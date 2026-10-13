# App Flow — Punjab Industrial Survey

**Government of the Punjab · Directorate General of Industries**

---

## System Roles

| Role | What they do |
|---|---|
| **Surveyor** | Goes to industrial sites, fills in the 11-section questionnaire offline, syncs when back in range |
| **Supervisor** | Reviews synced unit records, approves or rejects them |
| **DB Admin** | Manages users, assigns roles |

---

## High-Level Flow

```
Surveyor                    Mobile App (PWA)              Backend API          Database
────────                    ────────────────              ────────────         ────────
Login ──────────────────→  POST /auth/login ────────────→ Verify bcrypt    → users
                           Store JWT in localStorage        Return JWT + permissions

Download Form ──────────→  GET /survey-forms/active ─────→ Load 296 Qs    → survey_questions
                           Save to IndexedDB                Return JSON           survey_sections
                                                                                  survey_forms

Fill Survey (offline) ──→  SurveyPage                    [offline — no network]
                           11 sections, skip logic
                           GPS capture, photos
                           Save to IndexedDB as draft

Submit Survey (offline) →  IndexedDB → pending_sync      [offline — no network]

Sync ───────────────────→  POST /sync ──────────────────→ Duplicate check  → industrial_units
                           Batch upload all pending         Create unit         survey_responses
                           responses                        Save answers        survey_answers
                           Update local statuses            Return results      duplicate_flags
                                                                                sync_log

Supervisor reviews ─────→  GET /industrial-units ────────→ List unverified  → industrial_units
                           POST /industrial-units/:id/approve                   unit_approval_log
                           POST /industrial-units/:id/reject
```

---

## Screen-by-Screen Flow

### 1. Login Screen (`/login`)

```
User opens app
    ↓
Already has JWT in localStorage?
    ├── YES → redirect to /dashboard
    └── NO  → show login form

User enters username + password
    ↓
POST /auth/login
    ├── Success → store token + user in localStorage → /dashboard
    └── Fail    → show error message
```

**Quick Login** (dev only) shows preset buttons for `surveyor1`, `supervisor1`, `admin`.

---

### 2. Dashboard (`/dashboard`)

Loads on every login. Shows:

```
┌─────────────────────────────────────────┐
│  Hello, [FirstName] 👋                 │
│  Role: Surveyor                         │
│  Form v2.0 ready · 296 questions        │
├─────────────────────────────────────────┤
│  Total | Synced | Pending | Draft       │
│    3   |   1    |    1    |   1         │
├─────────────────────────────────────────┤
│  Quick Actions                          │
│  ➕ Start New Survey                    │
│  ↻  Sync Pending Responses (1)          │
│  ✓  Review Units (supervisor only)     │
│  ⬇  Refresh Survey Form               │
├─────────────────────────────────────────┤
│  Recent Surveys                         │
│  🏭 ABC Textiles    pending sync        │
│  🏭 XYZ Mills       synced             │
└─────────────────────────────────────────┘
```

On load: auto-fetches latest form from server if online. If cached version is old (`!= 2.0`) it force-refreshes.

---

### 3. Survey Flow (`/surveys/new` or `/surveys/:id`)

```
App opens SurveyPage
    ↓
No form in cache?
    └── Show "Download form first" → redirect to Dashboard

Form loaded → show section A (default)

┌──────────────────────────────────────────────────┐
│  ← Back   Punjab Industrial Unit Survey   💾 Draft│
│  Progress: ████████░░░░ 38%  (15/40 mandatory)   │
│                                                    │
│  [A] [B] [C] [D] [E] [F] [G] [H] [I] [J] [K]   │
│   ↑ horizontal scroll strip (A=current, blue)    │
│  1/11  Section A: Establishment Identity          │
├──────────────────────────────────────────────────┤
│  HDR.GPS  ★ Required                             │
│  Geotag Location                                  │
│  [📍 Capture GPS Location]                       │
│                                                    │
│  HDR.P1  ★ Required                              │
│  Photo: Interview Session                         │
│  [📷 Tap to capture]                              │
│                                                    │
│  A.1  ★ Required                                 │
│  Name of Establishment                            │
│  [________________]                               │
│  ...                                              │
├──────────────────────────────────────────────────┤
│  ← Prev         1/11         Next →              │
└──────────────────────────────────────────────────┘
```

