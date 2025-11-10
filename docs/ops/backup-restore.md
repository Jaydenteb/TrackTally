# Backup & Restore Procedures

## Database Backups (Neon PostgreSQL)

### Automated Backups

Neon provides automated backups:
- **Point-in-Time Recovery (PITR)**: Available for last 7 days (free tier) or 30 days (paid plans)
- **Daily Snapshots**: Automatic daily backups retained based on plan
- **Branch Snapshots**: Each database branch is snapshotted

### Manual Backup

To create a manual backup before major changes:

1. **Via Neon Console**:
   - Go to https://console.neon.tech
   - Select your project
   - Navigate to "Branches"
   - Click "Create branch" to snapshot current state
   - Name it with date/purpose: `backup-2025-01-10-pre-migration`

2. **Via pg_dump** (for local backup):
   ```bash
   # Use DIRECT_DATABASE_URL (not pooler)
   pg_dump $DIRECT_DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

3. **Via Prisma** (schema + data):
   ```bash
   # Export schema
   npx prisma db pull

   # Export data (requires custom script)
   npx ts-node scripts/export-data.ts
   ```

### Backup Verification

**Test restores quarterly**:
1. Create a test branch in Neon
2. Restore backup to test branch
3. Run smoke tests (auth, incident creation, multi-tenant isolation)
4. Verify data integrity
5. Delete test branch

---

## Restore Procedures

### Point-in-Time Recovery (Restore to specific time)

1. **Identify target timestamp**:
   - Determine exact time before incident/corruption occurred
   - Check audit logs if available

2. **Create restore branch in Neon**:
   ```bash
   # Via Neon CLI (install: npm i -g neonctl)
   neonctl branches create \
     --project-id your-project-id \
     --name restore-2025-01-10 \
     --timestamp "2025-01-10T14:30:00Z"
   ```

3. **Verify restored data**:
   - Connect to new branch
   - Check incident counts, user accounts, organization data
   - Run critical queries to verify data integrity

4. **Switch production to restored branch**:
   - Update `DATABASE_URL` in Vercel environment variables
   - Point to new branch connection string
   - Redeploy application

### Full Database Restore from pg_dump

1. **Create new branch for restore**:
   - Neon Console → Create new branch
   - Name: `restore-from-backup-YYYYMMDD`

2. **Restore SQL dump**:
   ```bash
   # Get connection string for new branch
   psql $RESTORE_BRANCH_URL < backup-20250110-120000.sql
   ```

3. **Verify and migrate schema if needed**:
   ```bash
   # Check for schema differences
   npx prisma db pull
   npx prisma migrate status

   # Apply missing migrations if any
   npx prisma migrate deploy
   ```

4. **Test restored database**:
   - Run test suite against restored branch
   - Verify multi-tenant isolation
   - Check recent incident data

5. **Switch production** (same as PITR step 4)

### Restore Individual Records

For accidental deletions of specific records:

1. **Find record in backup**:
   ```sql
   -- Connect to backup branch
   SELECT * FROM "Student" WHERE "studentId" = '12345';
   ```

2. **Re-create in production**:
   ```sql
   -- Copy data to production
   INSERT INTO "Student" (...) VALUES (...);
   ```

3. **Create audit log entry**:
   ```sql
   INSERT INTO "AuditLog" ("action", "performedBy", "meta")
   VALUES ('RESTORE_STUDENT', 'admin@school.edu', '{"studentId": "12345", "source": "backup-2025-01-10"}');
   ```

---

## Disaster Recovery

### Complete Data Loss

1. **Identify most recent backup**:
   - Neon automated snapshot (last 7-30 days)
   - Manual branch created before major change
   - pg_dump file if available

2. **Create new Neon project** (if original project lost):
   ```bash
   neonctl projects create --name tracktally-restored
   ```

3. **Restore from backup**:
   - Use PITR if within retention window
   - Import pg_dump if available
   - Restore from last known good branch

4. **Update application configuration**:
   - Update all database URLs in Vercel
   - Run migrations: `npx prisma migrate deploy`
   - Seed initial data if needed

5. **Verify data integrity**:
   - Check organization count
   - Verify incident data for each school
   - Test authentication flows

### Recovery Time Objectives (RTO)

- **Target RTO**: 4 hours (time to restore service)
- **Target RPO**: 24 hours (acceptable data loss = 1 day of incidents max)

---

## Google Sheets Backups

Incidents are also written to Google Sheets (currently "source of truth").

### Manual Sheets Backup

1. **Download as CSV**:
   - Open sheet in browser
   - File → Download → CSV
   - Store in secure location with date: `incidents-backup-YYYYMMDD.csv`

2. **Automate with script** (optional):
   ```typescript
   // scripts/backup-sheets.ts
   import { google } from 'googleapis';

   async function backupSheet() {
     const sheets = google.sheets('v4');
     const response = await sheets.spreadsheets.values.get({
       spreadsheetId: process.env.SHEET_ID,
       range: 'Incidents!A:L',
     });

     // Save to file or cloud storage
     const csv = response.data.values?.map(row => row.join(',')).join('\n');
     fs.writeFileSync(`backup-${Date.now()}.csv`, csv);
   }
   ```

### Restore from Sheets

If database is lost but Sheets intact:

1. **Export Sheets to CSV**
2. **Import via admin CSV import tool**:
   - `/admin` → Import → Upload CSV
   - Map columns to incident fields
3. **Verify imported data**

---

## Backup Schedule

### Production

- **Automated**: Neon daily snapshots (automatic)
- **Manual branches**: Before major migrations or bulk operations
- **pg_dump**: Weekly on Sundays at 2 AM (set up cron)
- **Sheets export**: Monthly CSV download

### Testing Backups

- **Quarterly**: Full restore drill to test branch
- **Before major releases**: Manual backup branch
- **Before bulk data operations**: Branch + pg_dump

---

## Backup Storage

### Current Setup

- **Primary**: Neon automated backups (7-30 day retention)
- **Secondary**: Manual branches (unlimited retention while not deleted)
- **Tertiary**: pg_dump files (store in):
  - Encrypted S3 bucket
  - Local encrypted drive (temporary)
  - Google Drive (for small backups)

### Future Enhancements

- [ ] Automate weekly pg_dump to S3
- [ ] Set up backup monitoring/alerts
- [ ] Implement backup rotation policy (keep weekly for 6 months)
- [ ] Add backup verification automation

---

## Incident Response

### Data Loss Detected

1. **Stop writes immediately**: Take app offline if necessary
2. **Assess scope**: Which tables/records affected?
3. **Identify last known good backup**
4. **Create incident log**: Document timeline, actions taken
5. **Execute restore procedure** (see above)
6. **Verify data integrity**
7. **Communicate with affected schools**
8. **Post-mortem**: Update procedures to prevent recurrence

### Accidental Deletion

1. **Don't panic** - data likely recoverable
2. **Check if soft-deleted** (if implemented)
3. **Use PITR** to restore to just before deletion
4. **Restore individual records** from backup branch
5. **Add audit log** of restoration

---

## Contacts

- **Neon Support**: https://neon.tech/docs/introduction/support
- **Database Admin**: [Your email]
- **Incident Response**: [Escalation contact]

---

## Checklist Before Production

- [ ] Verify Neon automated backups enabled
- [ ] Test PITR restore to new branch
- [ ] Document all database connection strings
- [ ] Set up weekly pg_dump automation
- [ ] Create first manual backup branch
- [ ] Download initial Sheets CSV backup
- [ ] Test restore procedure end-to-end
- [ ] Set calendar reminders for quarterly backup tests
- [ ] Add monitoring for backup success/failure
- [ ] Document RTO/RPO requirements

---

**Last Updated**: January 2025
**Next Review**: April 2025
**Owner**: [Your Name]
