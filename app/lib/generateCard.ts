import path from 'path';
import fs from 'fs';

function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getMemberValue(member: any, keys: string[], fallback: string = ''): string {
  if (!member || typeof member !== 'object') return fallback;

  for (const k of keys) {
    if (member[k] !== undefined && member[k] !== null && String(member[k]).trim() !== '') {
      return String(member[k]).trim();
    }
  }

  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const key of Object.keys(member)) {
    if (lowerKeys.includes(key.toLowerCase())) {
      const val = member[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }

  return fallback;
}

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  if (!member) member = {};

  // Extract member details from database row
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth']);
  const gender = getMemberValue(member, ['gender', 'sex']);
  const tempId = getMemberValue(member, ['membership_id', 'temp_id', 'id']);
  const district = getMemberValue(member, ['district', 'city']);
  const teamName = getMemberValue(member, ['team_name', 'team'], 'Akila Karnataka Maanila Thalamai TVK');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name']);
  const phone = getMemberValue(member, ['phone', 'mobile']);
  const photoUrl = getMemberValue(member, ['photo_url', 'avatar_url']);

  const publicDir = path.join(process.cwd(), 'public');

  // 1. Read local font file from public folder
  let fontBuffer: Buffer | null = null;
  const localFontPath = path.join(publicDir, 'Roboto-Bold.ttf');
  if (fs.existsSync(localFontPath)) {
    fontBuffer = fs.readFileSync(localFontPath);
  } else {
    // Online fallback if local file is missing
    try {
      const fontRes = await fetch(
        'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
      );
      if (fontRes.ok) {
        const fontArray = await fontRes.arrayBuffer();
        fontBuffer = Buffer.from(fontArray);
      }
    } catch (e) {
      console.error('Failed to fetch fallback font:', e);
    }
  }

  // 2. Read background template
  let backgroundBase64 = '';
  try {
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

  // 3. Fetch member photo as Base64 URI
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
      console.error('Failed to fetch photo:', err);
    }
  }

  // 4. Build SVG string
  const startX = 540;
  const svgString = `
    <svg width="1024" height="654" viewBox="0 0 1024 654" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Template -->
      ${
        backgroundBase64
          ? `<image x="0" y="0" width="1024" height="654" href="${backgroundBase64}" preserveAspectRatio="none"/>`
          : `<rect width="1024" height="654" fill="#FFFFFF"/>`
      }

      <!-- Member Photo -->
      ${
        photoBase64
          ? `<image x="808" y="242" width="170" height="210" href="${photoBase64}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0px round 6px)"/>`
          : ''
      }

      <!-- Clean SVG Text Overlay -->
      <g font-family="Roboto" font-weight="bold">
        <!-- Name / ಹೆಸರು -->
        <text x="${startX}" y="246" font-size="18" fill="#000000">${escapeXml(fullName)}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="${startX}" y="283" font-size="17" fill="#000000">${escapeXml(dob)}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="${startX}" y="320" font-size="17" fill="#000000">${escapeXml(gender)}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="${startX}" y="357" font-size="17" fill="#C00000">${escapeXml(tempId)}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="${startX}" y="394" font-size="17" fill="#000000">${escapeXml(district)}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="${startX}" y="431" font-size="15" fill="#000000">${escapeXml(teamName)}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="${startX}" y="468" font-size="15" fill="#000000">${escapeXml(coordinator)}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="${startX}" y="505" font-size="18" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `;

  // 5. Render PNG with Resvg using loaded local font buffer
  const { Resvg } = await import('@resvg/resvg-js');
  
  const resvgOptions: any = {
    fitTo: { mode: 'width', value: 1024 },
  };

  if (fontBuffer) {
    resvgOptions.font = {
      fontBuffers: [fontBuffer],
      defaultFontFamily: 'Roboto',
    };
  }

  const resvg = new Resvg(svgString, resvgOptions);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}