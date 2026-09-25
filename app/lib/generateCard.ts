import path from 'path';
import fs from 'fs';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  // Extract values with fallbacks across common database column names
  const fullName = member.full_name || member.fullName || member.name || 'N/A';
  const dob = member.dob || member.date_of_birth || member.birth_date || 'N/A';
  const gender = member.gender || member.sex || 'N/A';
  const tempId = member.temp_id || member.temporary_id || member.id || 'N/A';
  const district = member.district || member.city || 'N/A';
  const teamName = member.team_name || member.team || 'State HQ Team';
  const coordinator = member.coordinator || member.coordinator_name || 'N/A';
  const phone = member.phone || member.phone_number || member.mobile || 'N/A';
  const photoUrl = member.photo_url || member.photoUrl || member.photo || member.avatar_url || '';

  // 1. Read background template from public folder
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

  // 2. Fetch member photo as base64 URI
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

  // 3. Build SVG overlay with high-contrast text rendering
  const svgString = `
    <svg width="1024" height="654" viewBox="0 0 1024 654" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Template -->
      ${
        backgroundBase64
          ? `<image x="0" y="0" width="1024" height="654" href="${backgroundBase64}" preserveAspectRatio="none"/>`
          : `<rect width="1024" height="654" fill="#FFFFFF"/>`
      }

      <!-- Centered Member Photo -->
      ${
        photoBase64
          ? `<image x="808" y="242" width="170" height="210" href="${photoBase64}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0px round 6px)"/>`
          : ''
      }

      <!-- Explicit Text Overlays aligned precisely on line height -->
      <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" fill="#000000" dominant-baseline="alphabetic">
        <!-- Name / ಹೆಸರು -->
        <text x="490" y="252" font-size="20">${fullName}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="490" y="289" font-size="18">${dob}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="490" y="326" font-size="18">${gender}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="490" y="363" font-size="18" fill="#C00000">${tempId}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="490" y="400" font-size="18">${district}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="490" y="437" font-size="18">${teamName}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="490" y="474" font-size="18">${coordinator}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="490" y="511" font-size="20" fill="#0056B3">${phone}</text>
      </g>
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