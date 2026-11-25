import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import {
  RaporIndicator,
  SchoolProfile,
} from '../types';
import { SchoolDatabase } from './storageService';
import { syncLetterheadWithProfile } from './schoolIdentitySync';
import { analyzeSixPriorityIndicators } from './pbdSynthesisService';

// A4 paper in twips: 210mm x 297mm = 11906 x 16838
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN_TOP = 1360;
const MARGIN_BOTTOM = 1360;
const MARGIN_LEFT = 1640;
const MARGIN_RIGHT = 1360;
// Exact usable width in DXA for fixed-layout tables
const USABLE_WIDTH_DXA = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 8906 DXA

const FONT_FAMILY = 'Times New Roman';
const COLOR_PRIMARY = '065F46'; // Emerald 800
const COLOR_DARK = '0F172A'; // Slate 900
const COLOR_MUTED = '475569'; // Slate 600
const COLOR_BORDER = 'CBD5E1'; // Slate 300
const COLOR_ZEBRA = 'F8FAFC'; // Slate 50
const COLOR_HIGHLIGHT_BG = 'ECFDF5'; // Emerald 50

function formatRp(amount: number): string {
  return `Rp ${Math.round(amount || 0).toLocaleString('id-ID')}`;
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Parses inline markdown (**bold** and *italic*) into TextRuns.
 */
function parseInlineRuns(
  text: string,
  baseOpts: { size?: number; bold?: boolean; italics?: boolean; color?: string } = {}
): TextRun[] {
  const size = baseOpts.size ?? 23; // 11.5pt
  const baseColor = baseOpts.color ?? COLOR_DARK;
  const runs: TextRun[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      runs.push(
        new TextRun({
          text: text.slice(lastIdx, match.index),
          font: FONT_FAMILY,
          size,
          bold: baseOpts.bold,
          italics: baseOpts.italics,
          color: baseColor,
        })
      );
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          font: FONT_FAMILY,
          size,
          bold: true,
          italics: baseOpts.italics,
          color: baseColor,
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: FONT_FAMILY,
          size,
          bold: baseOpts.bold,
          italics: true,
          color: baseColor,
        })
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    runs.push(
      new TextRun({
        text: text.slice(lastIdx),
        font: FONT_FAMILY,
        size,
        bold: baseOpts.bold,
        italics: baseOpts.italics,
        color: baseColor,
      })
    );
  }

  if (runs.length === 0) {
    runs.push(
      new TextRun({
        text,
        font: FONT_FAMILY,
        size,
        bold: baseOpts.bold,
        italics: baseOpts.italics,
        color: baseColor,
      })
    );
  }

  return runs;
}

