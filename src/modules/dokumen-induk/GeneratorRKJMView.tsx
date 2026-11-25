import React, { useState, useEffect, useMemo } from 'react';
import {
  ActionPlanItem,
  IdentifiedProblem,
  OfficialDocument,
  RaporIndicator,
  RecommendationBenahi,
  RKASItem,
  RootCauseReflection,
  SchoolProfile,
  SNPStandardItem,
} from '../../types';
import {
  BookMarked,
  Printer,
  Sparkles,
  RefreshCw,
  Building2,
  Plus,
  Trash2,
  FolderPlus,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import { AIService } from '../../services/aiService';
import { syncLetterheadWithProfile } from '../../services/schoolIdentitySync';
import { buildDetailedRKJMMarkdown } from '../../services/pbdSynthesisService';
import { SchoolDatabase } from '../../services/storageService';
import { exportRKJMToWord } from '../../services/wordExportService';

interface GeneratorRKJMViewProps {
  schoolProfile: SchoolProfile;
  problems: IdentifiedProblem[];
  recommendations: RecommendationBenahi[];
  rkasItems: RKASItem[];
  raporIndicators?: RaporIndicator[];
  rootCauses?: RootCauseReflection[];
  actionPlans?: ActionPlanItem[];
  snpData?: SNPStandardItem[];
  onUpdateRecommendations?: (updated: RecommendationBenahi[]) => void;
  onSyncFromPbd?: () => void;
  onSaveToArchive?: (markdown: string, status: OfficialDocument['status']) => void;
}

export const GeneratorRKJMView: React.FC<GeneratorRKJMViewProps> = ({
  schoolProfile,
  problems,
  recommendations,
  rkasItems,
  raporIndicators = [],
  rootCauses = [],
  actionPlans = [],
  snpData = [],
  onUpdateRecommendations,
  onSyncFromPbd,
  onSaveToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'matriks' | 'edit'>('preview');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<OfficialDocument['status']>('Disahkan');
  const [notice, setNotice] = useState<string | null>(null);

  // Matriks Add & Delete state
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<RecommendationBenahi['type']>('Benahi 1 (Kompetensi GTK/Tata Kelola)');
  const [newSuccessIndicator, setNewSuccessIndicator] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState(2500000);
  const [newTimeline, setNewTimeline] = useState(`Periode ${schoolProfile.planningPeriod}`);

  const resolvedLetterhead = useMemo(
    () => syncLetterheadWithProfile(schoolProfile.letterheadText, schoolProfile),
    [schoolProfile]
  );

  const letterheadTopLine = useMemo(() => {
    const firstLine = resolvedLetterhead.split('\n').map((l) => l.trim()).filter(Boolean)[0];
    if (firstLine && firstLine.toUpperCase() !== schoolProfile.name.trim().toUpperCase()) {
      return firstLine;
    }
    return `PEMERINTAH ${schoolProfile.city.toUpperCase()} - DINAS PENDIDIKAN`;
  }, [resolvedLetterhead, schoolProfile.city, schoolProfile.name]);

  const defaultRKJMContent = useMemo(() => {
    const partialDb = {
      schoolProfile,
      raporIndicators,
      problems,
      rootCauses,
      recommendations,
      actionPlans,
      snpData,
      rkasItems,
    } as SchoolDatabase;
    return buildDetailedRKJMMarkdown(partialDb);
  }, [schoolProfile, raporIndicators, problems, rootCauses, recommendations, actionPlans, snpData, rkasItems]);

  const [documentMarkdown, setDocumentMarkdown] = useState(defaultRKJMContent);

  useEffect(() => {
    if (!hasManualOverride) {
      setDocumentMarkdown(defaultRKJMContent);
    }
  }, [defaultRKJMContent, hasManualOverride]);

  const handleResetToSchoolIdentity = () => {
    setHasManualOverride(false);
    setDocumentMarkdown(defaultRKJMContent);
    if (onSyncFromPbd) {
      onSyncFromPbd();
    }
    setNotice('Redaksi & Matriks RKJM berhasil disinkronkan presisi dari hasil PBD dan Identitas Sekolah terbaru.');
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const result = await AIService.generateOfficialDocument(
        'rkjm',
        schoolProfile,
        problems,
        schoolProfile.academicYear
      );
      setHasManualOverride(true);
      setDocumentMarkdown(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateRecommendations) return;
    const item: RecommendationBenahi = {
      id: `manual-rec-${Date.now()}`,
      problemId: problems[0]?.id || 'prob-manual',
      rootCauseId: rootCauses[0]?.id || 'rc-manual',
      title: newTitle.trim(),
      type: newType,
      objective: `Program strategis jangka menengah ${schoolProfile.name}`,
      strategy: 'Pelaksanaan bertahap dan terukur selama periode RKJM.',
      activities: [newTitle.trim()],
      pic: 'Tim Pengembang Sekolah (TPMPS)',
      targetAudience: `Seluruh warga ${schoolProfile.name}`,
      successIndicator: newSuccessIndicator.trim() || `Terlaksananya ${newTitle.trim()}`,
      targetValue: '100% Tercapai',
      timeline: newTimeline.trim(),
      resourceNeeds: 'Anggaran BOSP / Daya Dukung Sekolah',
      estimatedCost: Math.max(0, newEstimatedCost),
      requiresBudget: newEstimatedCost > 0,
    };
    onUpdateRecommendations([...recommendations, item]);
    setShowAddModal(false);
    setNewTitle('');
    setNewSuccessIndicator('');
    setNewEstimatedCost(2500000);
  };

  const handleDeleteProgram = (id: string) => {
    if (!onUpdateRecommendations) return;
    onUpdateRecommendations(recommendations.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
  };

  const handleSaveArchive = () => {
    if (!onSaveToArchive) return;
    onSaveToArchive(documentMarkdown, documentStatus);
    setNotice('Dokumen RKJM berhasil disimpan ke menu 6.3 Arsip Dokumen Saya.');
  };

  const handleDownloadWord = async () => {
    const partialDb = {
      schoolProfile,
      raporIndicators,
      problems,
      rootCauses,
      recommendations,
      actionPlans,
      snpData,
      rkasItems,
    } as SchoolDatabase;
    await exportRKJMToWord(partialDb, hasManualOverride ? documentMarkdown : undefined);
    setNotice('Dokumen MS Word (.docx) RKJM resmi ber-kop sekolah berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{schoolProfile.name}</span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              DOKUMEN INDUK 4 TAHUN
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                documentStatus === 'Disahkan'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              Status: {documentStatus}
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 mt-1.5 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-emerald-700" />
            <span>4.3 Generator Dokumen RKJM (Rencana Kerja Jangka Menengah)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumen 4 tahunan {schoolProfile.name} yang mengintegrasikan Rapor Pendidikan, 8 SNP, Akreditasi, dan arah strategis sekolah ({schoolProfile.planningPeriod}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={documentStatus}
            onChange={(e) => setDocumentStatus(e.target.value as OfficialDocument['status'])}
            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none"
          >
            <option value="Draf">Status: Draf</option>
            <option value="Direvisi">Status: Direvisi</option>
            <option value="Divalidasi">Status: Divalidasi TPMPS</option>
            <option value="Disahkan">Status: Disahkan Pejabat</option>
          </select>

          <button
            type="button"
            onClick={handleResetToSchoolIdentity}
            className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan dari PBD</span>
          </button>

          {onSaveToArchive && (
            <button
              type="button"
              onClick={handleSaveArchive}
              className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simpan ke Arsip</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isGeneratingAI ? 'AI Menulis RKJM...' : 'Regenerasi Narasi AI'}</span>
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
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak RKJM / PDF</span>
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
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'preview'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pratinjau Dokumen Cetak (BAB I - BAB VII)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matriks')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'matriks'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Matriks Program Strategis 4 Tahun ({recommendations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'edit'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Edit Redaksi Teks
        </button>
      </div>

      {/* Tab 1: Preview Document (Printable Official Layout) */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
          {/* Kop Surat Sekolah */}
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

          <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-4">
            <div className="whitespace-pre-line text-slate-800">
              {documentMarkdown}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Matriks 4 Tahunan */}
      {activeTab === 'matriks' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Matriks Program Strategis Pengembangan {schoolProfile.name} (4 Tahun)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                NPSN: {schoolProfile.npsn} · Periode {schoolProfile.planningPeriod} · {schoolProfile.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md whitespace-nowrap">
                {recommendations.length} Program Terintegrasi
              </span>
              {onUpdateRecommendations && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Program Strategis</span>
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 w-56">Program Strategis PBD</th>
                  <th className="py-2.5 px-3">Indikator Kinerja</th>
                  <th className="py-2.5 px-3 text-center">Th 1</th>
                  <th className="py-2.5 px-3 text-center">Th 2</th>
                  <th className="py-2.5 px-3 text-center">Th 3</th>
                  <th className="py-2.5 px-3 text-center">Th 4</th>
                  <th className="py-2.5 px-3 text-right">Estimasi Pagu 4 Th</th>
                  {onUpdateRecommendations && <th className="py-2.5 px-3 w-20 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recommendations.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{rec.title}</div>
                      <div className="text-[10px] text-emerald-700 font-medium mt-0.5">{rec.type}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">{rec.successIndicator}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">✓</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">✓</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">✓</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">✓</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      Rp {(rec.estimatedCost * 4).toLocaleString('id-ID')}
                    </td>
                    {onUpdateRecommendations && (
                      <td className="py-3 px-3 text-center">
                        {deleteConfirmId === rec.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteProgram(rec.id)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700"
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(rec.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                            title="Hapus program dari RKJM"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {recommendations.length === 0 && (
                  <tr>
                    <td colSpan={onUpdateRecommendations ? 9 : 8} className="py-8 text-center text-slate-500">
                      Belum ada program strategis. Klik &quot;Sinkronkan dari PBD&quot; atau &quot;Tambah Program Strategis&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Edit Teks */}
      {activeTab === 'edit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold text-slate-800">
              Edit Redaksi Markdown Dokumen RKJM ({schoolProfile.name}):
            </label>
            <button
              type="button"
              onClick={handleResetToSchoolIdentity}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Muat Ulang Presisi PBD Terbaru</span>
            </button>
          </div>
          <textarea
            rows={20}
            value={documentMarkdown}
            onChange={(e) => {
              setHasManualOverride(true);
              setDocumentMarkdown(e.target.value);
            }}
            className="w-full p-4 border border-slate-200 rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="flex justify-end gap-2">
            {onSaveToArchive && (
              <button
                type="button"
                onClick={handleSaveArchive}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg"
              >
                Simpan ke Arsip Dokumen
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs"
            >
              Simpan dan Lihat Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* Modal Tambah Program Strategis */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Program Strategis RKJM</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddProgram} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Kategori Benahi PBD</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as RecommendationBenahi['type'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Benahi 1 (Kompetensi GTK/Tata Kelola)">Benahi 1 (Kompetensi GTK/Tata Kelola)</option>
                  <option value="Benahi 2 (Pengadaan Sarana/Anggaran)">Benahi 2 (Pengadaan Sarana/Anggaran)</option>
                  <option value="Benahi 3 (Budaya Sekolah & Pembelajaran)">Benahi 3 (Budaya Sekolah & Pembelajaran)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul Program Strategis *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Digitalisasi Perpustakaan & Kelas Literasi Interaktif"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Indikator Kinerja Keberhasilan *</label>
                <input
                  type="text"
                  required
                  value={newSuccessIndicator}
                  onChange={(e) => setNewSuccessIndicator(e.target.value)}
                  placeholder="Contoh: 100% kelas memiliki akses perpustakaan digital aktif"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Linimasa</label>
                  <input
                    type="text"
                    value={newTimeline}
                    onChange={(e) => setNewTimeline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Estimasi Biaya Tahunan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEstimatedCost}
                    onChange={(e) => setNewEstimatedCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
                  Simpan ke Matriks RKJM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
