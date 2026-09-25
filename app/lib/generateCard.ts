import { createClient } from '@supabase/supabase-js';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  const fullName = member.full_name || member.fullName || member.name || 'Member';
  const phone = member.phone || member.phone_number || member.mobile || 'N/A';
  const district = member.district || 'Karnataka';
  const photoUrl = member.photo_url || member.photoUrl || member.photo || '';

  // 1. Fetch member photo as base64 data URI if available
  let photoBase64 = '';
  if (photoUrl && photoUrl.startsWith('http')) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = imgRes.headers.get('content-type') || 'image/png';
        photoBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
      }
    } catch {
      photoBase64 = '';
    }
  }

  // 2. Build the SVG layout for the ID Card
  const svgString = `
    <svg width="1200" height="750" viewBox="0 0 1200 750" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Header Bar -->
      <rect width="1200" height="750" fill="#FFFFFF" rx="24" />
      <rect width="1200" height="180" fill="#0B132B" rx="24" />
      
      <!-- Title -->
      <text x="600" y="110" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
        TVK KARNATAKA MEMBERSHIP CARD
      </text>

      <!-- Member Photo -->
      ${
        photoBase64
          ? `<image x="100" y="240" width="280" height="350" href="${photoBase64}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0px round 16px)"/>`
          : `<rect x="100" y="240" width="280" height="350" fill="#E0E0E0" rx="16"/>
             <text x="240" y="425" font-family="Arial, sans-serif" font-size="28" fill="#666666" text-anchor="middle">No Photo</text>`
      }

      <!-- Details Column -->
      <text x="440" y="290" font-family="Arial, sans-serif" font-size="30" fill="#666666">Full Name:</text>
      <text x="440" y="340" font-family="Arial, sans-serif" font-size="38" font-weight="bold" fill="#0B132B">${fullName}</text>

      <text x="440" y="420" font-family="Arial, sans-serif" font-size="30" fill="#666666">Phone Number:</text>
      <text x="440" y="470" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#0056B3">${phone}</text>

      <text x="440" y="550" font-family="Arial, sans-serif" font-size="30" fill="#666666">District:</text>
      <text x="440" y="600" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#0B132B">${district}</text>

      <!-- Card Footer Line -->
      <rect x="0" y="710" width="1200" height="40" fill="#0B132B" />
    </svg>
  `;

  // 3. Dynamically import Resvg at runtime to prevent bundler errors
  const { Resvg } = await import('@resvg/resvg-js');

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return Buffer.from(pngBuffer);
}