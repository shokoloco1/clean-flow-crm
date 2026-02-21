

# Plan: Fix Staff Invitation Flow, Email Notifications, and Google Calendar Integration

## Problem Summary

There are three issues to address:

1. **Invitation email goes to spam** and the "Accept Invitation" button does nothing -- it should redirect staff to create their account with a password.
2. **Job assignment notifications via email** -- when a job is assigned to a staff member, they should receive an email.
3. **Google Calendar integration** -- job assignments should sync to the staff member's Google Calendar.

---

## Issue 1: Fix Staff Invitation Flow

### Root Cause

The `invite-staff` edge function uses `inviteUserByEmail()` which sends Supabase's default invitation email. That default email has an "Accept Invitation" link that redirects to `/auth` (as configured in `REDIRECT_TO`). However:

- The `/auth` page is a **login-only** page -- there's no mechanism to detect that the user arrived via invitation and needs to set a password.
- The staff member's account is already created by `inviteUserByEmail()`, so they don't need to "sign up" -- they just need to **set their password**.
- The branded Resend email (secondary layer) doesn't include any action button at all -- it just says "you'll receive a separate email."

### Fix

**A) Create a dedicated `/staff/accept-invite` page** that:
- Detects the invitation token from the URL (Supabase appends `#access_token=...&type=invite` to the redirect URL)
- Shows a simple form: "Welcome! Set your password to get started"
- Calls `supabase.auth.updateUser({ password })` to set their password
- Redirects to `/staff` dashboard after success

**B) Update the `invite-staff` edge function:**
- Change `REDIRECT_TO` from `/auth` to `/staff/accept-invite` so the "Accept Invitation" link in Supabase's email takes staff to the correct page
- Update the branded Resend email to include an "Accept Invitation" button pointing to the same URL (as a backup)

**C) Add the new route** in `App.tsx` as a public route (not behind ProtectedRoute, since the user isn't fully authenticated yet).

**D) Improve email deliverability (spam reduction):**
- The Resend email is sent from `onboarding@resend.dev` (Resend's shared test domain) which triggers spam filters. The fix requires using a verified custom domain in Resend (configured via `RESEND_FROM_EMAIL` secret).
- Remove emoji characters from email subject lines (spam triggers)
- Add a plain text version (already done)
- I'll note this for you but the main fix is using your own verified domain in Resend.

---

## Issue 2: Job Assignment Email Notifications

### Current State

The database already has a trigger `notify_job_assignment()` that creates an **in-app notification** when a job is assigned. However, it does NOT send an email.

### Fix

**A) Create a new database trigger** `email_on_job_assignment()` that calls the existing `send-email` edge function via `pg_net` (or alternatively, handle it in the application layer).

**B) Better approach -- application-layer email:** Modify the job creation/assignment flow in the frontend to also call the `send-email` edge function with type `job_notification` after successfully creating/assigning a job. The `send-email` function already has a `job_notification` template ready to use.

The implementation will:
- After a job is assigned (in `useCreateJob.ts` and in job status/assignment updates), call `send-email` with the staff member's email and job details
- Use the existing `job_notification` template which includes location, date, and time

---

## Issue 3: Google Calendar Integration

### Feasibility

Yes, this is possible, but it requires a multi-step setup:

1. **Google Cloud Console setup** (done by you, the owner):
   - Create a Google Cloud project
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials (Web application type)
   - Set the redirect URI to your app

2. **Staff OAuth flow:**
   - Each staff member connects their Google account once
   - We store their refresh token securely in the database
   - When a job is assigned, we create a calendar event via Google Calendar API

### Implementation

**A) New database table** `google_calendar_tokens` to store OAuth tokens per staff member.

**B) New edge function** `google-calendar-sync` that:
   - Receives job details + staff user ID
   - Retrieves the staff's Google refresh token
   - Creates a Google Calendar event with the job details

**C) Settings page for staff** to connect/disconnect their Google Calendar.

**D) Required secrets:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud Console.

### Important Note
This requires you to set up a Google Cloud project and provide API credentials. I'll guide you through that process step by step when we implement it.

---

## Implementation Order

1. **Fix invitation flow** (Issue 1) -- highest priority, directly affects onboarding
2. **Job assignment emails** (Issue 2) -- relatively simple, uses existing infrastructure
3. **Google Calendar** (Issue 3) -- requires external setup, will do after the first two

---

## Technical Details

### New Files
- `src/pages/staff/AcceptInvitePage.tsx` -- Password setup page for invited staff
- `supabase/functions/google-calendar-sync/index.ts` -- Google Calendar integration (Issue 3)

### Modified Files
- `src/App.tsx` -- Add `/staff/accept-invite` route
- `supabase/functions/invite-staff/index.ts` -- Update redirect URL + improve branded email
- `src/hooks/useCreateJob.ts` -- Add email notification after job assignment
- `src/components/admin/CreateJobDialog.tsx` or `CreateJobWizard.tsx` -- Trigger email on assignment

### Database Changes
- New table `google_calendar_tokens` (for Issue 3, with RLS policies)
- New migration for the tokens table

### Secrets Needed (for Issue 3)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

