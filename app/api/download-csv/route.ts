import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ytaqlejhsxjanhmhwmkv.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'Tvk_ka_hq_2026';

    const url = new URL(req.url);
    const secret = url.searchParams.get('secret') || req.headers.get('x-admin-secret');

    if (!secret || secret !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid Admin Secret Key.' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No member records found.' }, { status: 404 });
    }

    const origin = url.origin;

    const csvHeader = [
      'ID',
      'Full Name',
      'Mobile Number',
      'Date of Birth',
      'Gender',
      'District',
      'Team Name',
      'Photo URL',
      'ID Card Download Link'
    ].join(',') + '\n';

    const csvRows = members.map((m) => {
      const phone = m.phone_number || m.phone || '';
      const idCardLink = `${origin}/api/download-id-card?phone=${phone}&secret=${ADMIN_SECRET_KEY}`;

      return [
        `"${m.id || ''}"`,
        `"${(m.full_name || m.fullName || '').replace(/"/g, '""')}"`,
        `"${phone}"`,
        `"${m.dob || ''}"`,
        `"${m.gender || ''}"`,
        `"${m.district || ''}"`,
        `"${(m.team_name || m.teamName || '').replace(/"/g, '""')}"`,
        `"${m.photo_url || m.photoUrl || ''}"`,
        `"${idCardLink}"`
      ].join(',');
    }).join('\n');

    return new NextResponse(csvHeader + csvRows, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="TVK_Members_List.csv"',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `CSV Export Error: ${msg}` }, { status: 500 });
  }
}