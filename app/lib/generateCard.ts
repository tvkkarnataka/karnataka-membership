import path from 'path';
import fs from 'fs';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  // Gracefully fallback across common Supabase database column names
  const fullName = member.full_name || member.fullName || member.name || '';
  const dob = member.dob || member.date_of_birth || member.birth_date || member.created_at?.split('T')[0] || '';
  const gender = member.gender || member.sex || '';
  const tempId = member.temp_id || member.temporary_id || member.id || '';
  const district = member.district || member.city || '';
  const teamName = member.team_name || member.team || 'State HQ Team';
  const coordinator = member.coordinator || member.coordinator_name || '';
  const phone = member.phone || member.phone_number || member.mobile || '';
  const photoUrl = member.photo_url || member.photoUrl || member.photo || member.avatar_url || '';

  // 1. Read template from public folder
  let backgroundBase64 = '';
  try {
    const publicDir = path.join(process.cwd(), 'public');
    let templatePath = path.join(publicDir, 'id-template.jpg');
    let contentType = 'image/jpeg';

    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(publicDir, 'id-template.png');
      contentType = 'image/png';
    }

    if (fs.existsSync(templatePath)) {
      const templateBuffer = fs.readFileSync(templatePath);
      backgroundBase64 = `data:${contentType};base64,${templateBuffer.toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to load background template:', e);
  }

  // 2. Fetch member photo as base64 data URI
  let photoBase64 = '';
  if (photoUrl && photoUrl.startsWith('http')) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const type = imgRes.headers.get('content-type') || 'image/png';
        photoBase64 = `data:${type};base64,${buffer.toString('base64')}`;
      }
    } catch {
      photoBase64 = '';
    }
  }

  // 3. Build SVG layer
  // Photo coordinates tuned to fit strictly within the white 'PHOTO HERE' box frame
  const svgString = `
    <svg width="1024" height="654" viewBox="0 0 1024 654" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Template -->
      ${
        backgroundBase64
          ? `<image x="0" y="0" width="1024" height="654" href="${backgroundBase64}" preserveAspectRatio="none"/>`
          : `<rect width="1024" height="654" fill="#FFFFFF"/>`
      }

      <!-- Member Photo (Sized & positioned strictly inside the template white box) -->
      ${
        photoBase64
          ? `<image x="808" y="243" width="170" height="195" href="${photoBase64}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0px round 8px)"/>`
          : ''
      }

      <!-- Text Field Overlays placed right after the colons -->
      <!-- Name / ಹೆಸರು -->
      <text x="525" y="254" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#0B132B">${fullName}</text>

      <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
      <text x="525" y="291" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#0B132B">${dob}</text>

      <!-- Gender / ಲಿಂಗ -->
      <text x="525" y="328" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#0B132B">${gender}</text>

      <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
      <text x="525" y="365" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#C00000">${tempId}</text>

      <!-- District / ಜಿಲ್ಲೆ -->
      <text x="525" y="402" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#0B132B">${district}</text>

      <!-- Team Name / ತಂಡದ ಹೆಸರು -->
      <text x="525" y="439" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#0B132B">${teamName}</text>

      <!-- Coordinator / ಸಂಯೋಜಕ -->
      <text x="525" y="476" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#0B132B">${coordinator}</text>

      <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
      <text x="525" y="513" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#0056B3">${phone}</text>
    </svg>
  `;

  // 4. Dynamically import Resvg
  const { Resvg } = await import('@resvg/resvg-js');

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: 1024,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}