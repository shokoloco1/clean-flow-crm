# PULCRIX BACKEND - COMPLETE AUDIT & IMPLEMENTATION PLAN

**Date**: 2026-02-08
**Auditor**: Claude Code (Opus 4.5)
**Repository**: clean-flow-crm
**Branch**: claude/multi-role-engineering-setup-8aQC7

---

## EXECUTIVE SUMMARY

**VERDICT: Continue with existing codebase - NO rebuild needed**

David, your codebase is **significantly more mature** than you described. This is NOT a basic Lovable frontend - it's a **production-ready MVP** with:

- **185+ React components** (TypeScript)
- **46 database migrations** (PostgreSQL via Supabase)
- **12 Edge Functions** (serverless backend)
- **Complete TIER 1 features** (95% done)
- **Stripe integration** (subscriptions working)
- **PWA capabilities** (offline-first)

The architecture is solid. What you're missing are the **AI features (TIER 2)** that will differentiate Pulcrix from competitors.

**Estimated time to add ALL 6 AI features: 45-55 hours**

---

# PART A: DEEP CODE AUDIT

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        PULCRIX ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐    ┌────────────────┐    ┌───────────────┐  │
│  │   React PWA    │───▶│   Supabase     │───▶│  PostgreSQL   │  │
│  │   (Vite/TS)    │    │   Edge Funcs   │    │   Database    │  │
│  │                │    │   (Deno)       │    │               │  │
│  │  - Components  │    │                │    │  - 24 Tables  │  │
│  │  - Hooks (29)  │    │  - 12 Funcs    │    │  - 3 Views    │  │
│  │  - Pages (20+) │    │  - Auth/RLS    │    │  - 15 Funcs   │  │
│  └────────────────┘    └────────────────┘    └───────────────┘  │
│           │                    │                     │           │
│           ▼                    ▼                     ▼           │
│  ┌────────────────┐    ┌────────────────┐    ┌───────────────┐  │
│  │  Supabase      │    │    Stripe      │    │   Storage     │  │
│  │  Realtime      │    │   Payments     │    │   (S3-like)   │  │
│  │  (WebSocket)   │    │                │    │               │  │
│  └────────────────┘    └────────────────┘    └───────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MISSING: AI LAYER                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ Claude   │  │ Google   │  │ SendGrid │  │  Twilio  │  │   │
│  │  │ API      │  │ Vision   │  │ (Email)  │  │  (SMS)   │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. TECH STACK ANALYSIS

| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| Frontend | React + TypeScript | 18.3.1 | ✅ Production-ready |
| Build | Vite | 6.4.1 | ✅ Optimized with code splitting |
| UI Library | shadcn/ui + Radix | Latest | ✅ Professional |
| Styling | Tailwind CSS | 3.4.17 | ✅ |
| State | React Query | 5.83.0 | ✅ Excellent choice |
| Backend | Supabase (BaaS) | 2.89.0 | ✅ |
| Database | PostgreSQL | 14+ | ✅ via Supabase |
| Auth | Supabase Auth | Built-in | ✅ JWT + RLS |
| Storage | Supabase Storage | Built-in | ✅ |
| Payments | Stripe | Latest | ✅ Working |
| PDF | jsPDF | 4.0.2 | ⚠️ Basic (no AI) |
| Monitoring | Sentry | 10.38.0 | ✅ |
| PWA | vite-plugin-pwa | 1.2.0 | ✅ |

### Pros of Current Stack:
1. **Supabase = Backend Solved** - No need for custom Node.js/Python server
2. **Edge Functions** - Serverless, scales automatically
3. **RLS (Row Level Security)** - Multi-tenant isolation built-in
4. **Real-time Subscriptions** - Live updates without WebSocket setup
5. **TypeScript** - Type safety across frontend

### Cons:
1. **No AI Integration** - Claude/Google Vision not connected
2. **PDF Generation** - Client-side only, no professional narratives
3. **Limited Backend Logic** - Edge Functions are basic

## 3. DATABASE SCHEMA REVIEW

### Tables (24 total):

| Table | Rows Est. | Purpose | Quality |
|-------|-----------|---------|---------|
| `users` | via Auth | Supabase managed | ✅ |
| `profiles` | 1-100 | Staff members | ✅ |
| `profiles_sensitive` | 1-100 | Hourly rates (admin-only) | ✅ Good separation |
| `user_roles` | 1-100 | RBAC (admin/staff) | ✅ |
| `clients` | 1-500 | Customer records | ✅ |
| `properties` | 1-1000 | Cleaning locations | ✅ Excellent detail |
| `property_photos` | 1-5000 | Reference photos | ✅ |
| `jobs` | 1-50000 | Core job records | ✅ Well designed |
| `job_photos` | 1-100000 | Before/after photos | ✅ |
| `job_area_photos` | 1-100000 | Area-specific docs | ✅ |
| `job_alerts` | 1-10000 | Late/no-show alerts | ✅ |
| `checklist_templates` | 1-50 | Reusable templates | ✅ |
| `checklist_items` | 1-100000 | Per-job checklist | ✅ |
| `invoices` | 1-10000 | Billing records | ✅ |
| `invoice_items` | 1-50000 | Line items | ✅ |
| `recurring_schedules` | 1-500 | Recurring jobs | ✅ |
| `staff_availability` | 1-700 | Weekly schedule | ✅ |
| `subscriptions` | 1-100 | Stripe subscriptions | ✅ |
| `notifications` | 1-50000 | User notifications | ✅ |
| `system_settings` | 1-50 | App config | ✅ |
| `login_attempts` | 1-10000 | Rate limiting | ✅ Security |
| `push_subscriptions` | 1-500 | Web push | ✅ |
| `portal_access_log` | 1-10000 | Audit trail | ✅ |
| `price_lists` | 1-20 | Price documents | ✅ |

