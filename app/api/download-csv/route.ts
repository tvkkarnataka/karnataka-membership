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
} from 'docx';

// Helper function to fetch remote image
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

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://tvkkarnatakahq.netlify.app';

    // Header row
    const headerRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Photo', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Full Name', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Phone Number', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'District', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'ID Card Link', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Aadhaar Link', bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'PAN Link', bold: true })] })] }),
      ],
    });

    // Asynchronously construct rows with images
    const dataRows = await Promise.all(
      (members || []).map(async (m) => {
        const phone = m.phone_number || m.phone || '';
        const photoUrl = m.photo_url || m.photoUrl || m.photo || '';
        const aadhaarUrl = m.aadhaar_url || m.aadhaar_link || m.aadhaar || 'N/A';
        const panUrl = m.pan_url || m.pan_link || m.pan || 'N/A';

        const idCardUrl = phone
          ? `${origin}/api/download-id-card?phone=${phone}&secret=Tvk_ka_hq_2026`
          : 'N/A';

        let photoElement: Paragraph;
        const imgBytes = await fetchImageBuffer(photoUrl);

        if (imgBytes) {
          photoElement = new Paragraph({
            children: [
              new ImageRun({
                data: imgBytes,
                transformation: { width: 60, height: 75 },
                type: 'png', // Specified type for docx ImageRun
              }),
            ],
          });
        } else {
          photoElement = new Paragraph('No Photo');
        }

        return new TableRow({
          children: [
            new TableCell({ children: [photoElement] }),
            new TableCell({ children: [new Paragraph(m.full_name || m.fullName || 'N/A')] }),
            new TableCell({ children: [new Paragraph(phone || 'N/A')] }),
            new TableCell({ children: [new Paragraph(m.district || 'N/A')] }),
            new TableCell({ children: [new Paragraph(idCardUrl)] }),
            new TableCell({ children: [new Paragraph(aadhaarUrl)] }),
            new TableCell({ children: [new Paragraph(panUrl)] }),
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