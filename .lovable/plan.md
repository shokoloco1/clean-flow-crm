
## Problem Diagnosis

The user `davidshawcc@gmail.com` hits the "Trial Ended" paywall despite having an `active` subscription record in the database. The cause is a two-layer verification mismatch:

**Layer 1 — Edge Function (`check-subscription`):**
- Queries Stripe by email → no real Stripe customer exists (only a fake `cus_demo_davidshawcc` ID) → returns `subscribed: false`

**Layer 2 — SubscriptionGate (local DB fallback):**
- Reads the `subscriptions` table → finds `status: 'active'` → but the code only grants access on `'trialing'` status, not `'active'`, for the trial banner path
- The `subscribed` flag from the edge function is `false`, so it falls through to the paywall

**Result:** Both checks fail → "Your Free Trial Has Expired" screen is shown.

---

## Fix Plan

### 1. Update `check-subscription` edge function — add DB fallback

Modify the function to check the local `subscriptions` table **before** returning a negative result when Stripe has no customer. If the DB record has `status = 'active'` with a future `current_period_end`, return `subscribed: true`.

This is the correct pattern for:
- Manually activated test/demo accounts
- Accounts migrated from external systems
- Grace periods between webhook delivery and DB sync

The updated logic flow:
```text
1. Authenticate user
2. Query Stripe → if active subscription found → return subscribed: true
3. If NOT found in Stripe → query local subscriptions table
4. If DB has status='active' AND current_period_end > now → return subscribed: true
5. If DB has status='trialing' AND current_period_end > now → return subscribed: false but include trial info
6. Otherwise → return subscribed: false
```

### 2. File to change

**`supabase/functions/check-subscription/index.ts`** — After the Stripe "no customer found" early return and after the "no active sub" branch, add a fallback query to `public.subscriptions` using the Supabase service role client.

### Technical Details

The edge function already has `supabaseClient` initialized with `SUPABASE_SERVICE_ROLE_KEY`, so querying the `subscriptions` table is straightforward. The key addition:

```typescript
// After Stripe finds no customer OR no active subscription:
const { data: dbSub } = await supabaseClient
  .from("subscriptions")
  .select("status, current_period_end, stripe_price_id")
  .eq("user_id", user.id)
  .maybeSingle();

if (dbSub?.status === "active" && dbSub.current_period_end) {
  const periodEnd = new Date(dbSub.current_period_end);
  if (periodEnd > new Date()) {
    return { subscribed: true, plan: "manual", subscription_end: periodEnd.toISOString() };
  }
}
```

This makes the system correctly recognize manually-activated accounts without needing a real Stripe record.

### No database changes needed

The `subscriptions` table already has the correct data (`status: 'active'`, `current_period_end: 2027-02-20`). Only the edge function logic needs updating.
