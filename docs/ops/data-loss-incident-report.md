# Data Loss Incident Report - Sacred Heart Primary School

**Date of Incident:** 2025-11-24
**Date of Discovery:** 2025-11-25
**Severity:** Critical
**Status:** Recovery in progress

---

## Executive Summary

On November 24, 2025, the Sacred Heart Primary School data was accidentally deleted from the `tracktally_stage` production database when a migration script designed for empty databases was executed on a database containing live data. The incident resulted in the loss of teacher accounts, student records, and classroom data. However, all incident and commendation records were preserved in Google Sheets, enabling partial data recovery.

---

## Incident Timeline

| Time | Event |
|------|-------|
| Nov 24, 2025 | User reported issues with LMS provider feature not showing in Super Admin |
| Nov 24, 2025 | Investigation revealed database column `lmsProvider` was missing |
| Nov 24, 2025 | Created `complete-migration.sql` script for database setup |
| Nov 24, 2025 | User ran migration script on `tracktally_stage` database |
| Nov 24, 2025 | Migration script wiped existing data (undetected at time) |
| Nov 25, 2025 | User discovered Sacred Heart data was missing |
| Nov 25, 2025 | Confirmed data loss; Neon restore window (6 hours) had expired |
| Nov 25, 2025 | Created recovery script to restore from Google Sheets |

---

## Root Cause Analysis

### Primary Cause
The `complete-migration.sql` script was designed to set up a database from scratch, including creating all tables, indexes, and initial data. When run on `tracktally_stage` (which contained production data), it dropped and recreated tables, wiping all existing records.

### Contributing Factors

1. **Ambiguous Database Naming**
   - Production data was in `tracktally_stage` instead of `tracktally_prod`
   - `.env.production` pointed `DATABASE_URL` to `tracktally_stage`
   - Developer assumed production data was in `tracktally_prod`

2. **Lack of Safety Checks**
   - Migration script had no checks for existing data
   - No backup was taken before running migration
   - No confirmation prompt for destructive operations

3. **Insufficient Backup Window**
   - Neon free tier only provides 6-hour point-in-time restore
   - Incident wasn't discovered until outside restore window

4. **Environment Variable Confusion**
   - `DATABASE_URL` pointed to `tracktally_stage`
   - `DIRECT_DATABASE_URL` pointed to `tracktally_prod`
   - Inconsistent configuration led to confusion

---

## Impact Assessment

### Data Lost ❌
- **Teacher Accounts**: All teacher records (email, displayName, role, isSpecialist)
- **Student Records**: All student profiles (firstName, lastName, guardians, notes)
- **Classroom Records**: All classroom data (name, code, homeroomTeacher)
- **Organization Metadata**: Configuration settings

### Data Preserved ✅
- **Incidents**: All incident records preserved in Google Sheets
- **Commendations**: All commendation records preserved in Google Sheets
- **Incident Details**: Student names/IDs, teacher emails, class codes, timestamps, categories, notes

### Business Impact
- **Data Access**: School admin unable to view teacher/student/classroom lists
- **New Incidents**: Still functional (logged directly to Sheets)
- **Reports**: Historical incident data recoverable
- **User Accounts**: Teachers lost access until accounts recreated

---

## Recovery Actions

### Immediate Actions Taken
1. ✅ Created data recovery script (`scripts/recover-from-sheets.ts`)
2. ✅ Documented recovery process ([RECOVERY-GUIDE.md](../../RECOVERY-GUIDE.md))
3. ✅ Added recovery command to package.json (`npm run recover`)
4. ✅ Installed tsx dependency for running recovery script

### Recovery Process

#### Phase 1: Incident Data Recovery (Automated)
```bash
npm install
npm run recover
```

This script:
- Reads all incidents from Google Sheets "Incidents" sheet
- Reads all commendations from Google Sheets "Commendations" sheet
- Recreates Sacred Heart organization
- Imports all incident records back into database
- Generates recovery report with statistics

#### Phase 2: Manual Reconstruction (Required)
The following must be manually recreated:

1. **Teacher Accounts**
   - Extract unique teacher emails from recovery report
   - Recreate each teacher account in admin panel
   - Assign appropriate roles (admin/teacher)
   - Mark specialist teachers

2. **Classroom Records**
   - Extract unique class codes from recovery report
   - Recreate each classroom with original codes
   - Assign homeroom teachers

3. **Student Records**
   - Extract unique student IDs/names from recovery report
   - Recreate each student profile
   - Assign students to classrooms
   - Add guardian information (from school records)

