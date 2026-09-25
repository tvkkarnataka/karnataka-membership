import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

let fontRegistered = false;

function registerFont() {
  if (fontRegistered) return;
  const fontPath = path.join(process.cwd(), 'public', 'Roboto-Bold.ttf');
  if (fs.existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, 'Roboto');
    fontRegistered = true;
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

  registerFont();

  // Create canvas matching template dimensions
  const canvas = createCanvas(1024, 654);
  const ctx = canvas.getContext('2d');

  // 1. Draw Background Template
  const publicDir = path.join(process.cwd(), 'public');
  let templatePath = path.join(publicDir, 'id-template.png');
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(publicDir, 'id-template.jpg');
  }

  if (fs.existsSync(templatePath)) {
    const bgImage = await loadImage(templatePath);
    ctx.drawImage(bgImage, 0, 0, 1024, 654);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1024, 654);
  }

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

  // 3. Draw Member Photo
  if (photoUrl && String(photoUrl).startsWith('http')) {
    try {
      const userPhoto = await loadImage(photoUrl);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(808, 242, 170, 210, 6);
      ctx.clip();
      ctx.drawImage(userPhoto, 808, 242, 170, 210);
      ctx.restore();
    } catch (e) {
      console.error('Failed to draw photo:', e);
    }
  }

  // 4. Render Text Overlay on Underlined Spaces (startX = 515)
  const fontName = fontRegistered ? 'Roboto' : 'sans-serif';
  const startX = 540;

  ctx.textBaseline = 'middle';

  // Full Name
  ctx.font = `bold 20px ${fontName}`;
  ctx.fillStyle = '#000000';
  ctx.fillText(fullName, startX, 238);

  // DOB
  ctx.font = `bold 18px ${fontName}`;
  ctx.fillText(dob, startX, 275);

  // Gender
  ctx.font = `bold 18px ${fontName}`;
  ctx.fillText(gender, startX, 312);

  // Temporary ID
  ctx.font = `bold 18px ${fontName}`;
  ctx.fillStyle = '#C00000';
  ctx.fillText(tempId, startX, 349);

  // District
  ctx.font = `bold 18px ${fontName}`;
  ctx.fillStyle = '#000000';
  ctx.fillText(district, startX, 386);

  // Team Name
  ctx.font = `bold 16px ${fontName}`;
  ctx.fillText(teamName, startX, 423);

  // Coordinator
  ctx.font = `bold 16px ${fontName}`;
  ctx.fillText(coordinator, startX, 460);

  // Phone Number
  ctx.font = `bold 19px ${fontName}`;
  ctx.fillStyle = '#0056B3';
  ctx.fillText(phone, startX, 497);

  // 5. Export PNG Buffer
  return canvas.toBuffer('image/png');
}