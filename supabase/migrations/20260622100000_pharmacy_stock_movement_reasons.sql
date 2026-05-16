-- Allow addition / reduction stock movement types (in addition to legacy restock, adjustment, sale).

alter table public.provider_pharmacy_stock_movements
  drop constraint if exists provider_pharmacy_stock_movements_reason_check;

alter table public.provider_pharmacy_stock_movements
  add constraint provider_pharmacy_stock_movements_reason_check
  check (reason in ('sale', 'restock', 'addition', 'reduction', 'adjustment'));
