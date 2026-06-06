import { NextRequest, NextResponse } from 'next/server';

const MAIL_TM_BASE = 'https://api.mail.tm';

export async function GET(req: NextRequest) {
  const messageId = req.nextUrl.searchParams.get('messageId');
  const token = req.headers.get('authorization');

  if (!messageId) {
    return NextResponse.json({ error: 'messageId required' }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
  }

  try {
    const response = await fetch(`${MAIL_TM_BASE}/messages/${messageId}`, {
      headers: { Authorization: token },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch email' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      id: data.id,
      subject: data.subject,
      text: data.text || '',
      html: Array.isArray(data.html) ? data.html.join('\n') : data.html || '',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
  }
}
