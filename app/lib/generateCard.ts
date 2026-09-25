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
    console.error('Failed to load opentype font:', e);
  }
  return null;
}

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
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" font-weight="bold">${text}</text>`;
  }

  try {
    const path = font.getPath(text, x, y, fontSize);
    path.fill = color;
    return path.toSVG(2);
  } catch (e) {
    console.error('Error converting text to path:', e);
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${text}</text>`;
  }
}

// Deep search helper to retrieve property values from flat or nested objects
function getMemberValue(member: any, keys: string[], fallback: string = ''): string {
  if (!member || typeof member !== 'object') return fallback;

  // Flatten potential nested containers
  const targets = [
    member,
    member.raw_user_meta_data,
    member.user_metadata,
    member.metadata,
    member.data,
  ].filter(Boolean);

  for (const obj of targets) {
    // 1. Exact match
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]).trim();
      }
    }

    // 2. Case-insensitive match
    const lowerKeys = keys.map((k) => k.toLowerCase());
    for (const key of Object.keys(obj)) {
      if (lowerKeys.includes(key.toLowerCase())) {
        const val = obj[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  return fallback;
}

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  // Log full Supabase object structure to Vercel Function Logs for debugging
  console.log('=== SUPABASE RECORD RAW DATA ===');
  console.log(JSON.stringify(member, null, 2));

  if (!member) member = {};

  const font = await getFont();

  // Field resolution with broad matching criteria
  const full_name = getMemberValue(member, ['full_name', 'fullname', 'name', 'member_name', 'Name', 'first_name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth', 'birth_date', 'DOB', 'created_at']);
  const gender = getMemberValue(member, ['gender', 'sex', 'Gender']);
  const membership_id = getMemberValue(member, ['temp_id', 'temporary_id', 'id', 'member_id', 'ID', 'code']);
  const district = getMemberValue(member, ['district', 'city', 'location', 'District', 'district_name']);
  const team_name = getMemberValue(member, ['team_name', 'team', 'Team'], 'State HQ Team');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name', 'Coordinator']);
  const phone = getMemberValue(member, ['phone', 'phone_number', 'mobile', 'Phone', 'contact']);
  const photoUrl = getMemberValue(member, ['photo_url', 'photoUrl', 'photo', 'avatar_url', 'Photo']);

  // 1. Read template image
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

  // 2. Fetch member photo
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

  // 3. Render vector text paths at startX = 515
  const startX = 540;
  const pathFullName = textToPathSvg(font, full_name, startX, 242, 18, '#000000');
  const pathDob = textToPathSvg(font, dob, startX, 279, 17, '#000000');
  const pathGender = textToPathSvg(font, gender, startX, 316, 17, '#000000');
  const pathMembershipId = textToPathSvg(font, membership_id, startX, 353, 17, '#C00000');
  const pathDistrict = textToPathSvg(font, district, startX, 390, 17, '#000000');
  const pathTeamName = textToPathSvg(font, team_name, startX, 427, 17, '#000000');
  const pathCoordinator = textToPathSvg(font, coordinator, startX, 464, 17, '#000000');
  const pathPhone = textToPathSvg(font, phone, startX, 501, 18, '#0056B3');

  // 4. Build output SVG
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
        ${pathMembershipId}
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