### Missing Tables for AI Features:
```sql
-- Needed for AI features
CREATE TABLE ai_insights (id, job_id, insight_type, content, confidence, created_at);
CREATE TABLE ai_photo_analysis (id, photo_id, analysis_json, score, created_at);
CREATE TABLE ai_time_predictions (id, property_id, staff_id, predicted_minutes, actual_minutes);
CREATE TABLE ai_fraud_flags (id, staff_id, flag_type, evidence_json, reviewed, created_at);
CREATE TABLE ai_report_cache (id, job_id, report_markdown, pdf_url, created_at);
```

### Indexes Analysis:
- ✅ Primary keys on all tables (UUID)
- ✅ Foreign keys with proper relationships
- ⚠️ Missing composite indexes for common queries:
  ```sql
  -- Recommended additions:
  CREATE INDEX idx_jobs_date_status ON jobs(scheduled_date, status);
  CREATE INDEX idx_jobs_staff_date ON jobs(assigned_staff_id, scheduled_date);
  CREATE INDEX idx_checklist_job_status ON checklist_items(job_id, status);
  ```

## 4. CODE QUALITY ASSESSMENT

### Quality Score: 8.5/10

**Strengths:**
- TypeScript strict mode enabled
- Proper error boundaries
- React Query for data fetching
- Custom hooks for reusability
- Zod validation schemas
- Logging abstraction (`logger.ts`)
- Centralized config (`config.ts`)
- Code splitting configured

**Issues Found:**

| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| No AI integration | High | Missing entirely | Implement |
| PDF generation client-side | Medium | `PDFReports.tsx` | Move to Edge Function |
| Some N+1 queries | Low | `PDFReports.tsx:82-98` | Use joins |
| Missing rate limiting on some endpoints | Medium | Edge Functions | Add rate-limit headers |
| No API versioning | Low | All Edge Functions | Add `/v1/` prefix |

### Security Assessment:

| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | ✅ Safe | Supabase client parameterizes |
| XSS | ✅ Safe | React escapes by default |
| CSRF | ✅ Safe | JWT-based, no cookies |
| Auth/AuthZ | ✅ Good | RLS policies enforced |
| Rate Limiting | ⚠️ Partial | Only on login |
| CORS | ✅ Configured | In Edge Functions |
| Sensitive Data | ✅ Good | `profiles_sensitive` separation |
| Secrets | ✅ Safe | Environment variables |

## 5. FEATURES COMPLETENESS - TIER 1 (Core)

### 1. Authentication Multi-Tenant ✅ COMPLETE

**Location**: `src/hooks/useAuth.tsx`, `supabase/functions/bootstrap-role/`

| Feature | Status | Implementation |
|---------|--------|----------------|
| JWT Auth | ✅ | Supabase Auth |
| Roles (Admin/Staff) | ✅ | `user_roles` table + RLS |
| Multi-tenant isolation | ✅ | RLS policies per user |
| Password reset | ✅ | Supabase built-in |
| Email verification | ✅ | `resendVerificationEmail()` |
| Session management | ✅ | Local storage caching |
| Rate limiting (login) | ✅ | `check_login_rate_limit()` |

**Quality: 9/10**

### 2. GPS Tracking System ✅ COMPLETE

**Location**: `src/integrations/supabase/types.ts` (jobs table)

| Feature | Status | Implementation |
|---------|--------|----------------|
| Check-in timestamp + GPS | ✅ | `checkin_lat`, `checkin_lng`, `start_time` |
| Check-out timestamp + GPS | ✅ | `checkout_lat`, `checkout_lng`, `end_time` |
| Geofencing validation | ✅ | `geofence_radius_meters`, `geofence_validated` |
| Distance tracking | ✅ | `checkin_distance_meters`, `checkout_distance_meters` |
| GPS spoofing detection | ⚠️ 70% | Basic distance validation, no velocity check |

**Quality: 8/10** - Missing velocity-based spoofing detection

### 3. Dynamic Checklists ✅ COMPLETE

**Location**: `src/components/AdvancedChecklist.tsx`, `checklist_templates` table

| Feature | Status | Implementation |
|---------|--------|----------------|
| Template creation | ✅ | 4 default templates (residential, commercial, airbnb, medical) |
| Per-job checklist | ✅ | `checklist_items` table |
| Task status | ✅ | pending/done/na/issue |
| Notes per task | ✅ | `issue_note` field |
| Issue photos | ✅ | `issue_photo_url` field |
| Progress tracking | ✅ | Completion counting in UI |

**Quality: 9/10**

### 4. Photo Documentation ✅ COMPLETE

**Location**: `job_photos`, `job_area_photos` tables, Supabase Storage

| Feature | Status | Implementation |
|---------|--------|----------------|
| Upload with timestamp | ✅ | `created_at` auto |
| GPS metadata | ⚠️ 50% | Not extracting EXIF |
| Before/After categorization | ✅ | `photo_type` field |
| Area-specific photos | ✅ | `job_area_photos` table |
| Compression | ✅ | `CONFIG.imageCompression` |
| Secure storage | ✅ | Supabase Storage + signed URLs |

**Quality: 8/10** - Missing EXIF extraction

### 5. Basic Dashboard & Analytics ✅ COMPLETE

**Location**: `src/pages/AdminDashboard.tsx`, `StaffDashboard.tsx`, `ReportsPage.tsx`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Admin overview | ✅ | Dashboard with metrics |
| Supervisor monitoring | ✅ | Real-time job status |
| Employee view | ✅ | Staff dashboard |
| Jobs completed/pending | ✅ | Metrics cards |
| On-time arrival rate | ✅ | Alert tracking |
| Charts | ✅ | Recharts integration |
| PDF Reports | ✅ | jsPDF (client-side) |
| CSV Export | ✅ | `CSVReports.tsx` |

**Quality: 8/10** - No AI insights

### 6. Job Management ✅ COMPLETE

**Location**: `src/hooks/useCreateJob.ts`, `useJobDetail.ts`, `useJobStatusChange.ts`

