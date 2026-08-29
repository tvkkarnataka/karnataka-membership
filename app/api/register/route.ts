import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone, dob, district, teamName, coordinator } = body;

    // 1. Basic Validation
    if (!fullName || !phone || !dob || !district) {
      return NextResponse.json(
        { error: 'Please fill in all mandatory fields.' },
        { status: 400 }
      );
    }

    // 2. Generate Random Membership ID
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const membershipId = `TVK-KA-${randomSuffix}`;

    // 3. Insert into Supabase
    const { data, error } = await supabase
      .from('members')
      .insert([
        {
          membership_id: membershipId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          dob: dob,
          district: district.trim(),
          team_name: teamName ? teamName.trim() : 'N/A',
          coordinator: coordinator ? coordinator.trim() : 'N/A',
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Mobile number already registered.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data: data || {
          membership_id: membershipId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          dob: dob,
          district: district.trim(),
          team_name: teamName || 'N/A',
          coordinator: coordinator || 'N/A',
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}