function buildKopSurat(schoolProfile: SchoolProfile): (Paragraph | Table)[] {
  const resolved = syncLetterheadWithProfile(schoolProfile.letterheadText, schoolProfile);
  const lines = resolved
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const topLine =
    lines[0] && lines[0].toUpperCase() !== schoolProfile.name.trim().toUpperCase()
      ? lines[0]
      : `PEMERINTAH ${schoolProfile.city.toUpperCase()} - DINAS PENDIDIKAN`;

  const contactParts = [
    `${schoolProfile.address}, ${schoolProfile.district}, ${schoolProfile.city}, ${schoolProfile.province}`,
    schoolProfile.postalCode ? `Kode Pos ${schoolProfile.postalCode}` : '',
    schoolProfile.phone ? `Telp. ${schoolProfile.phone}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const metaLine = [
    `NPSN: ${schoolProfile.npsn}`,
    `Akreditasi: ${schoolProfile.accreditationGrade}`,
    schoolProfile.email ? `Email: ${schoolProfile.email}` : '',
    schoolProfile.website ? schoolProfile.website : '',
  ]
    .filter(Boolean)
    .join('  |  ');

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: topLine.toUpperCase(),
          font: FONT_FAMILY,
          size: 22,
          bold: true,
          color: COLOR_DARK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: schoolProfile.name.toUpperCase(),
          font: FONT_FAMILY,
          size: 28,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 20 },
      children: [
        new TextRun({
          text: contactParts,
          font: FONT_FAMILY,
          size: 19,
          color: COLOR_MUTED,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 12,
          color: COLOR_DARK,
          space: 6,
        },
      },
      children: [
        new TextRun({
          text: metaLine,
          font: FONT_FAMILY,
          size: 18,
          color: COLOR_MUTED,
        }),
      ],
    }),
  ];
}

function buildTitleBanner(
  title: string,
  subtitle: string,
  periodLabel: string
): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 60 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          font: FONT_FAMILY,
          size: 28,
          bold: true,
          color: COLOR_DARK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: subtitle.toUpperCase(),
          font: FONT_FAMILY,
          size: 24,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 220 },
      children: [
        new TextRun({
          text: periodLabel,
          font: FONT_FAMILY,
          size: 22,
          bold: true,
          color: COLOR_MUTED,
        }),
      ],
    }),
  ];
}

function buildChapterHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    keepNext: true,
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: COLOR_PRIMARY,
        space: 3,
      },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT_FAMILY,
        size: 24,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function buildSubHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 70 },
    keepNext: true,
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 23,
        bold: true,
        color: COLOR_DARK,
      }),
    ],
  });
}

function buildBodyParagraph(text: string, spacingAfter = 110): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { before: 0, after: spacingAfter, line: 276 },
    children: parseInlineRuns(text, { size: 22 }),
  });
}

function buildNumberedOrBullet(
  prefix: string,
  text: string,
  indentLeft = 420
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    indent: { left: indentLeft, hanging: 260 },
    spacing: { before: 0, after: 75, line: 268 },
    children: [
      new TextRun({
        text: `${prefix} `,
        font: FONT_FAMILY,
        size: 22,
        bold: true,
        color: COLOR_DARK,
      }),
      ...parseInlineRuns(text, { size: 22 }),
    ],
  });
}

interface StyledTableColumn {
  header: string;
  widthPct: number;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
}

function buildStyledTable(
  columns: StyledTableColumn[],
  rows: string[][],
  summaryRow?: string[]
): Table {
  const totalPct = columns.reduce((s, c) => s + c.widthPct, 0) || 100;
  const colWidths = columns.map((c) => Math.round((c.widthPct / totalPct) * USABLE_WIDTH_DXA));

  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  };

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: columns.map(
      (col, idx) =>
        new TableCell({
          width: { size: colWidths[idx], type: WidthType.DXA },
          shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: col.align || AlignmentType.LEFT,
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({
                  text: col.header,
                  font: FONT_FAMILY,
                  size: 20,
                  bold: true,
                  color: 'FFFFFF',
                }),
              ],
            }),
          ],
        })
    ),
  });

  const bodyRows = rows.map((rowVals, rIdx) => {
    const fill = rIdx % 2 === 1 ? COLOR_ZEBRA : 'FFFFFF';
    return new TableRow({
      cantSplit: true,
      children: columns.map((col, cIdx) => {
        const val = rowVals[cIdx] ?? '-';
        return new TableCell({
          width: { size: colWidths[cIdx], type: WidthType.DXA },
          shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.TOP,
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: col.align || AlignmentType.LEFT,
              spacing: { before: 0, after: 0, line: 240 },
              children: parseInlineRuns(val, { size: 20 }),
            }),
          ],
        });
      }),
    });
  });

  const allRows: TableRow[] = [headerRow, ...bodyRows];

  if (summaryRow && summaryRow.length === columns.length) {
    allRows.push(
      new TableRow({
        cantSplit: true,
        children: columns.map((col, cIdx) => (
          new TableCell({
            width: { size: colWidths[cIdx], type: WidthType.DXA },
            shading: { fill: COLOR_HIGHLIGHT_BG, type: ShadingType.CLEAR, color: 'auto' },
            verticalAlign: VerticalAlign.CENTER,
            borders: cellBorders,
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: col.align || AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: summaryRow[cIdx] ?? '',
                    font: FONT_FAMILY,
                    size: 20,
                    bold: true,
                    color: COLOR_PRIMARY,
                  }),
                ],
              }),
            ],
          })
        )),
      })
    );
  }

  return new Table({
    width: { size: USABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: colWidths,
    rows: allRows,
  });
}

function buildKeyValueTable(pairs: Array<[string, string]>): Table {
  const leftW = Math.round(USABLE_WIDTH_DXA * 0.34);
  const rightW = USABLE_WIDTH_DXA - leftW;
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  };

  return new Table({
    width: { size: USABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [leftW, rightW],
    rows: pairs.map(
      ([label, value], idx) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: leftW, type: WidthType.DXA },
              shading: { fill: idx % 2 === 0 ? COLOR_ZEBRA : 'FFFFFF', type: ShadingType.CLEAR, color: 'auto' },
              borders: cellBorders,
              margins: { top: 75, bottom: 75, left: 110, right: 110 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({
                      text: label,
                      font: FONT_FAMILY,
                      size: 21,
                      bold: true,
                      color: COLOR_DARK,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: rightW, type: WidthType.DXA },
              shading: { fill: idx % 2 === 0 ? COLOR_ZEBRA : 'FFFFFF', type: ShadingType.CLEAR, color: 'auto' },
              borders: cellBorders,
              margins: { top: 75, bottom: 75, left: 110, right: 110 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: parseInlineRuns(value, { size: 21 }),
                }),
              ],
            }),
          ],
        })
    ),
  });
}

function buildSignatureBlock(
  schoolProfile: SchoolProfile,
  leftTitle = 'Mengetahui,',
  leftRole = `Ketua Komite Sekolah / TPMPS`,
  leftName = `${schoolProfile.name}`,
  leftSub = ''
): Table {
  const halfW = Math.round(USABLE_WIDTH_DXA / 2);
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  return new Table({
    width: { size: USABLE_WIDTH_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [halfW, USABLE_WIDTH_DXA - halfW],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: halfW, type: WidthType.DXA },
            borders: noBorder,
            margins: { top: 200, bottom: 40, left: 60, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: leftTitle, font: FONT_FAMILY, size: 22 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 560 },
                children: [new TextRun({ text: leftRole, font: FONT_FAMILY, size: 22, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: leftName,
                    font: FONT_FAMILY,
                    size: 22,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              ...(leftSub
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: leftSub, font: FONT_FAMILY, size: 20, color: COLOR_MUTED })],
                    }),
                  ]
                : []),
            ],
          }),
          new TableCell({
            width: { size: USABLE_WIDTH_DXA - halfW, type: WidthType.DXA },
            borders: noBorder,
            margins: { top: 200, bottom: 40, left: 60, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: `${schoolProfile.city}, ${getTodayFormatted()}`,
                    font: FONT_FAMILY,
                    size: 22,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 560 },
                children: [new TextRun({ text: 'Kepala Sekolah,', font: FONT_FAMILY, size: 22, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: schoolProfile.principalName,
                    font: FONT_FAMILY,
                    size: 22,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: `NIP. ${schoolProfile.principalNip || '-'}`,
                    font: FONT_FAMILY,
                    size: 20,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildSpacer(afterTwips = 120): Paragraph {
  return new Paragraph({ spacing: { before: 0, after: afterTwips }, children: [] });
}

function createDocumentShell(
  schoolProfile: SchoolProfile,
  docShortTitle: string,
  children: (Paragraph | Table)[]
): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: 22,
            color: COLOR_DARK,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: {
              width: A4_WIDTH,
              height: A4_HEIGHT,
            },
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
          },
        },
        headers: {
          first: new Header({ children: [] }),
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER, space: 3 },
                },
                children: [
                  new TextRun({
                    text: `${docShortTitle} — ${schoolProfile.name} (NPSN: ${schoolProfile.npsn})`,
                    font: FONT_FAMILY,
                    size: 18,
                    italics: true,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          first: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [
                      `Dokumen Resmi ${schoolProfile.name}  |  Halaman `,
                      PageNumber.CURRENT,
                      ' dari ',
                      PageNumber.TOTAL_PAGES,
                    ],
                    font: FONT_FAMILY,
                    size: 18,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [
                      `Dokumen Resmi ${schoolProfile.name}  |  Halaman `,
                      PageNumber.CURRENT,
                      ' dari ',
                      PageNumber.TOTAL_PAGES,
                    ],
                    font: FONT_FAMILY,
                    size: 18,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

function markdownToDocxElements(markdown: string): Paragraph[] {
  const lines = markdown.split('\n');
  const elements: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === '---' || line === '***') {
      elements.push(buildSpacer(60));
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: line.slice(2).trim(),
              font: FONT_FAMILY,
              size: 26,
              bold: true,
              color: COLOR_DARK,
            }),
          ],
        })
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: line.slice(3).trim(),
              font: FONT_FAMILY,
              size: 23,
              bold: true,
              color: COLOR_PRIMARY,
            }),
          ],
        })
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(buildChapterHeading(line.slice(4).trim()));
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(buildSubHeading(line.slice(5).trim()));
      continue;
    }

    const numMatch = line.match(/^(\d+\.)\s+(.*)$/);
    if (numMatch) {
      elements.push(buildNumberedOrBullet(numMatch[1], numMatch[2], 420));
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const leadingSpaces = rawLine.search(/\S/);
      const indent = leadingSpaces >= 2 ? 720 : 420;
      elements.push(buildNumberedOrBullet('•', line.slice(2).trim(), indent));
      continue;
    }

    elements.push(buildBodyParagraph(line));
  }

  return elements;
}

function getStageLabel(stage: SchoolProfile['stage']): string {
  switch (stage) {
    case 'SD':
      return 'Kelas I - VI';
    case 'SMP':
      return 'Kelas VII - IX';
    case 'SMA':
    case 'SMK':
    default:
      return 'Kelas X - XII';
  }
}

function findInd(indicators: RaporIndicator[], codePrefix: string, keyword: string): RaporIndicator | undefined {
  return (
    indicators.find((i) => i.code.toUpperCase().startsWith(codePrefix.toUpperCase())) ||
    indicators.find((i) => i.name.toLowerCase().includes(keyword.toLowerCase()))
  );
}

// ============================================================================
// 1. RKJM (4 Tahun) WORD EXPORT
// ============================================================================
export async function exportRKJMToWord(
  db: SchoolDatabase,
  customMarkdown?: string
): Promise<void> {
  const { schoolProfile, raporIndicators, problems, rootCauses, recommendations, snpData, rkasItems } = db;
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;
  const avgSNP =
    snpData.length > 0
      ? Math.round(snpData.reduce((s, x) => s + x.compliancePercentage, 0) / snpData.length)
      : 75;
  const totalRKAS = rkasItems.reduce((s, x) => s + x.totalAmount, 0);

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'RENCANA KERJA JANGKA MENENGAH (RKJM)',
      schoolProfile.name,
      `PERIODE PERENCANAAN: ${schoolProfile.planningPeriod}`
    ),
  ];

  if (customMarkdown && customMarkdown.trim().length > 0) {
    elements.push(...markdownToDocxElements(customMarkdown));
  } else {
    elements.push(
      buildChapterHeading('LEMBAR PENGESAHAN'),
      buildBodyParagraph(
        `Dokumen Rencana Kerja Jangka Menengah (RKJM) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Periode ${schoolProfile.planningPeriod} disusun melalui siklus Perencanaan Berbasis Data (PBD) Rapor Pendidikan (${raporIndicators.length} indikator teranalisis, ${usedProblems.length} masalah prioritas, ${recommendations.length} program strategis). Dokumen ini telah dimusyawarahkan dan disetujui oleh Tim Pengembang Sekolah (TPMPS), Dewan Guru, serta Komite Sekolah untuk menjadi pedoman pengembangan sekolah selama 4 (empat) tahun.`
      ),
      buildSignatureBlock(
        schoolProfile,
        'Mengetahui,',
        'Pengawas Pembina Satuan Pendidikan',
        `Dinas Pendidikan ${schoolProfile.city}`,
        ''
      ),
      buildSpacer(180),

      buildChapterHeading('BAB I. PENDAHULUAN'),
      buildSubHeading('1.1 Latar Belakang'),
      buildBodyParagraph(
        `Transformasi layanan pembelajaran yang berpusat pada murid di ${schoolProfile.name} (${getStageLabel(
          schoolProfile.stage
        )}) menuntut perencanaan strategis jangka menengah yang terukur, transparan, dan berbasis bukti empiris. Melalui mekanisme Perencanaan Berbasis Data (PBD) yang bersumber dari Rapor Pendidikan, sekolah mengidentifikasi kekuatan serta kesenjangan capaian mutu, menelusuri akar masalah secara mendalam, dan menyusun program pembenahan yang terintegrasi dengan 8 Standar Nasional Pendidikan (SNP) serta pembiayaan BOSP.`
      ),
      buildSubHeading('1.2 Landasan Hukum'),
      buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
      buildNumberedOrBullet(
        '2.',
        `Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana telah diubah dengan PP Nomor 4 Tahun 2022 (Keterpenuhan 8 SNP sekolah saat ini: ${avgSNP}%).`
      ),
      buildNumberedOrBullet('3.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
      buildNumberedOrBullet(
        '4.',
        'Permendikbudristek Nomor 46 Tahun 2023 tentang Pencegahan dan Penanganan Kekerasan di Lingkungan Satuan Pendidikan (PPKSP).'
      ),
      buildNumberedOrBullet('5.', 'Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan Satuan Pendidikan.'),
      buildNumberedOrBullet('6.', 'Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum pada PAUD, Dikdas, dan Dikmen.'),
      buildNumberedOrBullet('7.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
      buildSubHeading('1.3 Tujuan Penyusunan RKJM'),
      buildNumberedOrBullet('1.', `Menetapkan arah kebijakan pengembangan ${schoolProfile.name} selama periode ${schoolProfile.planningPeriod}.`),
      buildNumberedOrBullet('2.', 'Menyelaraskan rekomendasi pembenahan Rapor Pendidikan dengan 8 SNP, kesiapan akreditasi BAN-PDM, dan RKAS BOSP.'),
      buildNumberedOrBullet('3.', 'Menjadi acuan resmi penyusunan Rencana Kerja Tahunan (RKT) serta evaluasi kinerja sekolah.'),

      buildChapterHeading('BAB II. PROFIL SATUAN PENDIDIKAN'),
      buildKeyValueTable([
        ['Nama Satuan Pendidikan', schoolProfile.name],
        ['NPSN', schoolProfile.npsn],
        ['Jenjang / Status', `${schoolProfile.stage} ${schoolProfile.status} (${getStageLabel(schoolProfile.stage)})`],
        ['Alamat Lengkap', `${schoolProfile.address}, ${schoolProfile.district}, ${schoolProfile.city}, ${schoolProfile.province}`],
        ['Kepala Sekolah', `${schoolProfile.principalName} (NIP. ${schoolProfile.principalNip || '-'})`],
        ['Akreditasi', `Peringkat ${schoolProfile.accreditationGrade} (Tahun ${schoolProfile.accreditationYear})`],
        [
          'Sumber Daya Sekolah',
          `${schoolProfile.totalStudents} Peserta Didik, ${schoolProfile.totalStudyGroups} Rombel, ${schoolProfile.totalTeachers} Pendidik, ${schoolProfile.totalStaff} Tendik`,
        ],
      ]),
      buildSpacer(120),

      buildChapterHeading('BAB III. VISI, MISI, DAN TUJUAN SEKOLAH'),
      buildSubHeading('3.1 Visi Sekolah'),
      buildBodyParagraph(schoolProfile.vision),
      buildSubHeading('3.2 Misi Sekolah'),
      ...schoolProfile.mission
        .split('\n')
        .map((m) => m.trim())
        .filter(Boolean)
        .map((m) => buildBodyParagraph(m, 65)),
      buildSubHeading('3.3 Tujuan Sekolah'),
      buildBodyParagraph(schoolProfile.goals),

      buildChapterHeading('BAB IV. ANALISIS RAPOR PENDIDIKAN, MASALAH PRIORITAS & AKAR MASALAH'),
      buildSubHeading('4.1 Identifikasi Masalah Prioritas PBD'),
      buildStyledTable(
        [
          { header: 'No', widthPct: 7, align: AlignmentType.CENTER },
          { header: 'Kode & Indikator', widthPct: 26 },
          { header: 'Kondisi Aktual & Masalah Utama', widthPct: 47 },
          { header: 'Prioritas', widthPct: 20 },
        ],
        usedProblems.length > 0
          ? usedProblems.map((p, i) => [
              String(i + 1),
              `[${p.indicatorCode}] ${p.indicatorName}`,
              `${p.actualCondition}. Masalah: ${p.mainProblem}`,
              p.priority,
            ])
          : [['-', 'Belum ada data', 'Silakan lengkapi modul Identifikasi Masalah PBD.', '-']]
      ),
      buildSpacer(100),
      buildSubHeading('4.2 Hasil Penelusuran Akar Masalah (5-Why)'),
      ...(rootCauses.length > 0
        ? rootCauses.map((rc, i) =>
            buildNumberedOrBullet(
              `${i + 1}.`,
              `**${rc.mainProblem}** — Akar Masalah: ${rc.rootCause}`
            )
          )
        : [buildBodyParagraph('Refleksi akar masalah (5-Why) disusun bersama Komunitas Belajar sekolah.')]),

      buildChapterHeading(`BAB V. MATRIKS PROGRAM STRATEGIS 4 TAHUN (${schoolProfile.planningPeriod})`),
      buildStyledTable(
        [
          { header: 'No', widthPct: 6, align: AlignmentType.CENTER },
          { header: 'Program Strategis & Kategori PBD', widthPct: 34 },
          { header: 'Indikator Keberhasilan', widthPct: 30 },
          { header: 'Jadwal (Th 1-4)', widthPct: 14, align: AlignmentType.CENTER },
          { header: 'Pagu 4 Tahun', widthPct: 16, align: AlignmentType.RIGHT },
        ],
        recommendations.length > 0
          ? recommendations.map((rec, idx) => [
              String(idx + 1),
              `${rec.title} (${rec.type})`,
              rec.successIndicator,
              'Th 1 - Th 4',
              formatRp(rec.estimatedCost * 4),
            ])
          : [['-', 'Belum ada program', 'Lakukan sinkronisasi PBD terlebih dahulu.', '-', 'Rp 0']],
        [
          '',
          `Total ${recommendations.length} Program Strategis 4 Tahun`,
          '',
          '',
          formatRp(recommendations.reduce((s, r) => s + r.estimatedCost * 4, 0)),
        ]
      ),
      buildSpacer(120),

      buildChapterHeading('BAB VI. PROYEKSI PEMBIAYAAN, MONITORING, DAN PENUTUP'),
      buildBodyParagraph(
        `Total proyeksi alokasi anggaran tahunan pada RKAS berbasis PBD saat ini mencapai **${formatRp(
          totalRKAS
        )}** (${rkasItems.length} pos kegiatan). Evaluasi keterlaksanaan RKJM dilaksanakan setiap semester oleh Kepala ${
          schoolProfile.name
        } bersama Tim TPMPS dan dilaporkan kepada Pengawas Pembina serta Dinas Pendidikan ${schoolProfile.city}.`
      ),
      buildBodyParagraph(
        `Demikian dokumen RKJM ${schoolProfile.name} Periode ${schoolProfile.planningPeriod} ini disahkan sebagai pedoman penyelenggaraan program sekolah.`
      ),
      buildSignatureBlock(
        schoolProfile,
        'Menyetujui,',
        `Ketua Komite ${schoolProfile.name}`,
        `Ketua Komite Sekolah`,
        ''
      )
    );
  }

  const doc = createDocumentShell(schoolProfile, 'RKJM 4 Tahun', elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `RKJM_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.planningPeriod)}.docx`);
}

// ============================================================================
// 2. RKT (1 Tahun) WORD EXPORT
// ============================================================================
export async function exportRKTToWord(
  db: SchoolDatabase,
  customMarkdown?: string
): Promise<void> {
  const { schoolProfile, problems, rootCauses, actionPlans, rkasItems } = db;
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;
  const totalBudgetAction = actionPlans.reduce((s, a) => s + a.budgetAllocated, 0);
  const totalBudgetRKAS = rkasItems.reduce((s, r) => s + r.totalAmount, 0);

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'RENCANA KERJA TAHUNAN (RKT) BERBASIS PBD',
      schoolProfile.name,
      `TAHUN PELAJARAN ${schoolProfile.academicYear}`
    ),
  ];

  if (customMarkdown && customMarkdown.trim().length > 0) {
    elements.push(...markdownToDocxElements(customMarkdown));
  } else {
    elements.push(
      buildChapterHeading('LEMBAR PENGESAHAN'),
      buildBodyParagraph(
        `Dokumen Rencana Kerja Tahunan (RKT) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} merupakan penjabaran operasional RKJM (${schoolProfile.planningPeriod}) berdasarkan hasil Analisis Rapor Pendidikan, Identifikasi Masalah, Refleksi Akar Masalah, Rekomendasi Pembenahan, dan Matriks Implementasi Rencana Aksi.`
      ),
      buildSignatureBlock(
        schoolProfile,
        'Mengetahui,',
        `Ketua Komite ${schoolProfile.name}`,
        'Ketua Komite Sekolah',
        ''
      ),
      buildSpacer(180),

      buildChapterHeading('BAB I. PENDAHULUAN'),
      buildSubHeading('1.1 Latar Belakang'),
      buildBodyParagraph(
        `Rencana Kerja Tahunan (RKT) disusun sebagai pedoman kerja operasional satu tahun pelajaran bagi ${schoolProfile.totalTeachers} pendidik, ${schoolProfile.totalStaff} tenaga kependidikan, dan ${schoolProfile.totalStudents} peserta didik (${schoolProfile.totalStudyGroups} rombel) di ${schoolProfile.name}. Setiap kegiatan pada RKT Tahun Pelajaran ${schoolProfile.academicYear} bersumber langsung dari siklus Perencanaan Berbasis Data (PBD) agar intervensi mutu berjalan tepat sasaran dan selaras dengan alokasi anggaran RKAS BOSP.`
      ),
      buildSubHeading('1.2 Landasan Hukum'),
      buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
      buildNumberedOrBullet('2.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.'),
      buildNumberedOrBullet('3.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
      buildNumberedOrBullet('4.', 'Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan Satuan Pendidikan.'),
      buildNumberedOrBullet('5.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
      buildSubHeading('1.3 Tujuan dan Sasaran RKT'),
      buildNumberedOrBullet('1.', 'Menjabarkan program strategis RKJM ke dalam rencana aksi tahunan yang operasional, memiliki PIC jelas, dan jadwal terukur.'),
      buildNumberedOrBullet('2.', 'Menjamin sinkronisasi penuh antara RKT dengan kode rekening RKAS pada aplikasi ARKAS.'),

      buildChapterHeading('BAB II. RINGKASAN MASALAH PRIORITAS & AKAR MASALAH PBD'),
      buildSubHeading('2.1 Masalah Prioritas Terpilih'),
      ...(usedProblems.length > 0
        ? usedProblems.map((p, i) =>
            buildNumberedOrBullet(`${i + 1}.`, `**[${p.indicatorCode}] ${p.indicatorName}** (${p.priority}) — ${p.mainProblem}`)
          )
        : [buildBodyParagraph('Belum ada masalah prioritas terpilih.')]),
      buildSubHeading('2.2 Akar Masalah Utama (5-Why)'),
      ...(rootCauses.length > 0
        ? rootCauses.map((r, i) => buildNumberedOrBullet(`${i + 1}.`, r.rootCause))
        : [buildBodyParagraph('Akar masalah ditelusuri bersama Komunitas Belajar sekolah.')]),

      buildChapterHeading(`BAB III. MATRIKS PROGRAM & RENCANA AKSI (${schoolProfile.academicYear})`),
      buildStyledTable(
        [
          { header: 'No', widthPct: 6, align: AlignmentType.CENTER },
          { header: 'Kegiatan Operasional RKT', widthPct: 29 },
          { header: 'Penanggung Jawab (PIC)', widthPct: 18 },
          { header: 'Jadwal', widthPct: 15 },
          { header: 'Indikator & Target', widthPct: 18 },
          { header: 'Anggaran', widthPct: 14, align: AlignmentType.RIGHT },
        ],
        actionPlans.length > 0
          ? actionPlans.map((act, idx) => [
              String(idx + 1),
              act.activityName,
              act.pic,
              act.timeline,
              `${act.indicator} (${act.target})`,
              formatRp(act.budgetAllocated),
            ])
          : [['-', 'Belum ada kegiatan RKT', '-', '-', '-', 'Rp 0']],
        ['', `Total ${actionPlans.length} Kegiatan RKT`, '', '', '', formatRp(totalBudgetAction)]
      ),
      buildSpacer(120),

      buildChapterHeading('BAB IV. SINKRONISASI ANGGARAN RKAS BOSP'),
      buildKeyValueTable([
        ['Total Kebutuhan Anggaran Rencana Aksi RKT', formatRp(totalBudgetAction)],
        ['Total Pagu Terpetakan di RKAS ARKAS', `${formatRp(totalBudgetRKAS)} (${rkasItems.length} pos kegiatan)`],
        ['Kepatuhan Regulasi', 'Sesuai Permendikdasmen Nomor 8 Tahun 2026 tentang Juknis BOSP'],
      ]),
      buildSpacer(120),

      buildChapterHeading('BAB V. MONITORING, EVALUASI & PENUTUP'),
      buildBodyParagraph(
        `Evaluasi keterlaksanaan RKT dilaksanakan berkala setiap bulan dan tengah semester oleh Kepala ${schoolProfile.name} bersama Tim TPMPS, terintegrasi dengan Supervisi Akademik & Manajerial Berbasis Data. Demikian dokumen RKT Tahun Pelajaran ${schoolProfile.academicYear} ini disahkan untuk dilaksanakan dengan penuh tanggung jawab.`
      ),
      buildSignatureBlock(
        schoolProfile,
        'Mengetahui,',
        'Ketua Tim Pengembang Sekolah (TPMPS)',
        `Tim TPMPS ${schoolProfile.name}`,
        ''
      )
    );
  }

  const doc = createDocumentShell(schoolProfile, `RKT ${schoolProfile.academicYear}`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `RKT_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.academicYear)}.docx`);
}

// ============================================================================
// 3. RKAS BOSP WORD EXPORT
// ============================================================================
export async function exportRKASToWord(
  db: SchoolDatabase,
  budgetCapOverride?: number
): Promise<void> {
  const { schoolProfile, supportingData, rkasItems, problems } = db;
  const budgetCap = budgetCapOverride ?? supportingData?.budgetCapTotal ?? (schoolProfile.totalStudents || 180) * 1100000;
  const totalPlanned = rkasItems.reduce((s, r) => s + r.totalAmount, 0);
  const totalRealized = rkasItems.reduce((s, r) => s + (r.realizedAmount || 0), 0);
  const remaining = budgetCap - totalPlanned;
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;

  const compMap = new Map<string, number>();
  rkasItems.forEach((item) => {
    compMap.set(item.componentCategory, (compMap.get(item.componentCategory) || 0) + item.totalAmount);
  });

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS BOSP)',
      schoolProfile.name,
      `TAHUN ANGGARAN / PELAJARAN ${schoolProfile.academicYear}`
    ),
    buildChapterHeading('LEMBAR PENGESAHAN'),
    buildBodyParagraph(
      `Dokumen Rencana Kegiatan dan Anggaran Sekolah (RKAS) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun melalui rapat dewan pendidik, Bendahara BOSP, Tim TPMPS, dan Komite Sekolah berdasarkan hasil Perencanaan Berbasis Data (PBD) Rapor Pendidikan dan ketentuan Juknis BOSP.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui / Menyetujui,',
      `Ketua Komite & Bendahara BOSP`,
      `Komite & Tim BOSP ${schoolProfile.name}`,
      ''
    ),
    buildSpacer(160),

    buildChapterHeading('BAB I. PENDAHULUAN'),
    buildSubHeading('1.1 Latar Belakang'),
    buildBodyParagraph(
      `Pengelolaan pembiayaan pendidikan yang efektif, efisien, transparan, dan akuntabel merupakan fondasi peningkatan mutu layanan belajar di ${schoolProfile.name} (${schoolProfile.totalStudents} siswa, ${schoolProfile.totalStudyGroups} rombongan belajar). Penyusunan RKAS Tahun Pelajaran ${schoolProfile.academicYear} ini disusun secara presisi berdasarkan hasil Perencanaan Berbasis Data (PBD) sehingga setiap pos belanja terhubung langsung ke pembenahan indikator prioritas (${usedProblems.map((p) => `${p.indicatorCode} ${p.indicatorName}`).join(', ') || 'Literasi, Numerasi, Kualitas Pembelajaran, dan Karakter'}).`
    ),
    buildSubHeading('1.2 Landasan Hukum'),
    buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
    buildNumberedOrBullet('2.', 'PP Nomor 48 Tahun 2008 tentang Pendanaan Pendidikan sebagaimana diubah dengan PP Nomor 18 Tahun 2022.'),
    buildNumberedOrBullet('3.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan (Standar Pembiayaan).'),
    buildNumberedOrBullet('4.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
    buildNumberedOrBullet('5.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
    buildSubHeading('1.3 Prinsip & Tujuan Pengelolaan Dana BOSP'),
    buildNumberedOrBullet('1.', '**Efektivitas Berbasis Data**: Memprioritaskan pengadaan sarana, pelatihan Kombel/GTK, dan asesmen sesuai akar masalah Rapor Pendidikan.'),
    buildNumberedOrBullet('2.', '**Akuntabilitas & Transparansi**: Seluruh pembelanjaan mengacu pada kode rekening resmi ARKAS, menggunakan mekanisme SIPLah, serta diaudit berkala.'),

    buildChapterHeading('BAB II. RINGKASAN PAGU & REKAPITULASI KOMPONEN BOSP'),
    buildKeyValueTable([
      ['Satuan Pendidikan / NPSN', `${schoolProfile.name} (NPSN: ${schoolProfile.npsn})`],
      ['Total Pagu Dana BOSP Tahunan', formatRp(budgetCap)],
      ['Total Rencana Belanja RKAS', `${formatRp(totalPlanned)} (${budgetCap > 0 ? ((totalPlanned / budgetCap) * 100).toFixed(1) : '0'}% dari pagu)`],
      ['Total Realisasi Tercatat', formatRp(totalRealized)],
      ['Sisa Pagu Tersedia', formatRp(remaining)],
    ]),
    buildSpacer(100),
    buildSubHeading('2.1 Rekapitulasi Anggaran Per Komponen Pembiayaan BOSP'),
    buildStyledTable(
      [
        { header: 'No', widthPct: 8, align: AlignmentType.CENTER },
        { header: 'Komponen Pembiayaan BOSP', widthPct: 58 },
        { header: 'Persentase', widthPct: 14, align: AlignmentType.CENTER },
        { header: 'Jumlah Anggaran', widthPct: 20, align: AlignmentType.RIGHT },
      ],
      Array.from(compMap.entries()).map(([comp, amt], idx) => [
        String(idx + 1),
        comp,
        `${totalPlanned > 0 ? ((amt / totalPlanned) * 100).toFixed(1) : '0'}%`,
        formatRp(amt),
      ]),
      ['', 'Total Rencana Anggaran Keseluruhan', '100%', formatRp(totalPlanned)]
    ),
    buildSpacer(120),

    buildChapterHeading(`BAB III. RINCIAN KEGIATAN DAN ANGGARAN SEKOLAH (${rkasItems.length} POS)`),
    buildStyledTable(
      [
        { header: 'No', widthPct: 5, align: AlignmentType.CENTER },
        { header: 'Kode BOSP', widthPct: 11 },
        { header: 'Program & Uraian Kegiatan', widthPct: 33 },
        { header: 'Komponen', widthPct: 18 },
        { header: 'Vol / Satuan', widthPct: 10, align: AlignmentType.CENTER },
        { header: 'Harga Satuan', widthPct: 11, align: AlignmentType.RIGHT },
        { header: 'Total (Rp)', widthPct: 12, align: AlignmentType.RIGHT },
      ],
      rkasItems.length > 0
        ? rkasItems.map((item, idx) => [
            String(idx + 1),
            item.bospCode,
            `${item.activityName} (${item.fundingSource})`,
            item.componentCategory,
            `${item.volume} ${item.unit}`,
            formatRp(item.unitPrice),
            formatRp(item.totalAmount),
          ])
        : [['-', '-', 'Belum ada item RKAS terdaftar', '-', '-', 'Rp 0', 'Rp 0']],
      ['', '', `Total ${rkasItems.length} Kegiatan RKAS BOSP`, '', '', '', formatRp(totalPlanned)]
    ),
    buildSpacer(120),

    buildChapterHeading('BAB IV. PENGAWASAN, PELAPORAN & PENUTUP'),
    buildBodyParagraph(
      `Realisasi anggaran RKAS BOSP ${schoolProfile.name} diperiksa setiap triwulan melalui rekonsiliasi buku kas umum dan bukti pertanggungjawaban resmi pada aplikasi ARKAS Kemendikdasmen. Demikian RKAS Tahun Pelajaran ${schoolProfile.academicYear} ini disahkan sebagai acuan resmi penggunaan anggaran sekolah.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Bendahara BOSP ${schoolProfile.name}`,
      'Tim Pengelola Dana BOSP',
      ''
    ),
  ];

  const doc = createDocumentShell(schoolProfile, `RKAS BOSP ${schoolProfile.academicYear}`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `RKAS_BOSP_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.academicYear)}.docx`);
}

