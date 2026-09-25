import path from 'path';
import fs from 'fs';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  console.log('--- SUPABASE RECORD LOG ---');
  console.log('Raw member object from Supabase:', JSON.stringify(member, null, 2));

  if (!member || typeof member !== 'object') {
    member = {};
  }

  // Helper to extract column values regardless of key casing or naming scheme
  const getFieldValue = (candidateKeys: string[]): string => {
    // Check direct properties first
    for (const key of candidateKeys) {
      if (member[key] !== undefined && member[key] !== null && String(member[key]).trim() !== '') {
        return String(member[key]).trim();
      }
    }

    // Case-insensitive fallback scan across all record keys
    const lowerKeys = candidateKeys.map((k) => k.toLowerCase());
    for (const recordKey of Object.keys(member)) {
      if (lowerKeys.includes(recordKey.toLowerCase())) {
        const val = member[recordKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }

    return '';
  };

  // Map values across all common registration table column variations
  const fullName = getFieldValue([
    'full_name',
    'fullname',
    'fullName',
    'Name',
    'name',
    'member_name',
    'memberName',
  ]);

  const dob = getFieldValue([
    'dob',
    'date_of_birth',
    'dateOfBirth',
    'birth_date',
    'DOB',
    'created_at',
  ]);

  const gender = getFieldValue([
    'gender',
    'sex',
    'Gender',
    'Sex',
  ]);

  const tempId = getFieldValue([
    'temp_id',
    'temporary_id',
    'tempId',
    'id',
    'membership_id',
    'memberId',
  ]);

  const district = getFieldValue([
    'district',
    'district_name',
    'districtName',
    'District',
    'city',
  ]);

  const teamName = getFieldValue([
    'team_name',
    'teamName',
    'team',
    'Team',
  ]) || 'State HQ Team';

  const coordinator = getFieldValue([
    'coordinator',
    'coordinator_name',
    'coordinatorName',
    'Coordinator',
  ]);

  const phone = getFieldValue([
    'phone',
    'phone_number',
    'phoneNumber',
    'mobile',
    'mobile_number',
    'Mobile',
    'Contact',
  ]);

  const photoUrl = getFieldValue([
    'photo_url',
    'photoUrl',
    'photo',
    'avatar_url',
    'Photo',
  ]);

  // 1. Read template from public folder
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
  if (photoUrl && photoUrl.startsWith('http')) {
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

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // 3. SVG Overlay with direct SVG styling
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

      <!-- Member Details Overlay (Positioned directly on top of the blank lines, starting x="330") -->
      <g font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" fill="#000000">
        <!-- Name / ಹೆಸರು -->
        <text x="330" y="250" font-size="18">${escapeXml(fullName)}</text>

        <!-- DOB / ಜನ್ಮ ದಿನಾಂಕ -->
        <text x="330" y="287" font-size="17">${escapeXml(dob)}</text>

        <!-- Gender / ಲಿಂಗ -->
        <text x="330" y="324" font-size="17">${escapeXml(gender)}</text>

        <!-- Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ -->
        <text x="330" y="361" font-size="17" fill="#C00000">${escapeXml(tempId)}</text>

        <!-- District / ಜಿಲ್ಲೆ -->
        <text x="330" y="398" font-size="17">${escapeXml(district)}</text>

        <!-- Team Name / ತಂಡದ ಹೆಸರು -->
        <text x="330" y="435" font-size="17">${escapeXml(teamName)}</text>

        <!-- Coordinator / ಸಂಯೋಜಕ -->
        <text x="330" y="472" font-size="17">${escapeXml(coordinator)}</text>

        <!-- Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ -->
        <text x="330" y="509" font-size="18" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `;

  // 4. Render PNG with Resvg
  const { Resvg } = await import('@resvg/resvg-js');

  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: 1024,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}