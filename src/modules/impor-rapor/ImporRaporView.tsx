import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Sparkles,
  Layers,
  History,
  Table,
  Sliders,
  HelpCircle,
  FileText,
  Save,
  Trash2,
  ArrowLeftRight,
  FolderArchive,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { RaporIndicator, SavedRaporSnapshot } from '../../types';
import { ExcelService, ParsedSheetData } from '../../services/excelService';
import { INITIAL_RAPOR_INDICATORS } from '../../services/sampleData';

interface ApplyRaporOptions {
  savePrevious?: boolean;
  previousLabel?: string;
  newLabel?: string;
  newYear?: string;
}

interface ActiveCycleStats {
  hasAnyData: boolean;
  indicatorsCount: number;
  pbdCount: number;
  rkasAndDocsCount: number;
  mutuCount: number;
}

interface ImporRaporViewProps {
  currentIndicators: RaporIndicator[];
  onApplyImportedIndicators: (
    indicators: RaporIndicator[],
    sourceLabel: string,
    options?: ApplyRaporOptions
  ) => void;
  schoolName: string;
  raporSnapshots: SavedRaporSnapshot[];
  activeRaporSnapshotId?: string;
  activeRaporLabel?: string;
  activeCycleStats?: ActiveCycleStats;
  onSaveCurrentSnapshot: (label: string, year: string) => void;
  onClearCurrentCycle?: (options?: { savePrevious?: boolean; previousLabel?: string }) => void;
  onSwitchSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

export const ImporRaporView: React.FC<ImporRaporViewProps> = ({
  currentIndicators,
  onApplyImportedIndicators,
  schoolName,
  raporSnapshots,
  activeRaporSnapshotId,
  activeRaporLabel,
  activeCycleStats,
  onSaveCurrentSnapshot,
  onClearCurrentCycle,
  onSwitchSnapshot,
  onDeleteSnapshot,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheetData[]>([]);
  const [previewIndicators, setPreviewIndicators] = useState<RaporIndicator[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Preserve & labeling options when replacing active rapor
  const [savePreviousOnReplace, setSavePreviousOnReplace] = useState(true);
  const [previousArchiveLabel, setPreviousArchiveLabel] = useState('');
  const [newDatasetLabel, setNewDatasetLabel] = useState('');
  const [newDatasetYear, setNewDatasetYear] = useState(String(new Date().getFullYear()));

  // Manual save & clear-cycle UI state
  const [showSaveCurrentForm, setShowSaveCurrentForm] = useState(false);
  const [manualSaveLabel, setManualSaveLabel] = useState('');
  const [manualSaveYear, setManualSaveYear] = useState(String(new Date().getFullYear()));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearArchiveLabel, setClearArchiveLabel] = useState('');
  const [confirmDeleteSnapId, setConfirmDeleteSnapId] = useState<string | null>(null);

  // Manual Mapping State
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [manualCodeCol, setManualCodeCol] = useState('');
  const [manualNameCol, setManualNameCol] = useState('');
  const [manualScoreCol, setManualScoreCol] = useState('');
  const [manualCategoryCol, setManualCategoryCol] = useState('');
  const [manualChangeCol, setManualChangeCol] = useState('');

  useEffect(() => {
    setPreviousArchiveLabel(
      activeRaporLabel
        ? `${activeRaporLabel} (Arsip)`
        : `Rapor Aktif Sebelumnya (${new Date().toLocaleDateString('id-ID')})`
    );
  }, [activeRaporLabel]);

  const handleFileUpload = async (file: File) => {
    try {
      setStatusMessage({ type: 'info', text: `Membaca file Excel: ${file.name}...` });
      const result = await ExcelService.parseRaporExcel(file);

      setParsedSheets(result.sheets);
      setUploadedFileInfo({ name: result.fileName, size: result.fileSize });
      const baseName = result.fileName.replace(/\.[^.]+$/, '');
      setNewDatasetLabel(baseName);

      if (result.extractedIndicators.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'Tidak ada baris indikator valid yang dapat diekstrak otomatis dari sheet default. Kemungkinan sheet pertama berisi panduan/narasi. Silakan pilih sheet lain di bawah atau gunakan Pemetaan Kolom Manual.',
        });
        setShowManualMapping(true);
      } else {
        setPreviewIndicators(result.extractedIndicators);
        setStatusMessage({
          type: 'success',
          text: `Berhasil mendeteksi ${result.sheets.length} worksheet dan mengekstrak ${result.extractedIndicators.length} indikator Rapor Pendidikan.`,
        });
      }

      if (result.sheets.length > 0) {
        const firstSheet = result.sheets[0];
        setManualCodeCol(firstSheet.detectedColumns.codeCol || firstSheet.headers[0] || '');
        setManualNameCol(firstSheet.detectedColumns.nameCol || firstSheet.headers[1] || '');
        setManualScoreCol(firstSheet.detectedColumns.scoreCol || firstSheet.headers[2] || '');
        setManualCategoryCol(firstSheet.detectedColumns.categoryCol || '');
        setManualChangeCol(firstSheet.detectedColumns.changeCol || '');
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setStatusMessage({
        type: 'error',
        text: `Gagal membaca file: ${err.message || 'Format file tidak didukung'}. Pastikan file berekstensi .xlsx, .xls, atau .csv.`,
      });
    }
  };

  const handleSheetSwitch = (index: number) => {
    setSelectedSheetIndex(index);
    const sheet = parsedSheets[index];
    if (!sheet) return;

    setManualCodeCol(sheet.detectedColumns.codeCol || sheet.headers[0] || '');
    setManualNameCol(sheet.detectedColumns.nameCol || sheet.headers[1] || '');
    setManualScoreCol(sheet.detectedColumns.scoreCol || sheet.headers[2] || '');
    setManualCategoryCol(sheet.detectedColumns.categoryCol || '');
    setManualChangeCol(sheet.detectedColumns.changeCol || '');

    extractIndicatorsFromSheet(sheet, {
      codeCol: sheet.detectedColumns.codeCol || sheet.headers[0],
      nameCol: sheet.detectedColumns.nameCol || sheet.headers[1],
      scoreCol: sheet.detectedColumns.scoreCol || sheet.headers[2],
      categoryCol: sheet.detectedColumns.categoryCol,
      changeCol: sheet.detectedColumns.changeCol,
    });
  };

  const extractIndicatorsFromSheet = (
    sheet: ParsedSheetData,
    mapping: {
      codeCol?: string;
      nameCol?: string;
      scoreCol?: string;
      categoryCol?: string;
      changeCol?: string;
    }
  ) => {
    const headers = sheet.headers;
    const nameIdx = mapping.nameCol ? headers.indexOf(mapping.nameCol) : 1;
    const scoreIdx = mapping.scoreCol ? headers.indexOf(mapping.scoreCol) : -1;
    const codeIdx = mapping.codeCol ? headers.indexOf(mapping.codeCol) : 0;
    const catIdx = mapping.categoryCol ? headers.indexOf(mapping.categoryCol) : -1;
    const changeIdx = mapping.changeCol ? headers.indexOf(mapping.changeCol) : -1;

    const extracted: RaporIndicator[] = [];

    sheet.rows.forEach((row, rIdx) => {
      const rawName = String(row[nameIdx] || '').trim();
      if (!rawName || rawName.length < 2 || rawName.toLowerCase().startsWith('indikator')) return;

      let rawScore = NaN;
      if (scoreIdx >= 0 && row[scoreIdx] !== undefined) {
        const valStr = String(row[scoreIdx]).trim();
        const match = valStr.match(/\d+([.,]\d+)?/);
        if (match) {
          rawScore = parseFloat(match[0].replace(',', '.'));
        }
      }

      const rawCode = String(row[codeIdx] || `IND-${rIdx + 1}`).trim();
      let category: RaporIndicator['category'] = 'Sedang';
      const rawCatStr = catIdx >= 0 ? String(row[catIdx] || '').toLowerCase() : '';

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

      if (isNaN(rawScore)) rawScore = 60.0;

      let change = 0;
      if (changeIdx >= 0 && row[changeIdx] !== undefined) {
        const matchChange = String(row[changeIdx]).match(/[-+]?\d+([.,]\d+)?/);
        if (matchChange) {
          change = parseFloat(matchChange[0].replace(',', '.')) || 0;
        }
      }

      extracted.push({
        id: `imported-${sheet.sheetName.replace(/\s+/g, '_')}-${rIdx}`,
        code: rawCode.length < 15 ? rawCode : `A.${rIdx + 1}`,
        dimension: sheet.sheetName || 'Dimensi Rapor Pendidikan',
        name: rawName,
        score: Math.round(rawScore * 10) / 10,
        category,
        changeFromLastYear: Math.round(change * 10) / 10,
        year: parseInt(newDatasetYear, 10) || new Date().getFullYear(),
        priorityLevel: rawScore < 60 || change < 0 ? 'Tinggi' : rawScore < 70 ? 'Sedang' : 'Rendah',
      });
    });

    setPreviewIndicators(extracted);
    if (extracted.length > 0) {
      setStatusMessage({
        type: 'success',
        text: `Berhasil mengekstrak ${extracted.length} indikator dari sheet "${sheet.sheetName}". Silakan periksa pratinjau di bawah dan klik "Terapkan Data".`,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: `Tidak ada baris indikator yang dapat diekstrak dari sheet "${sheet.sheetName}". Silakan pilih kolom yang sesuai pada Pemetaan Kolom Manual di bawah.`,
      });
    }
  };

  const handleApplyManualMapping = (e: React.FormEvent) => {
    e.preventDefault();
    const sheet = parsedSheets[selectedSheetIndex];
    if (!sheet) return;

    extractIndicatorsFromSheet(sheet, {
      codeCol: manualCodeCol,
      nameCol: manualNameCol,
      scoreCol: manualScoreCol,
      categoryCol: manualCategoryCol,
      changeCol: manualChangeCol,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyPreview = () => {
    if (previewIndicators.length === 0) return;
    onApplyImportedIndicators(
      previewIndicators,
      uploadedFileInfo ? uploadedFileInfo.name : 'Impor Excel Rapor',
      {
        savePrevious: savePreviousOnReplace,
        previousLabel: previousArchiveLabel,
        newLabel: newDatasetLabel || (uploadedFileInfo ? uploadedFileInfo.name.replace(/\.[^.]+$/, '') : 'Data Rapor Baru'),
        newYear: newDatasetYear,
      }
    );
    setStatusMessage({
      type: 'success',
      text: `${previewIndicators.length} indikator berhasil diterapkan dan data Rapor sebelumnya telah disimpan di arsip.`,
    });
  };

  const handleLoadOfficialSimulation = () => {
    onApplyImportedIndicators(
      INITIAL_RAPOR_INDICATORS,
      'Simulasi Resmi Kemendikdasmen 2025',
      {
        savePrevious: true,
        previousLabel: previousArchiveLabel,
        newLabel: 'Rapor Pendidikan Simulasi 2025',
        newYear: '2025',
      }
    );
    setPreviewIndicators(INITIAL_RAPOR_INDICATORS);
    setUploadedFileInfo({ name: 'Data_Rapor_Resmi_Kemendikdasmen_2025.xlsx', size: 45200 });
    setStatusMessage({
      type: 'success',
      text: 'Berhasil memuat 15 indikator Rapor Pendidikan standar Kemendikdasmen (A.1, A.2, D.1, D.2, dll) ke dalam sistem.',
    });
  };

  const handleManualSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentIndicators.length === 0) return;
    onSaveCurrentSnapshot(
      manualSaveLabel || activeRaporLabel || `Arsip Rapor (${new Date().toLocaleDateString('id-ID')})`,
      manualSaveYear
    );
    setShowSaveCurrentForm(false);
    setManualSaveLabel('');
    setStatusMessage({
      type: 'success',
      text: 'Data Rapor Pendidikan aktif berhasil disimpan ke daftar arsip Rapor Tersimpan.',
    });
  };

  const hasAnyActiveData = activeCycleStats ? activeCycleStats.hasAnyData : currentIndicators.length > 0;

  const handleConfirmClearCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onClearCurrentCycle) return;
    onClearCurrentCycle({
      savePrevious: true,
      previousLabel: clearArchiveLabel.trim() || previousArchiveLabel,
    });
    setShowClearConfirm(false);
    setPreviewIndicators([]);
    setParsedSheets([]);
    setUploadedFileInfo(null);
    setStatusMessage({
      type: 'success',
      text: 'Seluruh data Rapor, PBD, Dokumen & Anggaran, serta Perencanaan Mutu Pembelajaran sebelumnya telah diamankan ke Arsip, dan ruang kerja aktif kini kosong siap diisi data Rapor Pendidikan baru.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-700" />
            <span>Fasilitas Impor & Pengelolaan Data Rapor Pendidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah file Rapor Pendidikan baru (.xlsx, .xls, .csv) atau kosongkan data aktif terlebih dahulu. Seluruh siklus sebelumnya (Rapor, PBD, Dokumen & Anggaran, serta Mutu Pembelajaran) otomatis tersimpan aman di Arsip.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onClearCurrentCycle && hasAnyActiveData && (
            <button
              type="button"
              onClick={() => {
                setClearArchiveLabel(
                  activeRaporLabel
                    ? `${activeRaporLabel} (Arsip Lengkap)`
                    : `Arsip Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`
                );
                setShowClearConfirm(!showClearConfirm);
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Amankan Rapor, PBD, Dokumen & Anggaran, serta Mutu Pembelajaran saat ini ke Arsip lalu kosongkan ruang kerja untuk data Rapor baru"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Arsipkan & Kosongkan Data Aktif</span>
            </button>
          )}

          <button
            onClick={() => ExcelService.generateSimulatedRaporFile(currentIndicators, schoolName)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Unduh format tabel Rapor Pendidikan sekolah saat ini"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Unduh Template Excel</span>
          </button>

          <button
            onClick={handleLoadOfficialSimulation}
            className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
            title="Muat data contoh resmi Kemendikdasmen langsung ke aplikasi"
          >
            <Sparkles className="w-4 h-4 text-emerald-950" />
            <span>Muat Data Simulasi Resmi (1 Klik)</span>
          </button>
        </div>
      </div>

      {/* Inline Clear & Archive Confirmation Box */}
      {showClearConfirm && onClearCurrentCycle && (
        <form
          onSubmit={handleConfirmClearCycle}
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 space-y-3 text-xs"
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                Amankan Siklus Sebelumnya & Kosongkan Ruang Kerja untuk Rapor Baru
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Sistem akan menyimpan seluruh data siklus aktif saat ini (<strong>{activeCycleStats?.indicatorsCount ?? currentIndicators.length} Indikator Rapor</strong>, <strong>{activeCycleStats?.pbdCount ?? 0} Butir PBD</strong>, <strong>{activeCycleStats?.rkasAndDocsCount ?? 0} RKAS & Dokumen Induk</strong>, dan <strong>{activeCycleStats?.mutuCount ?? 0} Program Mutu Pembelajaran</strong>) ke dalam <strong>Arsip Rapor & Siklus PBD Tersimpan</strong> terlebih dahulu sebelum mengosongkan ruang kerja aktif.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
            <div className="flex-1">
              <label className="block font-semibold text-slate-800 mb-1">
                Label Simpanan Arsip Siklus Sebelumnya *
              </label>
              <input
                type="text"
                required
                value={clearArchiveLabel}
                onChange={(e) => setClearArchiveLabel(e.target.value)}
                placeholder="Misal: Rapor Pendidikan 2025 + PBD + RKAS Lengkap"
                className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium whitespace-nowrap"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs whitespace-nowrap"
              >
                Simpan ke Arsip & Kosongkan Sekarang
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Explanatory Guide Box */}
      <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 font-bold text-emerald-950">
          <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Panduan Penggantian Data Rapor & Keamanan Arsip Siklus Sebelumnya:</span>
        </div>
        <p className="leading-relaxed text-slate-600 text-[11px]">
          Ketika Anda mengganti Rapor Pendidikan dengan data baru, ruang kerja PBD, Dokumen Induk & Anggaran (RKJM/RKT/RKAS/Kepsek), serta Perencanaan Mutu Pembelajaran akan otomatis dikosongkan agar selaras dengan Rapor baru. Seluruh data Rapor, PBD, Dokumen, Anggaran, dan Program Mutu Pembelajaran dari periode sebelumnya tetap tersimpan aman di <strong>Arsip Siklus Rapor Tersimpan</strong> dan dapat dipulihkan penuh kapan saja.
        </p>
      </div>

      {/* Status Alert if any */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
              : statusMessage.type === 'error'
              ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <Layers className="w-4 h-4 text-blue-700 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">
          Tarik dan Lepaskan File Rapor Pendidikan Baru (.xlsx, .xls, .csv) di Sini
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Atau klik tombol di bawah untuk memilih file dari komputer Anda. Mesin cerdas membaca hingga 25 baris awal untuk mendeteksi header tabel secara otomatis.
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <label className="cursor-pointer px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap">
            <Upload className="w-4 h-4" />
            <span>Pilih File Excel dari Perangkat</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Sheet Selector & Column Mapping Workspace */}
      {parsedSheets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>Pilih Lembar Kerja (Worksheet) dari File "{uploadedFileInfo?.name}"</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ditemukan {parsedSheets.length} sheet dalam file. Klik nama sheet yang berisi tabel data capaian indikator:
              </p>
            </div>

            <button
              onClick={() => setShowManualMapping(!showManualMapping)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>{showManualMapping ? 'Sembunyikan Pemetaan Kolom' : 'Buka Pemetaan Kolom Manual'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {parsedSheets.map((sh, idx) => (
              <button
                key={idx}
                onClick={() => handleSheetSwitch(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  selectedSheetIndex === idx
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{sh.sheetName}</span>
                <span className="text-[10px] opacity-80 font-mono">({sh.rows.length} baris)</span>
              </button>
            ))}
          </div>

          {showManualMapping && (
            <form
              onSubmit={handleApplyManualMapping}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs"
            >
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span>Atur Pemetaan Kolom untuk Sheet "{parsedSheets[selectedSheetIndex]?.sheetName}":</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kolom Kode Indikator</label>
                  <select
                    value={manualCodeCol}
                    onChange={(e) => setManualCodeCol(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Pilih Kolom Kode --</option>
                    {parsedSheets[selectedSheetIndex]?.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kolom Nama Indikator *</label>
                  <select
                    required
                    value={manualNameCol}
                    onChange={(e) => setManualNameCol(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none font-semibold text-emerald-900"
                  >
                    <option value="">-- Pilih Kolom Nama Indikator --</option>
                    {parsedSheets[selectedSheetIndex]?.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kolom Skor / Capaian *</label>
                  <select
                    value={manualScoreCol}
                    onChange={(e) => setManualScoreCol(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none font-semibold text-emerald-900"
                  >
                    <option value="">-- Pilih Kolom Skor / Nilai --</option>
                    {parsedSheets[selectedSheetIndex]?.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kolom Kategori / Predikat</label>
                  <select
                    value={manualCategoryCol}
                    onChange={(e) => setManualCategoryCol(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Opsional (Auto Hitung dari Skor) --</option>
                    {parsedSheets[selectedSheetIndex]?.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kolom Perubahan / Tren Delta</label>
                  <select
                    value={manualChangeCol}
                    onChange={(e) => setManualChangeCol(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Opsional (Nilai 0 jika tidak ada) --</option>
                    {parsedSheets[selectedSheetIndex]?.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Ekstrak dengan Pemetaan Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Preview Section + Preserve Previous Rapor Option */}
      {previewIndicators.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-700" />
                <span>Pratinjau Data Rapor Baru ({previewIndicators.length} Indikator)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Atur penamaan data baru dan opsi penyimpanan data Rapor sebelumnya di bawah sebelum menerapkan ke analisis.
              </p>
            </div>

            <button
              onClick={handleApplyPreview}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>Terapkan & Ganti Data Rapor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Label & Archive Options Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama / Label Data Rapor Baru *
                </label>
                <input
                  type="text"
                  value={newDatasetLabel}
                  onChange={(e) => setNewDatasetLabel(e.target.value)}
                  placeholder="Misal: Rapor Pendidikan Tahun 2026"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Rapor</label>
                <input
                  type="text"
                  value={newDatasetYear}
                  onChange={(e) => setNewDatasetYear(e.target.value)}
                  placeholder="2025"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {hasAnyActiveData && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer font-semibold text-emerald-900">
                  <input
                    type="checkbox"
                    checked={savePreviousOnReplace}
                    onChange={(e) => setSavePreviousOnReplace(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>
                    Amankan seluruh siklus sebelumnya ({activeCycleStats?.indicatorsCount ?? currentIndicators.length} Indikator Rapor, {activeCycleStats?.pbdCount ?? 0} Butir PBD, {activeCycleStats?.rkasAndDocsCount ?? 0} RKAS & Dokumen, {activeCycleStats?.mutuCount ?? 0} Program Mutu) ke Arsip sebelum dikosongkan & diganti Rapor baru
                  </span>
                </label>

                {savePreviousOnReplace && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Arsip Siklus Sebelumnya:
                    </label>
                    <input
                      type="text"
                      value={previousArchiveLabel}
                      onChange={(e) => setPreviousArchiveLabel(e.target.value)}
                      className="w-full md:w-2/3 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-16">Kode</th>
                  <th className="py-2.5 px-3">Nama Indikator</th>
                  <th className="py-2.5 px-3">Dimensi</th>
                  <th className="py-2.5 px-3 text-right">Skor</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-right">Perubahan</th>
                  <th className="py-2.5 px-3">Prioritas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewIndicators.map((ind, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-mono font-semibold text-slate-600">{ind.code}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{ind.name}</td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">{ind.dimension}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {ind.score.toFixed(1)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          ind.category === 'Baik' || ind.category === 'Mahir'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : ind.category === 'Sedang' || ind.category === 'Cakap'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200 font-semibold'
                        }`}
                      >
                        {ind.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          ind.changeFromLastYear > 0
                            ? 'text-emerald-700'
                            : ind.changeFromLastYear < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }
                      >
                        {ind.changeFromLastYear > 0 ? `+${ind.changeFromLastYear}` : ind.changeFromLastYear}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          ind.priorityLevel === 'Tinggi'
                            ? 'text-rose-700'
                            : ind.priorityLevel === 'Sedang'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {ind.priorityLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved Rapor Archives / Dataset Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900">
                Arsip Lengkap Rapor, PBD, Dokumen & Mutu Pembelajaran ({raporSnapshots.length} Versi)
              </h2>
              <p className="text-[11px] text-slate-500">
                Siklus aktif saat ini: <strong className="text-slate-800">{activeRaporLabel || (currentIndicators.length > 0 ? `${currentIndicators.length} Indikator Aktif` : 'Kosong (Siap Impor Baru)')}</strong>. Pilih arsip di bawah untuk memulihkan Rapor, PBD, Dokumen & Anggaran, serta Program Mutu Pembelajaran secara penuh.
              </p>
            </div>
          </div>

          {hasAnyActiveData && (
            <button
              type="button"
              onClick={() => {
                setManualSaveLabel(
                  activeRaporLabel
                    ? `${activeRaporLabel} (Salinan)`
                    : `Arsip Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`
                );
                setShowSaveCurrentForm(!showSaveCurrentForm);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Siklus Aktif</span>
            </button>
          )}
        </div>

        {/* Inline Form Save Current Rapor */}
        {showSaveCurrentForm && (
          <form
            onSubmit={handleManualSaveSubmit}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-end gap-3 text-xs"
          >
            <div className="flex-1">
              <label className="block font-semibold text-slate-700 mb-1">Nama Arsip Siklus Lengkap *</label>
              <input
                type="text"
                required
                value={manualSaveLabel}
                onChange={(e) => setManualSaveLabel(e.target.value)}
                placeholder="Misal: Rapor Pendidikan 2024 + PBD + RKAS Final"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="w-full md:w-32">
              <label className="block font-semibold text-slate-700 mb-1">Tahun</label>
              <input
                type="text"
                required
                value={manualSaveYear}
                onChange={(e) => setManualSaveYear(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSaveCurrentForm(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg whitespace-nowrap"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg whitespace-nowrap"
              >
                Simpan ke Arsip
              </button>
            </div>
          </form>
        )}

        {/* List of Saved Snapshots */}
        {raporSnapshots.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Belum ada arsip siklus Rapor tersimpan. Saat Anda mengimpor atau mengosongkan data Rapor, seluruh siklus sebelumnya (Rapor, PBD, Dokumen & Anggaran, Mutu Pembelajaran) dapat diamankan di sini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {raporSnapshots.map((snap) => {
              const isActive = snap.id === activeRaporSnapshotId;
              const pbdTotal =
                (snap.problems?.length || 0) +
                (snap.rootCauses?.length || 0) +
                (snap.recommendations?.length || 0) +
                (snap.actionPlans?.length || 0);
              const docsBudgetTotal =
                (snap.rkasItems?.length || 0) +
                (snap.principalPrograms?.length || 0) +
                (snap.documents?.length || 0);
              const mutuTotal =
                (snap.supervisionRecords?.length || 0) +
                (snap.literacyPrograms?.length || 0) +
                (snap.numeracyPrograms?.length || 0) +
                (snap.characterPrograms?.length || 0);

              return (
                <div
                  key={snap.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {snap.label}
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                          Sedang Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Tahun {snap.year} · {new Date(snap.savedAt).toLocaleString('id-ID')}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {snap.indicators.length} Indikator Rapor
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {pbdTotal} Butir PBD
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {docsBudgetTotal} RKAS & Dokumen
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {mutuTotal} Program Mutu
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Sumber: {snap.sourceName}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => onSwitchSnapshot(snap.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Pulihkan & Gunakan Siklus Ini</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        <span>Aktif di Analisis, PBD & Dokumen</span>
                      </span>
                    )}

                    {confirmDeleteSnapId === snap.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSnapshot(snap.id);
                            setConfirmDeleteSnapId(null);
                          }}
                          className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 whitespace-nowrap"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSnapId(null)}
                          className="px-2 py-1 text-[11px] bg-slate-100 text-slate-700 rounded hover:bg-slate-200 whitespace-nowrap"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSnapId(snap.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus dari Arsip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
