import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIDCardBuffer } from '../../lib/generateCard';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get('phone');
  const secret = url.searchParams.get('secret');

  if (!phone) {
    return NextResponse.json(
      { error: 'Mobile number parameter is missing.' },
      { status: 400 }
    );
  }

  const mockReq = new Request(req.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret || '',
    },
    body: JSON.stringify({ phone }),
  });

  return POST(mockReq);
}

export async function POST(req: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://ytaqlejhsxjanhmhwmkv.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';
    const ADMIN_SECRET_KEY =
      process.env.ADMIN_SECRET_KEY || 'Tvk_ka_hq_2026';

    const authHeader = req.headers.get('x-admin-secret');
    if (!authHeader || authHeader !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid Admin Secret Key.' },
        { status: 401 }
      );
    }

    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json(
        { error: 'Mobile number is required in request body.' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: member, error: dbError } = await supabase
      .from('members')
      .select('*')
      .or(`phone.eq.${phone},phone_number.eq.${phone}`)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json(
        { error: `Database query failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { error: `No member found with mobile number ${phone}.` },
        { status: 404 }
      );
    }

    const imageBuffer = await generateIDCardBuffer(member);
    const mobileNum = member.phone_number || member.phone || phone;

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="TVK_ID_Card_${mobileNum}.png"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `ID Card Generation Error: ${msg}` },
      { status: 500 }
    );
  }
}