#### Phase 3: Verification
- Verify incidents are properly linked to students/classrooms/teachers
- Test creating new incidents
- Verify analytics and reporting
- Confirm user access and permissions

---

## Lessons Learned

### What Went Wrong
1. Migration script lacked safety checks for existing data
2. Production database was misidentified
3. No backup taken before destructive operation
4. Environment variable naming was confusing
5. Backup retention window (6 hours) was insufficient

### What Went Right
1. ✅ Google Sheets integration preserved critical incident data
2. ✅ Incident UUIDs enabled deduplication during recovery
3. ✅ All incident metadata (students, teachers, classes) was captured
4. ✅ Recovery script could be created and executed quickly

---

## Prevention Measures

### 1. Migration Safety Checks

Update all migration scripts to include safety checks:

```sql
-- Check if tables have data before wiping
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM "Teacher";
  IF table_count > 0 THEN
    RAISE EXCEPTION 'Database contains data! This migration is for empty databases only.';
  END IF;
END $$;
```

### 2. Database Naming Convention

Establish clear naming:
- `tracktally_prod` - Production database (live data)
- `tracktally_stage` - Staging database (testing)
- `tracktally_dev` - Development database (local)

### 3. Environment Variable Standards

```bash
# Production (.env.production)
DATABASE_URL="postgres://...@tracktally_prod/..."
DIRECT_DATABASE_URL="postgres://...@tracktally_prod/..."

# Staging (.env.staging)
DATABASE_URL="postgres://...@tracktally_stage/..."
DIRECT_DATABASE_URL="postgres://...@tracktally_stage/..."
```

### 4. Backup Strategy

#### Real-Time Backups (Already Implemented)
- ✅ Google Sheets integration for incidents/commendations
- Continue syncing all critical data to Sheets

#### Daily Database Backups (To Implement)
```bash
# Automated daily backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
pg_dump $DATABASE_URL > backups/tracktally-$DATE.sql
```

#### Point-in-Time Recovery
- Consider upgrading Neon plan for longer restore window
- Alternative: Implement custom backup solution

### 5. Pre-Migration Checklist

Before running ANY migration:

- [ ] Verify which database you're targeting
- [ ] Check if database contains data: `SELECT COUNT(*) FROM "Teacher"`
- [ ] Take manual backup: `pg_dump > backup-$(date +%Y-%m-%d).sql`
- [ ] Test migration on separate database first
- [ ] Review migration script for destructive operations
- [ ] Confirm with team lead for production changes

### 6. Migration Script Standards

All migration scripts must:
1. Include header comment explaining purpose
2. Clearly state if designed for empty vs populated databases
3. Include safety checks that halt on existing data
4. Provide rollback instructions
5. Be tested on copy of production data first

### 7. Documentation Requirements

Maintain documentation for:
- Database architecture and naming
- Environment variable configuration
- Backup and recovery procedures
- Migration process and safety checks
- Incident response plan

---

## Action Items

### Immediate (This Week)
- [ ] Run recovery script to restore incident data
- [ ] Manually recreate teacher accounts
- [ ] Manually recreate student records
- [ ] Manually recreate classroom records
- [ ] Verify data integrity

### Short-Term (This Month)
- [ ] Implement daily automated database backups
- [ ] Add safety checks to all migration scripts
- [ ] Clarify production database naming
- [ ] Update environment variable configuration
- [ ] Document backup/restore procedures

### Long-Term (Next Quarter)
- [ ] Evaluate Neon plan upgrade for longer restore window
- [ ] Implement monitoring for database changes
- [ ] Create automated backup verification system
- [ ] Expand Google Sheets backup to include teachers/students
- [ ] Establish disaster recovery testing schedule

---

## Conclusion

While this incident resulted in temporary data loss, the Google Sheets integration prevented catastrophic loss of incident records. The incident highlights the importance of:

1. **Comprehensive backups** beyond point-in-time recovery
2. **Clear database naming conventions** to prevent confusion
3. **Safety checks in migration scripts** to prevent accidental data loss
4. **Redundant data storage** (database + Google Sheets)

By implementing the prevention measures outlined above, we can significantly reduce the risk of similar incidents in the future.

---

## References

- [RECOVERY-GUIDE.md](../../RECOVERY-GUIDE.md) - Step-by-step recovery instructions
- [backup-restore.md](backup-restore.md) - Backup and restore procedures
- [scripts/recover-from-sheets.ts](../../scripts/recover-from-sheets.ts) - Recovery script
- [complete-migration.sql](../../complete-migration.sql) - Migration script that caused incident

---

**Report Prepared By:** Claude Code Assistant
**Date:** 2025-11-25
**Version:** 1.0
