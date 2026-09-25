import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIDCardBuffer } from '../../lib/generateCard';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawPhone = url.searchParams.get('phone') || '';
    const secret = url.searchParams.get('secret');

    const expectedSecret = process.env.ADMIN_SECRET_KEY || 'Tvk_ka_hq_2026';
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    if (!rawPhone) {
      return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 });
    }

    // Clean phone input to match digits
    const cleanPhone = rawPhone.replace(/\D/g, '');

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://ytaqlejhsxjanhmhwmkv.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. First try exact match on 'phone'
    let { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', rawPhone)
      .maybeSingle();

    // 2. Fallback: Search with wildcards if clean phone exists
    if (!member && cleanPhone) {
      const { data: fallbackMembers } = await supabase
        .from('members')
        .select('*')
        .like('phone', `%${cleanPhone.slice(-10)}%`)
        .limit(1);

      if (fallbackMembers && fallbackMembers.length > 0) {
        member = fallbackMembers[0];
      }
    }

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: `No member record found for phone: ${rawPhone}` },
        { status: 404 }
      );
    }

    // Generate card buffer
    const imageBuffer = await generateIDCardBuffer(member);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="ID_Card_${rawPhone}.png"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}