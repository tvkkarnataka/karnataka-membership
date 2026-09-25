import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      fullName, 
      phone, 
      dob, 
      gender, 
      district, 
      teamName, 
      coordinator, 
      photoUrl, 
      aadharUrl, 
      panUrl 
    } = body;

    if (!fullName || !phone || !dob || !gender || !district || !photoUrl || !aadharUrl || !panUrl) {
      return NextResponse.json(
        { success: false, error: 'Please fill in all fields (including Gender) and ensure documents are uploaded.' },
        { status: 400 }
      );
    }

    const sanitizedPhone = String(phone).trim().replace(/\D/g, '');
    if (sanitizedPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // Duplicate check
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('phone', sanitizedPhone)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: 'Mobile number already registered.' },
        { status: 409 }
      );
    }

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const membershipId = `TVK-KA-${randomSuffix}`;

    const { data, error } = await supabaseAdmin
      .from('members')
      .insert([
        {
          membership_id: membershipId,
          full_name: fullName.trim(),
          phone: sanitizedPhone,
          dob: dob,
          gender: gender ? gender.trim() : null, // <--- Passes Gender to Supabase
          district: district.trim(),
          team_name: teamName ? teamName.trim() : null,
          coordinator: coordinator ? coordinator.trim() : null,
          photo_url: photoUrl,
          aadhar_url: aadharUrl,
          pan_url: panUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Mobile number already registered.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error occurred.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}