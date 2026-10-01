-- Read-only metadata snapshot. No migrations, fixtures, or data changes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT jsonb_build_object(
  'checked_at', now(),
  'database', current_database(),
  'read_only', current_setting('transaction_read_only'),
  'migration_ledger_present', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'tables', (SELECT jsonb_agg(jsonb_build_object('table', c.relname, 'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity, 'kind', c.relkind)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')),
  'columns', (SELECT jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type, 'udt', udt_name, 'nullable', is_nullable, 'default', column_default, 'precision', numeric_precision, 'scale', numeric_scale) ORDER BY table_name, ordinal_position) FROM information_schema.columns WHERE table_schema='public'),
  'constraints', (SELECT jsonb_agg(jsonb_build_object('table', c.conrelid::regclass::text, 'name', c.conname, 'type', c.contype, 'validated', c.convalidated, 'definition', pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'),
  'policies', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE schemaname='public'),
  'grants', (SELECT jsonb_agg(to_jsonb(g)) FROM information_schema.table_privileges g WHERE table_schema='public'),
  'roles', (SELECT jsonb_agg(jsonb_build_object('role', rolname, 'superuser', rolsuper, 'bypass_rls', rolbypassrls)) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')),
  'functions', (SELECT jsonb_agg(jsonb_build_object('name', p.proname, 'identity_arguments', pg_get_function_identity_arguments(p.oid), 'security_definer', p.prosecdef, 'config', p.proconfig, 'acl', p.proacl, 'definition', CASE WHEN p.proname IN ('owns_property','set_updated_at','handle_new_user') THEN pg_get_functiondef(p.oid) ELSE NULL END)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
  'triggers', (SELECT jsonb_agg(jsonb_build_object('table', c.relname, 'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid))) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND (n.nspname='public' OR (n.nspname='auth' AND c.relname='users')))
) AS preflight;
COMMIT;
