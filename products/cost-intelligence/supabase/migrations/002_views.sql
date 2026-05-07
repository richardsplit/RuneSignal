-- ============================================================
-- Cost Intelligence Platform — Materialized Views
-- ============================================================

-- customer_cost_summary: per-tenant, per-customer, per-month -------
create materialized view if not exists ci_customer_cost_summary as
select
  tenant_id,
  customer_id,
  date_trunc('month', created_at)             as month,
  count(*)                                     as request_count,
  sum(input_tokens)                            as total_input_tokens,
  sum(output_tokens)                           as total_output_tokens,
  sum(cost_usd)                                as total_cost_usd,
  avg(latency_ms)                              as avg_latency_ms,
  count(distinct model)                        as models_used,
  max(created_at)                              as last_request_at
from ci_inference_logs
group by 1, 2, 3;

create unique index if not exists ci_ccs_pk
  on ci_customer_cost_summary (tenant_id, coalesce(customer_id,'__none__'), month);
create index if not exists ci_ccs_tenant_month_idx
  on ci_customer_cost_summary (tenant_id, month desc);

-- model_cost_summary: per-tenant, per-model, per-month -------------
create materialized view if not exists ci_model_cost_summary as
select
  tenant_id,
  model,
  provider,
  date_trunc('month', created_at)             as month,
  count(*)                                     as request_count,
  sum(input_tokens)                            as total_input_tokens,
  sum(output_tokens)                           as total_output_tokens,
  sum(cost_usd)                                as total_cost_usd,
  avg(cost_usd)                                as avg_cost_per_request,
  avg(latency_ms)                              as avg_latency_ms
from ci_inference_logs
group by 1, 2, 3, 4;

create unique index if not exists ci_mcs_pk
  on ci_model_cost_summary (tenant_id, model, month);
create index if not exists ci_mcs_tenant_month_idx
  on ci_model_cost_summary (tenant_id, month desc);

-- monthly_revenue_summary: per-tenant, per-customer, per-month -----
create materialized view if not exists ci_monthly_revenue_summary as
select
  tenant_id,
  customer_id,
  date_trunc('month', period_start)           as month,
  sum(amount_usd)                              as revenue_usd,
  count(distinct stripe_customer_id)           as stripe_customers,
  max(plan_tier)                               as plan_tier
from ci_revenue_events
where event_type in ('charge.succeeded','invoice.payment_succeeded')
  and period_start is not null
group by 1, 2, 3;

create unique index if not exists ci_mrs_pk
  on ci_monthly_revenue_summary (tenant_id, coalesce(customer_id,'__none__'), month);
create index if not exists ci_mrs_tenant_month_idx
  on ci_monthly_revenue_summary (tenant_id, month desc);

-- customer_margin: joins cost + revenue ----------------------------
-- (not materialized — queried view that joins the two MV above)
create or replace view ci_customer_margin as
select
  coalesce(c.tenant_id, r.tenant_id)          as tenant_id,
  coalesce(c.customer_id, r.customer_id)      as customer_id,
  coalesce(c.month, r.month)                  as month,
  coalesce(r.revenue_usd, 0)                  as revenue_usd,
  coalesce(c.total_cost_usd, 0)               as ai_cost_usd,
  case
    when coalesce(r.revenue_usd, 0) = 0 then null
    else round(
      ((coalesce(r.revenue_usd,0) - coalesce(c.total_cost_usd,0))
       / coalesce(r.revenue_usd,0)) * 100, 2)
  end                                          as gross_margin_pct,
  coalesce(c.request_count, 0)                as request_count,
  r.plan_tier
from ci_customer_cost_summary  c
full outer join ci_monthly_revenue_summary r
  on c.tenant_id   = r.tenant_id
  and c.customer_id = r.customer_id
  and c.month       = r.month;

-- Refresh function (called by cron every hour) ---------------------
create or replace function ci_refresh_materialized_views()
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently ci_customer_cost_summary;
  refresh materialized view concurrently ci_model_cost_summary;
  refresh materialized view concurrently ci_monthly_revenue_summary;
end;
$$;

-- Trend helper: last 6 months AI cost + revenue per tenant ---------
create or replace view ci_six_month_trend as
select
  tenant_id,
  month,
  sum(ai_cost_usd)    as ai_cost_usd,
  sum(revenue_usd)    as revenue_usd,
  case
    when sum(revenue_usd) = 0 then null
    else round(((sum(revenue_usd) - sum(ai_cost_usd)) / sum(revenue_usd)) * 100, 2)
  end                 as gross_margin_pct
from ci_customer_margin
where month >= date_trunc('month', now()) - interval '5 months'
group by 1, 2
order by 1, 2;
