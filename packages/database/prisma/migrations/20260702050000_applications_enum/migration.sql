-- AlterEnum
-- Kept in its own migration: Postgres cannot use a newly-added enum value in the
-- same transaction that adds it, so the tables/config land in the next migration.
ALTER TYPE "Module" ADD VALUE 'APPLICATIONS';
