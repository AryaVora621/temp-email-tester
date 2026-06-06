import { NextResponse } from 'next/server';
import crypto from 'crypto';

const GM_BASE = 'https://api.guerrillamail.com/ajax.php';

function randomString(length: number) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export async function POST() {
  try {
    const sessionRes = await fetch(`${GM_BASE}?f=get_email_address`);
    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: 'Failed to start a session with the mail provider' },
        { status: 502 }
      );
    }
    const session = await sessionRes.json();

    const username = `test-${randomString(14)}`;
    const customRes = await fetch(
      `${GM_BASE}?f=set_email_user&email_user=${encodeURIComponent(username)}&lang=en&sid_token=${encodeURIComponent(session.sid_token)}`
    );
    if (!customRes.ok) {
      return NextResponse.json({ error: 'Failed to assign a temp email address' }, { status: 502 });
    }
    const custom = await customRes.json();

    return NextResponse.json({
      email: custom.email_addr,
      sidToken: custom.sid_token,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create temp email' }, { status: 500 });
  }
}
