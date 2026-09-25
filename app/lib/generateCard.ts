import path from 'path';
import fs from 'fs';
import * as opentype from 'opentype.js';

let cachedFont: opentype.Font | null = null;

async function getFont(): Promise<opentype.Font | null> {
  if (cachedFont) return cachedFont;
  try {
    const fontRes = await fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
    );
    if (fontRes.ok) {
      const fontBuffer = await fontRes.arrayBuffer();
      cachedFont = opentype.parse(fontBuffer);
      return cachedFont;
    }
  } catch (e) {
    console.error('Failed to load font:', e);
  }
  return null;
}

// Convert plain text into SVG vector path without triggering OpenType lookup errors
function textToPathSvg(
  font: opentype.Font | null,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string
): string {
  if (!text) return '';
  if (!font) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${text}</text>`;
  }

  try {
    // Setting features: {} bypasses OpenType substitution lookup errors
    const pathObj = font.getPath(text, x, y, fontSize, { features: {} });
    pathObj.fill = color;
    return pathObj.toSVG(2);
  } catch (e) {
    console.error(`Error rendering text "${text}":`, e);
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${text}</text>`;
  }
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

  const font = await getFont();

  // Extract fields matching your Supabase row keys
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth']);
  const gender = getMemberValue(member, ['gender', 'sex']);
  const tempId = getMemberValue(member, ['membership_id', 'temp_id', 'id']);
  const district = getMemberValue(member, ['district', 'city']);
  const teamName = getMemberValue(member, ['team_name', 'team'], 'Akila Karnataka Maanila Thalamai TVK');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name']);
  const phone = getMemberValue(member, ['phone', 'mobile']);
  const photoUrl = getMemberValue(member, ['photo_url', 'avatar_url']);

  // 1. Read background template from public directory
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

  // 2. Fetch member photo as Base64 Data URI
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

  // 3. Convert all text fields into vector paths starting at x = 515
  const startX = 540;
  const pathFullName = textToPathSvg(font, fullName, startX, 242, 18, '#000000');
  const pathDob = textToPathSvg(font, dob, startX, 279, 17, '#000000');
  const pathGender = textToPathSvg(font, gender, startX, 316, 17, '#000000');
  const pathTempId = textToPathSvg(font, tempId, startX, 353, 17, '#C00000');
  const pathDistrict = textToPathSvg(font, district, startX, 390, 17, '#000000');
  const pathTeamName = textToPathSvg(font, teamName, startX, 427, 15, '#000000');
  const pathCoordinator = textToPathSvg(font, coordinator, startX, 464, 15, '#000000');
  const pathPhone = textToPathSvg(font, phone, startX, 501, 18, '#0056B3');

  // 4. Construct SVG string
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

      <!-- Vector Path Overlay -->
      <g>
        ${pathFullName}
        ${pathDob}
        ${pathGender}
        ${pathTempId}
        ${pathDistrict}
        ${pathTeamName}
        ${pathCoordinator}
        ${pathPhone}
      </g>
    </svg>
  `;

  // 5. Render PNG Buffer
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: 1024 },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}