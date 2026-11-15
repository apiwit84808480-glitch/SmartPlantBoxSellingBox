-- Smart Plant Box — 2026-11-15
-- 1) Email the customer when an admin moves an order to confirmed / shipped / cancelled.
--    Only admins can change a status, so nobody else can make the site send these emails.
--    The email carries the order number, items and total only (no address or phone),
--    in case the customer mistyped their email address.
-- 2) Prices live in one place: admins edit public.price_list on /admin, the site reads it on load.
--    Every change is kept in private.price_changes (who, when, old → new).

-- ---------- 1) customer status emails ----------
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
begin
  if new.status is not distinct from old.status or new.status not in ('confirmed', 'shipped', 'cancelled') then
    return new;
  end if;
  v_to := lower(btrim(coalesce(v_c->>'email', '')));
  if v_to !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return new;  -- no usable address
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  select value into v_from from private.settings where key = 'notify_from';
  if coalesce(v_key, '') = '' or coalesce(v_from, '') = '' then
    return new;  -- email not set up
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
    else
      v_th_title := 'ยกเลิกคำสั่งซื้อแล้ว'; v_en_title := 'Your order was cancelled'; v_color := '#8a4b00';
      v_th_text := 'คำสั่งซื้อนี้ถูกยกเลิก หากคุณไม่ได้ขอยกเลิก กรุณาติดต่อทีมงานผ่านหน้าติดต่อบนเว็บไซต์';
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
        || '<table style="width:100%%;border-collapse:collapse;margin:8px 0 4px">%s'
        || '<tr><td style="padding:9px 0"><b>รวม / Total</b></td><td style="padding:9px 0;text-align:right"><b>฿%s</b></td></tr></table>'
        || '<p style="margin:16px 0 0;color:#888;font-size:12px">อีเมลนี้ส่งอัตโนมัติเมื่อสถานะคำสั่งซื้อเปลี่ยน · This email was sent automatically when your order status changed.<br>'
        || 'ติดต่อทีมงาน / Contact us: <a href="https://www.smartplantbox.com/?page=contact" style="color:#2c6a46">www.smartplantbox.com</a></p>'
        || '</div>',
        v_color, v_th_title, v_en_title, v_no,
        private.html_escape(left(coalesce(v_c->>'firstName', ''), 100)),
        v_th_text, v_en_text, v_rows,
        rtrim(to_char(new.total, 'FM999,999,990.99'), '.'))
    )
  );
  return new;
exception when others then
  return new;  -- never block a status change because the email failed
end;
$$;

revoke all on function private.notify_customer_status() from public, anon, authenticated;

drop trigger if exists orders_notify_customer on public.orders;
create trigger orders_notify_customer
  after update of status on public.orders
  for each row
  when (new.status is distinct from old.status)
  execute function private.notify_customer_status();

-- ---------- 2) prices edited in one place ----------
alter table public.price_list add column if not exists updated_at timestamptz;
alter table public.price_list drop constraint if exists price_list_price_range;
alter table public.price_list add constraint price_list_price_range check (price >= 0 and price <= 1000000);

create table if not exists private.price_changes (
  id bigint generated always as identity primary key,
  key text not null,
  old_price numeric,
  new_price numeric,
  changed_by text,
  changed_at timestamptz not null default now()
);
alter table private.price_changes enable row level security;

create or replace function private.price_list_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price is distinct from old.price then
    new.updated_at := now();
    insert into private.price_changes (key, old_price, new_price, changed_by)
    values (old.key, old.price, new.price, lower(auth.jwt() ->> 'email'));
  end if;
  return new;
end;
$$;
revoke all on function private.price_list_stamp() from public, anon, authenticated;

drop trigger if exists price_list_stamp on public.price_list;
create trigger price_list_stamp
  before update on public.price_list
  for each row execute function private.price_list_stamp();

-- admins may change the price column only (not keys or names); everyone else still reads only
grant update (price) on public.price_list to authenticated;
drop policy if exists "Admins update prices" on public.price_list;
create policy "Admins update prices" on public.price_list
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
