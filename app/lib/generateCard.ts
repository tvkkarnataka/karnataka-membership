import path from 'path';
import fs from 'fs';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  // Print incoming member object to Vercel logs for debugging
  console.log('Incoming member data for ID card:', JSON.stringify(member));

  if (!member) {
    member = {};
  }

  // Extract fields with exhaustive fallbacks across all database naming conventions
  const fullName = String(
    member.full_name ||
    member.fullname ||
    member.fullName ||
    member.name ||
    member.member_name ||
    ''
  ).trim();

  const dob = String(
    member.dob ||
    member.date_of_birth ||
    member.birth_date ||
    member.created_at?.split('T')[0] ||
    ''
  ).trim();

  const gender = String(
    member.gender ||
    member.sex ||
    ''
  ).trim();

  const tempId = String(
    member.temp_id ||
    member.temporary_id ||
    member.id ||
    member.membership_id ||
    ''
  ).trim();

  const district = String(
    member.district ||
    member.city ||
    member.location ||
    ''
  ).trim();

  const teamName = String(
    member.team_name ||
    member.team ||
    'State HQ Team'
  ).trim();

  const coordinator = String(
    member.coordinator ||
    member.coordinator_name ||
    ''
  ).trim();

  const phone = String(
    member.phone ||
    member.phone_number ||
    member.mobile ||
    ''
  ).trim();

  const photoUrl = member.photo_url || member.photoUrl || member.photo || member.avatar_url || '';

  // 1. Read background template from public folder
  let backgroundBase64 = '';
  try {
    const publicDir = path.join(process.cwd(), 'public');
    let templatePath = path.join(publicDir, 'id-template.png');
    let contentType = 'image/png';

    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(publicDir, 'id-template.jpg');
      contentType = 'image/jpeg';
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
  if (photoUrl && String(photoUrl).startsWith('http')) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const type = imgRes.headers.get('content-type') || 'image/png';
        photoBase64 = `data:${type};base64,${buffer.toString('base64')}`;
      }
    } catch (err) {
      console.error('Failed to fetch photo URL:', err);
    }
  }

  // 3. Build SVG overlay placing text on top of the blank lines (x="320")
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

      <!-- Registered Member Details directly on the underline -->
      <g font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" fill="#000000">
        <!-- Name / ಹೆಸರು -->
        <text x="320" y="250" font-size="18">${fullName}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="320" y="287" font-size="17">${dob}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="320" y="324" font-size="17">${gender}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="320" y="361" font-size="17" fill="#C00000">${tempId}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="320" y="398" font-size="17">${district}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="320" y="435" font-size="17">${teamName}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="320" y="472" font-size="17">${coordinator}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="320" y="509" font-size="18" fill="#0056B3">${phone}</text>
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