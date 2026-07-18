-- E-book -> physical "Buku Speakingpro" now needs a shipping address captured
-- at checkout (the Midtrans webhook payload carries no address data, so it's
-- stored on the order at creation time, same pattern as the 1-on-1 booking).
alter table public.orders
  add column shipping_address text,
  add column shipping_city text,
  add column shipping_postal_code text;

-- Catalog refresh: E-Course pricing/title, and the e-book becomes a physical book.
update public.coaching_products set price_idr = 120000, title = 'E-Course' where type = 'video_course';
update public.coaching_products set title = 'Buku Speakingpro' where type = 'ebook';