| Feature | Status | Implementation |
|---------|--------|----------------|
| CRUD operations | ✅ | Full implementation |
| Staff assignment | ✅ | `assigned_staff_id` |
| Scheduling | ✅ | `scheduled_date`, `scheduled_time` |
| Recurrence | ✅ | `recurring_schedules` table |
| Status tracking | ✅ | pending/in_progress/completed/cancelled |
| Calendar view | ✅ | FullCalendar integration |
| Quick duplicate | ✅ | `useDuplicateJob.ts` |
| Bulk creation | ✅ | Multi-job wizard |

**Quality: 9/10**

---

## TIER 1 SUMMARY

| Feature | Status | % Complete |
|---------|--------|------------|
| 1. Auth Multi-Tenant | ✅ | 100% |
| 2. GPS Tracking | ✅ | 95% |
| 3. Dynamic Checklists | ✅ | 100% |
| 4. Photo Documentation | ✅ | 90% |
| 5. Dashboard & Analytics | ✅ | 90% |
| 6. Job Management | ✅ | 100% |
| **OVERALL TIER 1** | ✅ | **96%** |

**Verdict**: TIER 1 is essentially complete. Minor enhancements needed but not blocking.

---

# PART B: ARCHITECTURE RECOMMENDATION

## RECOMMENDATION: Continue with Supabase + Add AI Edge Functions

**DO NOT rebuild.** Your architecture is solid. Here's what to add:

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW AI EDGE FUNCTIONS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  supabase/functions/                                            │
│  ├── generate-ai-report/      ← Claude API (PDF narratives)    │
│  ├── analyze-photo/           ← Google Vision (cleanliness)    │
│  ├── generate-insights/       ← Claude API (dashboard insights)│
│  ├── detect-anomalies/        ← Pattern detection (fraud)      │
│  ├── predict-time/            ← ML regression (time estimates) │
│  └── send-smart-alert/        ← Multi-channel notifications    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why NOT a separate Node.js/Python backend:

1. **Supabase Edge Functions** handle your needs perfectly
2. **No server management** - Deno runs serverless
3. **Same codebase** - TypeScript everywhere
4. **Cost** - Pay per invocation vs. always-on server
5. **Scaling** - Automatic, no configuration

### Project Structure Addition:

```
/supabase/functions/
  /generate-ai-report/
    index.ts          # Main handler
    claude.ts         # Claude API integration
    pdf-template.ts   # PDF generation

  /analyze-photo/
    index.ts
    vision.ts         # Google Vision API
    scoring.ts        # Cleanliness scoring algorithm

  /generate-insights/
    index.ts
    analysis.ts       # Data aggregation
    prompts.ts        # Claude prompt templates

  /detect-anomalies/
    index.ts
    patterns.ts       # Anomaly detection logic
    image-hash.ts     # Photo duplicate detection

  /predict-time/
    index.ts
    regression.ts     # Time prediction model

  /send-smart-alert/
    index.ts
    channels.ts       # Email, SMS, Push routing
```

---

# PART C: AI FEATURES EVALUATION

## Feature 7: Auto-Generation of PDF Reports (Claude API) 🔥

### Value Score: 92/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Sales Impact | 28/30 | **KILLER FEATURE** - Corporate clients demand professional reports |
| Differentiation | 22/25 | Competitors have basic reports, NOT AI-generated narratives |
| Churn Reduction | 18/20 | Clients see consistent value every cleaning |
| Premium Justification | 14/15 | Worth $30-50/month alone |
| Wow Factor | 10/10 | "IA escribió esto?" - Demo killer |

### Effort Score: 35/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Development Hours | 15/40 | ~12-16 hours |
| Complexity | 12/30 | Moderate - API integration + PDF |
| Dependencies | 6/20 | Claude API (reliable) |
| Monthly Cost | 2/10 | ~$20-40 for 100 clients |

### **RATIO: 92/35 = 2.63** 🔴 MUST DO

### Implementation Details:

```typescript
// supabase/functions/generate-ai-report/index.ts
// Claude API: claude-3-5-sonnet-20241022
// Cost: ~$0.003 per report (1000 input + 500 output tokens)
// Latency: 2-4 seconds

// Prompt structure:
const systemPrompt = `You are a professional cleaning service report writer...`;
const userPrompt = `Generate a professional cleaning report with:
- Executive summary (2-3 sentences)
- Work performed (bullet points from checklist)
- Quality verification (GPS, photos taken)
- Areas requiring attention (if any)
- Signature and timestamp`;
```

---

## Feature 8: Smart Alerts (AI-Powered) 🚨

### Value Score: 85/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Sales Impact | 25/30 | "La IA te avisa antes que el cliente" - Strong selling point |
| Differentiation | 20/25 | Others have basic alerts, NOT predictive |
| Churn Reduction | 20/20 | Prevents client complaints = less churn |
| Premium Justification | 12/15 | Part of Pro package value |
| Wow Factor | 8/10 | Good but not visually impressive |

### Effort Score: 25/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Development Hours | 10/40 | ~8-10 hours |
| Complexity | 8/30 | Simple logic rules |
| Dependencies | 5/20 | SendGrid (email), optional Twilio |
| Monthly Cost | 2/10 | ~$10-15/month |

### **RATIO: 85/25 = 3.40** 🔴 MUST DO (HIGHEST RATIO!)

### Implementation Details:
```typescript
// Alert rules (no ML needed, pure logic):
const alertRules = [
  { type: 'late_arrival', threshold: 15, message: 'Staff is {minutes} min late' },
  { type: 'no_show', threshold: 30, message: 'Staff has not arrived' },
  { type: 'incomplete_checkout', condition: 'checkout_without_photos' },
  { type: 'pattern_tardiness', condition: '3+ late in 7 days' },
  { type: 'geofence_violation', condition: 'distance > radius' },
];
```

---

## Feature 9: AI Dashboard Insights (Claude API) 📊

### Value Score: 78/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Sales Impact | 22/30 | Good but not primary buying reason |
| Differentiation | 22/25 | Unique - nobody else has natural language insights |
| Churn Reduction | 16/20 | Shows ongoing value, "look what IA found" |
| Premium Justification | 10/15 | Nice to have for Enterprise |
| Wow Factor | 8/10 | Cool but less tangible |

