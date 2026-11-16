-- Smart Plant Box — 2026-11-16: customers can follow their box
--   placed (new) → confirmed → preparing → shipped → delivered   (or cancelled)
-- 1) two more steps (preparing, delivered), the time of every step (status_log),
--    and the carrier + tracking number once it ships (admins fill these in on /admin)
-- 2) track_order(ref, phone): look an order up from another device / without signing in.
--    Needs the 8-character order number AND the phone used to order; returns only
--    the steps, items and tracking — never the name, address, email or phone.
-- 3) the "shipped" email carries the tracking number, and every status email links to /orders/

-- ---------- 1) steps, step times, tracking ----------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status = any (array['new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']));

alter table public.orders add column if not exists carrier text;
alter table public.orders add column if not exists tracking_no text;
alter table public.orders add column if not exists status_log jsonb not null default '[]'::jsonb;
alter table public.orders drop constraint if exists orders_carrier_check;
alter table public.orders add constraint orders_carrier_check
  check (carrier is null or carrier = any (array['thailandpost', 'kex', 'flash', 'jt', 'self', 'other']));
alter table public.orders drop constraint if exists orders_tracking_no_check;
alter table public.orders add constraint orders_tracking_no_check
  check (tracking_no is null or tracking_no ~ '^[A-Za-z0-9-]{4,40}$');
alter table public.orders drop constraint if exists orders_status_log_size;
alter table public.orders add constraint orders_status_log_size check (pg_column_size(status_log) <= 8192);

-- orders placed before today: "placed" at their creation time (+ the step they are on now)
update public.orders
   set status_log = jsonb_build_array(jsonb_build_object('status', 'new', 'at', created_at))
                    || case when status <> 'new' then jsonb_build_array(jsonb_build_object('status', status, 'at', now())) else '[]'::jsonb end
 where status_log = '[]'::jsonb;

-- every step gets its time (kept to the last 40 changes)
create or replace function private.orders_status_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status_log := jsonb_build_array(jsonb_build_object('status', coalesce(new.status, 'new'), 'at', now()));
  elsif new.status is distinct from old.status then
    new.status_log := (case when jsonb_array_length(coalesce(old.status_log, '[]'::jsonb)) >= 40
                            then old.status_log - 0 else coalesce(old.status_log, '[]'::jsonb) end)
                      || jsonb_build_array(jsonb_build_object('status', new.status, 'at', now()));
  end if;
  return new;
end;
$$;
revoke all on function private.orders_status_log() from public, anon, authenticated;
drop trigger if exists orders_status_log on public.orders;
create trigger orders_status_log
  before insert or update of status on public.orders
  for each row execute function private.orders_status_log();

-- admins (the existing "Admins update order status" policy) may also set the carrier and tracking number
grant update (carrier, tracking_no) on public.orders to authenticated;

-- ---------- 2) look up an order with its number + phone ----------
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
  select id, created_at, status, status_log, items, total, carrier, tracking_no into o
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
    'total', o.total, 'carrier', o.carrier, 'tracking_no', o.tracking_no);
end;
$$;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ---------- 3) status emails: tracking number + link to the tracking page ----------
create or replace function private.notify_customer_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_from text;
  v_to text;
  v_c jsonb := new.customer;
  v_no text := upper(left(new.id::text, 8));
  v_th_title text; v_en_title text; v_th_text text; v_en_text text; v_color text;
  v_rows text := '';
  v_item jsonb;
  v_money text;
  v_track text := '';
  v_carrier text;