// ============================================================================
// 4. PROGRAM KERJA KEPALA SEKOLAH WORD EXPORT
// ============================================================================
export async function exportPrincipalProgramToWord(db: SchoolDatabase): Promise<void> {
  const { schoolProfile, principalPrograms, problems } = db;
  const totalBudget = principalPrograms.reduce((s, p) => s + p.budget, 0);
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'PROGRAM KERJA KEPALA SEKOLAH TERPADU',
      schoolProfile.name,
      `TAHUN PELAJARAN ${schoolProfile.academicYear}`
    ),
    buildChapterHeading('LEMBAR PENGESAHAN'),
    buildBodyParagraph(
      `Program Kerja Kepala ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun sebagai pedoman pelaksanaan tugas manajerial, supervisi guru dan tenaga kependidikan, kewirausahaan, peningkatan mutu pembelajaran, penguatan karakter, sarpras, serta kemitraan masyarakat berbasis Perencanaan Berbasis Data (PBD).`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      'Pengawas Pembina Satuan Pendidikan',
      `Dinas Pendidikan ${schoolProfile.city}`,
      ''
    ),
    buildSpacer(160),

    buildChapterHeading('BAB I. PENDAHULUAN'),
    buildSubHeading('1.1 Latar Belakang'),
    buildBodyParagraph(
      `Kepala sekolah berperan strategis sebagai pemimpin pembelajaran (instructional leader) dan manajer satuan pendidikan. Dalam rangka mengakselerasi pembenahan mutu pendidikan di ${schoolProfile.name} (${getStageLabel(
        schoolProfile.stage
      )}, ${schoolProfile.totalTeachers} guru, ${schoolProfile.totalStaff} tendik, ${schoolProfile.totalStudents} peserta didik), Kepala Sekolah menyusun program kerja yang terintegrasi langsung dengan temuan Rapor Pendidikan serta fokus pembenahan PBD (${usedProblems.map((p) => `${p.indicatorCode} ${p.indicatorName}`).join(', ') || 'Literasi, Numerasi, dan Kualitas Pembelajaran'}).`
    ),
    buildSubHeading('1.2 Landasan Hukum'),
    buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
    buildNumberedOrBullet('2.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.'),
    buildNumberedOrBullet('3.', 'Permendikbudristek Nomor 40 Tahun 2021 tentang Penugasan Guru sebagai Kepala Sekolah.'),
    buildNumberedOrBullet('4.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
    buildNumberedOrBullet('5.', 'Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan Satuan Pendidikan.'),
    buildNumberedOrBullet('6.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
    buildSubHeading('1.3 Tujuan dan Sasaran'),
    buildNumberedOrBullet('1.', 'Mengawal penyusunan serta keterlaksanaan RKJM, RKT, dan RKAS berbasis data Rapor Pendidikan.'),
    buildNumberedOrBullet('2.', `Mendampingi peningkatan kinerja ${schoolProfile.totalTeachers} guru dan ${schoolProfile.totalStaff} tendik melalui supervisi klinis, Kombel, dan Ruang GTK/PMM.`),
    buildNumberedOrBullet('3.', 'Mewujudkan lingkungan belajar yang aman, inklusif, berkarakter, serta kolaboratif bersama Komite Sekolah dan orang tua.'),

    buildChapterHeading(`BAB II. MATRIKS PROGRAM KERJA KEPALA SEKOLAH (${principalPrograms.length} PROGRAM)`),
    buildStyledTable(
      [
        { header: 'No', widthPct: 6, align: AlignmentType.CENTER },
        { header: 'Dimensi Tugas', widthPct: 16 },
        { header: 'Program Kerja & Tujuan', widthPct: 34 },
        { header: 'Jadwal & Indikator Keberhasilan', widthPct: 28 },
        { header: 'Pagu & Status', widthPct: 16, align: AlignmentType.RIGHT },
      ],
      principalPrograms.length > 0
        ? principalPrograms.map((p, idx) => [
            String(idx + 1),
            p.dimension,
            `**${p.title}**. Tujuan: ${p.goals}`,
            `Jadwal: ${p.schedule}. Indikator: ${p.indicators}`,
            `${formatRp(p.budget)} (${p.status})`,
          ])
        : [['-', '-', 'Belum ada program kerja kepala sekolah', '-', 'Rp 0']],
      ['', '', `Total ${principalPrograms.length} Program Kerja Kepala Sekolah`, '', formatRp(totalBudget)]
    ),
    buildSpacer(120),

    buildChapterHeading('BAB III. STRATEGI PENGAWALAN MUTU & PENUTUP'),
    buildBodyParagraph(
      `Pelaksanaan program kerja ini dikawal melalui rapat koordinasi bulanan TPMPS, siklus supervisi akademik dan manajerial berbasis data, serta forum kemitraan orang tua dan Komite Sekolah. Evaluasi dilaksanakan tiap semester sebelum penetapan target tahun berikutnya. Demikian Program Kerja Kepala Sekolah ${schoolProfile.name} Tahun Pelajaran ${schoolProfile.academicYear} ini disahkan untuk dilaksanakan dengan sebaik-baiknya.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Ketua TPMPS ${schoolProfile.name}`,
      `Tim Pengembang Sekolah (TPMPS)`,
      ''
    ),
  ];

  const doc = createDocumentShell(schoolProfile, `Program Kepala Sekolah`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `Program_Kepala_Sekolah_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.academicYear)}.docx`);
}

