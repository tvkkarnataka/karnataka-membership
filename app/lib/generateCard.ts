import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

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

// Create clean text image buffer using Sharp's text engine
async function createTextImage(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  color: string = '#000000'
): Promise<Buffer> {
  if (!text) text = ' ';

  const svg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="${fontSize}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${text}</text>
    </svg>
  `);

  return await sharp(svg).png().toBuffer();
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

  // 2. Extract database values
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth']);
  const gender = getMemberValue(member, ['gender', 'sex']);
  const tempId = getMemberValue(member, ['membership_id', 'temp_id', 'id']);
  const district = getMemberValue(member, ['district', 'city']);
  const teamName = getMemberValue(member, ['team_name', 'team'], 'Akila Karnataka Maanila Thalamai TVK');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name']);
  const phone = getMemberValue(member, ['phone', 'mobile']);
  const photoUrl = getMemberValue(member, ['photo_url', 'avatar_url']);

  const compositeLayers: Array<{ input: Buffer; top: number; left: number }> = [];

  // 3. Process Member Photo (Your exact box coordinates: left 1210, top 410, size 260x310)
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

  // 4. Create individual text image buffers to bypass font rendering bugs (startX = 820)
  const startX = 820;

  const fields = [
    { text: fullName, top: 355, size: 28, color: '#000000' },
    { text: dob, top: 413, size: 26, color: '#000000' },
    { text: gender, top: 471, size: 26, color: '#000000' },
    { text: tempId, top: 529, size: 26, color: '#C00000' },
    { text: district, top: 587, size: 26, color: '#000000' },
    { text: teamName, top: 645, size: 24, color: '#000000' },
    { text: coordinator, top: 703, size: 24, color: '#000000' },
    { text: phone, top: 761, size: 28, color: '#0056B3' },
  ];

  for (const field of fields) {
    if (field.text) {
      const textImg = await createTextImage(
        field.text,
        380,
        field.size + 15,
        field.size,
        field.color
      );
      compositeLayers.push({
        input: textImg,
        left: startX,
        top: field.top,
      });
    }
  }

  // 5. Composite photo & text layers onto base template
  return await sharp(baseImageBuffer)
    .composite(compositeLayers)
    .png()
    .toBuffer();
}