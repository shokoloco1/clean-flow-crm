
## Fix: invite-staff Edge Function — Duplicate Profile Error

### Root Cause

When an existing user is re-invited (already has an auth account but perhaps no role yet), the function:

1. Detects the user already exists → sets `isExistingUser = true`
2. Only runs the "update profile" path if `existingRole` is found
3. If NO role exists yet → the code falls through to line 375 (`if (!isExistingUser)`) — but `isExistingUser` IS true, so the insert is skipped
4. BUT wait — re-reading more carefully: when `existingRole` is null, the user IS existing but profile insert IS skipped. The crash is the opposite case.

Actually, looking at the logs more carefully:

```
[invite-staff] User ID: 857c0efc-..., existing: false   ← isExistingUser is FALSE
[invite-staff] Profile creation error: duplicate key... ← but profile already exists
```

The real bug: `isExistingUser = false` when the user was **just created by `auth.admin.createUser`**, BUT the `handle_new_user()` trigger on `auth.users` **automatically creates a profile** in the `public.profiles` table. So by the time line 376 tries to `INSERT` into `profiles`, the trigger has already inserted one → **duplicate key**.

### The Fix

**File: `supabase/functions/invite-staff/index.ts`**

Replace the `profiles` INSERT with an `UPSERT` (using `onConflict: "user_id"`) so it's safe whether the trigger already fired or not. Same fix applies to `user_roles` insert.

Specifically:

1. **Line 376-386**: Change `profiles.insert(...)` → `profiles.upsert(..., { onConflict: "user_id" })` — this handles the case where `handle_new_user()` trigger already created the profile.

2. **Line 408-415**: Change `user_roles.insert(...)` → `user_roles.upsert(..., { onConflict: "user_id" })` — same protection in case the trigger also inserted a default `staff` role.

3. **Line 394-404**: Change `profiles_sensitive.insert(...)` → already uses `upsert` in the existing-user path, make the new-user path consistent too.

### Why This Works

The `handle_new_user()` database trigger fires immediately when `auth.admin.createUser()` succeeds. It inserts a row into `public.profiles` with basic info. The Edge Function then tries to insert a second profile row with the enriched data (phone, certifications, hire_date) — which fails with `duplicate key`.

Using `upsert` with `onConflict: "user_id"` means:
- If the trigger already inserted a profile → update it with the full data
- If no profile exists yet → insert fresh (new install without trigger)

This is a 3-line change in one file, zero database changes needed.

### Technical Details

```
File modified: supabase/functions/invite-staff/index.ts

Change 1 (line ~376):
  .from("profiles").insert({...})
→ .from("profiles").upsert({...}, { onConflict: "user_id" })

Change 2 (line ~408):
  .from("user_roles").insert({ user_id: userId, role: "staff" })
→ .from("user_roles").upsert({ user_id: userId, role: "staff" }, { onConflict: "user_id" })

Change 3 (line ~394):
  .from("profiles_sensitive").insert({...})
→ .from("profiles_sensitive").upsert({...}, { onConflict: "user_id" })
```

No UI changes required. No database migrations needed. After deploying the updated Edge Function, re-inviting staff will work correctly even if the auth trigger has already pre-created their profile.
