-- Smart Plant Box — 2026-11-17: pay with PromptPay, then attach the slip
--   unpaid → review (slip attached, waiting for the team) → paid        (or rejected → attach again)
--   paid → refunded (the team transferred the money back)
-- 1) payment columns on orders + the shop's PromptPay number (kept private, typed in by an admin)
-- 2) order_payment(ref, phone?): the PromptPay number and amount for one order, so the page can draw the QR.
--    The amount always comes from the database, never from the browser.
-- 3) slips: a private storage bucket. A customer can upload only into their own order's folder,
--    only while it still needs paying; only admins can open slips.
-- 4) submit_slip / review_payment / payment settings: the only ways to change payment columns
-- 5) emails: the team hears about every new slip; the customer hears when it is accepted, rejected or refunded

-- ---------- 1) columns + settings ----------
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists slip_path text;
alter table public.orders add column if not exists slip_at timestamptz;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists payment_note text;
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status = any (array['unpaid', 'review', 'paid', 'rejected', 'refunded']));
alter table public.orders drop constraint if exists orders_payment_note_len;
alter table public.orders add constraint orders_payment_note_len check (payment_note is null or char_length(payment_note) <= 300);

create table if not exists private.payment_settings (
  id boolean primary key default true check (id),
  promptpay_id text check (promptpay_id is null or promptpay_id ~ '^(0[0-9]{9}|[0-9]{13})$'),
  account_name text check (account_name is null or char_length(account_name) between 1 and 80),
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table private.payment_settings enable row level security;
revoke all on private.payment_settings from public, anon, authenticated;
insert into private.payment_settings (id) values (true) on conflict (id) do nothing;

-- admins: read and change the PromptPay number (phone 0XXXXXXXXX or 13-digit ID; empty = payments off)
create or replace function public.get_payment_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare s record;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select promptpay_id, account_name, updated_at, updated_by into s from private.payment_settings where id;
  return jsonb_build_object('promptpay_id', s.promptpay_id, 'account_name', s.account_name,
                            'updated_at', s.updated_at, 'updated_by', s.updated_by);
end;
$$;
revoke all on function public.get_payment_settings() from public, anon;
grant execute on function public.get_payment_settings() to authenticated;

create or replace function public.set_payment_settings(p_promptpay text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := nullif(regexp_replace(coalesce(p_promptpay, ''), '\D', '', 'g'), '');
  v_name text := nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 80), '');
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if v_id is not null and v_id !~ '^(0[0-9]{9}|[0-9]{13})$' then
    raise exception 'PromptPay must be a 10-digit phone (0XXXXXXXXX) or a 13-digit ID' using errcode = '22023';
  end if;
  if v_id is not null and v_name is null then
    raise exception 'Add the account name customers will see' using errcode = '22023';
  end if;
  update private.payment_settings
     set promptpay_id = v_id, account_name = v_name, updated_at = now(), updated_by = lower(auth.jwt() ->> 'email')
   where id;
  return public.get_payment_settings();
end;
$$;
revoke all on function public.set_payment_settings(text, text) from public, anon;
grant execute on function public.set_payment_settings(text, text) to authenticated;

