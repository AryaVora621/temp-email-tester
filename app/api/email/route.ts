import { NextRequest, NextResponse } from 'next/server';

const GM_BASE = 'https://api.guerrillamail.com/ajax.php';

export async function GET(req: NextRequest) {
  const sidToken = req.nextUrl.searchParams.get('sidToken');
  const messageId = req.nextUrl.searchParams.get('messageId');

  if (!messageId || !sidToken) {
    return NextResponse.json({ error: 'sidToken and messageId required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${GM_BASE}?f=fetch_email&email_id=${encodeURIComponent(messageId)}&sid_token=${encodeURIComponent(sidToken)}`
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch email' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      id: data.mail_id,
      subject: data.mail_subject || '',
      body: data.mail_body || '',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
  }
}
