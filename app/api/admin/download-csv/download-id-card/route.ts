import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ytaqlejhsxjanhmhwmkv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'Tvk_ka_hq_2026';

export async function POST(req: Request) {
  try {
    // 1. Admin Authorization Guard
    const authHeader = req.headers.get('x-admin-secret');
    if (!authHeader || authHeader !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin secret key required.' },
        { status: 401 }
      );
    }

    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Fetch member details from Supabase
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !member) {
      return NextResponse.json({ error: 'Member record not found.' }, { status: 404 });
    }

    // 3. Load PNG template from public/id-card-template.png
    const templatePath = path.join(process.cwd(), 'public', 'id-card-template.png');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Template missing. Place id-card-template.png in public/ folder.' },
        { status: 500 }
      );
    }

    const templateImage = await loadImage(templatePath);

    // 4. Create Canvas matching the template dimensions
    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');

    // Draw background PNG template
    ctx.drawImage(templateImage, 0, 0, templateImage.width, templateImage.height);

    // 5. Configure Text Properties
    ctx.fillStyle = '#000000'; // Black text color
    ctx.font = 'bold 24px sans-serif'; // Adjust size to fit your template

    // 6. Draw Member Info onto Canvas
    // Adjust (X, Y) coordinates below to align with text fields on your PNG
    const fullName = member.full_name || member.fullName || 'N/A';
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

    // 7. Draw Member Photo onto Canvas (if photoUrl exists)
    if (member.photo_url || member.photoUrl) {
      try {
        const photoUrl = member.photo_url || member.photoUrl;
        const memberPhoto = await loadImage(photoUrl);
        // Draw photo at X=40, Y=160 with Width=160, Height=200
        ctx.drawImage(memberPhoto, 40, 160, 160, 200);
      } catch {
        // Continue if photo fetching fails
      }
    }

    // 8. Output as PNG Buffer
    const imageBuffer = canvas.toBuffer('image/png');

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="TVK_ID_Card_${member.phone}.png"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate ID card PNG.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}