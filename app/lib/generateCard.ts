import path from 'path';
import fs from 'fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

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

  // 1. Fetch font buffer
  let fontData: ArrayBuffer | null = null;
  const localFontPath = path.join(publicDir, 'Roboto-Bold.ttf');
  if (fs.existsSync(localFontPath)) {
    const fontBuf = fs.readFileSync(localFontPath);
    fontData = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
  } else {
    try {
      const fontRes = await fetch(
        'https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-700-normal.ttf'
      );
      if (fontRes.ok) {
        fontData = await fontRes.arrayBuffer();
      }
    } catch (e) {
      console.error('Failed to fetch font:', e);
    }
  }

  // 2. Read background template
  let backgroundBase64 = '';
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

  // 3. Extract member fields from Supabase row
  const fullName = getMemberValue(member, ['full_name', 'fullname', 'name']);
  const dob = getMemberValue(member, ['dob', 'date_of_birth']);
  const gender = getMemberValue(member, ['gender', 'sex']);
  const tempId = getMemberValue(member, ['membership_id', 'temp_id', 'id']);
  const district = getMemberValue(member, ['district', 'city']);
  const teamName = getMemberValue(member, ['team_name', 'team'], 'Akila Karnataka Maanila Thalamai TVK');
  const coordinator = getMemberValue(member, ['coordinator', 'coordinator_name']);
  const phone = getMemberValue(member, ['phone', 'mobile']);
  const photoUrl = getMemberValue(member, ['photo_url', 'avatar_url']);

  // 4. Fetch photo as Base64 Data URI
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
      console.error('Failed to fetch photo:', err);
    }
  }

  // 5. Generate vector SVG using Satori
  const startX = 540;
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1024px',
          height: '654px',
          display: 'flex',
          position: 'relative',
          backgroundImage: backgroundBase64 ? `url(${backgroundBase64})` : 'none',
          backgroundSize: '100% 100%',
        },
        children: [
          // Member Photo
          photoBase64
            ? {
                type: 'img',
                props: {
                  src: photoBase64,
                  style: {
                    position: 'absolute',
                    left: '808px',
                    top: '242px',
                    width: '170px',
                    height: '210px',
                    borderRadius: '6px',
                    objectFit: 'cover',
                  },
                },
              }
            : null,

          // Name / ಹೆಸರು
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '232px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#000000',
              },
              children: fullName,
            },
          },

          // DOB / ಜನ್ಮ ದಿನಾಂಕ
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '269px',
                fontSize: '17px',
                fontWeight: 'bold',
                color: '#000000',
              },
              children: dob,
            },
          },

          // Gender / ಲಿಂಗ
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '306px',
                fontSize: '17px',
                fontWeight: 'bold',
                color: '#000000',
              },
              children: gender,
            },
          },

          // Temporary ID / ತಾತ್ಕಾಲಿಕ ಐಡಿ
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '343px',
                fontSize: '17px',
                fontWeight: 'bold',
                color: '#C00000',
              },
              children: tempId,
            },
          },

          // District / ಜಿಲ್ಲೆ
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '380px',
                fontSize: '17px',
                fontWeight: 'bold',
                color: '#000000',
              },
              children: district,
            },
          },

          // Team Name / ತಂಡದ ಹೆಸರು
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '417px',
                fontSize: '15px',
                fontWeight: 'bold',
                color: '#000000',
              },
              children: teamName,
            },
          },

          // Coordinator / ಸಂಯೋಜಕ
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '454px',
                fontSize: '15px',
                fontWeight: 'bold',
                color: '#000000',
              },
              children: coordinator,
            },
          },

          // Contact Number / ಸಂಪರ್ಕ ಸಂಖ್ಯೆ
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${startX}px`,
                top: '491px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#0056B3',
              },
              children: phone,
            },
          },
        ].filter(Boolean),
      },
    } as any,
    {
      width: 1024,
      height: 654,
      fonts: fontData
        ? [
            {
              name: 'Roboto',
              data: fontData,
              weight: 700,
              style: 'normal',
            },
          ]
        : [],
    }
  );

  // 6. Convert vector SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}