import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with admin privileges using the Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'TVK_SECRET_PASS_2026';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // 1. Verify Secret Key
  if (!secret || secret !== ADMIN_SECRET) {
    return new NextResponse('Unauthorized: Invalid or missing secret key.', { status: 401 });
  }

  try {
    // 2. Query members from database
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    if (!members || members.length === 0) {
      return new NextResponse('No registered members found.', { status: 404 });
    }

    // 3. Convert records to CSV format
    const headers = [
      'Sl No',
      'Membership ID',
      'Full Name',
      'Phone',
      'Date of Birth',
      'District',
      'VMI Experience (Years)',
      'Team Name',
      'Coordinator',
      'Registration Date'
    ];

    const escapeCsvField = (field: any) => {
      const stringValue = String(field ?? '');
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvRows = [headers.join(',')];

    members.forEach((m, idx) => {
      const row = [
        idx + 1,
        escapeCsvField(m.membership_id),
        escapeCsvField(m.full_name),
        escapeCsvField(m.phone),
        escapeCsvField(m.dob),
        escapeCsvField(m.district),
        escapeCsvField(m.vmi_experience),
        escapeCsvField(m.team_name),
        escapeCsvField(m.coordinator),
        escapeCsvField(m.created_at)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    // 4. Return as a downloadable CSV file
    const dateStamp = new Date().toISOString().split('T')[0];
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="TVK_Members_${dateStamp}.csv"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(`Server error: ${err.message}`, { status: 500 });
  }
}