#### Section Navigation

- **Section strip** at top: 11 colour-coded tiles (A–K)
  - Blue = current
  - Green = all mandatory answered
  - Orange = partially answered
  - Grey = not started
- Tapping any tile jumps directly to that section
- Active tile auto-scrolls into view

#### Question Types Rendered

| Type | UI Control |
|---|---|
| text | Text input |
| number | Numeric input with min/max hint |
| date | Date picker |
| select | Dropdown with options |
| multiselect | Checkbox list with highlight |
| boolean | Sliding toggle (Yes/No) |
| gps | GPS capture button → shows coordinates |
| photo | Camera/file upload → shows preview |

#### Skip Logic

Evaluated in real-time as answers change. Examples:
- A.8x (specify zone) only appears when A.8 = "Other"
- B.2 (closure reason) only appears when B.1 = "Temporarily Closed" or "Permanently Closed"
- G.4 (underutilization reasons) only appears when G.3 is below 75%
- J.6/J.7 (upscaling readiness) only appears when J.5 ≠ "No expansion plans currently"

#### Save & Submit

```
💾 Draft button (top right)
    → saveResponse(answers, status='draft') to IndexedDB
    → "✓ Saved" flash for 2 seconds

✅ Submit Survey button (last section only)
    → validateSection() — checks all mandatory visible questions
    → if errors: scroll to top, highlight missing fields
    → if valid: saveResponse(answers, status='pending_sync') to IndexedDB
    → navigate to /surveys
```

---

### 4. Survey List (`/surveys`)

Shows all local responses from IndexedDB, grouped by status filter.

```
Filter: [All] [Draft] [Pending Sync] [Synced] [Failed]

🏭 ABC Textiles              [pending sync]  [Edit]  [🗑️]
   15/09/2026 · 45 answers · 📍 GPS captured

🏭 XYZ Engineering           [synced]
   14/09/2026 · 52 answers · 📍 GPS captured
```

- **Edit** button: visible only for `draft` and `failed` status
- **Delete** button: visible for all except `synced`
- Delete shows confirmation modal before removing from IndexedDB

---

### 5. Sync Page (`/sync`)

```
● Online — 2 responses ready to sync

┌──────────┬──────────┬──────────┬──────────┐
│  Total   │ Pending  │  Synced  │  Failed  │
│    5     │    2     │    3     │    0     │
└──────────┴──────────┴──────────┴──────────┘

         📤 2 responses ready to upload
         [🔄 Sync Now]

After sync:
         ┌───────────────────────────────┐
         │ Last Sync Results     success │
         │ abc123… ✓ synced             │
         │ def456… ⚠ duplicate flagged  │
         └───────────────────────────────┘

Sync History:
Date          Sync ID  Records  Status
15/09/2026    42       2        success
14/09/2026    41       1        success
```

#### Sync Process Detail

```
1. Read all pending_sync responses from IndexedDB
2. Build payload: { device_id, responses: [...] }
   - GPS coords from response header, fallback to answer question_id=1
3. POST /sync with Authorization: Bearer <token>
4. For each result in response:
   - 'synced'            → update local to 'synced'
   - 'duplicate_flagged' → update local to 'synced' (supervisor holds it)
   - 'failed'            → update local to 'failed'
5. Save sync log entry to IndexedDB
6. Refresh response counts
```

---

### 6. Supervisor Page (`/supervisor`)

Only accessible to roles with `UNIT_APPROVE` permission.

```
Approval Queue               [🔄 Refresh]
3 units pending review

Filter: [All] [Pending ●3] [Verified]

┌─────────────────────────────────────────────────┐
│ ABC Textiles Ltd           [Pending]  [Review →]│
│ PK-PB-LHR-12345 · Privately Owned · Unverified  │
│ 15/09/2026                                       │
└─────────────────────────────────────────────────┘
```

