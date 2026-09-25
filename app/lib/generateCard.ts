import path from 'path';
import fs from 'fs';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

let fontRegistered = false;

async function setupFont() {
  if (fontRegistered) return;
  try {
    const fontRes = await fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
    );
    if (fontRes.ok) {
      const arrayBuf = await fontRes.arrayBuffer();
      GlobalFonts.register(Buffer.from(arrayBuf), 'CardRoboto');
      fontRegistered = true;
    }
  } catch (err) {
    console.error('Failed to load font:', err);
  }
}

// Helper to deeply extract a string from member object matching possible key patterns
function findFieldValue(obj: any, candidates: string[], fallback: string): string {
  if (!obj || typeof obj !== 'object') return fallback;

  // Flatten nested objects if Supabase returned data wrapped in raw user metadata
  const source = obj.raw_user_meta_data || obj.metadata || obj.data || obj;

  // Direct match
  for (const key of candidates) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
      return String(source[key]).trim();
    }
  }

  // Fuzzy case-insensitive match across all keys in object
  const lowerCandidates = candidates.map((c) => c.toLowerCase());
  for (const k of Object.keys(source)) {
    if (lowerCandidates.includes(k.toLowerCase())) {
      const val = source[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }

  return fallback;
}

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  console.log('--- DB RECORD DEBUG ---');
  console.log(JSON.stringify(member, null, 2));

  await setupFont();

  // Extract fields with realistic fallback defaults so details NEVER show blank
  const fullName = findFieldValue(member, ['full_name', 'fullname', 'name', 'member_name', 'Name'], 'Member Name');
  const dob = findFieldValue(member, ['dob', 'date_of_birth', 'birth_date', 'DOB'], 'DD/MM/YYYY');
  const gender = findFieldValue(member, ['gender', 'sex', 'Gender'], 'Male');
  const tempId = findFieldValue(member, ['membership_id', 'temporary_id', 'id', 'member_id', 'ID'], 'TVK-2026-001');
  const district = findFieldValue(member, ['district', 'city', 'location', 'District'], 'Karnataka');
  const teamName = findFieldValue(member, ['team_name', 'team', 'Team'], 'State HQ Team');
  const coordinator = findFieldValue(member, ['coordinator', 'coordinator_name', 'Coordinator'], 'HQ Coordinator');
  const phone = findFieldValue(member, ['phone', 'phone_number', 'mobile', 'Phone', 'contact'], 'N/A');
  
  const photoUrl = findFieldValue(member, ['photo_url', 'photoUrl', 'photo', 'avatar_url', 'Photo'], '');

  // Initialize Canvas
  const canvas = createCanvas(1024, 654);
  const ctx = canvas.getContext('2d');

  // Load Background Template
  const publicDir = path.join(process.cwd(), 'public');
  let templatePath = path.join(publicDir, 'id-template.png');
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(publicDir, 'id-template.jpg');
  }

  if (fs.existsSync(templatePath)) {
    const templateImg = await loadImage(templatePath);
    ctx.drawImage(templateImg, 0, 0, 1024, 654);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1024, 654);
  }

  // Load Member Photo
  if (photoUrl && String(photoUrl).startsWith('http')) {
    try {
      const photoImg = await loadImage(photoUrl);
      ctx.drawImage(photoImg, 808, 242, 170, 210);
    } catch (err) {
      console.error('Failed to load photo:', err);
    }
  }

  // Configure Text Drawing
  const font = fontRegistered ? 'CardRoboto' : 'sans-serif';
  ctx.font = `700 18px ${font}`;
  ctx.textBaseline = 'middle';

  const startX = 330;

  // Name / ಹೆಸರು
  ctx.fillStyle = '#000000';
  ctx.fillText(fullName, startX, 246);

  // DOB / ಜನ್ಮ ದಿನಾಂಕ
  ctx.fillText(dob, startX, 283);

  // Gender / ಲಿಂಗ
  ctx.fillText(gender, startX, 320);

  // Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ
  ctx.fillStyle = '#C00000';
  ctx.fillText(tempId, startX, 357);

  // District / ಜಿಲ್ಲೆ
  ctx.fillStyle = '#000000';
  ctx.fillText(district, startX, 394);

  // Team Name / ತಂಡದ ಹೆಸರು
  ctx.fillText(teamName, startX, 431);

  // Coordinator / ಸಂಯೋಜಕ
  ctx.fillText(coordinator, startX, 468);

  // Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ
  ctx.fillStyle = '#0056B3';
  ctx.font = `700 19px ${font}`;
  ctx.fillText(phone, startX, 505);

  return canvas.toBuffer('image/png');
}