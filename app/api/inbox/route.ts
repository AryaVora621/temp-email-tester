import { NextRequest, NextResponse } from 'next/server';

const MAIL_TM_BASE = 'https://api.mail.tm';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization');

  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  try {
    const response = await fetch(`${MAIL_TM_BASE}/messages`, {
      headers: { Authorization: token },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: response.status });
    }

    const data = await response.json();
    const messages = (data['hydra:member'] || []).map(
      (m: {
        id: string;
        from: { address: string; name?: string };
        subject: string;
        intro?: string;
        createdAt: string;
      }) => ({
        id: m.id,
        from: m.from,
        subject: m.subject,
        intro: m.intro,
        createdAt: m.createdAt,
      })
    );

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}
