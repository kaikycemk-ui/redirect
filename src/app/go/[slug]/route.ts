import { NextRequest, NextResponse } from 'next/server';
import { resolveTraffic } from '@/lib/engine/resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params?.slug;

  if (!slug) {
    return NextResponse.redirect('https://google.com', { status: 307 });
  }

  // Extrair metadados mínimos para tracking rápido
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  try {
    const resolution = await resolveTraffic({
      slug,
      ip,
      userAgent,
      referer,
    });

    // Retorna HTTP 307 (Temporary Redirect) com Cache-Control no-store para evitar cache de navegador nos pesos
    const response = NextResponse.redirect(resolution.redirectUrl, {
      status: 307,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error handling redirect /go/[slug]:', error);
    return NextResponse.redirect('https://google.com', { status: 307 });
  }
}
