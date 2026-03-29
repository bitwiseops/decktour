
-- Old plan-cards indirection (replaced by plan_cards table from migration 010)
DROP TABLE IF EXISTS public.plan_day_cards    CASCADE;
DROP TABLE IF EXISTS public.plan_days         CASCADE;

-- Old migration 009 view (recreated with correct definition in migration 010)
DROP VIEW  IF EXISTS public.plan_cards_view;
DROP VIEW  IF EXISTS public.cards_view;
