# 🚨 DATA RECOVERY GUIDE - Sacred Heart Primary School

## What Happened

On [date], the Sacred Heart Primary School data was accidentally lost when a database migration script designed for empty databases was run on the production `tracktally_stage` database containing live data.

**Data Lost:**
- Teacher accounts
- Student records
- Classroom records
- Organization metadata

**Data Preserved:**
- ✅ All incidents (stored in Google Sheets)
- ✅ All commendations (stored in Google Sheets)

## Recovery Steps

### Prerequisites

Ensure you have the following environment variables configured in `.env.production`:

```bash
SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Step 1: Install Recovery Dependencies

```bash
npm install tsx --save-dev
```

### Step 2: Run the Recovery Script

The recovery script will:
1. Read all incidents and commendations from Google Sheets
2. Recreate the Sacred Heart organization
3. Import all incidents back into the database
4. Generate a recovery report

```bash
npx tsx scripts/recover-from-sheets.ts
```

### Step 3: Review Recovery Report

After the script completes, you'll see:
- Number of incidents recovered
- Number of commendations recovered
- Unique teachers found in data
- Unique students found in data
- Unique classes found in data

### Step 4: Manually Recreate Organizational Structure

The incident data will be recovered, but you'll need to manually recreate:

#### 4a. Recreate Teachers

1. Go to Super Admin panel: `/super-admin`
2. Select Sacred Heart organization
3. Click "Admin view" to open the school admin panel
4. Go to Teachers section
5. Add each teacher account with their email

**Note:** You can see which teacher emails are in the system by checking the recovery report.

#### 4b. Recreate Classrooms

1. In the school admin panel, go to Classes section
2. Recreate each classroom with their original codes
3. Assign homeroom teachers

**Note:** You can see which class codes are in the system by checking the recovery report.

#### 4c. Recreate Students

1. In the school admin panel, go to Students section
2. Recreate each student record
3. Assign students to their classrooms

**Note:** The incident data already contains student names and IDs which will help you reconstruct the student list.

### Step 5: Re-link Incidents to Proper Records

After recreating the organizational structure, the incidents will automatically link to:
- Students (by `studentId`)
- Classrooms (by `classCode`)
- Teachers (by `teacherEmail`)

### Step 6: Verify Data Integrity

1. Log in as a Sacred Heart admin
2. Go to Incidents page
3. Verify that incidents are showing correctly
4. Check that students, teachers, and classes are properly linked
5. Test creating a new incident to ensure everything works

## What Was Recovered

✅ **Fully Recovered:**
- All incident records with timestamps
- All commendation records
- Student names and IDs from incidents
- Teacher emails from incidents
- Class codes from incidents
- All incident details (level, category, location, notes, etc.)

⚠️ **Needs Manual Recreation:**
- Teacher accounts (email + display name + role)
- Student profiles (first name, last name, guardians, notes)
- Classroom records (name, code, homeroom teacher)
- Organization metadata (already recreated by script)

## Prevention Measures

To prevent this from happening again:

### 1. Backup Strategy
- ✅ Google Sheets integration already provides real-time backup of incidents
- ⚠️ Need regular database backups for teacher/student/classroom data
- Consider upgrading Neon plan for longer point-in-time recovery window

### 2. Migration Safety
- Never run migration scripts directly on production without:
  1. Taking a manual backup first
  2. Testing on a separate database first
  3. Verifying the database state (empty vs. populated)
- Add safety checks to migration scripts that detect existing data

### 3. Environment Clarity
- Clearly document which database is production
- Use consistent naming: `tracktally_prod` for production
- Keep `tracktally_stage` for staging/testing only
- Update `.env.production` to point to the correct database

### 4. Documentation
- Document the database architecture
- Document the migration process
- Document the backup and recovery procedures

## Database Configuration

After recovery, ensure your environment variables are correctly configured:

```bash
# Production database (where live data should be)
DATABASE_URL="postgres://..."  # Should point to production DB

# Direct connection for migrations
DIRECT_DATABASE_URL="postgres://..."  # Should point to same production DB

# Verify both URLs point to the SAME database for production
```

## Questions or Issues

If you encounter any issues during recovery:

1. Check that Google Sheets credentials are valid
2. Verify the SHEET_ID is correct
3. Check the recovery script output for specific errors
4. Review the database connection strings in `.env.production`

## Support

For additional help, contact the development team or refer to:
- [README.md](README.md) - General TrackTally documentation
- [docs/ops/backup-restore.md](docs/ops/backup-restore.md) - Backup procedures
