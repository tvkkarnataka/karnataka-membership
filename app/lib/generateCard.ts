import path from 'path';
import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

export interface MemberData {
  fullName?: string;
  full_name?: string;
  dob?: string;
  gender?: string;
  id?: string;
  temp_id?: string;
  district?: string;
  teamName?: string;
  team_name?: string;
  coordinator?: string;
  phone?: string;
  phone_number?: string;
  photoUrl?: string;
  photo_url?: string;
}

export async function generateIDCardBuffer(member: MemberData): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'id-template.png');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Template image missing at public/id-template.png');
  }

  const templateBuffer = fs.readFileSync(templatePath);
  const templateBase64 = `data:image/png;base64,${templateBuffer.toString('base64')}`;

  const fullName = member.full_name || member.fullName || 'N/A';
  const dob = member.dob || 'N/A';
  const gender = member.gender || 'N/A';
  const phone = member.phone_number || member.phone || 'N/A';
  const tempId = member.id || member.temp_id || `TVK-${phone.slice(-4)}`;
  const district = member.district || 'N/A';
  const teamName = member.team_name || member.teamName || 'N/A';
  const coordinator = member.coordinator || 'HQ Admin';

  let photoDataUri = '';
  const photoUrl = member.photo_url || member.photoUrl;
  if (photoUrl) {
    try {
      const res = await fetch(photoUrl);
      if (res.ok) {
        const pBuffer = Buffer.from(await res.arrayBuffer());
        photoDataUri = `data:image/jpeg;base64,${pBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Failed to load user profile photo for ID card:', e);
    }
  }

  const svgContent = `
    <svg width="1024" height="682" viewBox="0 0 1024 682" xmlns="http://www.w3.org/2000/svg">
      <image href="${templateBase64}" x="0" y="0" width="1024" height="682" />
      <g font-family="sans-serif" font-weight="bold" font-size="22" fill="#0B132B">
        <text x="520" y="400">${fullName}</text>
        <text x="520" y="442">${dob}</text>
        <text x="520" y="484">${gender}</text>
        <text x="520" y="526">${tempId}</text>
        <text x="520" y="568">${district}</text>
        <text x="520" y="610">${teamName}</text>
        <text x="520" y="652">${coordinator}</text>
        <text x="520" y="694">${phone}</text>
      </g>
      ${
        photoDataUri
          ? `<image href="${photoDataUri}" x="808" y="385" width="182" height="230" preserveAspectRatio="xMidYMid slice" />`
          : ''
      }
    </svg>
  `;

  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: 1024 },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}