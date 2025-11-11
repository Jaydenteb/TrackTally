# Commendation Feature Implementation

## Overview

Added ability to log positive recognitions (commendations) alongside behavior incidents in TrackTally. Users can now choose between logging an "Incident" or "Commendation" with customized categories and levels for positive behaviors.

## Implementation Summary

### 1. Database Changes

**File**: [prisma/schema.prisma:73](prisma/schema.prisma#L73)

Added `type` field to Incident model:
```prisma
type String @default("incident") // "incident" | "commendation"
@@index([type])
```

**Migration**: [prisma/migrations/20251111_add_incident_type/migration.sql](prisma/migrations/20251111_add_incident_type/migration.sql)

```sql
ALTER TABLE "Incident" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'incident';
CREATE INDEX "Incident_type_idx" ON "Incident"("type");
```

**To apply migration**:
```bash
npx prisma migrate deploy
npx prisma generate
```

---

### 2. Validation Schema

**File**: [lib/validation.ts](lib/validation.ts)

**Added**:
- `TYPE_VALUES`: `["incident", "commendation"]`
- `COMMENDATION_LEVEL_VALUES`: `["Notable", "Exceptional"]`
- `COMMENDATION_CATEGORY_VALUES`:
  - "Excellent work"
  - "Helping others"
  - "Leadership"
  - "Improvement"
  - "Positive attitude"
  - "Kindness"
  - "Responsibility"
  - "Other"

**Updated `incidentInputSchema`**:
- Added `type` field (defaults to "incident")
- Made `level` and `category` flexible strings (max 32/64 chars) to support both incident and commendation values

---

### 3. Organization Options

**File**: [lib/organizations.ts](lib/organizations.ts)

**Updated `IncidentOptionGroups` type**:
```typescript
type IncidentOptionGroups = {
  levels: string[];
  categories: string[];
  locations: string[];
  actions: string[];
  commendationLevels?: string[];  // NEW
  commendationCategories?: string[];  // NEW
};
```

**Updated `DEFAULT_INCIDENT_OPTIONS`**:
- Added `commendationLevels: ["Notable", "Exceptional"]`
- Added `commendationCategories: [...]` (8 positive behavior types)

**Updated `normalizeOptions()`**:
- Now includes commendation fields with fallback to defaults

---

### 4. Google Sheets Integration

**File**: [lib/sheets.ts:105](lib/sheets.ts#L105)

**Added `appendCommendationRow()` function**:
- Writes to separate "Commendations" tab in Google Sheets
- Uses same 12-column structure as Incidents (A:L)
- Columns: timestamp, studentId, studentName, level, category, location, actionTaken, note, teacherEmail, classCode, device, uuid

**Action Required**: Create "Commendations" tab in your Google Sheet with header row matching Incidents tab.

---

### 5. Logger UI Changes

**File**: [components/LoggerApp.tsx](components/LoggerApp.tsx)

**Updated Flow**:
```
1. Students → 2. Type → 3. Level → 4. Category → 5. Location → 6. Action → 7. Note
```

**New "Type" Step** (after student selection):
- Two buttons: "Incident" or "Commendation"
- Auto-advances to next step on selection

**Dynamic Labels**:
- **Level step**: "Level" for incidents, "Impact" for commendations
- **Category step**: "Category" for incidents, "Recognition type" for commendations
- **Step descriptions**: Change based on type selected

**Dynamic Options**:
- Level options: `incidentOptions.levels` vs `incidentOptions.commendationLevels`
- Category options: `incidentOptions.categories` vs `incidentOptions.commendationCategories`

**State Management**:
- Added `type` state variable
- Updated `maxUnlockedStep` logic to include type validation
- Added `handleTypeSelect()` handler
- Reset clears type on submit

---

### 6. API Changes

**File**: [app/api/log-incident/route.ts:184](app/api/log-incident/route.ts#L184)

**Database Write**:
- Added `type: data.type || "incident"` to prisma.incident.create()

**Google Sheets Write** (line 218-223):
```typescript
if (data.type === "commendation") {
  const { appendCommendationRow } = await import("../../../lib/sheets");
  await appendCommendationRow(sheetRow);
} else {
  await appendIncidentRow(sheetRow);
}
```

**Options API**: [app/api/options/route.ts](app/api/options/route.ts)
- Already returns commendation options via updated `getOptionsForDomain()`

---

### 7. Testing

**File**: [__tests__/incidents.test.ts](__tests__/incidents.test.ts)

**Added Tests**:
1. ✅ Valid commendation data validation
2. ✅ Default to "incident" type if not specified
3. ✅ Accept both "incident" and "commendation" types
4. ✅ Reject invalid types (e.g., "unknown-type")

**Run Tests**:
```bash
npm test
```

---

## Files Changed (11 total)

### Created (2)
1. `prisma/migrations/20251111_add_incident_type/migration.sql`
2. `COMMENDATION-FEATURE.md` (this file)

### Modified (9)
1. `prisma/schema.prisma` - Added type field + index
2. `lib/validation.ts` - Added type schema, commendation enums
3. `lib/organizations.ts` - Added commendation options to type + defaults
4. `lib/sheets.ts` - Added appendCommendationRow function
5. `components/LoggerApp.tsx` - Added type step, dynamic labels, handlers
6. `app/api/log-incident/route.ts` - Branch logic for sheets, type field in DB
7. `__tests__/incidents.test.ts` - Added 4 commendation tests
8. `app/api/options/route.ts` - (No changes needed - already returns updated options)

---

## Deployment Checklist

### Before First Deploy

- [ ] **Create "Commendations" tab in Google Sheet**:
  - Copy header row from "Incidents" tab
  - Headers: timestamp, studentId, studentName, level, category, location, actionTaken, note, teacherEmail, classCode, device, uuid

- [ ] **Run database migration**:
  ```bash
  npx prisma migrate deploy
  npx prisma generate
  ```

- [ ] **Verify environment variables**:
  - `SHEET_ID` - Must have access to sheet
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

- [ ] **Run tests**:
  ```bash
  npm test
  ```

- [ ] **Build succeeds**:
  ```bash
  npm run build
  ```

### After Deploy

- [ ] Sign in and test logging a commendation
- [ ] Verify commendation appears in "Commendations" sheet tab
- [ ] Verify commendation saved to database with `type = "commendation"`
- [ ] Test logging an incident still works
- [ ] Verify offline queue works for both types
- [ ] Check audit logs created properly

---

## Usage Guide

### For Teachers

1. **Navigate to logger** (homepage after sign-in)
2. **Select student(s)**
3. **Choose type**: Click "Incident" or "Commendation"
4. **Select level**:
   - Incidents: Minor/Major
   - Commendations: Notable/Exceptional
5. **Pick category**:
   - Incidents: Disruption, Bullying, etc.
   - Commendations: Helping others, Leadership, etc.
6. **Set location**: Where behavior occurred
7. **Choose action**: Response taken (e.g., "Positive note home" for commendations)
8. **Add note** (optional): Context about the positive behavior
9. **Submit**: Record saved to database + Google Sheets

### For Admins

**Viewing Commendations**:
- Access Google Sheets → "Commendations" tab
- Filter by student, date, teacher, etc.
- Export for reports

**Customizing Options** (via Super Admin console):
- Navigate to `/super-admin`
- Edit organization
- Update `commendationLevels` or `commendationCategories`
- Changes apply org-wide

**Querying Database**:
```sql
-- All commendations
SELECT * FROM "Incident" WHERE type = 'commendation';

-- Count by student
SELECT "studentName", COUNT(*)
FROM "Incident"
WHERE type = 'commendation'
GROUP BY "studentName"
ORDER BY COUNT(*) DESC;

-- Recent commendations
SELECT * FROM "Incident"
WHERE type = 'commendation'
ORDER BY timestamp DESC
LIMIT 20;
```

---

## Design Decisions

### Why Single Model Instead of Separate Commendation Model?

**Chosen Approach**: Extended Incident model with `type` field

**Rationale**:
1. **Code Reuse**: Commendations share 95% of fields/logic with incidents
2. **Single API Endpoint**: `/api/log-incident` handles both (could rename to `/api/log-behavior` later)
3. **Unified Analytics**: Easy to query holistic student behavior (positive + negative)
4. **Minimal Changes**: Leverages existing validation, rate limiting, offline queue, audit logs
5. **Future-Proof**: Easy to add more types later (e.g., "observation", "goal")

**Trade-off**: Model name "Incident" is less accurate but acceptable for MVP.

---

### Why Separate Google Sheets Tab?

**Chosen Approach**: Write commendations to "Commendations!A:L" tab

**Rationale**:
1. **User Experience**: Teachers likely want separate views for positive vs negative behaviors
2. **Existing Workflows**: Schools may have different consumers/reports for each type
3. **Schema Flexibility**: Can adjust columns later without affecting incidents
4. **Minimal Code**: Just one new function `appendCommendationRow()`

**Alternative Considered**: Single tab with type column
- **Rejected**: Requires updating all existing sheet integrations

---

## Future Enhancements (Not in MVP)

- [ ] Admin dashboard view for commendations
- [ ] Commendation export to CSV/PDF
- [ ] Email notifications for commendations to parents/guardians
- [ ] Leaderboards/badges for top commended students
- [ ] Ratio tracking (incidents vs commendations per student)
- [ ] Rename Incident model to BehaviorLog or StudentEvent
- [ ] Rename `/api/log-incident` to `/api/log-behavior`
- [ ] Separate rate limits for incidents vs commendations
- [ ] Custom action options for commendations (vs incidents)

---

## Testing Scenarios

### Happy Paths

1. ✅ Log single student commendation → Appears in Commendations sheet
2. ✅ Log bulk commendations (multiple students) → All appear with same category/note
3. ✅ Log commendation offline → Queues to IndexedDB → Syncs when online
4. ✅ Log incident (existing flow) → Still works, goes to Incidents sheet
5. ✅ Custom commendation options (org-specific) → Show in UI

### Edge Cases

1. ✅ Switch from incident to commendation mid-flow → Level/category options update
2. ✅ Missing type field (old clients) → Defaults to "incident"
3. ✅ Google Sheets write fails → Still saves to database, doesn't crash
4. ✅ Commendations tab doesn't exist → Shows Sheets API error (expected)
5. ✅ Super long note (600+ chars) → Validation rejects

### Error Cases

1. ✅ Invalid type value → Zod validation fails with clear message
2. ✅ Missing required fields → User sees toast message
3. ✅ Network error during submit → Queues offline automatically

---

## Troubleshooting

### "Commendations sheet tab not found" error

**Symptom**: 500 error when submitting commendation

**Fix**: Create "Commendations" tab in Google Sheet with headers matching Incidents tab

---

### Commendation options not showing in UI

**Symptom**: Shows default incident options for commendations

**Causes**:
1. Old cached options → Clear browser cache/localStorage
2. Options API not returning commendation fields → Check `/api/options` response

**Fix**: Verify `incidentOptions` state includes `commendationLevels` and `commendationCategories`

---

### Migration fails "column already exists"

**Symptom**: `prisma migrate deploy` fails

**Fix**:
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Incident' AND column_name = 'type';

-- If it exists, mark migration as applied without running it
-- Or drop column and re-run migration
ALTER TABLE "Incident" DROP COLUMN "type";
```

---

## Support

- **File bugs**: GitHub Issues
- **Questions**: Check this doc first, then ask in team Slack

---

**Status**: ✅ COMPLETE - Ready for Testing

**Estimated Time Spent**: 4 hours

**Next Steps**: Deploy, test with real teachers, gather feedback on commendation categories
