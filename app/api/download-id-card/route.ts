import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIDCardBuffer } from '../../lib/generateCard';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get('phone');
    const secret = url.searchParams.get('secret');

    const expectedSecret = process.env.ADMIN_SECRET_KEY || 'Tvk_ka_hq_2026';
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number parameter is required' }, { status: 400 });
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://ytaqlejhsxjanhmhwmkv.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query using Supabase 'or' condition to match 'phone', 'phone_number', or 'mobile'
    let { data: member, error } = await supabase
      .from('members')
      .select('*')
      .or(`phone.eq.${phone},phone_number.eq.${phone},mobile.eq.${phone}`)
      .maybeSingle();

    // Fallback: If 'or' fails due to missing column names, query 'phone' directly
    if (error) {
      const fallbackRes = await supabase
        .from('members')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      member = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return NextResponse.json(
        { error: `Database query failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: `Member with phone number ${phone} not found` },
        { status: 404 }
      );
    }

    // Generate PNG Buffer using generateIDCardBuffer
    const imageBuffer = await generateIDCardBuffer(member);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="ID_Card_${phone}.png"`,
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