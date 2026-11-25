import * as XLSX from 'xlsx';
import { RaporIndicator, RKASItem } from '../types';

export interface ParsedSheetData {
  sheetName: string;
  headers: string[];
  rows: any[];
  detectedColumns: {
    codeCol?: string;
    nameCol?: string;
    scoreCol?: string;
    categoryCol?: string;
    changeCol?: string;
    rootCauseCol?: string;
    recommendationCol?: string;
  };
}

export class ExcelService {
  /**
   * Parse uploaded Excel (.xlsx, .xls) or CSV file with adaptive column identification
   */
  static async parseRaporExcel(file: File): Promise<{
    sheets: ParsedSheetData[];
    extractedIndicators: RaporIndicator[];
    fileName: string;
    fileSize: number;
  }> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheets: ParsedSheetData[] = [];
    let extractedIndicators: RaporIndicator[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: '' });

      if (jsonRows.length < 2) return;

      // Find the header row (scan up to 25 rows to accommodate title & metadata rows)
      let headerRowIndex = -1;
      for (let r = 0; r < Math.min(25, jsonRows.length); r++) {
        const row = jsonRows[r];
        if (Array.isArray(row)) {
          const rowText = row.map((cell) => String(cell || '').toLowerCase()).join(' ');
          if (
            rowText.includes('indikator') ||
            rowText.includes('capaian') ||
            rowText.includes('skor') ||
            rowText.includes('nilai') ||
            rowText.includes('aspek') ||
            rowText.includes('dimensi')
          ) {
            headerRowIndex = r;
            break;
          }
        }
      }

      // If no explicit header keyword found, fallback to first non-empty row with >= 2 columns
      if (headerRowIndex === -1) {
        for (let r = 0; r < Math.min(10, jsonRows.length); r++) {
          const row = jsonRows[r];
          if (Array.isArray(row) && row.filter((c) => String(c).trim() !== '').length >= 2) {
            headerRowIndex = r;
            break;
          }
        }
      }

      if (headerRowIndex === -1) headerRowIndex = 0;

      const headers = (jsonRows[headerRowIndex] as any[]).map((h, i) =>
        String(h || '').trim() || `Kolom_${i + 1}`
      );
      const dataRows = jsonRows
        .slice(headerRowIndex + 1)
        .filter((row) => row && Array.isArray(row) && row.some((cell: any) => String(cell).trim() !== ''));

      // Adaptive Column Detector with extensive Indonesian educational synonyms
      const detected: ParsedSheetData['detectedColumns'] = {};

      headers.forEach((h) => {
        const lower = h.toLowerCase();
        if (
          !detected.codeCol &&
          (lower.includes('kode') ||
            lower === 'no' ||
            lower === 'id' ||
            lower.includes('nomor') ||
            lower.includes('kode indikator'))
        ) {
          detected.codeCol = h;
        } else if (
          !detected.nameCol &&
          (lower.includes('indikator') ||
            lower.includes('nama indikator') ||
            lower.includes('nama aspek') ||
            lower.includes('aspek') ||
            lower.includes('sub-indikator') ||
            lower.includes('sub indikator') ||
            lower.includes('uraian') ||
            lower.includes('dimensi'))
        ) {
          detected.nameCol = h;
        } else if (
          !detected.scoreCol &&
          (lower.includes('skor') ||
            lower.includes('capaian') ||
            lower.includes('nilai') ||
            lower.includes('score') ||
            lower.includes('hasil') ||
            lower.includes('angka') ||
            lower.includes('2024') ||
            lower.includes('2025') ||
            lower.includes('2026'))
        ) {
          detected.scoreCol = h;
        } else if (
          !detected.categoryCol &&
          (lower.includes('kategori') ||
            lower.includes('predikat') ||
            lower.includes('label') ||
            lower.includes('status') ||
            lower.includes('peringkat'))
        ) {
          detected.categoryCol = h;
        } else if (
          !detected.changeCol &&
          (lower.includes('perubahan') ||
            lower.includes('tren') ||
            lower.includes('delta') ||
            lower.includes('selisih') ||
            lower.includes('perkembangan'))
        ) {
          detected.changeCol = h;
        } else if (
          !detected.rootCauseCol &&
          (lower.includes('akar') || lower.includes('masalah') || lower.includes('penyebab'))
        ) {
          detected.rootCauseCol = h;
        } else if (
          !detected.recommendationCol &&
          (lower.includes('inspirasi') || lower.includes('benahi') || lower.includes('rekomendasi'))
        ) {
          detected.recommendationCol = h;
        }
      });

      sheets.push({
        sheetName,
        headers,
        rows: dataRows,
        detectedColumns: detected,
      });

      // Extract indicators from this sheet if nameCol or candidate columns exist
      const nameIdx = detected.nameCol ? headers.indexOf(detected.nameCol) : headers.length > 1 ? 1 : 0;
      const scoreIdx = detected.scoreCol ? headers.indexOf(detected.scoreCol) : headers.length > 2 ? 2 : -1;
      const codeIdx = detected.codeCol ? headers.indexOf(detected.codeCol) : 0;
      const catIdx = detected.categoryCol ? headers.indexOf(detected.categoryCol) : -1;
      const changeIdx = detected.changeCol ? headers.indexOf(detected.changeCol) : -1;

      dataRows.forEach((row, rIdx) => {
        const rawName = String(row[nameIdx] || '').trim();

        // Extract score flexibly
        let rawScore = NaN;
        if (scoreIdx >= 0 && row[scoreIdx] !== undefined) {
          const cellVal = String(row[scoreIdx]).trim();
          // Extract number with regex (e.g., "64.8", "64,8", "64,8%", "Dasar (64.8)")
          const match = cellVal.match(/\d+([.,]\d+)?/);
          if (match) {
            rawScore = parseFloat(match[0].replace(',', '.'));
          }
        }

        // Check if row has indicator code
        const rawCode = String(row[codeIdx] || `IND-${rIdx + 1}`).trim();

        // Determine category
        let category: RaporIndicator['category'] = 'Sedang';
        let rawCatStr = catIdx >= 0 ? String(row[catIdx] || '').toLowerCase() : '';

        // If score is NaN, maybe the score or name column has the category string
        if (isNaN(rawScore) && rawCatStr) {
          if (rawCatStr.includes('mahir')) { rawScore = 85; category = 'Mahir'; }
          else if (rawCatStr.includes('cakap')) { rawScore = 70; category = 'Cakap'; }
          else if (rawCatStr.includes('intervensi')) { rawScore = 45; category = 'Perlu Intervensi Khusus'; }
          else if (rawCatStr.includes('dasar')) { rawScore = 55; category = 'Dasar'; }
          else if (rawCatStr.includes('baik')) { rawScore = 80; category = 'Baik'; }
          else if (rawCatStr.includes('kurang')) { rawScore = 50; category = 'Kurang'; }
        } else if (!isNaN(rawScore)) {
          if (rawCatStr.includes('mahir')) category = 'Mahir';
          else if (rawCatStr.includes('cakap')) category = 'Cakap';
          else if (rawCatStr.includes('intervensi')) category = 'Perlu Intervensi Khusus';
          else if (rawCatStr.includes('dasar')) category = 'Dasar';
          else if (rawCatStr.includes('baik')) category = 'Baik';
          else if (rawCatStr.includes('kurang')) category = 'Kurang';
          else {
            if (rawScore >= 75) category = 'Baik';
            else if (rawScore >= 60) category = 'Sedang';
            else category = 'Kurang';
          }
        }

        // If score is still NaN, default to 60.0 so row is not lost if valid name exists
        if (isNaN(rawScore) && rawName.length > 3) {
          rawScore = 60.0;
        }

        let change = 0;
        if (changeIdx >= 0 && row[changeIdx] !== undefined) {
          const matchChange = String(row[changeIdx]).match(/[-+]?\d+([.,]\d+)?/);
          if (matchChange) {
            change = parseFloat(matchChange[0].replace(',', '.')) || 0;
          }
        }

        // Keep row if name is meaningful (not purely a number or header repeat)
        if (
          rawName &&
          rawName.length > 2 &&
          !rawName.toLowerCase().startsWith('indikator') &&
          !rawName.toLowerCase().startsWith('dimensi') &&
          !isNaN(rawScore)
        ) {
          extractedIndicators.push({
            id: `imported-${sheetName.replace(/\s+/g, '_')}-${rIdx}`,
            code: rawCode.length < 15 ? rawCode : `A.${rIdx + 1}`,
            dimension: sheetName || 'Dimensi Rapor Pendidikan',
            name: rawName,
            score: Math.round(rawScore * 10) / 10,
            category,
            changeFromLastYear: Math.round(change * 10) / 10,
            year: new Date().getFullYear(),
            priorityLevel: rawScore < 60 || change < 0 ? 'Tinggi' : rawScore < 70 ? 'Sedang' : 'Rendah',
          });
        }
      });
    });

    return {
      sheets,
      extractedIndicators,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  /**
   * Export RKAS to Excel matching ARKAS spreadsheet format
   */
  static exportRKASToExcel(
    rkasItems: RKASItem[],
    schoolName: string,
    year: string,
    schoolMeta?: { npsn?: string; city?: string; principalName?: string }
  ): void {
    const headerLines: any[][] = [
      ['RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS / ARKAS BOSP)'],
      [`Satuan Pendidikan: ${schoolName}`, '', `NPSN: ${schoolMeta?.npsn || '-'}`],
      [`Wilayah: ${schoolMeta?.city || '-'}`, '', `Tahun Pelajaran: ${year}`],
      [`Kepala Sekolah: ${schoolMeta?.principalName || '-'}`],
      [],
    ];

    const tableHeaders = [
      'No',
      'Kode Rekening',
      'Program',
      'Nama Kegiatan',
      'Komponen',
      'Volume',
      'Satuan',
      'Harga Satuan (Rp)',
      'Total Anggaran (Rp)',
      'Sumber Dana',
      'Kesesuaian Juknis BOSP',
      'Realisasi (Rp)',
      'Sisa Anggaran (Rp)',
    ];

    const tableRows = rkasItems.map((item, idx) => [
      idx + 1,
      item.bospCode,
      item.programName,
      item.activityName,
      item.componentCategory,
      item.volume,
      item.unit,
      item.unitPrice,
      item.totalAmount,
      item.fundingSource,
      item.isBOSPCompliant ? 'Sesuai Juknis' : `Perlu Verifikasi (${item.complianceWarning || ''})`,
      item.realizedAmount || 0,
      item.totalAmount - (item.realizedAmount || 0),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([...headerLines, tableHeaders, ...tableRows]);
    const workbook = XLSX.utils.book_new();
    const safeYearSheet = `RKAS_ARKAS_${year.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18)}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, safeYearSheet);

    // Auto-width columns
    const colWidths = [
      { wch: 6 },
      { wch: 14 },
      { wch: 35 },
      { wch: 45 },
      { wch: 30 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
    ];
    worksheet['!cols'] = colWidths;

    const safeSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `RKAS_ARKAS_${safeSchool}_${year.replace('/', '-')}.xlsx`);
  }

  /**
   * Download a simulated official Kemendikdasmen Rapor Pendidikan Excel file
   */
  static generateSimulatedRaporFile(indicators: RaporIndicator[], schoolName: string): void {
    const rows = indicators.map((ind, idx) => ({
      'No': idx + 1,
      'Kode Indikator': ind.code,
      'Dimensi': ind.dimension,
      'Nama Indikator': ind.name,
      'Skor Capaian': ind.score,
      'Kategori Capaian': ind.category,
      'Perubahan dari Tahun Lalu': ind.changeFromLastYear,
      'Rata-rata Daerah': ind.districtAverage || 65.0,
      'Rata-rata Nasional': ind.nationalAverage || 63.5,
      'Prioritas Pembenahan': ind.priorityLevel,
      'Akar Masalah Kemendikdasmen': ind.kemendikbudRootCause || 'Perlu telaah di komunitas belajar.',
      'Inspirasi Benahi': ind.kemendikbudInspirasiBenahi || 'Optimalisasi pembelajaran berdiferensiasi.',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor_Pendidikan_Sekolah');

    XLSX.writeFile(workbook, `Unduhan_Rapor_Pendidikan_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_2025.xlsx`);
  }
}