// ============================================================================
// 5. PROGRAM SUPERVISI AKADEMIK & MANAJERIAL (6 KOMPONEN DATA-DRIVEN) WORD EXPORT
// ============================================================================
export async function exportSupervisionProgramToWord(
  db: SchoolDatabase,
  customMarkdown?: string
): Promise<void> {
  const { schoolProfile, raporIndicators, rootCauses, supervisionRecords } = db;
  const sixAnalysis = analyzeSixPriorityIndicators(raporIndicators, rootCauses);
  const attentionList = sixAnalysis.filter((x) => x.needsAttention);
  const targetGroups = attentionList.length > 0 ? attentionList : sixAnalysis.slice(0, 4);
  const revisitCount = supervisionRecords.filter((r) => r.requiresFollowUpSupervision).length;

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'PROGRAM SUPERVISI AKADEMIK DAN MANAJERIAL BERBASIS DATA',
      schoolProfile.name,
      `TERINTEGRASI RAPOR PENDIDIKAN · TAHUN PELAJARAN ${schoolProfile.academicYear}`
    ),
  ];

  if (customMarkdown && customMarkdown.trim().length > 0) {
    elements.push(...markdownToDocxElements(customMarkdown));
    elements.push(buildSpacer(120));
    elements.push(
      buildSignatureBlock(
        schoolProfile,
        'Mengetahui,',
        'Pengawas Pembina Satuan Pendidikan',
        `Dinas Pendidikan ${schoolProfile.city}`,
        ''
      )
    );
  } else {
    elements.push(
      buildChapterHeading('LEMBAR PENGESAHAN'),
      buildBodyParagraph(
        `Program Supervisi Akademik dan Manajerial Berbasis Data (Rapor Pendidikan) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun untuk mendampingi ${schoolProfile.totalTeachers} guru dan ${schoolProfile.totalStaff} tenaga kependidikan memperbaiki kualitas pembelajaran dan layanan satuan pendidikan pada indikator prioritas.`
      ),
      buildSignatureBlock(
        schoolProfile,
        'Mengetahui,',
        'Pengawas Pembina Satuan Pendidikan',
        `Dinas Pendidikan ${schoolProfile.city}`,
        ''
      ),
      buildSpacer(160),

      buildChapterHeading('BAB I. PENDAHULUAN'),
      buildSubHeading('1.1 Latar Belakang & Prinsip Dasar Data-Driven'),
      buildBodyParagraph(
        `Program supervisi akademik dan manajerial yang terhubung dengan Rapor Pendidikan di ${schoolProfile.name} bersifat berbasis data (data-driven) dan berfokus pada pemecahan masalah utama pada indikator prioritas. Tujuannya bukan sekadar memeriksa kelengkapan administrasi guru, melainkan mendampingi guru dan tenaga kependidikan untuk memperbaiki kualitas pembelajaran dan layanan satuan pendidikan yang skornya masih rendah atau mengalami penurunan.`
      ),
      buildSubHeading('1.2 Landasan Hukum'),
      buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
      buildNumberedOrBullet('2.', 'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen.'),
      buildNumberedOrBullet('3.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan (Standar Proses & Standar PTK).'),
      buildNumberedOrBullet('4.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
      buildNumberedOrBullet('5.', 'Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan Satuan Pendidikan.'),
      buildNumberedOrBullet('6.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),

      buildChapterHeading('BAB II. KOMPONEN 1 — ANALISIS AKAR MASALAH DARI RAPOR PENDIDIKAN'),
      buildBodyParagraph(
        'Pemetaan enam indikator utama prioritas Rapor Pendidikan berlabel Merah (Kurang), Kuning (Sedang), atau Hijau (Baik) beserta penelusuran Akar Masalah Level 2 (Metode Pembelajaran, Refleksi & Perbaikan Pembelajaran Guru, atau Kepemimpinan Instruksional):'
      ),
      buildStyledTable(
        [
          { header: 'Kode', widthPct: 8, align: AlignmentType.CENTER },
          { header: 'Indikator Utama Prioritas', widthPct: 24 },
          { header: 'Skor & Tren', widthPct: 14, align: AlignmentType.CENTER },
          { header: 'Label Mutu', widthPct: 16, align: AlignmentType.CENTER },
          { header: 'Akar Masalah Level 2', widthPct: 38 },
        ],
        sixAnalysis.map((item) => [
          item.code,
          item.title,
          `${item.score.toFixed(1)} (${item.change >= 0 ? `+${item.change}` : item.change})`,
          item.labelStatus,
          item.rootCauseLevel2,
        ])
      ),
      buildSpacer(120),

      buildChapterHeading('BAB III. KOMPONEN 2 — TUJUAN DAN SASARAN SUPERVISI SPESIFIK'),
      buildBodyParagraph(
        'Sasaran supervisi dikelompokkan berdasarkan kebutuhan pendampingan nyata (Sasaran Berbasis Kebutuhan), bukan menyamaratakan perlakuan bagi semua guru/tendik, dengan target perubahan perilaku mengajar/layanan yang spesifik:'
      ),
      buildStyledTable(
        [
          { header: 'Fokus', widthPct: 9, align: AlignmentType.CENTER },
          { header: 'Kelompok Sasaran Berbasis Kebutuhan', widthPct: 39 },
          { header: 'Target Peningkatan Indikator & Perubahan Perilaku', widthPct: 52 },
        ],
        targetGroups.map((g) => [g.code, g.coachingNeedGroup, g.behaviorTarget])
      ),
      buildSpacer(120),

      buildChapterHeading('BAB IV. KOMPONEN 3 & 4 — FOKUS OBSERVASI & SIKLUS COACHING'),
      buildSubHeading('4.1 Fokus Aspek Observasi Kelas & Layanan (Instrumen Supervisi)'),
      buildNumberedOrBullet(
        'A.',
        '**Fokus Literasi dan Numerasi (A.1 & A.2)**: Mengamati bagaimana guru mengintegrasikan teks bacaan bermakna atau penalaran matematika ke dalam mata pelajaran non-bahasa dan non-matematika, serta bagaimana guru memantik pertanyaan terbuka.'
      ),
      buildNumberedOrBullet(
        'B.',
        '**Fokus Kualitas Pembelajaran (D.1)**: Mengamati manajemen kelas, dukungan psikologis guru kepada murid, serta keterlibatan aktif siswa dalam proses belajar (student-centered).'
      ),
      buildNumberedOrBullet(
        'C.',
        '**Fokus Iklim Keamanan, Karakter & Kebinekaan (A.3, D.4, D.8)**: Mengamati interaksi sosial di kelas dan unit layanan, pencegahan perundungan (bullying), serta sikap inklusif guru dan tendik terhadap murid dengan latar belakang atau kebutuhan belajar beragam.'
      ),
      buildSubHeading('4.2 Pendekatan dan Metode Pendampingan (Siklus Coaching Berkelanjutan)'),
      buildNumberedOrBullet(
        '1.',
        '**Pra-Observasi**: Diskusi awal antara kepala sekolah/tim supervisi dan guru/tendik untuk menyepakati indikator Rapor Pendidikan serta aspek instrumen yang akan dilatihkan.'
      ),
      buildNumberedOrBullet(
        '2.',
        '**Observasi Pembelajaran / Layanan**: Pengamatan langsung di kelas atau unit layanan menggunakan instrumen yang disepakati tanpa menginterupsi jalannya pelajaran.'
      ),
      buildNumberedOrBullet(
        '3.',
        '**Pasca-Observasi (Coaching & Umpan Balik Reflektif)**: Dialog reflektif berbasis bukti observasi agar guru/tendik menemukan sendiri kekuatan, kelemahan, dan solusi perbaikan.'
      ),

      buildChapterHeading('BAB V. KOMPONEN 5 — RENCANA TINDAK LANJUT (RTL) TERINTEGRASI & JADWAL'),
      buildNumberedOrBullet('1.', '**Integrasi Komunitas Belajar (Kombel)**: Masalah umum temuan supervisi diangkat menjadi topik utama bahasan Kombel sekolah (seperti praktik baik modul ajar berdiferensiasi dan integrasi literasi-numerasi).'),
      buildNumberedOrBullet('2.', '**Pemanfaatan Platform Belajar (Ruang GTK / PMM)**: Guru diarahkan mempelajari topik spesifik di Ruang GTK / PMM sesuai catatan hasil observasinya.'),
      buildNumberedOrBullet('3.', `**Supervisi Klinis Ulang**: Pendampingan lanjutan terjadwal khusus bagi guru/tendik yang masih membutuhkan penguatan pasca tindak lanjut pertama (terjadwal ulang saat ini: ${revisitCount} sasaran).`),
      buildSpacer(80),
      buildStyledTable(
        [
          { header: 'No', widthPct: 5, align: AlignmentType.CENTER },
          { header: 'Sasaran (Guru / Unit Tendik)', widthPct: 22 },
          { header: 'Fokus Rapor & Jadwal', widthPct: 18 },
          { header: 'Pra-Observasi & Coaching', widthPct: 28 },
          { header: 'RTL Kombel, Ruang GTK & Ulang', widthPct: 27 },
        ],
        supervisionRecords.length > 0
          ? supervisionRecords.map((rec, idx) => [
              String(idx + 1),
              `${rec.teacherName} (${rec.supervisionType || 'Akademik (Guru)'} — ${rec.subject})`,
              `${rec.priorityIndicatorCode || 'PBD'} ${rec.priorityIndicatorName || ''} · ${rec.scheduledDate} (${rec.status})`,
              `Pra: ${rec.preObservationNotes}. Coaching: ${rec.postObservationReflection}`,
              `Kombel: ${rec.kombelTopic || rec.followUpPlan}. PMM: ${rec.pmmTopic || '-'}${rec.requiresFollowUpSupervision ? `. Supervisi Ulang: ${rec.followUpRescheduleDate || 'Terjadwal'}` : ''}`,
            ])
          : [['-', 'Belum ada jadwal supervisi', '-', '-', '-']]
      ),
      buildSpacer(120),

      buildChapterHeading('BAB VI. KOMPONEN 6 — EVALUASI, MONITORING DAMPAK & PENUTUP'),
      buildNumberedOrBullet('1.', '**Evaluasi Tengah Semester**: Memeriksa keterlaksanaan jadwal supervisi dan konsistensi guru/tendik menerapkan kesepakatan hasil coaching.'),
      buildNumberedOrBullet('2.', `**Asesmen Internal & Survei Lingkungan Belajar Internal**: Melakukan survei lingkungan belajar internal serta asesmen diagnostik berkala kepada ${schoolProfile.totalStudents} siswa untuk mengukur dampak perubahan mengajar terhadap pemahaman dan kenyamanan belajar murid sebelum rilis Rapor Pendidikan tahun berikutnya.`),
      buildBodyParagraph(
        `Demikian Program Supervisi Akademik dan Manajerial Berbasis Data ${schoolProfile.name} Tahun Pelajaran ${schoolProfile.academicYear} ini disahkan untuk dilaksanakan.`
      ),
      buildSignatureBlock(
        schoolProfile,
        'Mengetahui,',
        `Wakasek Kurikulum / Koordinator TPMPS`,
        `Tim Supervisi ${schoolProfile.name}`,
        ''
      )
    );
  }

  const doc = createDocumentShell(schoolProfile, `Supervisi Akademik & Manajerial`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `Program_Supervisi_Akademik_Manajerial_${sanitizeFilename(schoolProfile.name)}.docx`);
}

// ============================================================================
// 6. PROGRAM GERAKAN LITERASI SEKOLAH WORD EXPORT
// ============================================================================
export async function exportLiteracyProgramToWord(db: SchoolDatabase): Promise<void> {
  const { schoolProfile, raporIndicators, literacyPrograms, rootCauses } = db;
  const indLit = findInd(raporIndicators, 'A.1', 'literasi');
  const litScore = indLit?.score ?? 65;
  const litChange = indLit?.changeFromLastYear ?? 0;
  const litRC =
    rootCauses.find((r) => r.mainProblem.toLowerCase().includes('literasi'))?.rootCause ||
    indLit?.kemendikbudRootCause ||
    'Peserta didik memerlukan penguatan membaca teks informasi bermakna, diskusi reflektif, serta ketersediaan buku non-teks di pojok baca kelas.';

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'PROGRAM GERAKAN LITERASI SEKOLAH (GLS) BERBASIS PBD',
      schoolProfile.name,
      `TAHUN PELAJARAN ${schoolProfile.academicYear}`
    ),
    buildChapterHeading('LEMBAR PENGESAHAN'),
    buildBodyParagraph(
      `Program Gerakan Literasi Sekolah (GLS) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun sebagai intervensi terpadu atas capaian Rapor Pendidikan Indikator A.1 (Kemampuan Literasi) bagi seluruh ${schoolProfile.totalStudents} peserta didik (${schoolProfile.totalStudyGroups} rombel).`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Koordinator Tim GLS & Perpustakaan`,
      `Tim Literasi ${schoolProfile.name}`,
      ''
    ),
    buildSpacer(160),

    buildChapterHeading('BAB I. PENDAHULUAN'),
    buildSubHeading('1.1 Latar Belakang'),
    buildBodyParagraph(
      `Kemampuan literasi merupakan fondasi utama bagi peserta didik untuk mengakses informasi, menalar secara kritis, dan menguasai seluruh mata pelajaran. Berdasarkan hasil Rapor Pendidikan ${schoolProfile.name}, capaian indikator **A.1 Kemampuan Literasi** berada pada skor **${litScore.toFixed(
        1
      )}** (${indLit?.category || 'Sedang'}, tren ${litChange >= 0 ? `+${litChange}` : litChange} poin). Oleh karena itu, diperlukan Program Gerakan Literasi Sekolah (GLS) yang mencakup pembiasaan membaca senyap 15 menit, revitalisasi pojok baca di ${schoolProfile.totalStudyGroups} kelas, serta integrasi teks bacaan bermakna lintas mata pelajaran.`
    ),
    buildSubHeading('1.2 Landasan Hukum'),
    buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
    buildNumberedOrBullet('2.', 'Undang-Undang Nomor 3 Tahun 2017 tentang Sistem Perbukuan.'),
    buildNumberedOrBullet('3.', 'Permendikbud Nomor 23 Tahun 2015 tentang Penumbuhan Budi Pekerti (Pembiasaan Membaca 15 Menit).'),
    buildNumberedOrBullet('4.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.'),
    buildNumberedOrBullet('5.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
    buildNumberedOrBullet('6.', 'Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum.'),
    buildNumberedOrBullet('7.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
    buildSubHeading('1.3 Tujuan dan Sasaran'),
    buildNumberedOrBullet('1.', 'Meningkatkan kecakapan memahami, menginterpretasi, dan merefleksikan teks sastra maupun informasi.'),
    buildNumberedOrBullet('2.', `Mewujudkan sudut baca aktif pada ${schoolProfile.totalStudyGroups} ruang kelas dan perpustakaan sekolah yang nyaman.`),
    buildNumberedOrBullet('3.', `Melibatkan ${schoolProfile.totalTeachers} guru lintas mata pelajaran dan orang tua dalam pembiasaan literasi harian.`),

    buildChapterHeading('BAB II. ANALISIS KONDISI LITERASI & AKAR MASALAH'),
    buildKeyValueTable([
      ['Indikator Rapor Pendidikan', `A.1 Kemampuan Literasi — Skor ${litScore.toFixed(1)} (${indLit?.category || 'Sedang'})`],
      ['Akar Masalah Teridentifikasi', litRC],
      ['Strategi Pembenahan PBD', 'Pembiasaan 15 menit membaca, pengadaan buku bacaan non-teks bermutu BOSP, dan integrasi pertanyaan terbuka lintas mapel di Kombel.'],
    ]),
    buildSpacer(120),

    buildChapterHeading(`BAB III. MATRIKS PROGRAM GERAKAN LITERASI SEKOLAH (${literacyPrograms.length} PROGRAM)`),
    buildStyledTable(
      [
        { header: 'No', widthPct: 6, align: AlignmentType.CENTER },
        { header: 'Jenis & Judul Program', widthPct: 28 },
        { header: 'Strategi & Uraian Kegiatan', widthPct: 32 },
        { header: 'Sasaran & Frekuensi', widthPct: 18 },
        { header: 'PIC & Progres', widthPct: 16 },
      ],
      literacyPrograms.length > 0
        ? literacyPrograms.map((p, i) => [
            String(i + 1),
            `**${p.title}** [${p.type}]`,
            p.description,
            `${p.targetParticipation} · ${p.frequency}`,
            `${p.pic} (${p.progress}%)`,
          ])
        : [['-', 'Belum ada program literasi', '-', '-', '-']]
    ),
    buildSpacer(120),

    buildChapterHeading('BAB IV. DUKUNGAN SUMBER DAYA, EVALUASI & PENUTUP'),
    buildBodyParagraph(
      `Dukungan sarana buku bacaan fiksi/non-fiksi bermutu dipenuhi melalui pos Pengembangan Perpustakaan pada RKAS BOSP, disertai pemantauan jurnal baca mingguan siswa, asesmen diagnostik literasi tengah semester, serta refleksi guru di Komunitas Belajar. Demikian Program Gerakan Literasi Sekolah ${schoolProfile.name} ini disahkan untuk dilaksanakan dengan konsisten.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Wakasek Kurikulum ${schoolProfile.name}`,
      'Tim Pengembang Literasi Sekolah',
      ''
    ),
  ];

  const doc = createDocumentShell(schoolProfile, `Program Gerakan Literasi`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `Program_Literasi_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.academicYear)}.docx`);
}

// ============================================================================
// 7. PROGRAM AKSELERASI NUMERASI KONTEKSTUAL WORD EXPORT
// ============================================================================
export async function exportNumeracyProgramToWord(db: SchoolDatabase): Promise<void> {
  const { schoolProfile, raporIndicators, numeracyPrograms, rootCauses } = db;
  const indNum = findInd(raporIndicators, 'A.2', 'numerasi');
  const numScore = indNum?.score ?? 60;
  const numChange = indNum?.changeFromLastYear ?? 0;
  const numRC =
    rootCauses.find((r) => r.mainProblem.toLowerCase().includes('numerasi'))?.rootCause ||
    indNum?.kemendikbudRootCause ||
    'Kemampuan bernalar matematis pada domain bilangan, aljabar, geometri, pengukuran, dan data memerlukan pembelajaran berbasis masalah nyata serta media konkret.';

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'PROGRAM AKSELERASI NUMERASI KONTEKSTUAL BERBASIS PBD',
      schoolProfile.name,
      `TAHUN PELAJARAN ${schoolProfile.academicYear}`
    ),
    buildChapterHeading('LEMBAR PENGESAHAN'),
    buildBodyParagraph(
      `Program Akselerasi Numerasi Kontekstual ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun sebagai intervensi prioritas terhadap capaian Rapor Pendidikan Indikator A.2 (Kemampuan Numerasi) untuk seluruh ${schoolProfile.totalStudents} peserta didik (${getStageLabel(
        schoolProfile.stage
      )}).`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Wakasek Kurikulum & Koordinator Numerasi`,
      `Tim Numerasi ${schoolProfile.name}`,
      ''
    ),
    buildSpacer(160),

    buildChapterHeading('BAB I. PENDAHULUAN'),
    buildSubHeading('1.1 Latar Belakang'),
    buildBodyParagraph(
      `Numerasi adalah kecakapan mengaplikasikan konsep bilangan, operasi hitung, geometri, pengukuran, dan interpretasi data dalam memecahkan masalah kehidupan nyata. Berdasarkan Rapor Pendidikan ${schoolProfile.name}, indikator **A.2 Kemampuan Numerasi** saat ini berada pada skor **${numScore.toFixed(
        1
      )}** (${indNum?.category || 'Sedang'}, tren ${numChange >= 0 ? `+${numChange}` : numChange} poin). Kondisi ini mendorong sekolah menyusun Program Akselerasi Numerasi Kontekstual yang melibatkan guru matematika dan guru lintas mata pelajaran menggunakan alat peraga manipulatif serta asesmen diagnostik.`
    ),
    buildSubHeading('1.2 Landasan Hukum'),
    buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
    buildNumberedOrBullet('2.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.'),
    buildNumberedOrBullet('3.', 'Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.'),
    buildNumberedOrBullet('4.', 'Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum pada PAUD, Dikdas, dan Dikmen.'),
    buildNumberedOrBullet('5.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
    buildSubHeading('1.3 Tujuan dan Sasaran'),
    buildNumberedOrBullet('1.', `Mengangkat capaian A.2 Kemampuan Numerasi ${schoolProfile.name} ke kategori Baik/Cakap (>= 70).`),
    buildNumberedOrBullet('2.', `Membiasakan ${schoolProfile.totalTeachers} guru mengintegrasikan pembacaan data, grafik, dan penalaran matematis di mapel non-matematika.`),
    buildNumberedOrBullet('3.', `Menyediakan alat peraga manipulatif konkret dan klinik bimbingan terdiferensiasi di ${schoolProfile.totalStudyGroups} rombongan belajar.`),

    buildChapterHeading('BAB II. ANALISIS KONDISI NUMERASI & AKAR MASALAH'),
    buildKeyValueTable([
      ['Indikator Rapor Pendidikan', `A.2 Kemampuan Numerasi — Skor ${numScore.toFixed(1)} (${indNum?.category || 'Sedang'})`],
      ['Akar Masalah Teridentifikasi', numRC],
      ['Strategi Pembenahan PBD', 'Pembelajaran berbasis masalah kontekstual, eksplorasi kit alat peraga manipulatif BOSP, Math Corner, dan asesmen diagnostik awal bab.'],
    ]),
    buildSpacer(120),

    buildChapterHeading(`BAB III. MATRIKS PROGRAM NUMERASI KONTEKSTUAL (${numeracyPrograms.length} PROGRAM)`),
    buildStyledTable(
      [
        { header: 'No', widthPct: 6, align: AlignmentType.CENTER },
        { header: 'Pendekatan & Judul Program', widthPct: 28 },
        { header: 'Metode & Uraian Kegiatan', widthPct: 32 },
        { header: 'Sasaran & Frekuensi', widthPct: 18 },
        { header: 'PIC & Progres', widthPct: 16 },
      ],
      numeracyPrograms.length > 0
        ? numeracyPrograms.map((p, i) => [
            String(i + 1),
            `**${p.title}** [${p.type}]`,
            p.description,
            `${p.targetParticipation} · ${p.frequency}`,
            `${p.pic} (${p.progress}%)`,
          ])
        : [['-', 'Belum ada program numerasi', '-', '-', '-']]
    ),
    buildSpacer(120),

    buildChapterHeading('BAB IV. IMPLEMENTASI ASESMEN DIAGNOSTIK, EVALUASI & PENUTUP'),
    buildBodyParagraph(
      `Setiap awal bab, guru melaksanakan asesmen diagnostik numerasi untuk memetakan kesiapan belajar siswa agar pendampingan terdiferensiasi tepat sasaran. Praktik baik pembelajaran kontekstual direfleksikan rutin dalam Komunitas Belajar (Kombel) sekolah. Demikian Program Akselerasi Numerasi Kontekstual ${schoolProfile.name} ini disahkan untuk dilaksanakan.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Koordinator Kombel ${schoolProfile.name}`,
      'Tim Pengembang Numerasi',
      ''
    ),
  ];

  const doc = createDocumentShell(schoolProfile, `Program Numerasi Kontekstual`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `Program_Numerasi_Kontekstual_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.academicYear)}.docx`);
}