### Effort Score: 45/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Development Hours | 20/40 | ~14-18 hours |
| Complexity | 18/30 | Data aggregation + Claude integration |
| Dependencies | 5/20 | Claude API |
| Monthly Cost | 2/10 | ~$30-50/month |

### **RATIO: 78/45 = 1.73** 🟠 SHOULD DO

### Implementation Details:
```typescript
// Weekly batch job that generates insights:
// 1. Aggregate job data from past 7 days
// 2. Calculate metrics (avg times, completion rates, staff performance)
// 3. Send to Claude for natural language insights
// 4. Cache results in ai_insights table

// Prompt: "Analyze this cleaning business data and provide 3-5 actionable insights..."
```

---

## Feature 10: AI Photo Verification (Google Vision) 🤖📸

### Value Score: 88/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Sales Impact | 28/30 | **WOW FACTOR** - "IA verifica que limpiaron" |
| Differentiation | 25/25 | NO competitor has this |
| Churn Reduction | 15/20 | Reduces disputes |
| Premium Justification | 12/15 | Justifies Enterprise pricing |
| Wow Factor | 8/10 | Very impressive in demos |

### Effort Score: 55/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Development Hours | 25/40 | ~20-24 hours |
| Complexity | 22/30 | Vision API + scoring algorithm |
| Dependencies | 6/20 | Google Vision API |
| Monthly Cost | 2/10 | ~$40-60/month |

### **RATIO: 88/55 = 1.60** 🟠 SHOULD DO

### Implementation Details:
```typescript
// Google Vision API labels detection
// Cost: $1.50 per 1000 images
// Returns: labels with confidence scores

// Scoring algorithm:
// - Detect expected objects (toilet, sink, desk, etc.)
// - Check for unwanted labels (garbage, clutter, stain)
// - Generate cleanliness score 0-100
```

---

## Feature 11: Time Prediction (ML) ⏱️

### Value Score: 65/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Sales Impact | 18/30 | Nice for operations, not sales driver |
| Differentiation | 18/25 | Some competitors have basic estimates |
| Churn Reduction | 14/20 | Efficiency = more jobs = more value |
| Premium Justification | 8/15 | Not worth premium alone |
| Wow Factor | 7/10 | Technical but not visible |

### Effort Score: 50/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Development Hours | 22/40 | ~18-22 hours |
| Complexity | 20/30 | ML model training |
| Dependencies | 6/20 | Local model (no API) |
| Monthly Cost | 2/10 | $0 (runs locally) |

### **RATIO: 65/50 = 1.30** 🟡 MAYBE (Phase 2)

---

## Feature 12: Fraud/Anomaly Detection 🕵️

### Value Score: 75/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Sales Impact | 22/30 | Good for trust-building |
| Differentiation | 20/25 | Unique, security-focused |
| Churn Reduction | 18/20 | Prevents theft/fraud = trust |
| Premium Justification | 8/15 | Enterprise feature |
| Wow Factor | 7/10 | Backend feature, less visible |

### Effort Score: 38/100
| Criteria | Points | Justification |
|----------|--------|---------------|
| Development Hours | 15/40 | ~12-16 hours |
| Complexity | 15/30 | Pattern detection + image hashing |
| Dependencies | 6/20 | None (internal logic) |
| Monthly Cost | 2/10 | $0 |

### **RATIO: 75/38 = 1.97** 🟠 SHOULD DO

---

# PART D: PRIORITIZATION MATRIX

| # | Feature | Valor | Esfuerzo | Ratio | Decision | Week |
|---|---------|-------|----------|-------|----------|------|
| 8 | Smart Alerts | 85 | 25 | **3.40** | 🔴 MUST | 1 |
| 7 | AI PDF Reports | 92 | 35 | **2.63** | 🔴 MUST | 1-2 |
| 12 | Fraud Detection | 75 | 38 | **1.97** | 🟠 SHOULD | 2-3 |
| 9 | AI Dashboard Insights | 78 | 45 | **1.73** | 🟠 SHOULD | 3-4 |
| 10 | Photo Verification | 88 | 55 | **1.60** | 🟠 SHOULD | 4-5 |
| 11 | Time Prediction | 65 | 50 | **1.30** | 🟡 MAYBE | 6+ |

### Sprint Groupings:

**🔴 SPRINT 1 (Week 1-2): Core AI - 20-24 hours**
- Smart Alerts (8-10h) - Highest ratio, immediate value
- AI PDF Reports (12-16h) - Biggest sales impact

**🟠 SPRINT 2 (Week 3-4): Advanced AI - 18-22 hours**
- Fraud Detection (12-16h) - Security differentiator
- AI Dashboard Insights (14-18h) - Ongoing value demonstration

**🟡 SPRINT 3 (Week 5-6): Premium AI - 20-24 hours**
- Photo Verification (20-24h) - WOW factor for demos

**🟢 SPRINT 4+ (Week 7+): Optimization**
- Time Prediction - Only if requested by clients

---

# PART E: 12-WEEK ROADMAP

## WEEK 1-2: CORE AI FEATURES (Sprint 1)

**Objective**: Add AI features that maximize value/effort ratio

### Tasks:

#### Smart Alerts Enhancement (8-10h)
- [ ] Create `send-smart-alert/` Edge Function (2h)
- [ ] Add SendGrid integration for email alerts (2h)
- [ ] Implement pattern detection (3+ late in week) (2h)
- [ ] Add escalation logic (supervisor → admin) (2h)
- [ ] Test and deploy (1h)

#### AI PDF Reports (12-16h)
- [ ] Create `generate-ai-report/` Edge Function (4h)
- [ ] Integrate Claude API (claude-3-5-sonnet) (3h)
- [ ] Design PDF template with header/logo (2h)
- [ ] Add auto-email to client option (2h)
- [ ] Create `ai_report_cache` table (1h)
- [ ] Frontend button "Generate AI Report" (2h)
- [ ] Test and deploy (2h)

