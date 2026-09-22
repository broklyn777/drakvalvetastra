import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (
    !['auth', 'rooms', 'saves', 'characters', 'health'].includes(path[0]) ||
    path.some((p) => !/^[a-zA-Z0-9-]+$/.test(p))
  )
    return NextResponse.json({ error: 'Okänd resurs.' }, { status: 404 });
  try {
    const headers = new Headers();
    for (const key of ['cookie', 'content-type', 'origin']) {
      const value = request.headers.get(key);
      if (value) headers.set(key, value);
    }
    const requestBody = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
    if (requestBody && Buffer.byteLength(requestBody) > 1024 * 1024)
      return NextResponse.json({ error: 'För stor förfrågan.' }, { status: 413 });
    const response = await fetch(
      `${process.env.GAME_SERVER_URL ?? 'http://127.0.0.1:4001'}/${path.join('/')}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: requestBody,
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      },
    );
    const outgoing = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    const cookie = response.headers.get('set-cookie');
    if (cookie) outgoing.set('set-cookie', cookie);
    return new NextResponse(await response.text(), { status: response.status, headers: outgoing });
  } catch {
    return NextResponse.json(
      { error: 'Spelservern är inte tillgänglig. Solospel fungerar fortfarande.' },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PUT };
