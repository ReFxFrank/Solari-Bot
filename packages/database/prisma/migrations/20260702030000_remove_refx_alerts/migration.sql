-- The ReFx Alerts module was removed from the product. Postgres cannot drop
-- enum values, so "Module".REFX_ALERTS stays as a dead value; clean up every
-- row that referenced it (audit history is retained).
DELETE FROM "GuildModuleConfig" WHERE "module" = 'REFX_ALERTS';
DELETE FROM "GlobalModuleFlag" WHERE "module" = 'REFX_ALERTS';
