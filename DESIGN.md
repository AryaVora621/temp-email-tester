# Temp Email Tester — Design Specification

**Date:** 2026-06-06  
**Purpose:** Web app to test site registration forms using temporary Mailtrap email inboxes with code extraction

## Overview

A Next.js web application that generates unique temporary email addresses via Mailtrap, displays received emails, extracts verification codes, and provides one-click clipboard copy for testing workflows.

## Architecture

### Tech Stack
- **Framework:** Next.js (App Router)
- **Frontend:** React (built-in)
- **Backend:** Next.js API Routes
- **External Service:** Mailtrap (email receiving)
- **Deployment:** Vercel

### System Components

#### Frontend (React Component)
- **Email Display:** Show current temp email address (large, readable)
- **Inbox List:** Display all emails received at current address with subject and timestamp
- **Code Extractor:** Scan email bodies for `###-###` pattern, highlight found codes
- **Copy Code Button:** Find 6-digit code in `###-###` format, copy to clipboard
- **Refresh Inbox:** Fetch latest emails from Mailtrap
- **Reset Button:** Clear current inbox, generate new email address and inbox

#### Backend (API Routes)
- `POST /api/generate-email` — Create new Mailtrap inbox, return unique email address
- `GET /api/inbox?inboxId=...` — Fetch emails from specific inbox via Mailtrap API
- `POST /api/reset` — Archive current inbox (optional), create new one

#### Mailtrap Integration
- Use Mailtrap API to create named inboxes
- Inbox names: `test-{random10-20chars}` (becomes email: `test-xxx@inbox.mailtrap.io`)
- API key stored in `.env.local` (not committed)
- Fetch emails via Mailtrap API GET `/api/accounts/{account_id}/inboxes/{inbox_id}/messages`

## Feature Specifications

### 1. Generate Temp Email
**Flow:**
1. User loads app
2. Auto-generate first email on mount
3. User can click "Generate New Email" to create another
4. API creates Mailtrap inbox with random name
5. Return inbox ID and email address to frontend
6. Display email prominently (copy-friendly)

**Implementation:**
- Random name: `test-` + 12-16 random alphanumeric chars
- Store in React state: `{ inboxId, email, createdAt }`
- Show email in large font, clickable to copy to clipboard

### 2. Display Inbox
**Flow:**
1. Auto-refresh every 5 seconds (or manual "Refresh" button)
2. Fetch emails from current inbox via API
3. Display list showing:
   - Subject
   - From address
   - Timestamp
   - Preview (first 100 chars of body)

**Implementation:**
- API calls Mailtrap to list messages for inbox
- Frontend polls or user clicks refresh
- Sort by timestamp (newest first)

### 3. Code Extraction & Copy
**Flow:**
1. User clicks "Copy Code" button
2. System scans all email subjects AND bodies for pattern `###-###` (6 digits with dash)
3. If found, copy to clipboard automatically
4. If multiple codes found, copy first one
5. If no code found, show toast: "No code found in emails"
6. After reset, clear clipboard state

**Implementation:**
- Regex: `/\d{3}-\d{3}/`
- Iterate through emails, search both subject and body (text_body or html_body)
- Check subject first, then body
- Use `navigator.clipboard.writeText(code)` to copy
- Toast notification on success/failure (use browser alert or simple toast)

### 4. Reset
**Flow:**
1. User clicks "Reset"
2. Current inbox is archived (optional)
3. New inbox created
4. New email displayed
5. Inbox clears (previous emails gone from view)

**Implementation:**
- Call POST `/api/reset`
- Clears React state, generates new email
- No database persistence needed

## Data Model

### Email Address State
```javascript
{
  inboxId: "12345",           // Mailtrap inbox ID
  email: "test-abc123@inbox.mailtrap.io",
  createdAt: "2026-06-06T10:30:00Z"
}
```

### Email Message (from Mailtrap)
```javascript
{
  id: 1,
  from: { email: "noreply@google.com", name: "Google" },
  to: [{ email: "test-abc123@inbox.mailtrap.io" }],
  subject: "Verify your email",
  body: "Your verification code is: 123-456",
  text_body: "Your verification code is: 123-456",
  created_at: "2026-06-06T10:31:00Z"
}
```

## Error Handling

- **Mailtrap API failure:** Show error toast, allow retry
- **Network timeout:** Retry fetch after 2 seconds
- **No emails in inbox:** Show "No emails yet" message
- **Code not found:** Show "No verification code found in emails"

## UI Layout

```
┌─────────────────────────────────────┐
│  Temp Email Tester                  │
├─────────────────────────────────────┤
│ Current Email:                      │
│ test-abc123def456@inbox.mailtrap.io │
│ [Copy to Clipboard] [New Email]     │
├─────────────────────────────────────┤
│ Inbox (Auto-refreshes every 5s)    │
│ [Refresh] [Copy Code] [Reset]      │
├─────────────────────────────────────┤
│ • Subject: Verify your email        │
│   From: noreply@google.com          │
│   10:31 AM                          │
│   Preview: "Your verification..."  │
│                                     │
│ • Subject: Welcome!                 │
│   From: support@site.com            │
│   10:32 AM                          │
│   Preview: "Welcome to our site..." │
├─────────────────────────────────────┤
│ Code Found: 123-456 [Copy]          │
└─────────────────────────────────────┘
```

## Deployment

- **Platform:** Vercel
- **Environment variables:**
  - `NEXT_PUBLIC_MAILTRAP_API_KEY` (or store securely in Vercel)
  - `NEXT_PUBLIC_MAILTRAP_ACCOUNT_ID`
- **Deployment:** `git push` to main branch, Vercel auto-deploys

## Testing Checklist

- [ ] Generate new email creates Mailtrap inbox
- [ ] Email address displays correctly
- [ ] Inbox refreshes and shows received emails
- [ ] Code extraction finds `###-###` pattern
- [ ] Copy Code button copies to clipboard
- [ ] Reset generates new email and clears inbox
- [ ] App works when deployed to Vercel
- [ ] Handles no emails gracefully
- [ ] Handles API failures gracefully

## Future Enhancements (Out of Scope)

- Email search/filter
- Email body full-text view
- Multiple simultaneous temp emails
- Email history/archive
- Custom email prefix