#### Unit Detail & Approval (`/supervisor/units/:id`)

```
← Back    ABC Textiles Ltd    [Unverified]

Unit Details
┌─────────────────────────────────────────┐
│ Unit Code        PK-PB-LHR-12345        │
│ Ownership Type   Privately Owned        │
│ Status           Unverified             │
│ GPS Accuracy     ±8m                    │
│ Province         Province 1             │
│ District         District 1             │
│ Created At       15/09/2026 14:32       │
│ Verified         No                     │
└─────────────────────────────────────────┘

Review Action
[✅ Approve Unit]    [❌ Reject Unit]

→ On click: shows remarks textarea
→ Confirm Approve:
   PATCH /industrial-units/:id/approve { remarks }
   unit.is_verified = true, operational_status = 'Active'
   unit_approval_log row created

→ Confirm Reject:
   PATCH /industrial-units/:id/reject { remarks }
   unit stays Unverified, unit_approval_log row created
```

---

### 7. Admin Page (`/admin`)

Only visible to `DB Admin` role (USER_MANAGE permission).

```
⚙️ Admin Panel

👤 Register New User
┌─────────────────────────────────────────┐
│ Username *      [____________]           │
│ Full Name *     [____________]           │
│ Email           [____________]           │
│ Phone           [____________]           │
│ Password *      [____________]           │
│ Role *          [Surveyor ▾]            │
│                                         │
│ [➕ Create User]                         │
└─────────────────────────────────────────┘

🔑 Permission Matrix
Role        Submit   Approve   Users
Surveyor      ✅        —         —
Supervisor    ✅        ✅        —
DB Admin      ✅        ✅        ✅
```

---

## Data Lifecycle

```
Survey filled (offline)
    │
    ▼ IndexedDB
  sync_status = 'draft'
    │
    │ User taps Submit
    ▼
  sync_status = 'pending_sync'
    │
    │ User taps Sync Now (online)
    ▼ POST /sync
    │
    ├── No duplicate → industrial_unit CREATED
    │       sync_status = 'synced'
    │       unit.is_verified = false
    │       unit.operational_status = 'Unverified'
    │
    └── Duplicate detected → industrial_unit LINKED (existing)
            sync_status = 'pending_sync' (held on server)
            duplicate_flags row created
            local marked 'synced'

                │
                │ Supervisor reviews
                ▼
    APPROVE → unit.is_verified = true
              unit.operational_status = 'Active'
              unit_approval_log created
              survey_responses.sync_status = 'synced'

    REJECT  → unit stays Unverified
              unit_approval_log created
              survey_responses.sync_status = 'rejected'
```

---

## Offline Capability Matrix

| Feature | Online | Offline |
|---|---|---|
| Login | ✅ | ❌ (needs server) |
| View cached form | ✅ | ✅ |
| Download latest form | ✅ | ❌ |
| Fill survey | ✅ | ✅ |
| Save draft | ✅ | ✅ |
| Submit to pending | ✅ | ✅ |
| View local responses | ✅ | ✅ |
| Sync to server | ✅ | ❌ |
| Supervisor review | ✅ | ❌ |
| Register users | ✅ | ❌ |

---

## JWT Auth Flow

```
Client                              Server
──────                              ──────
POST /auth/login
  { username, password_hash }  →   bcrypt.compare(password, hash)
                                   Build JWT payload:
                                   { user_id, username, role_name, permissions[] }
                               ←   { access_token, user }

Store in localStorage:
  survey_token = <jwt>
  survey_user  = <user object>

Subsequent requests:
  Authorization: Bearer <token>  →  RbacGuard.canActivate()
                                    jwt.verify(token, secret)
                                    Check payload.permissions includes required codes
                               ←   200 OK or 401/403
```

Token expires in **1 day**. No refresh mechanism — user must log in again.