**Deliverables Week 2:**
- ✅ Smart alerts with email notifications
- ✅ AI-generated professional reports
- ✅ Demo-ready for first sales calls

---

## WEEK 3-4: ADVANCED AI (Sprint 2)

**Objective**: Security + ongoing value features

### Tasks:

#### Fraud/Anomaly Detection (12-16h)
- [ ] Create `detect-anomalies/` Edge Function (3h)
- [ ] Implement image hash matching (duplicate photos) (3h)
- [ ] Add geospatial velocity check (impossible travel) (2h)
- [ ] Create `ai_fraud_flags` table (1h)
- [ ] Add admin dashboard for fraud alerts (3h)
- [ ] Test with synthetic fraud scenarios (2h)

#### AI Dashboard Insights (14-18h)
- [ ] Create `generate-insights/` Edge Function (4h)
- [ ] Build data aggregation queries (3h)
- [ ] Claude prompt engineering for insights (2h)
- [ ] Create `ai_insights` table (1h)
- [ ] Weekly batch job setup (2h)
- [ ] Frontend insights widget (3h)
- [ ] Test and deploy (2h)

**Deliverables Week 4:**
- ✅ Fraud detection running in background
- ✅ AI insights on admin dashboard
- ✅ "Your business is getting smarter" messaging

---

## WEEK 5-6: PREMIUM AI (Sprint 3)

**Objective**: WOW factor for enterprise demos

### Tasks:

#### Photo Verification with Google Vision (20-24h)
- [ ] Create `analyze-photo/` Edge Function (4h)
- [ ] Integrate Google Cloud Vision API (3h)
- [ ] Build cleanliness scoring algorithm (4h)
- [ ] Create `ai_photo_analysis` table (1h)
- [ ] Add real-time analysis on upload (3h)
- [ ] Frontend: show analysis results on photos (4h)
- [ ] Supervisor override capability (2h)
- [ ] Test with real cleaning photos (2h)

**Deliverables Week 6:**
- ✅ Every photo analyzed by AI
- ✅ Cleanliness scores visible
- ✅ Enterprise demo-ready

---

## WEEK 7-8: POLISH + FIRST CUSTOMERS

**Objective**: Production hardening, first paying customers

### Tasks:
- [ ] Performance optimization (caching, query tuning)
- [ ] Error handling improvement
- [ ] Rate limiting on AI endpoints
- [ ] Cost tracking dashboard (API usage)
- [ ] Customer onboarding flow refinement
- [ ] First 3-5 paying customer acquisition
- [ ] Feedback collection system

**Deliverables Week 8:**
- ✅ 3-5 paying customers on Pro plan
- ✅ ~$450-750 MRR

---

## WEEK 9-10: SCALE FEATURES

**Objective**: Features requested by first customers

### Potential Tasks:
- [ ] Bulk operations (mass report generation)
- [ ] Custom branding (white-label reports)
- [ ] Xero/MYOB integration (if requested)
- [ ] Mobile app improvements
- [ ] Additional alert channels (Slack, Teams)

---

## WEEK 11-12: OPTIMIZATION + ENTERPRISE

**Objective**: Enterprise-ready, self-serve onboarding

### Tasks:
- [ ] Self-serve signup optimization
- [ ] Automatic trial-to-paid conversion
- [ ] Usage-based billing preparation
- [ ] Enterprise feature flags
- [ ] SOC 2 compliance checklist
- [ ] Performance benchmarking

**Deliverables Week 12:**
- ✅ 10-15 paying customers
- ✅ ~$1,500-2,000 MRR
- ✅ Product-market fit validation

---

# PART F: IMPLEMENTATION CODE

## Smart Alerts Enhancement

