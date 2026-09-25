import path from 'path';
import fs from 'fs';

let cachedFontBuffer: Buffer | null = null;

async function getFontBuffer(): Promise<Buffer | null> {
  if (cachedFontBuffer) return cachedFontBuffer;
  try {
    const fontRes = await fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
    );
    if (fontRes.ok) {
      const arrayBuf = await fontRes.arrayBuffer();
      cachedFontBuffer = Buffer.from(arrayBuf);
      return cachedFontBuffer;
    }
  } catch (e) {
    console.error('Failed to fetch font buffer:', e);
  }
  return null;
}

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

  const fontBuffer = await getFontBuffer();

  // Map database properties based on your Supabase raw record keys
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth']);
  const gender = getMemberValue(member, ['gender', 'sex']);
  const tempId = getMemberValue(member, ['membership_id', 'temp_id', 'id']);
  const district = getMemberValue(member, ['district', 'city']);
  const teamName = getMemberValue(member, ['team_name', 'team'], 'Akila Karnataka Maanila Thalamai TVK');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name']);
  const phone = getMemberValue(member, ['phone', 'mobile']);
  const photoUrl = getMemberValue(member, ['photo_url', 'avatar_url']);

  // 1. Read background template
  let backgroundBase64 = '';
  const publicDir = path.join(process.cwd(), 'public');
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

  // 2. Fetch photo as Base64 Data URI
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

  // 3. Construct clean SVG text nodes using `dominant-baseline="alphabetic"`
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

      <!-- Native Resvg Font Text Overlay -->
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
        <text x="${startX}" y="431" font-size="16" fill="#000000">${escapeXml(teamName)}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="${startX}" y="468" font-size="16" fill="#000000">${escapeXml(coordinator)}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="${startX}" y="505" font-size="18" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `;

  // 4. Pass font buffer directly to Resvg options
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