-- ---------- 2) what to pay for one order ----------
-- Signed in: the order must be yours (p_phone null). From another device: order number + phone (like track_order).
create or replace function public.order_payment(p_ref text, p_phone text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ref text := regexp_replace(lower(btrim(coalesce(p_ref, ''))), '^#', '');
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  o record;
  s record;
  v_payable boolean;
begin
  if v_ref !~ '^[0-9a-f]{8}$' then
    return null;
  end if;
  if p_phone is null then
    if auth.uid() is null then return null; end if;
    select id, status, total, payment_status, payment_note into o from public.orders
     where left(id::text, 8) = v_ref and user_id = auth.uid()
     order by created_at desc limit 1;
  else
    if length(v_phone) < 9 then return null; end if;
    select id, status, total, payment_status, payment_note into o from public.orders
     where left(id::text, 8) = v_ref
       and right(regexp_replace(coalesce(customer->>'phone', ''), '\D', '', 'g'), 9) = v_phone
     order by created_at desc limit 1;
  end if;
  if not found then
    return null;
  end if;
  select promptpay_id, account_name into s from private.payment_settings where id;
  v_payable := o.status in ('new', 'confirmed', 'preparing') and o.payment_status in ('unpaid', 'rejected')
               and coalesce(o.total, 0) > 0;
  return jsonb_build_object(
    'payment_status', o.payment_status,
    'payment_note', case when o.payment_status = 'rejected' then o.payment_note end,
    'amount', o.total,
    'payable', v_payable,
    'ready', v_payable and s.promptpay_id is not null,
    'promptpay_id', case when v_payable then s.promptpay_id end,
    'account_name', case when v_payable then s.account_name end);
end;
$$;
revoke all on function public.order_payment(text, text) from public;
grant execute on function public.order_payment(text, text) to anon, authenticated;

-- the tracking lookup shows whether the order is paid too
create or replace function public.track_order(p_ref text, p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ref text := regexp_replace(lower(btrim(coalesce(p_ref, ''))), '^#', '');
  v_phone text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  o record;
begin
  if v_ref !~ '^[0-9a-f]{8}$' or length(v_phone) < 9 then
    return null;
  end if;
  select id, created_at, status, status_log, items, total, carrier, tracking_no, payment_status into o
    from public.orders
   where left(id::text, 8) = v_ref
     and right(regexp_replace(coalesce(customer->>'phone', ''), '\D', '', 'g'), 9) = v_phone
   order by created_at desc
   limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', o.id, 'created_at', o.created_at, 'status', o.status, 'status_log', o.status_log,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i->>'name', 'price', i->'price')), '[]'::jsonb)
                from jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) i),
    'total', o.total, 'carrier', o.carrier, 'tracking_no', o.tracking_no, 'payment_status', o.payment_status);
end;
$$;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ---------- 3) slips bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- an upload must be "<your user id>/<your order id>/<file>.jpg|png|webp", for an order that still needs
-- paying, and at most 5 slips per order
create or replace function public.can_upload_slip(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce(p_name, '') ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]{1,40}\.(jpg|png|webp)$'
     and split_part(p_name, '/', 1) = auth.uid()::text
     and exists (select 1 from public.orders o
                  where o.id::text = split_part(p_name, '/', 2)
                    and o.user_id = auth.uid()
                    and o.status in ('new', 'confirmed', 'preparing')
                    and o.payment_status in ('unpaid', 'rejected'))
     and (select count(*) from storage.objects x
           where x.bucket_id = 'slips' and x.name like split_part(p_name, '/', 1) || '/' || split_part(p_name, '/', 2) || '/%') < 5;
$$;
revoke all on function public.can_upload_slip(text) from public, anon;
grant execute on function public.can_upload_slip(text) to authenticated;

drop policy if exists "Customers upload their own slips" on storage.objects;
create policy "Customers upload their own slips" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'slips' and public.can_upload_slip(name));
drop policy if exists "Admins read slips" on storage.objects;
create policy "Admins read slips" on storage.objects
  for select to authenticated
  using (bucket_id = 'slips' and (select public.is_admin()));

