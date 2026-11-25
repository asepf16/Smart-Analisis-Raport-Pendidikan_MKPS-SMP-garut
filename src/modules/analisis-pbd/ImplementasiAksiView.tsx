import React, { useState } from 'react';
import {
  ActionPlanItem,
  IdentifiedProblem,
  RaporIndicator,
  RecommendationBenahi,
  RootCauseReflection,
  SchoolProfile,
} from '../../types';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Plus,
  Upload,
  Calendar,
  UserCheck,
  Trash2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  BookMarked,
  Calculator,
  GraduationCap,
} from 'lucide-react';
import {
  buildActionPlansFromRecommendations,
  SynthesisOptions,
  SynthesisSummary,
} from '../../services/pbdSynthesisService';
import { NavMenuId } from '../../components/layout/Sidebar';

interface ImplementasiAksiViewProps {
  actionPlans: ActionPlanItem[];
  recommendations: RecommendationBenahi[];
  indicators: RaporIndicator[];
  problems: IdentifiedProblem[];
  rootCauses: RootCauseReflection[];
  schoolProfile: SchoolProfile;
  onUpdateActionPlans: (updated: ActionPlanItem[]) => void;
  onSynthesizeAllFromPBD: (options: SynthesisOptions) => SynthesisSummary;
  onNavigateToRKAS: () => void;
  onNavigateMenu: (menuId: NavMenuId) => void;
}

