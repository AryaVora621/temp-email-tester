'use client';

import { useEffect, useState } from 'react';

interface MessageSummary {
  id: string;
  from: { address: string; name?: string };
  subject: string;
  intro?: string;
  createdAt: string;
}

interface MessageBody {
  id: string;
  subject: string;
  body: string;
}

interface InboxState {
  email: string;
  sidToken: string;
  createdAt: string;
}

const CODE_REGEX = /\d{3}-\d{3}/;

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function findCode(subject: string, body: string): string | null {
  const subjectMatch = subject?.match(CODE_REGEX);
  if (subjectMatch) return subjectMatch[0];
  const bodyMatch = body?.match(CODE_REGEX);
  if (bodyMatch) return bodyMatch[0];
  return null;
}

export default function Home() {
  const [inbox, setInbox] = useState<InboxState | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [bodies, setBodies] = useState<Record<string, MessageBody>>({});
  const [foundCode, setFoundCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (text: string, durationMs = 2500) => {
    setMessage(text);
    setTimeout(() => setMessage(''), durationMs);
  };

  const generateEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-email', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || 'Error generating email', 4000);
        return;
      }
      setInbox(data);
      setMessages([]);
      setBodies({});
      setFoundCode(null);
      showMessage('New email generated!');
    } catch {
      showMessage('Error generating email', 4000);
    } finally {
      setLoading(false);
    }
  };

  const fetchBody = async (sidToken: string, id: string): Promise<MessageBody | null> => {
    try {
      const res = await fetch(
        `/api/email?sidToken=${encodeURIComponent(sidToken)}&messageId=${id}`
      );
      if (!res.ok) return null;
      const body: MessageBody = await res.json();
      setBodies((prev) => ({ ...prev, [id]: body }));
      return body;
    } catch {
      return null;
    }
  };

  const fetchInbox = async (current: InboxState | null) => {
    if (!current) return;
    try {
      const res = await fetch(`/api/inbox?sidToken=${encodeURIComponent(current.sidToken)}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: MessageSummary[] = data.messages || [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMessages(sorted);

      for (const m of sorted) {
        const body = await fetchBody(current.sidToken, m.id);
        if (!body) continue;
        const plainBody = stripHtml(body.body);
        const code = findCode(body.subject || m.subject, plainBody);
        if (code) {
          setFoundCode(code);
          return;
        }
      }
      setFoundCode(null);
    } catch {
      // silent — auto-refresh will retry
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inbox) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInbox(inbox);
    const interval = setInterval(() => fetchInbox(inbox), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showMessage(`${label} copied!`);
    } catch {
      showMessage('Failed to copy', 3000);
    }
  };

  const copyCode = () => {
    if (!foundCode) {
      showMessage('No code found');
      return;
    }
    copyToClipboard(foundCode, `Code ${foundCode}`);
  };

  const reset = async () => {
    setInbox(null);
    setMessages([]);
    setBodies({});
    setFoundCode(null);
    await generateEmail();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Temp Email Tester</h1>
        <p className="text-gray-600 mb-8">
          Test your registration forms with temporary email addresses
        </p>

        {inbox && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Current Email:</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-100 p-3 rounded text-lg font-mono text-gray-900 break-all">
                {inbox.email}
              </code>
              <button
                onClick={() => copyToClipboard(inbox.email, 'Email')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium whitespace-nowrap cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {foundCode && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Verification Code Found:</p>
            <div className="flex items-center gap-3">
              <code className="text-3xl font-bold text-green-600">{foundCode}</code>
              <button
                onClick={copyCode}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded font-bold text-lg cursor-pointer"
              >
                Copy Code
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Inbox</h2>
            <div className="flex gap-2">
              <button
                onClick={() => fetchInbox(inbox)}
                disabled={loading || !inbox}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50 cursor-pointer"
              >
                Refresh
              </button>
              <button
                onClick={reset}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {messages.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">
              No emails yet. Waiting for confirmation emails...
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const body = bodies[m.id];
                const preview = m.intro || (body ? stripHtml(body.body) : '');
                return (
                  <div
                    key={m.id}
                    className="border border-gray-200 rounded p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{m.subject}</p>
                        <p className="text-sm text-gray-600">
                          From: {m.from?.name || m.from?.address}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    {preview && (
                      <p className="text-gray-700 text-sm">{preview.slice(0, 150)}…</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg">
          {message}
        </div>
      )}
    </div>
  );
}
