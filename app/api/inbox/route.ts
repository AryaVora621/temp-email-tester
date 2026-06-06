import { NextRequest, NextResponse } from 'next/server';

const GM_BASE = 'https://api.guerrillamail.com/ajax.php';

interface GuerrillaMessage {
  mail_id: number;
  mail_from: string;
  mail_subject: string;
  mail_excerpt: string;
  mail_timestamp: number;
}

export async function GET(req: NextRequest) {
  const sidToken = req.nextUrl.searchParams.get('sidToken');

  if (!sidToken) {
    return NextResponse.json({ error: 'sidToken required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${GM_BASE}?f=check_email&seq=0&sid_token=${encodeURIComponent(sidToken)}`
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: response.status });
    }

    const data = await response.json();
    const messages = ((data.list || []) as GuerrillaMessage[])
      .filter((m) => m.mail_from !== 'no-reply@guerrillamail.com')
      .map((m) => ({
        id: m.mail_id,
        from: { address: m.mail_from },
        subject: m.mail_subject,
        intro: m.mail_excerpt,
        createdAt: new Date(m.mail_timestamp * 1000).toISOString(),
      }));

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}
