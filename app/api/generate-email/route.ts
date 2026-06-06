import { NextResponse } from 'next/server';
import crypto from 'crypto';

const MAIL_TM_BASE = 'https://api.mail.tm';

function randomString(length: number) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export async function POST() {
  try {
    const domainsRes = await fetch(`${MAIL_TM_BASE}/domains`);
    if (!domainsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch available domains' }, { status: 502 });
    }
    const domainsData = await domainsRes.json();
    const domain = domainsData['hydra:member']?.find((d: { isActive: boolean }) => d.isActive)?.domain;
    if (!domain) {
      return NextResponse.json({ error: 'No active mail domain available' }, { status: 502 });
    }

    const address = `test-${randomString(14)}@${domain}`;
    const password = randomString(20);

    const createRes = await fetch(`${MAIL_TM_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });
    if (!createRes.ok) {
      const text = await createRes.text();
      return NextResponse.json({ error: `Failed to create inbox: ${text}` }, { status: 502 });
    }

    const tokenRes = await fetch(`${MAIL_TM_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password }),
    });
    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Failed to authenticate new inbox' }, { status: 502 });
    }
    const { token } = await tokenRes.json();

    return NextResponse.json({
      email: address,
      token,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create temp email' }, { status: 500 });
  }
}
