# Implementation Plan — Temp Email Tester

## Phase 1: Project Setup (10 min)

### 1.1 Initialize Next.js Project
```bash
cd /Users/aryavora/Desktop/Personal\ Projects/temp-email-tester
npx create-next-app@latest . --typescript --tailwind --app
# Choose defaults, ESLint yes, no src dir, use App Router
```

### 1.2 Install Dependencies
```bash
npm install axios
```

### 1.3 Setup Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_MAILTRAP_API_KEY=42c1c9a0e2eb65171fc997529f6f3249
NEXT_PUBLIC_MAILTRAP_ACCOUNT_ID=<your-account-id>
```

**Get Account ID:**
- Log in to Mailtrap
- Go to Settings > API Tokens
- Copy your Account ID (visible in API docs or dashboard)

### 1.4 Initialize Git (Optional but Recommended)
```bash
git init
git add .
git commit -m "Initial Next.js setup"
```

---

## Phase 2: Backend API Routes (15 min)

### 2.1 Create API Route: Generate Email
**File:** `app/api/generate-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const MAILTRAP_API_KEY = process.env.NEXT_PUBLIC_MAILTRAP_API_KEY;
const ACCOUNT_ID = process.env.NEXT_PUBLIC_MAILTRAP_ACCOUNT_ID;
const MAILTRAP_BASE = 'https://mailtrap.io/api/accounts';

function randomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

