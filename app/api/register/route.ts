import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, phone, dob, district, teamName, coordinator } = body;

    // 1. Mandatory field checks
    if (!fullName || !phone || !dob || !district) {
      return NextResponse.json(
        { error: 'Please fill in all required fields.' },
        { status: 400 }
      );
    }

    // 2. Sanitize and validate 10-digit mobile number
    const sanitizedPhone = String(phone).trim().replace(/\D/g, '');
    if (sanitizedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // 3. Duplicate phone check
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('phone', sanitizedPhone)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: 'Mobile number already registered. Please check your number.' },
        { status: 409 }
      );
    }

    // 4. Generate random TVK Membership ID
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const membershipId = `TVK-KA-${randomSuffix}`;

    // 5. Insert member row into Supabase
    const { data, error } = await supabaseAdmin
      .from('members')
      .insert([
        {
          membership_id: membershipId,
          full_name: fullName.trim(),
          phone: sanitizedPhone,
          dob: dob,
          district: district.trim(),
          team_name: teamName ? teamName.trim() : null,
          coordinator: coordinator ? coordinator.trim() : null,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Mobile number already registered. Please check your number.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Member registered successfully.',
        data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}