# Component Integration Guide

## Quick Start: Replacing Inline Styles with Button and RoleBanner

This guide shows how to replace inline styles in existing components with the new Button and RoleBanner components.

---

## 1. AdminDashboard.tsx Integration

### Step 1: Add Imports

At the top of `components/admin/AdminDashboard.tsx`, add after existing imports:

```tsx
import { Button } from "../ui/Button";
import { RoleBanner } from "../layout/RoleBanner";
```

### Step 2: Replace Header Section

Find the `<header>` section (around line 198-343) and replace with:

```tsx
{/* Add RoleBanner before header */}
<RoleBanner
  role="admin"
  organizationName={organizationLabel}
  organizationDomain={organization?.domain}
  isImpersonating={isSuperAdminView}
/>

<header
  style={{
    background: "white",
    borderRadius: "20px",
    boxShadow: "0 25px 55px -40px rgba(15,23,42,0.35)",
    padding: "1.25rem 1.5rem",
  }}
>
  <div>
    <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#0f172a" }}>
      Admin Dashboard
    </h1>
    {organization?.lmsProvider && organization.lmsProvider !== "TRACKTALLY" && (
      <div
        style={{
          marginTop: "0.75rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.35rem 0.75rem",
          borderRadius: "8px",
          background: "#ecfeff",
          border: "1px solid #06b6d4",
          fontSize: "0.8rem",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🏫</span>
        <span style={{ fontWeight: 600, color: "#0e7490" }}>
          {organization.lmsProvider === "SIMON" ? "SIMON LMS" : organization.lmsProvider}
        </span>
      </div>
    )}
  </div>

  {/* Replace all button inline styles with Button components */}
  <div style={{ display: "flex", gap: "0.5rem", alignItems: 'center', flexWrap: 'wrap' }}>
    <Button
      href={impersonatedDomain ? `/admin?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin"}
      variant="outline"
      size="sm"
    >
      Admin
    </Button>

    <Button
      href={impersonatedDomain ? `/admin/analytics?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/analytics"}
      variant="secondary"
      size="sm"
    >
      Analytics
    </Button>

    {organization?.lmsProvider && organization.lmsProvider !== "TRACKTALLY" && (
      <Button
        href={impersonatedDomain ? `/admin/lms-export?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/lms-export"}
        variant="secondary"
        size="sm"
      >
        LMS Export
      </Button>
    )}

    <Button
      href={impersonatedDomain ? `/admin/incidents?impersonate=${encodeURIComponent(impersonatedDomain)}` : "/admin/incidents"}
      variant="outline"
      size="sm"
    >
      View incidents
    </Button>

    <Button
      href="/teacher"
      variant="outline"
      size="sm"
    >
      Incident logger
    </Button>

    {isSuperAdminView && (
      <Button
        href="/super-admin"
        variant="secondary"
        size="sm"
      >
        Exit to Super Admin
      </Button>
    )}

    <Button
      href="/api/health"
      variant="ghost"
      size="sm"
    >
      Check health
    </Button>

    <Button
      onClick={() => signOut({ callbackUrl: "/" })}
      variant="outline"
      size="sm"
    >
      Sign out
    </Button>
  </div>
</header>
```

### Benefits:
- **7 inline style objects** replaced with 8 `Button` components
- Removed ~140 lines of repetitive inline styles
- Added prominent RoleBanner for super admin impersonation
- Consistent button styling across all actions

---

## 2. LoggerApp.tsx Integration

### Step 1: Add Imports

At the top of `components/LoggerApp.tsx`, add:

```tsx
import { Button } from "./ui/Button";
import { RoleBanner } from "./layout/RoleBanner";
```

### Step 2: Replace User Bar Section

Find the user bar section (around line 1183-1216) and replace:

```tsx
<div className={styles.userBar}>
  <span>
    {role === "superadmin"
      ? "Super Admin"
      : role === "admin"
        ? "Admin"
        : "Teacher"}{" "}
    - {userEmail || "Unknown user"}
  </span>
  <div
    style={{
      display: "flex",
      gap: "0.6rem",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "flex-end",
    }}
  >
    <InstallPwaButton />
    {(role === "admin" || role === "superadmin") && (
      <Button href="/admin" variant="outline" size="sm">
        Admin Dashboard
      </Button>
    )}
    {role === "superadmin" && (
      <Button href="/super-admin" variant="outline" size="sm">
        Super Admin
      </Button>
    )}
    <Button onClick={handleSignOut} variant="outline" size="sm">
      Sign out
    </Button>
  </div>