// ============================================================================
// 8. PROGRAM PENGUATAN KARAKTER & PPKSP WORD EXPORT
// ============================================================================
export async function exportCharacterProgramToWord(db: SchoolDatabase): Promise<void> {
  const { schoolProfile, raporIndicators, characterPrograms } = db;
  const indChar = findInd(raporIndicators, 'A.3', 'karakter');
  const indSafe = findInd(raporIndicators, 'D.4', 'keamanan');
  const indDiv = findInd(raporIndicators, 'D.8', 'kebinekaan');
  const charScore = indChar?.score ?? 72;
  const safeScore = indSafe?.score ?? 78;
  const divScore = indDiv?.score ?? 76;

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      'PROGRAM PEMBIASAAN & PENGUATAN KARAKTER SATUAN PENDIDIKAN',
      schoolProfile.name,
      `BERBASIS PROFIL PELAJAR PANCASILA & PPKSP · TP ${schoolProfile.academicYear}`
    ),
    buildChapterHeading('LEMBAR PENGESAHAN'),
    buildBodyParagraph(
      `Program Pembiasaan dan Penguatan Karakter ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun untuk menguatkan capaian indikator Rapor Pendidikan Karakter (A.3), Iklim Keamanan Satuan Pendidikan (D.4), dan Iklim Kebinekaan (D.8) bagi ${schoolProfile.totalStudents} peserta didik.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Ketua Satgas PPKSP & Kesiswaan`,
      `Satgas PPKSP ${schoolProfile.name}`,
      ''
    ),
    buildSpacer(160),

    buildChapterHeading('BAB I. PENDAHULUAN'),
    buildSubHeading('1.1 Latar Belakang'),
    buildBodyParagraph(
      `Pendidikan bermutu tidak hanya berorientasi pada kecakapan kognitif, tetapi juga pembentukan karakter mulia, integritas, kemandirian, gotong royong, serta terciptanya sekolah yang aman dan inklusif. Berdasarkan data Rapor Pendidikan ${schoolProfile.name}, capaian **Karakter (A.3)** berada pada skor **${charScore.toFixed(
        1
      )}**, **Iklim Keamanan Satuan Pendidikan (D.4)** pada skor **${safeScore.toFixed(
        1
      )}**, dan **Iklim Kebinekaan (D.8)** pada skor **${divScore.toFixed(
        1
      )}**. Oleh karena itu, sekolah merancang program terstruktur yang memadukan 7 pembiasaan positif, kinerja Satgas PPKSP, dan budaya gotong royong.`
    ),
    buildSubHeading('1.2 Landasan Hukum'),
    buildNumberedOrBullet('1.', 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.'),
    buildNumberedOrBullet('2.', 'Peraturan Presiden Nomor 87 Tahun 2017 tentang Penguatan Pendidikan Karakter.'),
    buildNumberedOrBullet('3.', 'PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.'),
    buildNumberedOrBullet('4.', 'Permendikbudristek Nomor 46 Tahun 2023 tentang Pencegahan dan Penanganan Kekerasan di Lingkungan Satuan Pendidikan (PPKSP).'),
    buildNumberedOrBullet('5.', 'Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum (Projek Penguatan Profil Pelajar Pancasila).'),
    buildNumberedOrBullet('6.', 'Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.'),
    buildSubHeading('1.3 Tujuan dan Sasaran'),
    buildNumberedOrBullet('1.', `Membiasakan sikap religius, disiplin, santun, jujur, dan gotong royong bagi ${schoolProfile.totalStudents} peserta didik.`),
    buildNumberedOrBullet('2.', 'Mewujudkan sekolah ramah anak yang bebas dari perundungan (bullying), intoleransi, dan segala bentuk kekerasan.'),
    buildNumberedOrBullet('3.', 'Melibatkan seluruh pendidik, tendik, guru BK, wali kelas, dan orang tua secara sinergis.'),

    buildChapterHeading('BAB II. ANALISIS KONDISI KARAKTER & IKLIM SEKOLAH'),
    buildKeyValueTable([
      ['A.3 Karakter Peserta Didik', `Skor ${charScore.toFixed(1)} (${indChar?.category || 'Baik'})`],
      ['D.4 Iklim Keamanan Satuan Pendidikan', `Skor ${safeScore.toFixed(1)} (${indSafe?.category || 'Baik'})`],
      ['D.8 Iklim Kebinekaan', `Skor ${divScore.toFixed(1)} (${indDiv?.category || 'Baik'})`],
    ]),
    buildSpacer(120),

    buildChapterHeading(`BAB III. MATRIKS PROGRAM PENGUATAN KARAKTER (${characterPrograms.length} PROGRAM)`),
    buildStyledTable(
      [
        { header: 'No', widthPct: 6, align: AlignmentType.CENTER },
        { header: 'Fokus Area & Judul Program', widthPct: 28 },
        { header: 'Uraian Kegiatan Pembiasaan', widthPct: 34 },
        { header: 'Jadwal Pelaksanaan', widthPct: 16 },
        { header: 'PIC & Progres', widthPct: 16 },
      ],
      characterPrograms.length > 0
        ? characterPrograms.map((p, i) => [
            String(i + 1),
            `**${p.title}** [${p.focusArea}]`,
            p.description,
            p.implementationSchedule,
            `${p.pic} (${p.progress}%)`,
          ])
        : [['-', 'Belum ada program karakter', '-', '-', '-']]
    ),
    buildSpacer(120),

    buildChapterHeading('BAB IV. OPERASIONAL PPKSP, MONITORING & PENUTUP'),
    buildNumberedOrBullet('1.', '**Kanal Aduan & Pencegahan Dini**: Satgas PPKSP menyediakan kanal aduan aman serta edukasi anti-perundungan berkala di setiap rombel.'),
    buildNumberedOrBullet('2.', '**Disiplin Positif & Konseling**: Guru BK dan wali kelas menerapkan pendekatan restitutif dalam membina peserta didik.'),
    buildNumberedOrBullet('3.', '**Survei Lingkungan Belajar Internal**: Dilaksanakan setiap semester untuk memverifikasi rasa aman, kenyamanan, dan sikap inklusif antarwarga sekolah.'),
    buildBodyParagraph(
      `Demikian Program Pembiasaan & Penguatan Karakter ${schoolProfile.name} Tahun Pelajaran ${schoolProfile.academicYear} ini disahkan untuk dilaksanakan oleh seluruh warga sekolah.`
    ),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui,',
      `Wakasek Kesiswaan / Guru BK`,
      `Tim Kesiswaan ${schoolProfile.name}`,
      ''
    ),
  ];

  const doc = createDocumentShell(schoolProfile, `Program Penguatan Karakter`, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `Program_Penguatan_Karakter_${sanitizeFilename(schoolProfile.name)}_${sanitizeFilename(schoolProfile.academicYear)}.docx`);
}

