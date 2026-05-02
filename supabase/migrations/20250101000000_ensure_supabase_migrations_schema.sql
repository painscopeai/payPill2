-- Ensures supabase_migrations.schema_migrations exists (Dashboard + CLI migration tracking).
-- Mirrors supabase/cli pkg/migration/history.go CreateMigrationTable.
-- Safe when the platform already created these objects.

set lock_timeout = '4s';

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key
);

alter table supabase_migrations.schema_migrations
  add column if not exists statements text[];

alter table supabase_migrations.schema_migrations
  add column if not exists name text;
