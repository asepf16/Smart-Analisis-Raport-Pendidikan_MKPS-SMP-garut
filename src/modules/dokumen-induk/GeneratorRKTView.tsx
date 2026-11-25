import React, { useState, useEffect, useMemo } from 'react';
import {
  ActionPlanItem,
  IdentifiedProblem,
  OfficialDocument,
  RecommendationBenahi,
  RKASItem,
  RootCauseReflection,
  SchoolProfile,
} from '../../types';
import {
  CalendarDays,
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
import { buildDetailedRKTMarkdown } from '../../services/pbdSynthesisService';
import { SchoolDatabase } from '../../services/storageService';
import { exportRKTToWord } from '../../services/wordExportService';

interface GeneratorRKTViewProps {
  schoolProfile: SchoolProfile;
  actionPlans: ActionPlanItem[];
  recommendations: RecommendationBenahi[];
  problems?: IdentifiedProblem[];
  rootCauses?: RootCauseReflection[];
  rkasItems?: RKASItem[];
  onUpdateActionPlans?: (updated: ActionPlanItem[]) => void;
  onSyncFromPbd?: () => void;
  onSaveToArchive?: (markdown: string, status: OfficialDocument['status']) => void;
}

export const GeneratorRKTView: React.FC<GeneratorRKTViewProps> = ({
  schoolProfile,
  actionPlans,
  recommendations,
  problems = [],
  rootCauses = [],
  rkasItems = [],
  onUpdateActionPlans,
  onSyncFromPbd,
  onSaveToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'jadwal' | 'edit'>('preview');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<OfficialDocument['status']>('Disahkan');
  const [notice, setNotice] = useState<string | null>(null);

  // Matriks Add & Delete state
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newActivityName, setNewActivityName] = useState('');
  const [newPic, setNewPic] = useState('Tim TPMPS & Guru Terkait');
  const [newTimeline, setNewTimeline] = useState(`TP ${schoolProfile.academicYear}`);
  const [newIndicator, setNewIndicator] = useState('');
  const [newBudget, setNewBudget] = useState(1500000);

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

  const defaultRKTContent = useMemo(() => {
    const partialDb = {
      schoolProfile,
      problems,
      rootCauses,
      recommendations,
      actionPlans,
      rkasItems,
    } as SchoolDatabase;
    return buildDetailedRKTMarkdown(partialDb);
  }, [schoolProfile, problems, rootCauses, recommendations, actionPlans, rkasItems]);

  const [documentMarkdown, setDocumentMarkdown] = useState(defaultRKTContent);

  useEffect(() => {
    if (!hasManualOverride) {
      setDocumentMarkdown(defaultRKTContent);
    }
  }, [defaultRKTContent, hasManualOverride]);

  const handleResetToSchoolIdentity = () => {
    setHasManualOverride(false);
    setDocumentMarkdown(defaultRKTContent);
    if (onSyncFromPbd) {
      onSyncFromPbd();
    }
    setNotice('Dokumen & Matriks RKT berhasil disinkronkan presisi dari Rencana Aksi PBD terbaru.');
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const result = await AIService.generateOfficialDocument(
        'rkt',
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

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateActionPlans) return;
    const item: ActionPlanItem = {
      id: `manual-act-${Date.now()}`,
      recommendationId: recommendations[0]?.id || 'rec-manual',
      activityName: newActivityName.trim(),
      pic: newPic.trim(),
      timeline: newTimeline.trim(),
      indicator: newIndicator.trim() || `Keterlaksanaan ${newActivityName.trim()}`,
      target: '100% Terlaksana',
      status: 'Direncanakan',
      budgetAllocated: Math.max(0, newBudget),
      actualBudgetSpent: 0,
    };
    onUpdateActionPlans([...actionPlans, item]);
    setShowAddModal(false);
    setNewActivityName('');
    setNewIndicator('');
    setNewBudget(1500000);
  };

  const handleDeleteActivity = (id: string) => {
    if (!onUpdateActionPlans) return;
    onUpdateActionPlans(actionPlans.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
  };

  const handleStatusChange = (id: string, status: ActionPlanItem['status']) => {
    if (!onUpdateActionPlans) return;
    onUpdateActionPlans(actionPlans.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const handleSaveArchive = () => {
    if (!onSaveToArchive) return;
    onSaveToArchive(documentMarkdown, documentStatus);
    setNotice('Dokumen RKT berhasil disimpan ke menu 6.3 Arsip Dokumen Saya.');
  };

  const handleDownloadWord = async () => {
    const partialDb = {
      schoolProfile,
      problems,
      rootCauses,
      recommendations,
      actionPlans,
      rkasItems,
    } as SchoolDatabase;
    await exportRKTToWord(partialDb, hasManualOverride ? documentMarkdown : undefined);
    setNotice('Dokumen MS Word (.docx) RKT resmi ber-kop sekolah berhasil diunduh.');
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
              DOKUMEN OPERASIONAL TAHUNAN
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              TP {schoolProfile.academicYear} · {documentStatus}
            </span>
          </div>
          <h1 className="text-base font-bold text-slate-900 mt-1.5 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-700" />
            <span>4.4 Generator RKT (Rencana Kerja Tahunan)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penjabaran rinci operasional RKJM 1 tahun berjalan untuk {schoolProfile.name} yang terhubung langsung dengan Rencana Kegiatan Anggaran Sekolah (RKAS).
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
            <option value="Disahkan">Status: Disahkan</option>
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
            <span>{isGeneratingAI ? 'AI Menulis RKT...' : 'Regenerasi Narasi AI'}</span>
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
            <span>Cetak Dokumen RKT / PDF</span>
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
          Pratinjau Dokumen Resmi RKT
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jadwal')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'jadwal'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Matriks Jadwal Pelaksanaan & PIC ({actionPlans.length})
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
          Edit Redaksi
        </button>
      </div>

      {/* Tab 1: Preview Layout */}
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
              {schoolProfile.address}, {schoolProfile.district}, {schoolProfile.city}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              NPSN: {schoolProfile.npsn} · Akreditasi: {schoolProfile.accreditationGrade} · TP {schoolProfile.academicYear}
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-4">
            <div className="whitespace-pre-line text-slate-800">
              {documentMarkdown}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Matriks 12 Bulan */}
      {activeTab === 'jadwal' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Matriks Keterlaksanaan Program RKT {schoolProfile.name} (Tahun Pelajaran {schoolProfile.academicYear})
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                NPSN: {schoolProfile.npsn} · Kepala Sekolah: {schoolProfile.principalName} · {schoolProfile.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md whitespace-nowrap">
                {actionPlans.length} Kegiatan Operasional
              </span>
              {onUpdateActionPlans && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kegiatan RKT</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3">Kegiatan Operasional</th>
                  <th className="py-2.5 px-3 w-36">PIC</th>
                  <th className="py-2.5 px-3 w-32">Waktu Pelaksanaan</th>
                  <th className="py-2.5 px-3 text-right w-28">Anggaran</th>
                  <th className="py-2.5 px-3 w-36">Status</th>
                  {onUpdateActionPlans && <th className="py-2.5 px-3 w-20 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actionPlans.map((act, idx) => (
                  <tr key={act.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{act.activityName}</td>
                    <td className="py-3 px-3 text-slate-600">{act.pic}</td>
                    <td className="py-3 px-3 text-slate-600">{act.timeline}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      Rp {act.budgetAllocated.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3">
                      {onUpdateActionPlans ? (
                        <select
                          value={act.status}
                          onChange={(e) => handleStatusChange(act.id, e.target.value as ActionPlanItem['status'])}
                          className="w-full px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 focus:outline-none"
                        >
                          <option value="Belum direncanakan">Belum direncanakan</option>
                          <option value="Direncanakan">Direncanakan</option>
                          <option value="Sedang dilaksanakan">Sedang dilaksanakan</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Perlu tindak lanjut">Perlu tindak lanjut</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {act.status}
                        </span>
                      )}
                    </td>
                    {onUpdateActionPlans && (
                      <td className="py-3 px-3 text-center">
                        {deleteConfirmId === act.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(act.id)}
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
                            onClick={() => setDeleteConfirmId(act.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                            title="Hapus kegiatan RKT"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {actionPlans.length === 0 && (
                  <tr>
                    <td colSpan={onUpdateActionPlans ? 7 : 6} className="py-8 text-center text-slate-500">
                      Belum ada kegiatan RKT. Klik &quot;Sinkronkan dari PBD&quot; atau &quot;Tambah Kegiatan RKT&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Edit */}
      {activeTab === 'edit' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold text-slate-800">
              Edit Redaksi Markdown Dokumen RKT ({schoolProfile.name}):
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
            rows={18}
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

      {/* Modal Tambah Kegiatan RKT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Kegiatan Operasional RKT</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Kegiatan Tahunan *</label>
                <input
                  type="text"
                  required
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  placeholder="Contoh: Gelar Karya P5 & Festival Literasi Siswa"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Penanggung Jawab (PIC) *</label>
                  <input
                    type="text"
                    required
                    value={newPic}
                    onChange={(e) => setNewPic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jadwal Pelaksanaan *</label>
                  <input
                    type="text"
                    required
                    value={newTimeline}
                    onChange={(e) => setNewTimeline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Indikator Keberhasilan</label>
                  <input
                    type="text"
                    value={newIndicator}
                    onChange={(e) => setNewIndicator(e.target.value)}
                    placeholder="100% kegiatan terlaksana tepat waktu"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Estimasi Anggaran (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newBudget}
                    onChange={(e) => setNewBudget(parseFloat(e.target.value) || 0)}
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
                  Simpan ke RKT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