export const ImplementasiAksiView: React.FC<ImplementasiAksiViewProps> = ({
  actionPlans,
  recommendations,
  indicators,
  problems,
  rootCauses,
  schoolProfile,
  onUpdateActionPlans,
  onSynthesizeAllFromPBD,
  onNavigateToRKAS,
  onNavigateMenu,
}) => {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [preserveManualItems, setPreserveManualItems] = useState(true);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisSummary | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Add Action Plan modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecId, setNewRecId] = useState(recommendations[0]?.id || '');
  const [newActivityName, setNewActivityName] = useState('');
  const [newPic, setNewPic] = useState('Tim TPMPS & Guru Terkait');
  const [newTimeline, setNewTimeline] = useState(`TP ${schoolProfile.academicYear}`);
  const [newIndicator, setNewIndicator] = useState('');
  const [newTarget, setNewTarget] = useState('100% Terlaksana');
  const [newBudget, setNewBudget] = useState(0);

  const statusColors: Record<ActionPlanItem['status'], { badge: string; icon: React.ElementType }> = {
    'Selesai': { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    'Sedang dilaksanakan': { badge: 'bg-blue-50 text-blue-800 border-blue-200', icon: Clock },
    'Direncanakan': { badge: 'bg-purple-50 text-purple-800 border-purple-200', icon: Calendar },
    'Belum direncanakan': { badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertCircle },
    'Perlu tindak lanjut': { badge: 'bg-rose-50 text-rose-800 border-rose-200', icon: AlertCircle },
  };

  const pbdStages = [
    { label: '3.1 Analisis Rapor', done: indicators.length > 0, count: `${indicators.length} indikator`, target: 'analisis-rapor' as NavMenuId },
    { label: '3.2 Masalah Prioritas', done: problems.length > 0, count: `${problems.filter((p) => p.selectedForPBD).length || problems.length} masalah`, target: 'identifikasi-masalah' as NavMenuId },
    { label: '3.3 Refleksi 5-Why', done: rootCauses.length > 0, count: `${rootCauses.length} akar`, target: 'refleksi-akar-masalah' as NavMenuId },
    { label: '3.4 Rekomendasi Benahi', done: recommendations.length > 0, count: `${recommendations.length} program`, target: 'rekomendasi-pembenahan' as NavMenuId },
    { label: '3.5 Rencana Aksi', done: actionPlans.length > 0, count: `${actionPlans.length} aksi`, target: 'implementasi-aksi' as NavMenuId },
  ];

  const handleStatusChange = (id: string, newStatus: ActionPlanItem['status']) => {
    const updated = actionPlans.map((item) =>
      item.id === id ? { ...item, status: newStatus } : item
    );
    onUpdateActionPlans(updated);
  };

  const handleSaveNotes = (id: string) => {
    const updated = actionPlans.map((item) =>
      item.id === id ? { ...item, evidenceNotes: tempNotes } : item
    );
    onUpdateActionPlans(updated);
    setEditingNotesId(null);
  };

  const handleDelete = (id: string) => {
    onUpdateActionPlans(actionPlans.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
  };

  const handleDeriveFromRecommendations = () => {
    if (recommendations.length === 0) return;
    const before = actionPlans.length;
    const merged = buildActionPlansFromRecommendations(recommendations, actionPlans, schoolProfile);
    const added = merged.length - before;
    onUpdateActionPlans(merged);
    setBannerMessage(
      added > 0
        ? `Berhasil menarik ${added} kegiatan rencana aksi baru secara presisi dari Rekomendasi Pembenahan.`
        : 'Semua rekomendasi pembenahan sudah terhubung ke Matriks Rencana Aksi.'
    );
  };

  const handleAddActionPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ActionPlanItem = {
      id: `manual-act-${Date.now()}`,
      recommendationId: newRecId || 'rec-manual',
      activityName: newActivityName.trim(),
      pic: newPic.trim(),
      timeline: newTimeline.trim(),
      indicator: newIndicator.trim() || `Keterlaksanaan ${newActivityName.trim()}`,
      target: newTarget.trim(),
      status: 'Direncanakan',
      budgetAllocated: Math.max(0, newBudget),
      actualBudgetSpent: 0,
    };
    onUpdateActionPlans([...actionPlans, newItem]);
    setShowAddModal(false);
    setNewActivityName('');
    setNewIndicator('');
    setNewBudget(0);
    setBannerMessage(`Rencana aksi "${newItem.activityName}" berhasil ditambahkan.`);
  };

  const handleRunFullSynthesis = () => {
    const summary = onSynthesizeAllFromPBD({ preserveManualItems });
    setSynthesisResult(summary);
    setBannerMessage(
      `Seluruh Dokumen Induk (8 SNP, Akreditasi, RKJM, RKT, RKAS, Program Kepsek), Mutu Pembelajaran (Supervisi, Literasi, Numerasi, Karakter), dan Arsip Dokumen ${schoolProfile.name} berhasil disusun presisi dari hasil PBD!`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-700" />
            <span>3.5 Matriks Implementasi Rencana Aksi Pembenahan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahap akhir Perencanaan Berbasis Data (PBD). Setelah rencana aksi siap, Anda dapat langsung menghasilkan seluruh Dokumen Induk, Anggaran RKAS, dan Program Mutu Pembelajaran secara presisi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDeriveFromRecommendations}
            disabled={recommendations.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tarik dari Rekomendasi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewRecId(recommendations[0]?.id || '');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rencana Aksi</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToRKAS}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <span>Buka Modul RKAS</span>
            <FileCheck className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* PBD Pipeline Status & Master Synthesis Panel */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              OTOMASI DOKUMEN TERINTEGRASI PBD — {schoolProfile.name.toUpperCase()}
            </div>
            <h2 className="text-base font-bold text-white">
              Generate Seluruh Dokumen Induk, Anggaran & Mutu Pembelajaran Presisi
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Mengonversi hasil Analisis Rapor, Masalah Prioritas, Akar Masalah 5-Why, Rekomendasi Benahi, dan Rencana Aksi menjadi 8 SNP, Akreditasi BAN-PDM, RKJM, RKT, RKAS BOSP, Program Kepsek, Supervisi Guru, Literasi, Numerasi, Karakter, dan Arsip Dokumen.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRunFullSynthesis}
              disabled={indicators.length === 0 && problems.length === 0 && actionPlans.length === 0}
              className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Generate Semua Dokumen & Program Mutu</span>
            </button>
            <label className="flex items-center gap-2 text-[11px] text-emerald-100 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveManualItems}
                onChange={(e) => setPreserveManualItems(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-emerald-400 accent-amber-400"
              />
              <span>Pertahankan item yang sudah saya tambah manual</span>
            </label>
          </div>
        </div>

        {/* 5-Stage PBD Readiness Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {pbdStages.map((st, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigateMenu(st.target)}
              className={`text-left p-2.5 rounded-xl border transition-colors ${
                st.done
                  ? 'bg-emerald-950/60 border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-slate-900/60 border-slate-700 hover:border-amber-400/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white truncate">{st.label}</span>
                {st.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <div className="text-[11px] font-mono text-emerald-200/90 mt-1">{st.count}</div>
            </button>
          ))}
        </div>

        {/* Result Quick-Jump Cards after Synthesis */}
        {synthesisResult && (
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Generasi Presisi Selesai — Seluruh Modul Siap Digunakan & Bisa Ditambah/Diedit/Dihapus:</span>
              </span>
              <span className="font-mono text-[11px] text-amber-300">
                Pagu RKAS: Rp {synthesisResult.totalRkasBudget.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => onNavigateMenu('integrasi-snp')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <BookMarked className="w-3.5 h-3.5 text-emerald-300" />
                <span>4.1 SNP ({synthesisResult.snpCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('integrasi-akreditasi')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>4.2 Akreditasi ({synthesisResult.accreditationCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('generator-rkjm')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>4.3 RKJM</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('generator-rkt')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>4.4 RKT</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('generator-rkas')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-300" />
                <span>4.5 RKAS ({synthesisResult.rkasCount} pos)</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('program-kepsek')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>4.6 Program Kepsek ({synthesisResult.principalProgramsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('supervisi-akademik')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                <span>5.1 Supervisi ({synthesisResult.supervisionCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('program-literasi')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>5.2 Literasi ({synthesisResult.literacyCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('program-numerasi')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>5.3 Numerasi ({synthesisResult.numeracyCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('program-karakter')}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1"
              >
                <span>5.4 Karakter ({synthesisResult.characterCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateMenu('dokumen-saya')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold inline-flex items-center gap-1"
              >
                <span>6.3 Arsip Dokumen ({synthesisResult.documentsCount})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {bannerMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-emerald-700 font-bold text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Action Plan Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5 min-w-[220px]">Rencana Kegiatan Aksi</th>
                <th className="py-3 px-3.5 w-36">Penanggung Jawab (PIC)</th>
                <th className="py-3 px-3.5 w-32">Waktu / Jadwal</th>
                <th className="py-3 px-3.5 w-48">Indikator & Target</th>
                <th className="py-3 px-3.5 w-32 text-right">Alokasi Anggaran</th>
                <th className="py-3 px-3.5 w-40">Status Keterlaksanaan</th>
                <th className="py-3 px-3.5 min-w-[160px]">Bukti Fisik & Catatan</th>
                <th className="py-3 px-3.5 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actionPlans.map((act, idx) => (
                <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-semibold text-slate-900 leading-snug">
                      {act.activityName}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{act.pic}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{act.timeline}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[11px] leading-relaxed">
                    <div className="text-slate-800 font-medium">{act.indicator}</div>
                    <div className="text-emerald-700 font-semibold mt-0.5">Target: {act.target}</div>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                    Rp {act.budgetAllocated.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3.5">
                    <select
                      value={act.status}
                      onChange={(e) => handleStatusChange(act.id, e.target.value as ActionPlanItem['status'])}
                      className={`w-full px-2 py-1 text-[11px] font-bold rounded-lg border focus:outline-none ${statusColors[act.status]?.badge}`}
                    >
                      <option value="Belum direncanakan">Belum direncanakan</option>
                      <option value="Direncanakan">Direncanakan</option>
                      <option value="Sedang dilaksanakan">Sedang dilaksanakan</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Perlu tindak lanjut">Perlu tindak lanjut</option>
                    </select>
                  </td>
                  <td className="py-3 px-3.5 text-[11px]">
                    {editingNotesId === act.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          rows={2}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="Catat nomor surat, link drive bukti, atau evaluasi..."
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(act.id)}
                            className="px-2 py-0.5 bg-emerald-700 text-white rounded font-medium text-[10px]"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingNotesId(act.id);
                          setTempNotes(act.evidenceNotes || '');
                        }}
                        className="cursor-pointer hover:text-emerald-700 text-slate-600 leading-snug"
                        title="Klik untuk mengedit catatan bukti fisik"
                      >
                        {act.evidenceNotes ? (
                          <span>{act.evidenceNotes}</span>
                        ) : (
                          <span className="text-slate-400 italic flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Tambah bukti fisik...
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    {deleteConfirmId === act.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(act.id)}
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
                        title="Hapus rencana aksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {actionPlans.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Belum ada rencana aksi. Klik &quot;Tarik dari Rekomendasi&quot; atau &quot;Tambah Rencana Aksi&quot; di atas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>{actionPlans.filter((a) => a.status === 'Selesai').length} dari {actionPlans.length} Rencana Aksi Telah Selesai</span>
          <span className="font-semibold text-emerald-800 font-mono">
            Total Anggaran Terpetakan: Rp {actionPlans.reduce((sum, a) => sum + a.budgetAllocated, 0).toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Modal Tambah Rencana Aksi */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Rencana Aksi Pembenahan</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddActionPlan} className="space-y-3 text-xs">
              {recommendations.length > 0 && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rujukan Rekomendasi Benahi</label>
                  <select
                    value={newRecId}
                    onChange={(e) => setNewRecId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {recommendations.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.type.split(' ')[0]} {r.type.split(' ')[1]}] {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Kegiatan Aksi *</label>
                <input
                  type="text"
                  required
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  placeholder="Contoh: Workshop Pemanfaatan Kit Numerasi Lintas Mapel"
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
                    placeholder="Tersusunnya perangkat & bukti kegiatan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Alokasi Anggaran (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newBudget}
                    onChange={(e) => setNewBudget(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Capaian</label>
                <input
                  type="text"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
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
                  Simpan Rencana Aksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
