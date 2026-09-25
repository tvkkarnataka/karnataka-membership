import path from 'path';
import fs from 'fs';

// Helper to escape special XML characters for SVG text
function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Deep field extraction to guarantee values are never blank
function getMemberValue(member: any, keys: string[], fallback: string = ''): string {
  if (!member || typeof member !== 'object') return fallback;

  for (const k of keys) {
    if (member[k] !== undefined && member[k] !== null && String(member[k]).trim() !== '') {
      return String(member[k]).trim();
    }
  }

  // Case-insensitive search across object keys
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

  // Extract registered values
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name', 'member_name', 'Name'], 'Member Name');
  const dob = getMemberValue(member, ['dob', 'date_of_birth', 'birth_date', 'DOB'], 'N/A');
  const gender = getMemberValue(member, ['gender', 'sex', 'Gender'], 'N/A');
  const tempId = getMemberValue(member, ['membership_id', 'temporary_id', 'id', 'member_id', 'ID'], 'TVK-2026-001');
  const district = getMemberValue(member, ['district', 'city', 'location', 'District'], 'Karnataka');
  const teamName = getMemberValue(member, ['team_name', 'team', 'Team'], 'State HQ Team');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name', 'Coordinator'], 'N/A');
  const phone = getMemberValue(member, ['phone', 'phone_number', 'mobile', 'Phone'], 'N/A');
  const photoUrl = getMemberValue(member, ['photo_url', 'photoUrl', 'photo', 'avatar_url', 'Photo'], '');

  // 1. Read background template from public folder
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
      console.error('Failed to fetch photo URL:', err);
    }
  }

  // 3. Load or fetch TTF Font Buffer for SVG text rendering
  let fontBuffer: Buffer | null = null;
  try {
    const fontRes = await fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
    );
    if (fontRes.ok) {
      const fontArray = await fontRes.arrayBuffer();
      fontBuffer = Buffer.from(fontArray);
    }
  } catch (e) {
    console.error('Failed to fetch font for resvg:', e);
  }

  // 4. Build SVG string with coordinates overlaying the underline space
  const svgString = `
    <svg width="1024" height="654" viewBox="0 0 1024 654" xmlns="http://www.w3.org/2000/svg">
      <!-- Background Template -->
      ${
        backgroundBase64
          ? `<image x="0" y="0" width="1024" height="654" href="${backgroundBase64}" preserveAspectRatio="none"/>`
          : `<rect width="1024" height="654" fill="#FFFFFF"/>`
      }

      <!-- Centered Member Photo -->
      ${
        photoBase64
          ? `<image x="808" y="242" width="170" height="210" href="${photoBase64}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0px round 6px)"/>`
          : ''
      }

      <!-- Text Overlay directly on template lines -->
      <g font-family="Roboto" font-weight="bold" fill="#000000">
        <!-- Name / ಹೆಸರು -->
        <text x="330" y="252" font-size="18">${escapeXml(fullName)}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="330" y="289" font-size="17">${escapeXml(dob)}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="330" y="326" font-size="17">${escapeXml(gender)}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="330" y="363" font-size="17" fill="#C00000">${escapeXml(tempId)}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="330" y="400" font-size="17">${escapeXml(district)}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="330" y="437" font-size="17">${escapeXml(teamName)}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="330" y="474" font-size="17">${escapeXml(coordinator)}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="330" y="511" font-size="18" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `;

  // 5. Render PNG with Resvg
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