-- ---------- 4) attach a slip / the team's decision ----------
create or replace function public.submit_slip(p_order uuid, p_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first' using errcode = '28000';
  end if;
  select id, status, payment_status into o from public.orders where id = p_order and user_id = auth.uid() for update;
  if not found then
    raise exception 'Order not found' using errcode = '22023';
  end if;
  if o.status not in ('new', 'confirmed', 'preparing') or o.payment_status not in ('unpaid', 'rejected') then
    raise exception 'This order does not need a slip right now' using errcode = '22023';
  end if;
  if split_part(coalesce(p_path, ''), '/', 1) <> auth.uid()::text or split_part(p_path, '/', 2) <> p_order::text
     or not exists (select 1 from storage.objects x where x.bucket_id = 'slips' and x.name = p_path
                     and x.owner_id = auth.uid()::text) then
    raise exception 'Upload the slip first' using errcode = '22023';
  end if;
  update public.orders
     set payment_status = 'review', slip_path = p_path, slip_at = now(), payment_note = null
   where id = p_order;
  return jsonb_build_object('payment_status', 'review');
end;
$$;
revoke all on function public.submit_slip(uuid, text) from public, anon;
grant execute on function public.submit_slip(uuid, text) to authenticated;

create or replace function public.review_payment(p_order uuid, p_result text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_result not in ('paid', 'rejected', 'refunded', 'unpaid') then
    raise exception 'Unknown payment result' using errcode = '22023';
  end if;
  select id, payment_status into o from public.orders where id = p_order for update;
  if not found then
    raise exception 'Order not found' using errcode = '22023';
  end if;
  if p_result = 'refunded' and o.payment_status <> 'paid' then
    raise exception 'Only a paid order can be refunded' using errcode = '22023';
  end if;
  update public.orders
     set payment_status = p_result,
         paid_at = case when p_result = 'paid' then now() when p_result = 'refunded' then paid_at else null end,
         payment_note = v_note
   where id = p_order;
  return jsonb_build_object('payment_status', p_result);
end;
$$;
revoke all on function public.review_payment(uuid, text, text) from public, anon;
grant execute on function public.review_payment(uuid, text, text) to authenticated;

-- ---------- 5) emails ----------
create or replace function private.notify_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_from text;
  v_url text;
  v_to jsonb;
  v_c jsonb := new.customer;
  v_no text := upper(left(new.id::text, 8));
  v_money text := rtrim(to_char(coalesce(new.total, 0), 'FM999,999,990.99'), '.');
  v_th_title text; v_en_title text; v_th_text text; v_en_text text; v_color text;
  v_note text := '';
begin
  if new.payment_status is not distinct from old.payment_status then
    return new;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  select value into v_from from private.settings where key = 'notify_from';
  if coalesce(v_key, '') = '' or coalesce(v_from, '') = '' then
    return new;
  end if;

  if new.payment_status = 'review' then
    -- the team: a slip is waiting
    select jsonb_agg(email) into v_to from public.admins where notify_email;
    if v_to is null then return new; end if;
    select value into v_url from private.settings where key = 'admin_url';
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', v_from, 'to', v_to,
        'subject', format('Payment slip to check: ฿%s · #%s', v_money, v_no),
        'html', format(
          '<div style="font-family:Arial,sans-serif;max-width:560px;color:#111;line-height:1.6">'
          || '<h2 style="margin:0 0 4px">A customer attached a PromptPay slip</h2>'
          || '<p style="margin:0 0 12px;color:#555">Order #%s &middot; %s %s &middot; <b>฿%s</b></p>'
          || '<p style="margin:0 0 12px">Open your bank app and check that ฿%s really arrived, then press <b>Payment received</b> on the admin page.</p>'
          || '<p><a href="%s" style="display:inline-block;background:#1d3a2a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Open the admin page</a></p>'
          || '</div>',
          v_no, private.html_escape(left(v_c->>'firstName', 60)), private.html_escape(left(v_c->>'lastName', 60)),
          v_money, v_money, coalesce(v_url, 'https://www.smartplantbox.com/admin/'))));
    return new;
  end if;

  if new.payment_status not in ('paid', 'rejected', 'refunded') then
    return new;
  end if;
  if lower(btrim(coalesce(v_c->>'email', ''))) !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return new;
  end if;
  case new.payment_status
    when 'paid' then
      v_th_title := 'ได้รับชำระเงินแล้ว'; v_en_title := 'Payment received'; v_color := '#2c6a46';
      v_th_text := format('ทีมงานได้รับเงิน ฿%s เรียบร้อยแล้ว ขอบคุณที่สนับสนุน Smart Plant Box เราจะแจ้งให้ทราบทุกครั้งที่สถานะกล่องของคุณเปลี่ยน', v_money);
      v_en_text := format('We have received your ฿%s. Thank you! We will email you each time your box moves to the next step.', v_money);
    when 'rejected' then
      v_th_title := 'ตรวจสอบสลิปไม่ผ่าน'; v_en_title := 'We could not match your slip'; v_color := '#8a4b00';
      v_th_text := 'ทีมงานยังไม่พบยอดเงินที่ตรงกับสลิปนี้ กรุณาตรวจสอบยอดและแนบสลิปใหม่ที่หน้าติดตามคำสั่งซื้อ หรือติดต่อทีมงาน';
      v_en_text := 'We could not find a payment that matches this slip. Please check the amount and attach the slip again on the tracking page, or contact us.';
      if coalesce(new.payment_note, '') <> '' then
        v_note := format('<p style="margin:0 0 14px;padding:10px 12px;border-radius:8px;background:#f3ecdf">หมายเหตุจากทีมงาน / Note from our team: %s</p>',
                         private.html_escape(new.payment_note));
      end if;
    else
      v_th_title := 'คืนเงินแล้ว'; v_en_title := 'Refund sent'; v_color := '#1d3a2a';
      v_th_text := format('ทีมงานโอนเงินคืน ฿%s ให้คุณแล้ว หากยังไม่ได้รับภายใน 3 วันทำการ กรุณาติดต่อทีมงาน', v_money);
      v_en_text := format('We have sent your ฿%s back. If it has not arrived within 3 business days, please contact us.', v_money);
  end case;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', v_from,
      'to', jsonb_build_array(lower(btrim(v_c->>'email'))),
      'subject', format('%s · %s #%s — Smart Plant Box', v_th_title, v_en_title, v_no),
      'html', format(
        '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d3a2a;line-height:1.6">'
        || '<p style="margin:0 0 6px;color:#a8853c;font-size:12px;letter-spacing:1px">SMART PLANT BOX</p>'
        || '<h2 style="margin:0;color:%s">%s</h2>'
        || '<p style="margin:0 0 14px;color:#666">%s &middot; คำสั่งซื้อ / Order #%s</p>'
        || '<p style="margin:0 0 6px">สวัสดีคุณ %s</p>'
        || '<p style="margin:0 0 6px">%s</p>'
        || '<p style="margin:0 0 14px;color:#666">%s</p>'
        || '%s'
        || '<p style="margin:18px 0"><a href="https://www.smartplantbox.com/orders/?ref=%s" style="display:inline-block;background:#1d3a2a;color:#f6f1e7;padding:10px 18px;border-radius:999px;text-decoration:none">ติดตามคำสั่งซื้อ / Track your order</a></p>'
        || '<p style="margin:0;color:#888;font-size:12px">อีเมลนี้ส่งอัตโนมัติ · This email was sent automatically.<br>'
        || 'ติดต่อทีมงาน / Contact us: <a href="https://www.smartplantbox.com/?page=contact" style="color:#2c6a46">www.smartplantbox.com</a></p>'
        || '</div>',
        v_color, v_th_title, v_en_title, v_no,
        private.html_escape(left(coalesce(v_c->>'firstName', ''), 100)),
        v_th_text, v_en_text, v_note, v_no)));
  return new;