begin
  if new.status is not distinct from old.status or new.status not in ('confirmed', 'shipped', 'cancelled') then
    return new;
  end if;
  v_to := lower(btrim(coalesce(v_c->>'email', '')));
  if v_to !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return new;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  select value into v_from from private.settings where key = 'notify_from';
  if coalesce(v_key, '') = '' or coalesce(v_from, '') = '' then
    return new;
  end if;

  case new.status
    when 'confirmed' then
      v_th_title := 'ยืนยันคำสั่งซื้อแล้ว'; v_en_title := 'Your order is confirmed'; v_color := '#2c6a46';
      v_th_text := 'ทีมงานตรวจสอบและยืนยันคำสั่งซื้อของคุณแล้ว เราจะติดต่อกลับเรื่องการชำระเงินและการจัดส่ง';
      v_en_text := 'We have checked and confirmed your order. We will contact you about payment and delivery.';
    when 'shipped' then
      v_th_title := 'จัดส่งสินค้าแล้ว'; v_en_title := 'Your order has shipped'; v_color := '#1d3a2a';
      v_th_text := 'สินค้าของคุณถูกส่งออกแล้ว ขอบคุณที่สนับสนุน Smart Plant Box';
      v_en_text := 'Your order is on its way. Thank you for supporting Smart Plant Box.';
      if coalesce(new.tracking_no, '') <> '' then
        v_carrier := case new.carrier when 'thailandpost' then 'ไปรษณีย์ไทย / Thailand Post' when 'kex' then 'KEX (Kerry Express)'
                       when 'flash' then 'Flash Express' when 'jt' then 'J&amp;T Express' when 'self' then 'ทีมงานจัดส่งเอง / Our team' else 'ขนส่ง / Carrier' end;
        v_track := format('<p style="margin:0 0 14px;padding:10px 12px;border-radius:8px;background:#f3ecdf">เลขพัสดุ / Tracking: <b>%s</b> &middot; %s</p>',
                          private.html_escape(new.tracking_no), v_carrier);
      end if;
    else
      v_th_title := 'ยกเลิกคำสั่งซื้อแล้ว'; v_en_title := 'Your order was cancelled'; v_color := '#8a4b00';
      v_th_text := 'คำสั่งซื้อนี้ถูกยกเลิก หากคุณไม่ได้ขอยกเลิก กรุณาติดต่อทีมงานผ่านหน้าติดต่อเราบนเว็บไซต์';
      v_en_text := 'This order was cancelled. If you did not ask for this, please contact us through the Contact page on our website.';
  end case;

  for v_item in select value from jsonb_array_elements(coalesce(new.items, '[]'::jsonb)) loop
    v_money := rtrim(to_char(coalesce((v_item->>'price')::numeric, 0), 'FM999,999,990.99'), '.');
    v_rows := v_rows || format(
      '<tr><td style="padding:7px 0;border-bottom:1px solid #eee">%s</td><td style="padding:7px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">฿%s</td></tr>',
      private.html_escape(v_item->>'name'), v_money);
  end loop;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', v_from,
      'to', jsonb_build_array(v_to),
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
        || '<table style="width:100%%;border-collapse:collapse;margin:8px 0 4px">%s'
        || '<tr><td style="padding:9px 0"><b>รวม / Total</b></td><td style="padding:9px 0;text-align:right"><b>฿%s</b></td></tr></table>'
        || '<p style="margin:18px 0"><a href="https://www.smartplantbox.com/orders/?ref=%s" style="display:inline-block;background:#1d3a2a;color:#f6f1e7;padding:10px 18px;border-radius:999px;text-decoration:none">ติดตามคำสั่งซื้อ / Track your order</a></p>'
        || '<p style="margin:0;color:#888;font-size:12px">อีเมลนี้ส่งอัตโนมัติเมื่อสถานะคำสั่งซื้อเปลี่ยน · This email was sent automatically when your order status changed.<br>'
        || 'ติดต่อทีมงาน / Contact us: <a href="https://www.smartplantbox.com/?page=contact" style="color:#2c6a46">www.smartplantbox.com</a></p>'
        || '</div>',
        v_color, v_th_title, v_en_title, v_no,
        private.html_escape(left(coalesce(v_c->>'firstName', ''), 100)),
        v_th_text, v_en_text, v_track, v_rows,
        rtrim(to_char(new.total, 'FM999,999,990.99'), '.'),
        v_no)
    )
  );
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function private.notify_customer_status() from public, anon, authenticated;