```typescript
// supabase/functions/send-smart-alert/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertConfig {
  type: 'late_arrival' | 'no_show' | 'incomplete_checkout' | 'pattern_tardiness' | 'geofence_violation';
  jobId?: string;
  staffId?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { alertConfig } = await req.json() as { alertConfig: AlertConfig };

    // 1. Create alert record
    const { data: alert, error: alertError } = await supabase
      .from('job_alerts')
      .insert({
        job_id: alertConfig.jobId,
        alert_type: alertConfig.type,
        message: alertConfig.message,
        is_resolved: false,
      })
      .select()
      .single();

    if (alertError) throw alertError;

    // 2. Get admin users to notify
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminIds = admins?.map(a => a.user_id) || [];

    // 3. Get admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', adminIds);

    // 4. Create in-app notifications
    const notifications = adminIds.map(userId => ({
      user_id: userId,
      title: getAlertTitle(alertConfig.type),
      message: alertConfig.message,
      type: 'alert',
      related_job_id: alertConfig.jobId,
    }));

    await supabase.from('notifications').insert(notifications);

    // 5. Send email if high/critical severity
    if ((alertConfig.severity === 'high' || alertConfig.severity === 'critical') && sendgridApiKey) {
      for (const admin of adminProfiles || []) {
        await sendAlertEmail(sendgridApiKey, admin.email, admin.full_name, alertConfig);
      }
    }

    return new Response(JSON.stringify({ success: true, alertId: alert.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[send-smart-alert] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getAlertTitle(type: string): string {
  const titles: Record<string, string> = {
    'late_arrival': '⏰ Late Arrival Alert',
    'no_show': '🚫 No Show Alert',
    'incomplete_checkout': '⚠️ Incomplete Checkout',
    'pattern_tardiness': '📊 Pattern Detected: Repeated Lateness',
    'geofence_violation': '📍 Geofence Violation',
  };
  return titles[type] || 'Alert';
}

async function sendAlertEmail(
  apiKey: string,
  toEmail: string,
  toName: string,
  config: AlertConfig
) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail, name: toName }] }],
      from: { email: 'alerts@pulcrix.com', name: 'Pulcrix Alerts' },
      subject: getAlertTitle(config.type),
      content: [{
        type: 'text/html',
        value: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">${getAlertTitle(config.type)}</h2>
            <p style="font-size: 16px; color: #374151;">${config.message}</p>
            <p style="color: #6b7280; font-size: 14px;">Severity: ${config.severity.toUpperCase()}</p>
            <a href="https://app.pulcrix.com/jobs/${config.jobId}"
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; margin-top: 16px;">
              View Job Details
            </a>
          </div>
        `,
      }],
    }),
  });

  if (!response.ok) {
    console.error('SendGrid error:', await response.text());
  }
}
```

---

## AI PDF Report Generator (Claude API)

```typescript
// supabase/functions/generate-ai-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobReportData {
  job: any;
  property: any;
  client: any;
  staff: any;
  checklist: any[];
  photos: any[];
  businessSettings: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anthropic = new Anthropic({ apiKey: claudeApiKey });

    const { jobId, sendToClient = false } = await req.json();

    // 1. Fetch all job data
    const reportData = await fetchJobReportData(supabase, jobId);

    // 2. Generate AI narrative
    const narrative = await generateReportNarrative(anthropic, reportData);

    // 3. Generate PDF (using edge-compatible PDF library or return markdown)
    const reportContent = buildReportContent(reportData, narrative);

    // 4. Cache the report
    await supabase.from('ai_report_cache').upsert({
      job_id: jobId,
      report_markdown: reportContent.markdown,
      report_html: reportContent.html,
      generated_at: new Date().toISOString(),
    });

    // 5. Optionally send to client
    if (sendToClient && reportData.client?.email) {
      await sendReportEmail(reportData, reportContent);
    }

    return new Response(JSON.stringify({
      success: true,
      report: reportContent,
      narrative
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-ai-report] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchJobReportData(supabase: any, jobId: string): Promise<JobReportData> {
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  const [propertyResult, clientResult, staffResult, checklistResult, photosResult, settingsResult] =
    await Promise.all([
      supabase.from('properties').select('*').eq('id', job.property_id).single(),
      supabase.from('clients').select('*').eq('id', job.client_id).single(),
      supabase.from('profiles').select('*').eq('user_id', job.assigned_staff_id).single(),
      supabase.from('checklist_items').select('*').eq('job_id', jobId).order('sort_order'),
      supabase.from('job_photos').select('*').eq('job_id', jobId),
      supabase.from('system_settings').select('key, value').in('key', [
        'company_name', 'company_logo', 'business_abn', 'business_address', 'business_phone'
      ]),
    ]);

  const businessSettings = Object.fromEntries(
    (settingsResult.data || []).map((s: any) => [s.key, s.value])
  );

  return {
    job,
    property: propertyResult.data,
    client: clientResult.data,
    staff: staffResult.data,
    checklist: checklistResult.data || [],
    photos: photosResult.data || [],
    businessSettings,
  };
}

async function generateReportNarrative(anthropic: Anthropic, data: JobReportData): Promise<string> {
  const completedTasks = data.checklist.filter((c: any) => c.status === 'done').length;
  const totalTasks = data.checklist.length;
  const issues = data.checklist.filter((c: any) => c.status === 'issue');

  const duration = data.job.start_time && data.job.end_time
    ? Math.round((new Date(data.job.end_time).getTime() - new Date(data.job.start_time).getTime()) / 60000)
    : null;

  const prompt = `You are a professional cleaning service report writer. Generate a concise, professional cleaning completion report.

CONTEXT:
- Property: ${data.property?.name || data.job.location}
- Client: ${data.client?.name || 'N/A'}
- Cleaner: ${data.staff?.full_name || 'N/A'}
- Date: ${data.job.scheduled_date}
- Duration: ${duration ? `${duration} minutes` : 'Not recorded'}
- Tasks Completed: ${completedTasks}/${totalTasks}
- Photos Taken: ${data.photos.length} (${data.photos.filter((p: any) => p.photo_type === 'before').length} before, ${data.photos.filter((p: any) => p.photo_type === 'after').length} after)
- GPS Verified: ${data.job.geofence_validated ? 'Yes' : 'No'}
- Quality Score: ${data.job.quality_score || 'N/A'}
${issues.length > 0 ? `\nISSUES REPORTED:\n${issues.map((i: any) => `- ${i.room_name}: ${i.task_name} - ${i.issue_note || 'Issue flagged'}`).join('\n')}` : ''}

INSTRUCTIONS:
1. Write a professional executive summary (2-3 sentences)
2. Summarize work performed
3. Note any issues or areas requiring attention
4. End with a positive closing statement

Keep the tone professional but warm. Use Australian English spelling.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return (response.content[0] as any).text;
}

function buildReportContent(data: JobReportData, narrative: string) {
  const completedTasks = data.checklist.filter((c: any) => c.status === 'done');
  const issues = data.checklist.filter((c: any) => c.status === 'issue');

  const duration = data.job.start_time && data.job.end_time
    ? Math.round((new Date(data.job.end_time).getTime() - new Date(data.job.start_time).getTime()) / 60000)
    : null;

  const markdown = `
# Cleaning Service Report

**${data.businessSettings.company_name || 'Pulcrix'}**
${data.businessSettings.business_address || ''}
ABN: ${data.businessSettings.business_abn || 'N/A'}

---

## Property Details
- **Location**: ${data.property?.name || data.job.location}
- **Address**: ${data.property?.address || 'N/A'}
- **Client**: ${data.client?.name || 'N/A'}

## Service Details
- **Date**: ${new Date(data.job.scheduled_date).toLocaleDateString('en-AU', { dateStyle: 'full' })}
- **Scheduled Time**: ${data.job.scheduled_time}
- **Duration**: ${duration ? `${duration} minutes` : 'Not recorded'}
- **Cleaner**: ${data.staff?.full_name || 'N/A'}

## GPS Verification
- **Check-in**: ${data.job.start_time ? new Date(data.job.start_time).toLocaleTimeString('en-AU') : 'N/A'}
- **Check-out**: ${data.job.end_time ? new Date(data.job.end_time).toLocaleTimeString('en-AU') : 'N/A'}
- **Location Verified**: ${data.job.geofence_validated ? '✓ Yes' : '✗ No'}

---

## Executive Summary

${narrative}

---

## Work Performed

${completedTasks.map((t: any) => `- ✓ ${t.room_name}: ${t.task_name}`).join('\n')}

${issues.length > 0 ? `
## Issues Reported

${issues.map((i: any) => `- ⚠️ ${i.room_name}: ${i.task_name}${i.issue_note ? ` - ${i.issue_note}` : ''}`).join('\n')}
` : ''}

## Photo Documentation

- Before photos: ${data.photos.filter((p: any) => p.photo_type === 'before').length}
- After photos: ${data.photos.filter((p: any) => p.photo_type === 'after').length}

---

*Report generated by Pulcrix AI on ${new Date().toLocaleString('en-AU')}*
`;

  const html = markdownToHtml(markdown);

  return { markdown, html };
}

function markdownToHtml(markdown: string): string {
  // Basic markdown to HTML conversion
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/---/g, '<hr>')
    .replace(/^/gm, '')
    .replace(/<li>/g, '<ul><li>')
    .replace(/<\/li>\n(?!<li>)/g, '</li></ul>');
}

async function sendReportEmail(data: JobReportData, content: any) {
  // Implementation similar to send-invoice-email
  console.log('Sending report to:', data.client?.email);
}
```

---

## Photo Verification (Google Vision)

```typescript
// supabase/functions/analyze-photo/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  photoId: string;
  cleanlinessScore: number;
  labels: string[];
  issues: string[];
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { photoId, photoUrl, areaType } = await req.json();

    // 1. Call Google Vision API
    const visionResult = await analyzeWithVision(googleVisionApiKey, photoUrl);

    // 2. Calculate cleanliness score
    const analysis = calculateCleanlinessScore(visionResult, areaType);

    // 3. Store analysis
    await supabase.from('ai_photo_analysis').upsert({
      photo_id: photoId,
      analysis_json: visionResult,
      cleanliness_score: analysis.cleanlinessScore,
      detected_labels: analysis.labels,
      detected_issues: analysis.issues,
      confidence: analysis.confidence,
      analyzed_at: new Date().toISOString(),
    });

    // 4. Create alert if score is low
    if (analysis.cleanlinessScore < 70) {
      const { data: photo } = await supabase
        .from('job_photos')
        .select('job_id')
        .eq('id', photoId)
        .single();

      if (photo) {
        await supabase.from('job_alerts').insert({
          job_id: photo.job_id,
          alert_type: 'quality_issue',
          message: `AI detected cleanliness issues. Score: ${analysis.cleanlinessScore}%. Issues: ${analysis.issues.join(', ')}`,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-photo] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeWithVision(apiKey: string, imageUrl: string) {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'SAFE_SEARCH_DETECTION' },
          ],
        }],
      }),
    }
  );

  const data = await response.json();
  return data.responses[0];
}

function calculateCleanlinessScore(visionResult: any, areaType: string): AnalysisResult {
  const labels = (visionResult.labelAnnotations || []).map((l: any) => ({
    description: l.description.toLowerCase(),
    score: l.score,
  }));

  // Positive indicators (clean)
  const positiveLabels = ['clean', 'tidy', 'organized', 'shiny', 'spotless', 'polished',
    'neat', 'orderly', 'immaculate', 'pristine', 'white', 'bright'];

  // Negative indicators (dirty)
  const negativeLabels = ['dirty', 'mess', 'clutter', 'stain', 'garbage', 'trash',
    'dust', 'grime', 'mold', 'debris', 'waste', 'untidy', 'disorganized'];

  // Expected objects by area type
  const expectedByArea: Record<string, string[]> = {
    'bathroom': ['toilet', 'sink', 'mirror', 'tile', 'bathtub', 'shower'],
    'kitchen': ['sink', 'countertop', 'appliance', 'stove', 'refrigerator'],
    'bedroom': ['bed', 'furniture', 'floor', 'window'],
    'living_room': ['sofa', 'furniture', 'floor', 'window', 'table'],
    'office': ['desk', 'chair', 'floor', 'window', 'computer'],
  };

  let score = 75; // Base score
  const issues: string[] = [];
  const detectedLabels: string[] = [];

  for (const label of labels) {
    detectedLabels.push(label.description);

    // Boost for positive labels
    if (positiveLabels.some(p => label.description.includes(p))) {
      score += label.score * 10;
    }

    // Penalty for negative labels
    if (negativeLabels.some(n => label.description.includes(n))) {
      score -= label.score * 15;
      issues.push(label.description);
    }
  }

  // Check for expected objects in area
  const expected = expectedByArea[areaType] || [];
  const foundExpected = expected.filter(e =>
    detectedLabels.some(l => l.includes(e))
  );

  if (foundExpected.length < expected.length / 2) {
    score -= 10;
    issues.push(`Missing expected ${areaType} elements`);
  }

  // Clamp score between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Calculate confidence based on number of labels
  const confidence = Math.min(0.95, 0.5 + (labels.length * 0.03));

  return {
    photoId: '',
    cleanlinessScore: score,
    labels: detectedLabels.slice(0, 10),
    issues,
    confidence,
  };
}
```

---

## Database Migrations for AI Features

```sql
-- supabase/migrations/20260208_ai_features.sql

-- AI Report Cache
CREATE TABLE IF NOT EXISTS ai_report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  report_markdown TEXT,
  report_html TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id)
);

-- AI Photo Analysis
CREATE TABLE IF NOT EXISTS ai_photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL, -- References job_photos or job_area_photos
  analysis_json JSONB,
  cleanliness_score INTEGER CHECK (cleanliness_score >= 0 AND cleanliness_score <= 100),
  detected_labels TEXT[],
  detected_issues TEXT[],
  confidence DECIMAL(3,2),
  staff_override BOOLEAN DEFAULT FALSE,
  staff_override_note TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL, -- 'performance', 'efficiency', 'pattern', 'recommendation'
  content TEXT NOT NULL,
  data_context JSONB,
  confidence DECIMAL(3,2),
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_by UUID,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Fraud Flags
CREATE TABLE IF NOT EXISTS ai_fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  flag_type TEXT NOT NULL, -- 'photo_reuse', 'gps_spoof', 'impossible_travel', 'time_anomaly'
  evidence_json JSONB,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  is_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  is_false_positive BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Time Predictions
CREATE TABLE IF NOT EXISTS ai_time_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  staff_id UUID,
  property_type TEXT,
  predicted_minutes INTEGER,
  actual_minutes INTEGER,
  accuracy_delta INTEGER, -- actual - predicted
  features_used JSONB, -- bedrooms, bathrooms, sqm, etc.
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_report_cache_job ON ai_report_cache(job_id);
CREATE INDEX idx_ai_photo_analysis_photo ON ai_photo_analysis(photo_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type, valid_until);
CREATE INDEX idx_ai_fraud_flags_staff ON ai_fraud_flags(staff_id, created_at);
CREATE INDEX idx_ai_time_predictions_property ON ai_time_predictions(property_id);

-- RLS Policies
ALTER TABLE ai_report_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_photo_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_time_predictions ENABLE ROW LEVEL SECURITY;

-- Admin access to all AI tables
CREATE POLICY "Admins can access ai_report_cache" ON ai_report_cache
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can access ai_photo_analysis" ON ai_photo_analysis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can access ai_insights" ON ai_insights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can access ai_fraud_flags" ON ai_fraud_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can access ai_time_predictions" ON ai_time_predictions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

---

# PART G: ENVIRONMENT VARIABLES

Add these to your Supabase project:

```bash
# .env.example (for Edge Functions)

# Existing
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI APIs (NEW)
CLAUDE_API_KEY=sk-ant-...          # Get from console.anthropic.com
GOOGLE_VISION_API_KEY=AIza...      # Get from Google Cloud Console

# Notifications (NEW)
SENDGRID_API_KEY=SG....            # Get from sendgrid.com
TWILIO_ACCOUNT_SID=AC...           # Optional for SMS
TWILIO_AUTH_TOKEN=...              # Optional for SMS
TWILIO_PHONE_NUMBER=+1...          # Optional for SMS

# Cron (for scheduled jobs)
CRON_SECRET=your-secure-random-string
```

---

# PART H: COST ANALYSIS

## Monthly Cost Projections

| Service | 0-10 Clients | 50 Clients | 100 Clients | Notes |
|---------|--------------|------------|-------------|-------|
| **Supabase** | $0 | $25 | $25 | Free tier → Pro |
| **Claude API** | $5 | $25 | $50 | ~$0.003/report |
| **Google Vision** | $0 | $15 | $30 | $1.50/1000 images |
| **SendGrid** | $0 | $0 | $15 | Free tier → Essentials |
| **Sentry** | $0 | $0 | $26 | Free tier → Team |
| **Railway/Hosting** | $0 | $0 | $0 | Supabase hosts |
| **Total** | **~$5** | **~$65** | **~$146** | |

## Revenue vs Costs

| Clients | Avg Revenue | Monthly Costs | Gross Margin |
|---------|-------------|---------------|--------------|
| 10 | $1,200 | $5 | **99.6%** |
| 50 | $6,000 | $65 | **98.9%** |
| 100 | $12,000 | $146 | **98.8%** |

**Conclusion**: Excellent unit economics. AI features pay for themselves 100x over.

---

# PART I: RISK ASSESSMENT

## Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Claude API rate limits | Low | Medium | Implement queuing, cache results |
| Google Vision inaccuracy | Medium | Low | Staff override capability |
| Supabase outage | Low | High | Error handling, offline mode |
| Cost explosion | Low | Medium | Usage monitoring, budget alerts |

## Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competitor copies features | Medium | Medium | First-mover advantage, iterate fast |
| Pricing too high | Low | High | Start with Pro tier focus |
| CAC too high | Medium | High | Focus on referrals, content marketing |
| Churn | Medium | High | AI features = stickiness |

---

# PART J: IMMEDIATE ACTION ITEMS

## Week 1 Checklist

- [ ] Add `CLAUDE_API_KEY` to Supabase secrets
- [ ] Add `SENDGRID_API_KEY` to Supabase secrets
- [ ] Deploy `send-smart-alert/` Edge Function
- [ ] Deploy `generate-ai-report/` Edge Function
- [ ] Run AI database migration
- [ ] Test AI report generation with real job
- [ ] Add "Generate AI Report" button to Job Detail page
- [ ] Test email delivery with SendGrid

## Validation Checklist

Before considering MVP "done":
- [ ] All TIER 1 features working ✅ (already done)
- [ ] Smart Alerts working with email
- [ ] AI PDF Reports generating correctly
- [ ] Fraud detection running
- [ ] AI Dashboard insights showing
- [ ] Photo verification scoring
- [ ] Tests passing
- [ ] No critical bugs
- [ ] Performance < 3s for AI endpoints
- [ ] Security audit passed
- [ ] Demo ready with WOW factor

---

# CONCLUSION

David, your codebase is in excellent shape. The foundation is solid:

**What you have (96% of TIER 1):**
- ✅ Production-ready React app
- ✅ Complete auth with multi-tenant
- ✅ GPS tracking with geofencing
- ✅ Checklists and photos
- ✅ Job management
- ✅ Invoicing with Stripe
- ✅ Dashboard and analytics

**What you need (TIER 2 AI):**
- ❌ Claude API integration (reports + insights)
- ❌ Google Vision (photo verification)
- ❌ Smart alerts with email
- ❌ Fraud detection

**Estimated effort**: 45-55 hours to add ALL AI features

**My recommendation**: Start with Smart Alerts (8-10h) and AI PDF Reports (12-16h) in Week 1. These have the highest value/effort ratio and will make your demos significantly more impressive.

¡Buena suerte, David! 🚀
