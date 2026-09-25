import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import * as opentype from 'opentype.js';

let cachedFont: opentype.Font | null = null;

async function getFont(): Promise<opentype.Font | null> {
  if (cachedFont) return cachedFont;
  const fontPath = path.join(process.cwd(), 'public', 'Roboto-Bold.ttf');

  if (fs.existsSync(fontPath)) {
    const fontBuf = fs.readFileSync(fontPath);
    const arrayBuf = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
    cachedFont = opentype.parse(arrayBuf);
    return cachedFont;
  }

  try {
    const fontRes = await fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
    );
    if (fontRes.ok) {
      const fontArray = await fontRes.arrayBuffer();
      cachedFont = opentype.parse(fontArray);
      return cachedFont;
    }
  } catch (e) {
    console.error('Failed to load TTF font:', e);
  }
  return null;
}

// Safely convert string glyph by glyph into SVG vector paths
function safeTextToPath(
  font: opentype.Font | null,
  text: string,
  startX: number,
  y: number,
  fontSize: number,
  color: string
): string {
  if (!text || !font) return '';

  let currentX = startX;
  let svgPaths = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      currentX += fontSize * 0.35;
      continue;
    }

    try {
      const glyph = font.charToGlyph(char);
      const pathObj = glyph.getPath(currentX, y, fontSize);
      pathObj.fill = color;
      svgPaths += pathObj.toSVG(2);
      currentX += (glyph.advanceWidth || 1000) * (fontSize / font.unitsPerEm);
    } catch (e) {
      console.error(`Error generating path for char '${char}':`, e);
      currentX += fontSize * 0.5;
    }
  }

  return svgPaths;
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
  const publicDir = path.join(process.cwd(), 'public');

  // 1. Read template image
  let templatePath = path.join(publicDir, 'id-template.png');
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(publicDir, 'id-template.jpg');
  }

  let baseImageBuffer: Buffer;
  if (fs.existsSync(templatePath)) {
    baseImageBuffer = fs.readFileSync(templatePath);
  } else {
    baseImageBuffer = await sharp({
      create: {
        width: 1600,
        height: 1022,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  }

  const metadata = await sharp(baseImageBuffer).metadata();
  const canvasWidth = metadata.width || 1600;
  const canvasHeight = metadata.height || 1022;

  // 2. Extract database fields
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth']);
  const gender = getMemberValue(member, ['gender', 'sex']);
  const tempId = getMemberValue(member, ['membership_id', 'temp_id', 'id']);
  const district = getMemberValue(member, ['district', 'city']);
  const teamName = getMemberValue(member, ['team_name', 'team'], 'Akila Karnataka Maanila Thalamai TVK');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name']);
  const phone = getMemberValue(member, ['phone', 'mobile']);
  const photoUrl = getMemberValue(member, ['photo_url', 'avatar_url']);

  const compositeLayers: Array<{ input: Buffer; top?: number; left?: number }> = [];

  // 3. Member photo (left: 1210, top: 410, size: 260x310)
  if (photoUrl && String(photoUrl).startsWith('http')) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const photoArrBuffer = await imgRes.arrayBuffer();
        const rawPhotoBuffer = Buffer.from(photoArrBuffer);

        const processedPhoto = await sharp(rawPhotoBuffer)
          .resize(260, 310, { fit: 'cover' })
          .toBuffer();

        compositeLayers.push({
          input: processedPhoto,
          left: 1210,
          top: 410,
        });
      }
    } catch (e) {
      console.error('Failed to fetch photo:', e);
    }
  }

  // 4. Generate glyph paths for all fields (startX = 780)
  const startX = 780;

  const pathFullName = safeTextToPath(font, fullName, startX, 410, 28, '#000000');
  const pathDob = safeTextToPath(font, dob, startX, 455, 26, '#000000');
  const pathGender = safeTextToPath(font, gender, startX, 505, 26, '#000000');
  const pathTempId = safeTextToPath(font, tempId, startX, 553, 26, '#C00000');
  const pathDistrict = safeTextToPath(font, district, startX, 600, 26, '#000000');
  const pathTeamName = safeTextToPath(font, teamName, startX, 650, 24, '#000000');
  const pathCoordinator = safeTextToPath(font, coordinator, startX, 700, 24, '#000000');
  const pathPhone = safeTextToPath(font, phone, startX, 749, 28, '#000000');

  const svgVectorOverlay = Buffer.from(`
    <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
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
  `);

  compositeLayers.push({
    input: svgVectorOverlay,
    top: 0,
    left: 0,
  });

  // 5. Composite photo & text vector shapes onto template
  return await sharp(baseImageBuffer)
    .composite(compositeLayers)
    .png()
    .toBuffer();
}