import path from 'path';
import fs from 'fs';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  if (!member) member = {};

  // Extract registered values
  const fullName = String(
    member.full_name || member.fullname || member.fullName || member.name || ''
  ).trim();

  const dob = String(
    member.dob || member.date_of_birth || member.birth_date || ''
  ).trim();

  const gender = String(
    member.gender || member.sex || ''
  ).trim();

  const tempId = String(
    member.membership_id || member.temporary_id || member.id || ''
  ).trim();

  const district = String(
    member.district || member.city || ''
  ).trim();

  const teamName = String(
    member.team_name || member.team || 'State HQ Team'
  ).trim();

  const coordinator = String(
    member.coordinator || member.coordinator_name || ''
  ).trim();

  const phone = String(
    member.phone || member.phone_number || member.mobile || ''
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

  // Helper function to sanitize text for SVG
  const escapeSvgText = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // 3. Build SVG overlay with raw system fonts (sans-serif)
  const svgString = `
    <svg width="1024" height="654" viewBox="0 0 1024 654" xmlns="http://www.w3.org/2000/svg">
      <style>
        .card-text {
          font-family: sans-serif, serif;
          font-weight: 700;
          fill: #000000;
        }
        .highlight-text {
          font-family: sans-serif, serif;
          font-weight: 700;
          fill: #C00000;
        }
        .phone-text {
          font-family: sans-serif, serif;
          font-weight: 700;
          fill: #0056B3;
        }
      </style>

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

      <!-- Text overlay directly on top of template underline space (x="330") -->
      <!-- Name / ಹೆಸರು -->
      <text x="330" y="250" font-size="18" class="card-text">${escapeSvgText(fullName)}</text>

      <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
      <text x="330" y="287" font-size="17" class="card-text">${escapeSvgText(dob)}</text>

      <!-- Gender / ಲಿಂಗ -->
      <text x="330" y="324" font-size="17" class="card-text">${escapeSvgText(gender)}</text>

      <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
      <text x="330" y="361" font-size="17" class="highlight-text">${escapeSvgText(tempId)}</text>

      <!-- District / ಜಿಲ್ಲೆ -->
      <text x="330" y="398" font-size="17" class="card-text">${escapeSvgText(district)}</text>

      <!-- Team Name / ತಂಡದ ಹೆಸರು -->
      <text x="330" y="435" font-size="17" class="card-text">${escapeSvgText(teamName)}</text>

      <!-- Coordinator / ಸಂಯೋಜಕ -->
      <text x="330" y="472" font-size="17" class="card-text">${escapeSvgText(coordinator)}</text>

      <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
      <text x="330" y="509" font-size="18" class="phone-text">${escapeSvgText(phone)}</text>
    </svg>
  `;

  // 4. Dynamically import Resvg and pass default system font configuration
  const { Resvg } = await import('@resvg/resvg-js');

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: 1024,
    },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}