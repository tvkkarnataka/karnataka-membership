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
  ShadingType 
} from 'docx';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'TVK_SECRET_PASS_2026';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // 1. Verify Secret Passcode
  if (!secret || secret !== ADMIN_SECRET) {
    return new NextResponse('Unauthorized: Invalid or missing secret key.', { status: 401 });
  }

  try {
    // 2. Fetch all members from Supabase
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return new NextResponse(`Database error: ${error.message}`, { status: 500 });
    }

    if (!members || members.length === 0) {
      return new NextResponse('No registered members found.', { status: 404 });
    }

    // 3. Build Word Table
    const createHeaderCell = (text: string, widthPercent: number) => {
      return new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: 'DC2626' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })
            ],
          }),
        ],
      });
    };

    const createDataCell = (
      text: string, 
      widthPercent: number, 
      align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
    ) => {
      return new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: align,
            children: [
              new TextRun({ text: text || 'N/A', size: 18, font: 'Calibri' })
            ],
          }),
        ],
      });
    };

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('Sl No', 6),
        createHeaderCell('Member ID', 14),
        createHeaderCell('Full Name', 18),
        createHeaderCell('Phone', 13),
        createHeaderCell('DOB', 11),
        createHeaderCell('District', 13),
        createHeaderCell('VMI Exp', 7),
        createHeaderCell('Team', 9),
        createHeaderCell('Coordinator', 9),
      ],
    });

    const dataRows = members.map((m, index) => {
      return new TableRow({
        children: [
          createDataCell(String(index + 1), 6, AlignmentType.CENTER),
          createDataCell(m.membership_id, 14, AlignmentType.CENTER),
          createDataCell(m.full_name, 18),
          createDataCell(m.phone, 13),
          createDataCell(m.dob, 11, AlignmentType.CENTER),
          createDataCell(m.district, 13),
          createDataCell(`${m.vmi_experience} yr`, 7, AlignmentType.CENTER),
          createDataCell(m.team_name, 9),
          createDataCell(m.coordinator, 9),
        ],
      });
    });

    // 4. Create Document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
          },
          children: [
            new Paragraph({
              text: 'TVK KARNATAKA REGISTRATION DRIVE',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              run: { bold: true, color: 'DC2626', size: 26, font: 'Calibri' },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: `Official Member Registry Report | Total Members: ${members.length}`,
                  italics: true,
                  size: 19,
                  color: '4B5563',
                  font: 'Calibri',
                }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [headerRow, ...dataRows],
            }),
            new Paragraph({
              spacing: { before: 200 },
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString('en-IN')}`,
                  size: 15,
                  color: '9CA3AF',
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        },
      ],
    });

    // 5. Convert document to buffer
    const buffer = await Packer.toBuffer(doc);
    const dateStamp = new Date().toISOString().split('T')[0];

    // 6. Return response with DOCX Content-Type
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="TVK_Members_Registry_${dateStamp}.docx"`,
      },
    });

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Server error: ${errorMsg}`, { status: 500 });
  }
}