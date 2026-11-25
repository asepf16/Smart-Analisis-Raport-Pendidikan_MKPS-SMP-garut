import React, { useState } from 'react';
import { RKASItem, SchoolProfile } from '../../types';
import {
  Calculator,
  Download,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  Printer,
  RefreshCw,
  FolderPlus,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import { ExcelService } from '../../services/excelService';
import { syncLetterheadWithProfile } from '../../services/schoolIdentitySync';
import { buildDetailedRKASMarkdown } from '../../services/pbdSynthesisService';
import { exportRKASToWord } from '../../services/wordExportService';
import { IdentifiedProblem, SupportingData } from '../../types';
import { SchoolDatabase } from '../../services/storageService';

interface GeneratorRKASViewProps {
  rkasItems: RKASItem[];
  schoolProfile: SchoolProfile;
  budgetCapTotal: number;
  problems?: IdentifiedProblem[];
  supportingData?: SupportingData;
  onUpdateRKAS: (updated: RKASItem[]) => void;
  onSyncFromPbd?: () => void;
  onSaveToArchive?: (customMarkdown?: string) => void;
}

export const GeneratorRKASView: React.FC<GeneratorRKASViewProps> = ({
  rkasItems,
  schoolProfile,
  budgetCapTotal,
  problems = [],
  supportingData,
  onUpdateRKAS,
  onSyncFromPbd,
  onSaveToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'tabel' | 'dokumen'>('tabel');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resolvedLetterhead = syncLetterheadWithProfile(schoolProfile.letterheadText, schoolProfile);
  const letterheadTopLine =
    resolvedLetterhead.split('\n').map((l) => l.trim()).filter(Boolean)[0] ||
    `PEMERINTAH ${schoolProfile.city.toUpperCase()} - DINAS PENDIDIKAN`;

  const partialDb = {
    schoolProfile,
    supportingData: supportingData || ({ budgetCapTotal } as SupportingData),
    rkasItems,
    problems,
  } as SchoolDatabase;
  const formalRKASMarkdown = buildDetailedRKASMarkdown(partialDb, budgetCapTotal);

  const handleDownloadWord = async () => {
    await exportRKASToWord(partialDb, budgetCapTotal);
    setNotice('Dokumen MS Word (.docx) RKAS BOSP resmi lengkap dengan Latar Belakang & Landasan Hukum berhasil diunduh.');
  };

  // Form state for adding RKAS row
  const [newProgram, setNewProgram] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newBospCode, setNewBospCode] = useState('03.02.01');
  const [newComponent, setNewComponent] = useState('Kegiatan Pembelajaran dan Ekstrakurikuler');
  const [newVolume, setNewVolume] = useState(1);
  const [newUnit, setNewUnit] = useState('Paket');
  const [newUnitPrice, setNewUnitPrice] = useState(1000000);
  const [newFundingSource, setNewFundingSource] = useState<RKASItem['fundingSource']>('BOS Reguler');

  const totalBudgetPlanned = rkasItems.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalBudgetRealized = rkasItems.reduce((acc, curr) => acc + (curr.realizedAmount || 0), 0);
  const remainingPagu = budgetCapTotal - totalBudgetPlanned;
  const budgetUtilizationRate = budgetCapTotal > 0 ? (totalBudgetPlanned / budgetCapTotal) * 100 : 0;

  // Juknis BOSP Verification Checks (Permendikdasmen No 8 Tahun 2026)
  const bospWarnings: string[] = [];
  if (totalBudgetPlanned > budgetCapTotal) {
    bospWarnings.push(`Peringatan BOSP: Total perencanaan anggaran (Rp ${totalBudgetPlanned.toLocaleString('id-ID')}) melebihi pagu tahunan resmi (Rp ${budgetCapTotal.toLocaleString('id-ID')}).`);
  }
  // Check library book spending (Juknis recommends adequate portion)
  const libSpending = rkasItems
    .filter((i) => i.componentCategory.toLowerCase().includes('perpustakaan'))
    .reduce((acc, curr) => acc + curr.totalAmount, 0);
  if (libSpending < budgetCapTotal * 0.05) {
    bospWarnings.push('Rekomendasi BOSP: Alokasi untuk buku perpustakaan/literasi sebaiknya minimal 5% dari pagu BOS Reguler untuk menuntaskan capaian literasi.');
  }

  const handleExportExcel = () => {
    ExcelService.exportRKASToExcel(rkasItems, schoolProfile.name, schoolProfile.academicYear, {
      npsn: schoolProfile.npsn,
      city: schoolProfile.city,
      principalName: schoolProfile.principalName,
    });
  };

  const handleDeleteItem = (id: string) => {
    onUpdateRKAS(rkasItems.filter((i) => i.id !== id));
    setDeleteConfirmId(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = newVolume * newUnitPrice;

    const newItem: RKASItem = {
      id: `manual-rkas-${Date.now()}`,
      programName: newProgram,
      activityName: newActivity,
      bospCode: newBospCode,
      componentCategory: newComponent,
      volume: newVolume,
      unit: newUnit,
      unitPrice: newUnitPrice,
      totalAmount,
      fundingSource: newFundingSource,
      isBOSPCompliant: true,
      realizedAmount: 0,
    };

    onUpdateRKAS([...rkasItems, newItem]);
    setShowAddModal(false);
    // reset
    setNewProgram('');
    setNewActivity('');
    setNewVolume(1);
    setNewUnitPrice(1000000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{schoolProfile.name}</span>
              <span className="text-emerald-400">·</span>
              <span className="font-mono">NPSN {schoolProfile.npsn}</span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              TA {schoolProfile.academicYear}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              Permendikdasmen No. 8 Tahun 2026 Ready
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 mt-1.5 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-700" />
            <span>4.5 Generator RKAS / ARKAS Berbasis Hasil PBD</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Menghubungkan setiap rupiah anggaran {schoolProfile.name} dengan akar masalah dan rekomendasi pembenahan Rapor Pendidikan. Dilengkapi validasi otomatis kepatuhan juknis BOSP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSyncFromPbd && (
            <button
              type="button"
              onClick={() => {
                onSyncFromPbd();
                setNotice('Pos anggaran RKAS BOSP berhasil disinkronkan presisi dari Rencana Aksi PBD terbaru.');
              }}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan dari PBD</span>
            </button>
          )}

          {onSaveToArchive && (
            <button
              type="button"
              onClick={() => {
                onSaveToArchive(formalRKASMarkdown);
                setNotice('Dokumen RKAS BOSP berhasil disimpan ke menu 6.3 Arsip Dokumen Saya.');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simpan ke Arsip</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kegiatan RKAS</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWord}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh MS Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
            title="Unduh file Excel yang siap diimpor ke aplikasi ARKAS Kemendikdasmen"
          >
            <Download className="w-4 h-4 text-emerald-950" />
            <span>Ekspor Excel ARKAS</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak RKAS</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700 font-bold text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print text-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tabel')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'tabel'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tabel Anggaran &amp; Rincian BOSP ({rkasItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dokumen')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dokumen'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dokumen Resmi RKAS (Latar Belakang, Landasan Hukum &amp; Pengesahan)
        </button>
      </div>

      {/* Printable Kop Identitas Anggaran Satuan Pendidikan */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {letterheadTopLine}
          </div>
          <div className="text-sm font-extrabold uppercase text-slate-900">
            RKAS BOSP — {schoolProfile.name}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-mono">
          <span>NPSN: {schoolProfile.npsn}</span>
          <span>·</span>
          <span>{schoolProfile.city}</span>
          <span>·</span>
          <span>Kepsek: {schoolProfile.principalName}</span>
        </div>
      </div>

      {activeTab === 'dokumen' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-slate-900 pb-3 text-center space-y-0.5">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-600">
              {letterheadTopLine}
            </div>
            <div className="text-base font-extrabold uppercase text-slate-900">
              {schoolProfile.name}
            </div>
            <div className="text-[11px] text-slate-600">
              {schoolProfile.address}, {schoolProfile.district}, {schoolProfile.city} - Telp: {schoolProfile.phone}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              NPSN: {schoolProfile.npsn} · Akreditasi: {schoolProfile.accreditationGrade} · Email: {schoolProfile.email}
            </div>
          </div>
          <div className="prose prose-slate max-w-none text-xs leading-relaxed">
            <div className="whitespace-pre-line text-slate-800">{formalRKASMarkdown}</div>
          </div>
        </div>
      )}

      {activeTab === 'tabel' && (
        <div className="space-y-6">

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Total Pagu BOSP Tahunan</div>
          <div className="font-bold text-slate-900 text-base mt-1 font-mono tabular-nums">
            Rp {budgetCapTotal.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">BOS Reguler + BOS Kinerja</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Total Direncanakan (RKAS)</div>
          <div className="font-bold text-emerald-800 text-base mt-1 font-mono tabular-nums">
            Rp {totalBudgetPlanned.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            {budgetUtilizationRate.toFixed(1)}% dari Pagu Resmi
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Total Realisasi Anggaran</div>
          <div className="font-bold text-slate-900 text-base mt-1 font-mono tabular-nums">
            Rp {totalBudgetRealized.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {totalBudgetPlanned > 0 ? ((totalBudgetRealized / totalBudgetPlanned) * 100).toFixed(1) : 0}% Terserap
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Sisa Pagu Tersedia</div>
          <div
            className={`font-bold text-base mt-1 font-mono tabular-nums ${
              remainingPagu < 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            Rp {remainingPagu.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {remainingPagu < 0 ? 'Melebihi Batas Pagu!' : 'Tersedia untuk Kegiatan Lain'}
          </div>
        </div>
      </div>

      {/* Juknis BOSP Verification Warnings / Notes */}
      {bospWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-1.5 text-xs">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Hasil Pemeriksaan Kesesuaian Juknis BOSP (Permendikdasmen No 8 Tahun 2026):</span>
          </div>
          <ul className="space-y-1 text-amber-800 text-[11px] list-disc list-inside">
            {bospWarnings.map((warn, wIdx) => (
              <li key={wIdx} className="leading-relaxed">{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main RKAS Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-28">Kode BOSP</th>
                <th className="py-3 px-3 min-w-[200px]">Program & Nama Kegiatan</th>
                <th className="py-3 px-3 w-40">Komponen Pembiayaan</th>
                <th className="py-3 px-3 text-center w-16">Vol</th>
                <th className="py-3 px-3 w-20">Satuan</th>
                <th className="py-3 px-3 text-right w-28">Harga Satuan</th>
                <th className="py-3 px-3 text-right w-32">Total (Rp)</th>
                <th className="py-3 px-3 w-28">Sumber Dana</th>
                <th className="py-3 px-3 w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rkasItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700">{item.bospCode}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 leading-snug">{item.activityName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.programName}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">{item.componentCategory}</td>
                  <td className="py-3 px-3 text-center font-mono font-medium">{item.volume}</td>
                  <td className="py-3 px-3 text-slate-600">{item.unit}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    Rp {item.unitPrice.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-emerald-800">
                    Rp {item.totalAmount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                      {item.fundingSource}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {deleteConfirmId === item.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 whitespace-nowrap"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 whitespace-nowrap"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                        title="Hapus baris anggaran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
          <span>Total {rkasItems.length} Kegiatan Terdaftar dalam RKAS</span>
          <span className="font-bold text-slate-900 font-mono text-sm">
            Total Anggaran: Rp {totalBudgetPlanned.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
      </div>
      )}

      {/* Modal: Tambah Baris RKAS Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Kegiatan Anggaran RKAS</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Program PBD *</label>
                <input
                  type="text"
                  required
                  value={newProgram}
                  onChange={(e) => setNewProgram(e.target.value)}
                  placeholder="Contoh: Penguatan Numerasi dan Media Manipulatif"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Kegiatan Rinci *</label>
                <input
                  type="text"
                  required
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="Contoh: Pengadaan Paket Alat Peraga Pecahan & Bangun Ruang"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kode Rekening BOSP</label>
                  <input
                    type="text"
                    required
                    value={newBospCode}
                    onChange={(e) => setNewBospCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sumber Dana</label>
                  <select
                    value={newFundingSource}
                    onChange={(e) => setNewFundingSource(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="BOS Reguler">BOS Reguler</option>
                    <option value="BOS Kinerja">BOS Kinerja</option>
                    <option value="BOSDA / Yayasan">BOSDA / Yayasan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Komponen Pembiayaan BOSP</label>
                <select
                  value={newComponent}
                  onChange={(e) => setNewComponent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Pengembangan Perpustakaan">Pengembangan Perpustakaan</option>
                  <option value="Kegiatan Pembelajaran dan Ekstrakurikuler">Kegiatan Pembelajaran dan Ekstrakurikuler</option>
                  <option value="Pengembangan Profesi Pendidik dan Tenaga Kependidikan">Pengembangan Profesi Pendidik dan Tenaga Kependidikan</option>
                  <option value="Pemeliharaan Sarana dan Prasarana Sekolah">Pemeliharaan Sarana dan Prasarana Sekolah</option>
                  <option value="Kegiatan Asesmen dan Evaluasi Pembelajaran">Kegiatan Asesmen dan Evaluasi Pembelajaran</option>
                  <option value="Pengelolaan Sekolah">Pengelolaan Sekolah</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Volume</label>
                  <input
                    type="number"
                    min="1"
                    value={newVolume}
                    onChange={(e) => setNewVolume(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Paket / Set / Rim"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={newUnitPrice}
                    onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 text-right text-xs font-mono font-bold text-emerald-800">
                Total Subtotal: Rp {(newVolume * newUnitPrice).toLocaleString('id-ID')}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Simpan ke RKAS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
