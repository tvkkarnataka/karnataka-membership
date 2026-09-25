import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
  ImageRun,
  ExternalHyperlink,
  BorderStyle,
  VerticalAlign,
  AlignmentType,
} from 'docx';

async function fetchImageBuffer(url: string): Promise<Uint8Array | null> {
  if (!url || !url.startsWith('http')) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch {
    return null;
  }
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' },
};

const cellMargins = { top: 120, bottom: 120, left: 150, right: 150 };

function createHeaderCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: '0B132B' },
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })],
      }),
    ],
  });
}

function createBodyCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, size: 18, color: '333333' })],
      }),
    ],
  });
}

function createClickableCell(displayText: string, targetUrl: string, widthPercent: number): TableCell {
  if (!targetUrl || targetUrl === 'N/A' || !targetUrl.startsWith('http')) {
    return createBodyCell('N/A', widthPercent);
  }

  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: displayText,
                style: 'Hyperlink',
                color: '0056B3',
                underline: {},
                bold: true,
                size: 18,
              }),
            ],
            link: targetUrl,
          }),
        ],
      }),
    ],
  });
}

export async function GET(req: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://ytaqlejhsxjanhmhwmkv.supabase.co';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Automatically detect host header or default to Vercel domain
    const host = req.headers.get('host') || 'karnataka-membership.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const headerRow = new TableRow({
      cantSplit: true,
      children: [
        createHeaderCell('Photo', 12),
        createHeaderCell('Full Name', 22),
        createHeaderCell('Phone', 16),
        createHeaderCell('District', 16),
        createHeaderCell('ID Card', 12),
        createHeaderCell('Aadhaar', 11),
        createHeaderCell('PAN', 11),
      ],
    });

    const dataRows = await Promise.all(
      (members || []).map(async (m) => {
        const phone = m.phone || m.phone_number || m.mobile || '';
        const photoUrl = m.photo_url || m.photoUrl || m.photo || m.avatar_url || '';
        
        // Checks all common database field naming variations for document record links
        const aadhaarUrl =
          m.aadhaar_url ||
          m.aadhaarUrl ||
          m.aadhaar_link ||
          m.aadhaar ||
          m.aadhar_url ||
          m.aadhar ||
          '';

        const panUrl = m.pan_url || m.panUrl || m.pan_link || m.pan || '';

        // Point link directly to the current server deployment domain
        const idCardUrl = phone
          ? `${baseUrl}/api/download-id-card?phone=${phone}&secret=Tvk_ka_hq_2026`
          : '';

        let photoElement: Paragraph;
        const imgBytes = await fetchImageBuffer(photoUrl);

        if (imgBytes) {
          photoElement = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imgBytes,
                transformation: { width: 50, height: 65 },
                type: 'png',
              }),
            ],
          });
        } else {
          photoElement = new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'No Photo', size: 16, color: '888888' })],
          });
        }

        const photoCell = new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          margins: cellMargins,
          children: [photoElement],
        });

        return new TableRow({
          cantSplit: true,
          children: [
            photoCell,
            createBodyCell(m.full_name || m.fullName || m.name || 'N/A', 22),
            createBodyCell(phone || 'N/A', 16),
            createBodyCell(m.district || 'N/A', 16),
            createClickableCell('View ID Card', idCardUrl, 12),
            createClickableCell('View Aadhaar', aadhaarUrl, 11),
            createClickableCell('View PAN', panUrl, 11),
          ],
        });
      })
    );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'TVK Karnataka Membership Master Report',
              heading: 'Heading1',
              spacing: { after: 300 },
            }),
            new Table({
              rows: [headerRow, ...dataRows],
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition':
          'attachment; filename="TVK_Members_Master_Report.docx"',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}