export async function POST(req: NextRequest) {
  try {
    const inboxName = `test-${randomString(14)}`;
    
    const response = await axios.post(
      `${MAILTRAP_BASE}/${ACCOUNT_ID}/inboxes`,
      { name: inboxName },
      { headers: { 'Api-Token': MAILTRAP_API_KEY } }
    );

    const { id, email } = response.data;

    return NextResponse.json({
      inboxId: id,
      email: email,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating inbox:', error);
    return NextResponse.json(
      { error: 'Failed to create temp email' },
      { status: 500 }
    );
  }
}
```

### 2.2 Create API Route: Fetch Inbox
**File:** `app/api/inbox/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const MAILTRAP_API_KEY = process.env.NEXT_PUBLIC_MAILTRAP_API_KEY;
const ACCOUNT_ID = process.env.NEXT_PUBLIC_MAILTRAP_ACCOUNT_ID;
const MAILTRAP_BASE = 'https://mailtrap.io/api/accounts';

export async function GET(req: NextRequest) {
  const inboxId = req.nextUrl.searchParams.get('inboxId');

  if (!inboxId) {
    return NextResponse.json(
      { error: 'inboxId required' },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get(
      `${MAILTRAP_BASE}/${ACCOUNT_ID}/inboxes/${inboxId}/messages`,
      { headers: { 'Api-Token': MAILTRAP_API_KEY } }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox' },
      { status: 500 }
    );
  }
}
```

### 2.3 Create API Route: Get Email Body
**File:** `app/api/email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const MAILTRAP_API_KEY = process.env.NEXT_PUBLIC_MAILTRAP_API_KEY;
const ACCOUNT_ID = process.env.NEXT_PUBLIC_MAILTRAP_ACCOUNT_ID;
const MAILTRAP_BASE = 'https://mailtrap.io/api/accounts';

export async function GET(req: NextRequest) {
  const inboxId = req.nextUrl.searchParams.get('inboxId');
  const messageId = req.nextUrl.searchParams.get('messageId');

  if (!inboxId || !messageId) {
    return NextResponse.json(
      { error: 'inboxId and messageId required' },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get(
      `${MAILTRAP_BASE}/${ACCOUNT_ID}/inboxes/${inboxId}/messages/${messageId}`,
      { headers: { 'Api-Token': MAILTRAP_API_KEY } }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    );
  }
}
```

---

## Phase 3: Frontend Component (20 min)

### 3.1 Create Main Page Component
**File:** `app/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Email {
  id: number;
  from: { email: string; name?: string };
  subject: string;
  created_at: string;
  text_body?: string;
  html_body?: string;
}

interface InboxState {
  inboxId: string;
  email: string;
  createdAt: string;
}

export default function Home() {
  const [inbox, setInbox] = useState<InboxState | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [foundCode, setFoundCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Generate new email on mount
  useEffect(() => {
    generateEmail();
  }, []);

  // Auto-refresh inbox every 5 seconds
  useEffect(() => {
    if (!inbox) return;
    
    const interval = setInterval(() => {
      fetchInbox();
    }, 5000);

    return () => clearInterval(interval);
  }, [inbox]);

  const generateEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-email', { method: 'POST' });
      const data = await res.json();
      setInbox(data);
      setEmails([]);
      setFoundCode(null);
      setMessage('New email generated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error generating email');
    } finally {
      setLoading(false);
    }
  };

  const fetchInbox = async () => {
    if (!inbox) return;
    try {
      const res = await fetch(`/api/inbox?inboxId=${inbox.inboxId}`);
      const data = await res.json();
      setEmails(Array.isArray(data) ? data : []);
      extractCode(data);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    }
  };

  const extractCode = (emailList: Email[]) => {
    const codeRegex = /\d{3}-\d{3}/;
    for (const email of emailList) {
      // Check subject first
      let match = email.subject.match(codeRegex);
      if (match) {
        setFoundCode(match[0]);
        return;
      }
      // Check email body
      const body = email.text_body || email.html_body || '';
      match = body.match(codeRegex);
      if (match) {
        setFoundCode(match[0]);
        return;
      }
    }
    setFoundCode(null);
  };

  const copyCode = async () => {
    if (!foundCode) {
      setMessage('No code found');
      return;
    }
    try {
      await navigator.clipboard.writeText(foundCode);
      setMessage(`Copied: ${foundCode}`);
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage('Failed to copy');
    }
  };

  const reset = async () => {
    setInbox(null);
    setEmails([]);
    setFoundCode(null);
    await generateEmail();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Temp Email Tester
        </h1>
        <p className="text-gray-600 mb-8">
          Test your registration forms with temporary email addresses
        </p>

        {/* Email Display */}
        {inbox && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Email:</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-gray-100 p-3 rounded text-lg font-mono text-gray-900 break-all">
                  {inbox.email}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inbox.email);
                    setMessage('Email copied!');
                    setTimeout(() => setMessage(''), 2000);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Code Extractor */}
        {foundCode && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Verification Code Found:</p>
            <div className="flex items-center gap-3">
              <code className="text-3xl font-bold text-green-600">
                {foundCode}
              </code>
              <button
                onClick={copyCode}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded font-bold text-lg"
              >
                Copy Code
              </button>
            </div>
          </div>
        )}

        {/* Inbox */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Inbox</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchInbox}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                onClick={reset}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
              >
                Reset
              </button>
            </div>
          </div>

          {emails.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">
              No emails yet. Waiting for confirmation emails...
            </p>
          ) : (
            <div className="space-y-4">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="border border-gray-200 rounded p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">
                        {email.subject}
                      </p>
                      <p className="text-sm text-gray-600">
                        From: {email.from.name || email.from.email}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(email.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-gray-700 text-sm">
                    {(email.text_body || email.html_body || '')
                      .substring(0, 150)
                      .replace(/<[^>]*>/g, '')}
                    ...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Toast */}
        {message && (
          <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 4: Testing (5 min)

### 4.1 Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

### 4.2 Manual Testing
- [ ] Load page, verify email generated
- [ ] Copy email button works
- [ ] Send test email to your temp email via Mailtrap
- [ ] Click Refresh, verify email appears
- [ ] Code extraction finds `###-###` codes
- [ ] Copy Code button copies to clipboard
- [ ] Reset generates new email

---

## Phase 5: Deploy to Vercel (5 min)

### 5.1 Initialize Git (if not done)
```bash
git init
git add .
git commit -m "Initial temp email tester"
```

### 5.2 Push to GitHub
```bash
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/temp-email-tester.git
git branch -M main
git push -u origin main
```

### 5.3 Deploy
- Go to [Vercel](https://vercel.com)
- Click "Import Project"
- Select your GitHub repo
- Add environment variables:
  - `NEXT_PUBLIC_MAILTRAP_API_KEY`
  - `NEXT_PUBLIC_MAILTRAP_ACCOUNT_ID`
- Click Deploy

Your app is now live! Share the URL to test your site's registration form.

---

## Troubleshooting

**"No code found" message:**
- Verify code format is exactly `###-###` (3 digits, dash, 3 digits)
- Check email text_body and html_body both

**Inbox not refreshing:**
- Check Mailtrap account ID is correct
- Verify API key has inbox access permissions

**Emails not appearing:**
- Confirm your site is actually sending to the displayed email
- Check Mailtrap inbox directly to verify emails are arriving

**Deploy fails:**
- Verify environment variables are set in Vercel
- Check Node version compatibility (use Node 18+)

---

## Done Criteria

- [ ] Project initializes without errors
- [ ] Generate Email button creates new Mailtrap inbox
- [ ] Email displays in UI
- [ ] Copy Email button works
- [ ] Inbox shows received emails (auto-refreshes every 5s)
- [ ] Code extraction finds `###-###` pattern
- [ ] Copy Code copies to clipboard
- [ ] Reset generates new email and clears inbox
- [ ] App deployed to Vercel and accessible online
- [ ] Manual testing passes all cases
