import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

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

  const publicDir = path.join(process.cwd(), 'public');

  // 1. Read base template
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

  // 2. Read local font and convert to Base64
  let fontBase64 = '';
  const fontPath = path.join(publicDir, 'Roboto-Bold.ttf');
  if (fs.existsSync(fontPath)) {
    fontBase64 = fs.readFileSync(fontPath).toString('base64');
  }

  // 3. Extract database values
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

  // 4. Member Photo -> Verified positions (left: 1210, top: 410, size: 260x310)
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

  // 5. SVG overlay with embedded base64 font (startX = 820)
  const startX = 820;
  const fontFaceStyle = fontBase64
    ? `@font-face {
        font-family: 'EmbeddedRoboto';
        src: url('data:font/ttf;charset=utf-8;base64,${fontBase64}') format('truetype');
        font-weight: bold;
      }`
    : '';

  const svgTextOverlay = Buffer.from(`
    <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          ${fontFaceStyle}
          .bold-val {
            font-family: 'EmbeddedRoboto', Arial, sans-serif;
            font-weight: bold;
          }
        </style>
      </defs>
      <g class="bold-val">
        <!-- Name / ಹೆಸರು -->
        <text x="${startX}" y="385" font-size="28" fill="#000000">${escapeXml(fullName)}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="${startX}" y="443" font-size="26" fill="#000000">${escapeXml(dob)}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="${startX}" y="501" font-size="26" fill="#000000">${escapeXml(gender)}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="${startX}" y="559" font-size="26" fill="#C00000">${escapeXml(tempId)}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="${startX}" y="617" font-size="26" fill="#000000">${escapeXml(district)}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="${startX}" y="675" font-size="24" fill="#000000">${escapeXml(teamName)}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="${startX}" y="733" font-size="24" fill="#000000">${escapeXml(coordinator)}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="${startX}" y="791" font-size="28" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `);

  compositeLayers.push({
    input: svgTextOverlay,
    top: 0,
    left: 0,
  });

  // 6. Composite photo & text onto base template
  return await sharp(baseImageBuffer)
    .composite(compositeLayers)
    .png()
    .toBuffer();
}