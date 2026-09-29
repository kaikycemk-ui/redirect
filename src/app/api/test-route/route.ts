import { NextRequest, NextResponse } from 'next/server';
import { resolveTraffic } from '@/lib/engine/resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug não informado' }, { status: 400 });
  }

  try {
    const result = await resolveTraffic({
      slug,
      ip: '127.0.0.1',
      userAgent: 'LeadRouter-Inspector/1.0',
      referer: 'dashboard-test',
      isTest: true, // Garante que nenhum clique é gravado no banco!
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao simular link' }, { status: 500 });
  }
}
