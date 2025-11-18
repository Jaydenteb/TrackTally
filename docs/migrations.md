# Database Migration Guide for TrackTally

## Overview

TrackTally uses Prisma for database migrations. This guide explains how to manage migrations in different environments.

## Environment Variables Required

You need **three** database URLs in production:

1. **`DATABASE_URL`** - Pooled connection (for app queries)
   - Use Neon's **pooler** connection string
   - Example: `postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require&pgbouncer=true`

2. **`DIRECT_DATABASE_URL`** - Direct connection (for migrations)
   - Use Neon's **direct** connection string (non-pooled)
   - Required for running migrations
   - Example: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

3. **`SHADOW_DATABASE_URL`** - Shadow database (for dev migrations)
   - Only needed for `prisma migrate dev`
   - Not required in production
   - Example: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname_shadow?sslmode=require`

## Vercel Setup

### 1. Add Environment Variables

In your Vercel project settings, add:

```bash
DATABASE_URL=postgresql://...pooler.../dbname?pgbouncer=true
DIRECT_DATABASE_URL=postgresql://.../dbname  # Direct connection (no pooler)
```

### 2. Deployment Options

**Option A: Automatic Migrations (Recommended for development)**

If `DIRECT_DATABASE_URL` is set in Vercel, migrations run automatically on every build.

- ✅ Simple - migrations happen on deploy
- ⚠️ Risk - failed migration = failed deployment

**Option B: Manual Migrations (Recommended for production)**

Run migrations manually before deploying:

```bash
# Set production database URL locally
export DIRECT_DATABASE_URL="your-direct-connection-string"

# Run pending migrations
npx prisma migrate deploy

# Then deploy to Vercel
vercel --prod
```

- ✅ Safer - test migrations before deployment
- ✅ Rollback possible if migration fails
- ⚠️ Requires manual step before each schema change

**Option C: Separate Migration Job**

Set up GitHub Actions to run migrations before deployment:

```yaml
# .github/workflows/deploy.yml
- name: Run Migrations
  env:
    DIRECT_DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}
  run: npx prisma migrate deploy

- name: Deploy to Vercel
  run: vercel deploy --prod
```

## Current Build Behavior

The build script (`npm run build`) does the following:

1. **Check for `DIRECT_DATABASE_URL`**
   - If set: Run `prisma migrate deploy` (apply pending migrations)
   - If not set: Skip migrations (print warning)

2. **Generate Prisma Client**
   - Always runs (required for app to work)

3. **Build Next.js App**
   - Compiles the application

This means:
- Build won't fail if `DIRECT_DATABASE_URL` is missing
- Migrations are optional during build
- You can deploy without migrations, but app may fail at runtime if schema is out of sync

## Migration Workflow

### Development (Local)

```bash
# Create a new migration
npx prisma migrate dev --name add_new_field

# This will:
# 1. Create migration file in prisma/migrations/
# 2. Apply migration to your dev database
# 3. Regenerate Prisma Client
```

### Staging/Production

```bash
# Option 1: Run manually before deploying
export DIRECT_DATABASE_URL="postgresql://..."
npx prisma migrate deploy

# Option 2: Let Vercel build handle it (if env var is set)
git push  # Vercel will run migrations automatically
```

## Troubleshooting

### Build fails with "Environment variable not found: DIRECT_DATABASE_URL"

**Cause**: `DIRECT_DATABASE_URL` is required in `schema.prisma` but not set in Vercel.

**Fix**: Add `DIRECT_DATABASE_URL` to Vercel environment variables:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `DIRECT_DATABASE_URL` with your direct database connection string
3. Redeploy

### Migration runs but app still has errors

**Cause**: Schema change requires app code changes too.

**Fix**: Ensure both migration and code changes are deployed together:
```bash
git add prisma/migrations/
git add app/  # Updated code
git commit -m "feat: Add new field to schema"
git push
```

### Want to skip migrations during build

**Current behavior**: Migrations are skipped automatically if `DIRECT_DATABASE_URL` isn't set.

If you want to force-skip migrations even when env var is set, run:
```bash
# Build without migrations
prisma generate && next build
```

## Best Practices

1. **Test migrations locally first**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Review generated SQL**
   ```bash
   cat prisma/migrations/XXXXXX_descriptive_name/migration.sql
   ```

3. **Backup before major schema changes**
   - Neon provides automatic backups
   - Or manually export: `pg_dump > backup.sql`

4. **Use descriptive migration names**
   - ✅ `add_incident_type_field`
   - ❌ `update_schema`

5. **Never edit migration files after they're applied**
   - Create a new migration instead

6. **Keep migrations small and focused**
   - One logical change per migration
   - Easier to debug and rollback

## Migration Files

All migrations are stored in `prisma/migrations/`:

```
prisma/migrations/
├── 20251105_init_postgres/
│   └── migration.sql
├── 20251107_add_organizations/
│   └── migration.sql
├── 20251110_add_mobile_auth_ticket/
│   └── migration.sql
└── 20251111_add_incident_type/
    └── migration.sql
```

Each folder contains:
- `migration.sql` - The actual SQL commands
- Applied migrations are tracked in `_prisma_migrations` table

## Emergency Rollback

If a migration causes issues:

```bash
# 1. Revert the code changes
git revert HEAD

# 2. Manually rollback the migration
# (Prisma doesn't have built-in rollback, you need to write reverse SQL)
psql $DIRECT_DATABASE_URL < rollback.sql

# 3. Mark migration as not applied (advanced)
# Delete the migration record from _prisma_migrations table
```

**Prevention is better**: Always test migrations on staging first!

## Summary

- **Development**: `npx prisma migrate dev` (creates + applies migrations)
- **Production**: `npx prisma migrate deploy` (applies pending migrations)
- **Vercel Build**: Automatically runs migrations if `DIRECT_DATABASE_URL` is set
- **Safety**: Test on staging, backup before major changes, never edit applied migrations