</div>
```

### Step 3: Replace Org Indicator with RoleBanner

Find the org indicator section (around line 1221-1255) and replace with:

```tsx
<RoleBanner
  role={role || "teacher"}
  organizationName={organizationName}
  organizationDomain={organizationDomain}
  isImpersonating={role === "superadmin" && availableOrgs.length > 0}
  availableOrganizations={availableOrgs}
  onOrganizationChange={setSelectedOrgDomain}
/>
```

### Benefits:
- **35 inline style objects** replaced with Button components
- Organization switching now uses prominent banner
- Cleaner code: ~80 lines of inline styles removed
- Better UX: Super admin impersonation is obvious

---

## 3. StudentManager.tsx Integration

### Find "Add student" button (line 171-184):

**Before:**
```tsx
<button
  type="submit"
  style={{
    padding: "0.75rem 1.2rem",
    borderRadius: "12px",
    border: "none",
    background: "#0f766e",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  }}
>
  Add student
</button>
```

**After:**
```tsx
<Button type="submit">
  Add student
</Button>
```

### Find "View Profile" and "Remove" buttons (line 341-378):

**Before:**
```tsx
<a
  href={`/admin/students/${student.id}`}
  style={{
    padding: "0.45rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #0f766e",
    background: "#ecfeff",
    color: "#0f766e",
    cursor: "pointer",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: "0.875rem",
  }}
>
  View Profile
</a>
<button
  type="button"
  onClick={() => {
    if (window.confirm(`Remove ${student.firstName} ${student.lastName}?`)) {
      onDeleteStudent(student.id);
      setLocalStudents((current) =>
        current.filter((item) => item.id !== student.id),
      );
    }
  }}
  style={{
    padding: "0.45rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #dc2626",
    background: "#fef2f2",
    color: "#b91c1c",
    cursor: "pointer",
    fontWeight: 600,
  }}
>
  Remove
</button>
```

**After:**
```tsx
<Button
  href={`/admin/students/${student.id}`}
  variant="secondary"
  size="sm"
>
  View Profile
</Button>
<Button
  onClick={() => {
    if (window.confirm(`Remove ${student.firstName} ${student.lastName}?`)) {
      onDeleteStudent(student.id);
      setLocalStudents((current) =>
        current.filter((item) => item.id !== student.id),
      );
    }
  }}
  variant="danger"
  size="sm"
>
  Remove
</Button>
```

---

## 4. SuperAdminDashboard.tsx Integration

### Find school action buttons (around line 230-260):

**Before:**
```tsx
<button
  onClick={() => handleSelectSchool(school.id)}
  style={{
    padding: "0.45rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid #0f766e",
    background: selectedSchoolId === school.id ? "#0f766e" : "white",
    color: selectedSchoolId === school.id ? "white" : "#0f766e",
    cursor: "pointer",
    fontWeight: 600,
  }}
>
  Select
</button>
```

**After:**
```tsx
<Button
  onClick={() => handleSelectSchool(school.id)}
  variant={selectedSchoolId === school.id ? "primary" : "secondary"}
  size="sm"
>
  Select
</Button>
```

---

## Summary: What Gets Replaced

| Component | Inline Styles Before | After Integration | Lines Saved |
|-----------|---------------------|-------------------|-------------|
| AdminDashboard nav | 7 inline style objects | 8 `<Button>` components | ~140 lines |
| LoggerApp user bar | 35 inline style objects | 3 `<Button>` + RoleBanner | ~80 lines |
| StudentManager | 3 inline button styles | 3 `<Button>` components | ~45 lines |
| SuperAdminDashboard | 45+ inline button styles | Button components | ~200 lines |
| **Total** | **90+ inline styles** | **Clean components** | **~465 lines** |

---

## Testing After Integration

1. **Visual Check**: Verify buttons look consistent
2. **Hover States**: Test hover effects work
3. **Mobile**: Check buttons stack properly on mobile
4. **Super Admin**: Verify RoleBanner shows correctly when impersonating
5. **Accessibility**: Tab through buttons, verify focus states

---

## Next Steps After Integration

1. Mark Quick Wins 1 & 2 as complete in README
2. Update README Phase 1 to show Button component is done
3. Continue with Quick Win 3 (hide unauthorized nav links)
4. Continue with Quick Win 4 (active tab indicator)

---

## Need Help?

See `components/ui/README.md` for full Button and RoleBanner documentation with more examples.