exception when others then
  return new;  -- never block a payment update because an email failed
end;
$$;
revoke all on function private.notify_payment() from public, anon, authenticated;
drop trigger if exists orders_notify_payment on public.orders;
create trigger orders_notify_payment
  after update of payment_status on public.orders
  for each row when (new.payment_status is distinct from old.payment_status)
  execute function private.notify_payment();

-- "confirmed" email: point unpaid customers to the PromptPay QR instead of "we will contact you about payment"
do $$
declare v_def text;
begin
  select pg_get_functiondef('private.notify_customer_status()'::regprocedure) into v_def;
  v_def := replace(v_def,
    'v_th_text := ''ทีมงานตรวจสอบและยืนยันคำสั่งซื้อของคุณแล้ว เราจะติดต่อกลับเรื่องการชำระเงินและการจัดส่ง'';',
    'v_th_text := case when new.payment_status in (''unpaid'', ''rejected'') then ''ทีมงานยืนยันคำสั่งซื้อของคุณแล้ว ชำระเงินผ่านพร้อมเพย์ได้ที่ปุ่ม "ติดตามคำสั่งซื้อ" ด้านล่าง แล้วแนบสลิปไว้ในหน้าเดียวกัน'' else ''ทีมงานยืนยันคำสั่งซื้อของคุณแล้ว เราจะแจ้งอีกครั้งเมื่อจัดส่ง'' end;');
  v_def := replace(v_def,
    'v_en_text := ''We have checked and confirmed your order. We will contact you about payment and delivery.'';',
    'v_en_text := case when new.payment_status in (''unpaid'', ''rejected'') then ''Your order is confirmed. Pay with PromptPay from the "Track your order" button below and attach the slip on the same page.'' else ''Your order is confirmed. We will email you again when it ships.'' end;');
  if v_def not like '%ชำระเงินผ่านพร้อมเพย์%' then
    raise exception 'notify_customer_status text not found';
  end if;
  execute v_def;
end;
$$;
revoke all on function private.notify_customer_status() from public, anon, authenticated;
