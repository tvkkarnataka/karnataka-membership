import { NextResponse } from 'next/server';

const otpStore = new Map<string, string>();

export async function POST(req: Request) {
  try {
    const { action, phone, otp } = await req.json();

    if (action === 'SEND') {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(phone, generatedOtp);

      console.log(`\n============================\n[DEV OTP] Code for ${phone}: ${generatedOtp}\n============================\n`);

      return NextResponse.json({ success: true });
    }

    if (action === 'VERIFY') {
      const savedOtp = otpStore.get(phone);
      if (savedOtp && savedOtp === otp) {
        otpStore.delete(phone);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