// ============================================================================
// 9. UNIVERSAL ARCHIVE / MARKDOWN DOCUMENT WORD EXPORT (untuk 6.3 Dokumen Saya)
// ============================================================================
export async function exportMarkdownDocumentToWord(params: {
  title: string;
  category: string;
  academicYear: string;
  status: string;
  approvedBy?: string;
  contentMarkdown: string;
  schoolProfile: SchoolProfile;
}): Promise<void> {
  const { title, category, academicYear, status, approvedBy, contentMarkdown, schoolProfile } = params;

  const elements: (Paragraph | Table)[] = [
    ...buildKopSurat(schoolProfile),
    ...buildTitleBanner(
      title,
      schoolProfile.name,
      `Kategori: ${category}  ·  Periode / TP: ${academicYear}  ·  Status: ${status}`
    ),
    ...markdownToDocxElements(contentMarkdown),
    buildSpacer(120),
    buildSignatureBlock(
      schoolProfile,
      'Mengetahui / Memvalidasi,',
      'Tim Pengembang Sekolah (TPMPS)',
      approvedBy && approvedBy !== schoolProfile.principalName
        ? approvedBy
        : `TPMPS ${schoolProfile.name}`,
      ''
    ),
  ];

  const doc = createDocumentShell(schoolProfile, category, elements);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${sanitizeFilename(title)}.docx`);
}
