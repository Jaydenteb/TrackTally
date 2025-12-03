# TrackTally UI Component Library

## Button Component

A reusable button component with multiple variants and sizes.

### Basic Usage

```tsx
import { Button } from "@/components/ui/Button";

// Primary button (default)
<Button>Submit</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Outline button
<Button variant="outline">View Details</Button>

// Danger button
<Button variant="danger">Delete</Button>

// Ghost button (transparent)
<Button variant="ghost">Skip</Button>
```

### Sizes

```tsx
// Small
<Button size="sm">Small Button</Button>

// Medium (default)
<Button size="md">Medium Button</Button>

// Large
<Button size="lg">Large Button</Button>
```

### As a Link

```tsx
// Button styled as a link
<Button href="/admin" variant="secondary">
  Go to Admin
</Button>
```

### Full Width

```tsx
<Button fullWidth>Submit Form</Button>
```

### With Disabled State

```tsx
<Button disabled>Loading...</Button>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"primary" \| "secondary" \| "outline" \| "danger" \| "ghost"` | `"primary"` | Button color variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size |
| `fullWidth` | `boolean` | `false` | Make button full width |
| `href` | `string` | - | If provided, renders as `<a>` tag |
| `disabled` | `boolean` | `false` | Disable button |
| `className` | `string` | `""` | Additional CSS classes |

All standard `button` HTML attributes are also supported.

---

## RoleBanner Component

A banner component that shows role information and super admin impersonation mode.

### Basic Usage

```tsx
import { RoleBanner } from "@/components/layout/RoleBanner";

// Regular teacher view
<RoleBanner
  role="teacher"
  organizationName="Example School"
  organizationDomain="example.edu"
/>

// Regular admin view
<RoleBanner
  role="admin"
  organizationName="Example School"
  organizationDomain="example.edu"
/>

// Super admin impersonating another school
<RoleBanner
  role="superadmin"
  organizationName="Example School"
  organizationDomain="example.edu"
  isImpersonating={true}
  availableOrganizations={[
    { id: "1", name: "Example School", domain: "example.edu" },
    { id: "2", name: "Test School", domain: "test.edu" },
  ]}
  onOrganizationChange={(domain) => {
    // Handle organization change
    console.log("Switched to:", domain);
  }}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `role` | `"teacher" \| "admin" \| "superadmin"` | Yes | User's role |
| `organizationName` | `string` | No | Current organization name |
| `organizationDomain` | `string` | No | Current organization domain |
| `isImpersonating` | `boolean` | No | Whether super admin is viewing another org |
| `availableOrganizations` | `Array<{id, name, domain}>` | No | List of orgs for super admin to switch |
| `onOrganizationChange` | `(domain: string) => void` | No | Callback when org is changed |

### Visual States

**Super Admin Mode** (prominent teal banner):
```
🔍 Super Admin Mode
Viewing: Example School (example.edu)  [Switch dropdown ▼]
```

**Regular Admin/Teacher** (subtle gray banner):
```
Admin Dashboard • Example School (example.edu)
```

---

## Migration Examples

### Before: Inline Styles

```tsx
// Old approach with inline styles
<button
  style={{
    padding: "0.65rem 1rem",
    borderRadius: "12px",
    border: "none",
    background: "#0f766e",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  }}
  onClick={handleSubmit}
>
  Submit
</button>
```

### After: Button Component

```tsx
// New approach with Button component
<Button onClick={handleSubmit}>
  Submit
</Button>
```

### Before: Custom Banner

```tsx
// Old approach in LoggerApp.tsx
<div style={{
  background: "#ecfeff",
  borderRadius: "16px",
  padding: "0.75rem 1rem",
  color: "#0f766e",
  display: "flex",
  gap: "0.5rem",
}}>
  Super Admin view · managing {organizationDomain}
</div>
```

### After: RoleBanner Component

```tsx
// New approach
<RoleBanner
  role="superadmin"
  organizationName={organizationName}
  organizationDomain={organizationDomain}
  isImpersonating={true}
  availableOrganizations={availableOrgs}
  onOrganizationChange={setSelectedOrgDomain}
/>
```

---

## Next Steps

Replace inline button styles in:
1. `components/admin/AdminDashboard.tsx` (28 instances)
2. `components/admin/StudentManager.tsx` (3 instances)
3. `components/admin/ClassManager.tsx` (multiple instances)
4. `components/SuperAdmin/SuperAdminDashboard.tsx` (45+ instances)
5. `components/LoggerApp.tsx` (35 instances)

Add RoleBanner to:
1. `app/admin/page.tsx` - Show org info for admins
2. `app/page.tsx` - Show org info for teachers
3. `app/super-admin/page.tsx` - Show impersonation mode

This will reduce code duplication and make styling consistent across the app.
