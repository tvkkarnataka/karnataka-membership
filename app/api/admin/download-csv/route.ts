import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  AlignmentType,
  HeadingLevel,
  TextRun,
  ShadingType,
  ImageRun,
  ExternalHyperlink,
} from 'docx';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Accept either ?key= or ?secret= from the URL query
    const providedKey = (searchParams.get('key') || searchParams.get('secret'))?.trim();

    // Whitelist of valid access keys
    const validKeys = [
      (process.env.ADMIN_SECRET_KEY || '').trim(),
      'Tvk_ka_hq_2026',
      'tvk2026admin',
    ].filter(Boolean);

    // Validate access key
    if (!providedKey || !validKeys.includes(providedKey)) {
      return NextResponse.json(
        { 
          error: 'Unauthorized access.',
          message: 'Invalid secret key provided. Ensure ?secret=Tvk_ka_hq_2026 or ?key=... is appended to the URL.' 
        }, 
        { status: 401 }
      );
    }

    // Fetch members from database
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('membership_id, full_name, phone, dob, district, team_name, coordinator, photo_url, aadhar_url, pan_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 1. Table Headers
    const headerColumns = [
      'Sl.',
      'Photo',
      'Membership ID',
      'Full Name',
      'Phone',
      'DOB',
      'District',
      'Team & Coordinator',
      'Documents',
    ];

    const tableHeaders = new TableRow({
      tableHeader: true,
      children: headerColumns.map(
        (col) =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: 'DC2626' },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: col,
                    bold: true,
                    color: 'FFFFFF',
                    size: 16,
                  }),
                ],
              }),
            ],
          })
      ),
    });

    // 2. Fetch images and construct table data rows
    const dataRows = await Promise.all(
      (members || []).map(async (m, index) => {
        const isEven = index % 2 === 0;
        const rowFill = isEven ? 'FFFFFF' : 'F8FAFC';

        // Fetch image buffer and construct photo cell
        let photoCellChildren: Paragraph[] = [];
        if (m.photo_url) {
          const imgBuffer = await fetchImageBuffer(m.photo_url);
          if (imgBuffer) {
            photoCellChildren = [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: {
                      width: 45,
                      height: 55,
                    },
                    type: 'png',
                  }),
                ],
              }),
            ];
          }
        }

        if (photoCellChildren.length === 0) {
          photoCellChildren = [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'No Photo', size: 14, color: '94A3B8' })],
            }),
          ];
        }

        // Documents Links Cell
        const docLinksChildren: Paragraph[] = [
          new Paragraph({
            children: m.aadhar_url
              ? [
                  new ExternalHyperlink({
                    children: [new TextRun({ text: '🔗 Aadhaar Doc', style: 'Hyperlink', size: 15, color: '2563EB' })],
                    link: m.aadhar_url,
                  }),
                ]
              : [new TextRun({ text: 'Aadhaar: N/A', size: 14, color: '94A3B8' })],
          }),
          new Paragraph({
            children: m.pan_url
              ? [
                  new ExternalHyperlink({
                    children: [new TextRun({ text: '🔗 PAN Doc', style: 'Hyperlink', size: 15, color: '2563EB' })],
                    link: m.pan_url,
                  }),
                ]
              : [new TextRun({ text: 'PAN: N/A', size: 14, color: '94A3B8' })],
          }),
        ];

        return new TableRow({
          children: [
            // Sl. No
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(index + 1), size: 15 })] })],
            }),
            // Photo
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: photoCellChildren,
            }),
            // Membership ID
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [new Paragraph({ children: [new TextRun({ text: m.membership_id || 'N/A', bold: true, size: 15 })] })],
            }),
            // Name
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [new Paragraph({ children: [new TextRun({ text: m.full_name || 'N/A', size: 15 })] })],
            }),
            // Phone
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [new Paragraph({ children: [new TextRun({ text: m.phone || 'N/A', size: 15 })] })],
            }),
            // DOB
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [new Paragraph({ children: [new TextRun({ text: m.dob || 'N/A', size: 15 })] })],
            }),
            // District
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [new Paragraph({ children: [new TextRun({ text: m.district || 'N/A', size: 15 })] })],
            }),
            // Team & Coordinator
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: [
                new Paragraph({ children: [new TextRun({ text: `Team: ${m.team_name || 'N/A'}`, size: 14 })] }),
                new Paragraph({ children: [new TextRun({ text: `Coord: ${m.coordinator || 'N/A'}`, size: 14, color: '64748B' })] }),
              ],
            }),
            // Documents Links
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: rowFill },
              children: docLinksChildren,
            }),
          ],
        });
      })
    );

    // 3. Document Structure
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            },
          },
          children: [
            new Paragraph({
              text: 'TVK KARNATAKA - MEMBERSHIP REGISTRY & VERIFICATION',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString('en-IN')} | Total Members: ${members?.length || 0}`,
                  color: '64748B',
                  size: 18,
                }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [tableHeaders, ...dataRows],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const dateStamp = new Date().toISOString().split('T')[0];

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="TVK_Members_With_Photos_${dateStamp}.docx"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}