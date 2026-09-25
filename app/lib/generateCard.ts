import path from 'path';
import fs from 'fs';

export async function generateIDCardBuffer(member: any): Promise<Buffer> {
  if (!member || typeof member !== 'object') {
    member = {};
  }

  // Helper function to pull property values safely regardless of database key casing
  const getValue = (...keys: string[]): string => {
    for (const key of keys) {
      if (member[key] !== undefined && member[key] !== null && String(member[key]).trim() !== '') {
        return String(member[key]).trim();
      }
    }
    // Case-insensitive key check
    for (const memberKey of Object.keys(member)) {
      if (keys.some((k) => k.toLowerCase() === memberKey.toLowerCase())) {
        const val = member[memberKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
    return '';
  };

  const fullName = getValue('full_name', 'fullname', 'fullName', 'name', 'member_name');
  const dob = getValue('dob', 'date_of_birth', 'dateOfBirth', 'birth_date', 'created_at');
  const gender = getValue('gender', 'sex');
  const tempId = getValue('temp_id', 'temporary_id', 'tempId', 'id', 'membership_id');
  const district = getValue('district', 'city', 'location');
  const teamName = getValue('team_name', 'teamName', 'team') || 'State HQ Team';
  const coordinator = getValue('coordinator', 'coordinator_name', 'coordinatorName');
  const phone = getValue('phone', 'phone_number', 'mobile', 'phoneNumber');
  const photoUrl = getValue('photo_url', 'photoUrl', 'photo', 'avatar_url');

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

  // 2. Fetch member photo as Base64 Data URI
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

  // 3. SVG string using system fallback fonts with forced fill colors
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

      <!-- Render Member Details on top of template underline space -->
      <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" dominant-baseline="alphabetic">
        <text x="330" y="250" font-size="18" fill="#000000">${escapeXml(fullName)}</text>
        <text x="330" y="287" font-size="17" fill="#000000">${escapeXml(dob)}</text>
        <text x="330" y="324" font-size="17" fill="#000000">${escapeXml(gender)}</text>
        <text x="330" y="361" font-size="17" fill="#C00000">${escapeXml(tempId)}</text>
        <text x="330" y="398" font-size="17" fill="#000000">${escapeXml(district)}</text>
        <text x="330" y="435" font-size="17" fill="#000000">${escapeXml(teamName)}</text>
        <text x="330" y="472" font-size="17" fill="#000000">${escapeXml(coordinator)}</text>
        <text x="330" y="509" font-size="18" fill="#0056B3">${escapeXml(phone)}</text>
      </g>
    </svg>
  `;

  // 4. Render SVG using Resvg
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