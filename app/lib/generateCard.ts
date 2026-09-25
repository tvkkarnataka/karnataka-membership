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

  // 1. Read base background template
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
        width: 1024,
        height: 654,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  }

  // 2. Extract member details from database row
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

  // 3. Process Member Photo -> Positioned strictly at left: 808, top: 242 inside the photo frame
  if (photoUrl && String(photoUrl).startsWith('http')) {
    try {
      const imgRes = await fetch(photoUrl);
      if (imgRes.ok) {
        const photoArrBuffer = await imgRes.arrayBuffer();
        const rawPhotoBuffer = Buffer.from(photoArrBuffer);

        // Crop & Resize photo to match box (170x210)
        const processedPhoto = await sharp(rawPhotoBuffer)
          .resize(170, 210, { fit: 'cover' })
          .toBuffer();

        compositeLayers.push({
          input: processedPhoto,
          left: 808,
          top: 242,
        });
      }
    } catch (e) {
      console.error('Failed to fetch user photo:', e);
    }
  }

  // 4. Pure SVG Text Overlay for database field values
  const startX = 550;
  const svgTextOverlay = Buffer.from(`
    <svg width="1024" height="654" xmlns="http://www.w3.org/2000/svg">
      <style>
        .card-text {
          font-family: Arial, sans-serif;
          font-weight: bold;
        }
      </style>
      <g class="card-text">
        <!-- Name / ಹೆಸರು -->
        <text x="${startX}" y="246" font-size="19" fill="#000000">${escapeXml(fullName)}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="${startX}" y="283" font-size="18" fill="#000000">${escapeXml(dob)}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="${startX}" y="320" font-size="18" fill="#000000">${escapeXml(gender)}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="${startX}" y="357" font-size="18" fill="#C00000">${escapeXml(tempId)}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="${startX}" y="394" font-size="18" fill="#000000">${escapeXml(district)}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="${startX}" y="431" font-size="15" fill="#000000">${escapeXml(teamName)}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="${startX}" y="468" font-size="15" fill="#000000">${escapeXml(coordinator)}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="${startX}" y="505" font-size="19" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `);

  compositeLayers.push({
    input: svgTextOverlay,
    top: 0,
    left: 0,
  });

  // 5. Composite photo & text onto base template
  return await sharp(baseImageBuffer)
    .composite(compositeLayers)
    .png()
    .toBuffer();
}