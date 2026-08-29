import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      fullName, 
      phone, 
      dob, 
      district, 
      vmiExperience, 
      teamName, 
      coordinator 
    } = body;

    // Check each field explicitly (handles 0 properly for vmiExperience)
    if (
      !fullName?.trim() ||
      !phone?.trim() ||
      !dob?.trim() ||
      !district?.trim() ||
      vmiExperience === undefined ||
      vmiExperience === null ||
      vmiExperience === '' ||
      !teamName?.trim() ||
      !coordinator?.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // Generate unique Membership ID
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const membershipId = `TVK-KA-${randomNum}`;

    // Insert to Supabase
    const { data, error } = await supabase
      .from('members')
      .insert([
        {
          membership_id: membershipId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          dob: dob,
          district: district.trim(),
          vmi_experience: Number(vmiExperience) || 0,
          team_name: teamName.trim(),
          coordinator: coordinator.trim()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Return the member payload for the frontend ID card
    return NextResponse.json({
      success: true,
      member: {
        membershipId: data.membership_id,
        fullName: data.full_name,
        phone: data.phone,
        dob: data.dob,
        district: data.district,
        vmiExperience: data.vmi_experience,
        teamName: data.team_name,
        coordinator: data.coordinator
      }
    }, { status: 201 });

  } catch (err) {
    console.error('Route handler error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}