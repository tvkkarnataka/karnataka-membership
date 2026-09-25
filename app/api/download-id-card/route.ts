import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ytaqlejhsxjanhmhwmkv.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'Tvk_ka_hq_2026';

    if (!supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase key is missing in server environment variables.' },
        { status: 500 }
      );
    }

    // 1. Verify Secret Key
    const authHeader = req.headers.get('x-admin-secret');
    if (!authHeader || authHeader !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Incorrect Admin Secret Key.' },
        { status: 401 }
      );
    }

    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 });
    }

    // 2. Fetch Member Record
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: member, error: dbError } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json({ error: `Member with phone number ${phone} was not found.` }, { status: 404 });
    }

    // 3. Load Background Template
    const templatePath = path.join(process.cwd(), 'public', 'id-template.png');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Template missing: public/id-template.png was not found.' },
        { status: 500 }
      );
    }

    const templateImage = await loadImage(templatePath);
    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');

    // Draw Template
    ctx.drawImage(templateImage, 0, 0, templateImage.width, templateImage.height);

    // Text Properties
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';

    const fullName = member.full_name || member.fullName || member.name || 'N/A';
    const mobile = member.phone || 'N/A';
    const dob = member.dob || 'N/A';
    const gender = member.gender || 'N/A';
    const district = member.district || 'N/A';
    const teamName = member.team_name || member.teamName || 'N/A';

    ctx.fillText(`Name: ${fullName}`, 250, 180);
    ctx.fillText(`Mobile: ${mobile}`, 250, 220);
    ctx.fillText(`DOB: ${dob}`, 250, 260);
    ctx.fillText(`Gender: ${gender}`, 250, 300);
    ctx.fillText(`District: ${district}`, 250, 340);
    ctx.fillText(`Team: ${teamName}`, 250, 380);

    // 4. Safely Fetch & Draw Profile Photo
    const photoUrl = member.photo_url || member.photoUrl;
    if (photoUrl) {
      try {
        const photoRes = await fetch(photoUrl);
        if (photoRes.ok) {
          const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
          const memberPhoto = await loadImage(photoBuffer);
          ctx.drawImage(memberPhoto, 40, 160, 160, 200);
        }
      } catch (photoErr) {
        console.warn('Skipping photo render due to fetch error:', photoErr);
      }
    }

    // 5. Generate PNG Stream
    const imageBuffer = canvas.toBuffer('image/png');

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="TVK_ID_Card_${mobile}.png"`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Server Canvas Render Error:', errorMsg);
    return NextResponse.json({ error: `Server Render Error: ${errorMsg}` }, { status: 500 });
  }
}