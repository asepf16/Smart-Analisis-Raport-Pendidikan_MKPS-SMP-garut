import React, { useState, useEffect, useRef } from 'react';
import { IdentifiedProblem, RaporIndicator, SchoolProfile } from '../../types';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  Sparkles,
  RefreshCw,
  ArrowLeftRight,
  Search,
  CheckCircle2,
  Edit3,
  Lightbulb,
} from 'lucide-react';
import {
  recommendTopProblems,
  sortIndicatorsByUrgency,
  getProblemAlternativesForIndicator,
  buildProblemFromIndicator,
} from '../../services/problemRecommendationService';
import { AIService } from '../../services/aiService';

interface IdentifikasiMasalahViewProps {
  problems: IdentifiedProblem[];
  indicators: RaporIndicator[];
  schoolProfile: SchoolProfile;
  onUpdateProblems: (problems: IdentifiedProblem[]) => void;
  onNavigateToRefleksi: () => void;
}

export const IdentifikasiMasalahView: React.FC<IdentifikasiMasalahViewProps> = ({
  problems,
  indicators,
  schoolProfile,
  onUpdateProblems,
  onNavigateToRefleksi,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Replacement modal state
  const [replacingProblem, setReplacingProblem] = useState<IdentifiedProblem | null>(null);
  const [replaceTab, setReplaceTab] = useState<'indicators' | 'alternatives' | 'manual'>('indicators');
  const [replaceSearch, setReplaceSearch] = useState('');
  const [manualActual, setManualActual] = useState('');
  const [manualProblemText, setManualProblemText] = useState('');
  const [manualProof, setManualProof] = useState('');
  const [manualPriority, setManualPriority] = useState<IdentifiedProblem['priority']>(
    'Prioritas 1 (Mendesak)'
  );

  // New problem modal state
  const [newIndicatorId, setNewIndicatorId] = useState('');
  const [newActualCondition, setNewActualCondition] = useState('');
  const [newMainProblem, setNewMainProblem] = useState('');
  const [newDataProof, setNewDataProof] = useState('');
  const [newPriority, setNewPriority] = useState<IdentifiedProblem['priority']>(
    'Prioritas 1 (Mendesak)'
  );

  const hasAutoRecommendedRef = useRef(false);

  // Automatic recommendation when user enters module with indicators but no identified problems yet
  useEffect(() => {
    if (!hasAutoRecommendedRef.current && problems.length === 0 && indicators.length > 0) {
      hasAutoRecommendedRef.current = true;
      const autoRecommended = recommendTopProblems(indicators, 5);
      if (autoRecommended.length > 0) {
        onUpdateProblems(autoRecommended);
        setStatusBanner(
          `Sistem otomatis merekomendasikan ${autoRecommended.length} masalah prioritas berdasarkan skor terendah dan tren Rapor Pendidikan Anda. Klik "Ganti" pada baris mana pun bila ingin menukarnya dengan pilihan lain.`
        );
      }
    }
  }, [problems.length, indicators, onUpdateProblems]);

  const handleRunAutoRecommend = async (forceReplace = false) => {
    if (indicators.length === 0) return;
    if (problems.length > 0 && !forceReplace) {
      setShowRegenerateConfirm(true);
      return;
    }

    setShowRegenerateConfirm(false);
    setIsGeneratingAI(true);
    try {
      const recommended = await AIService.identifyProblems(indicators, schoolProfile);
      if (recommended.length > 0) {
        onUpdateProblems(recommended);
        setStatusBanner(
          `Berhasil memperbarui ${recommended.length} rekomendasi masalah prioritas otomatis untuk ${schoolProfile.name}. Anda dapat mengganti tiap butir sesuai kondisi lapangan sekolah.`
        );
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const updated = problems.map((p) =>
      p.id === id ? { ...p, selectedForPBD: !p.selectedForPBD } : p
    );
    onUpdateProblems(updated);
  };

  const handleApprove = (id: string) => {
    const updated = problems.map((p) =>
      p.id === id ? { ...p, status: 'Disetujui' as const } : p
    );
    onUpdateProblems(updated);
  };

  const handleDeleteConfirm = (id: string) => {
    const updated = problems.filter((p) => p.id !== id);
    onUpdateProblems(updated);
    setConfirmDeleteId(null);
  };

  const openReplaceModal = (prob: IdentifiedProblem, initialTab: 'indicators' | 'alternatives' | 'manual' = 'indicators') => {
    setReplacingProblem(prob);
    setReplaceTab(initialTab);
    setReplaceSearch('');
    setManualActual(prob.actualCondition);
    setManualProblemText(prob.mainProblem);
    setManualProof(prob.dataProof);
    setManualPriority(prob.priority);
  };

  const handleReplaceWithIndicator = (newInd: RaporIndicator, variantIndex = 0) => {
    if (!replacingProblem) return;
    const replacement = buildProblemFromIndicator(newInd, variantIndex, replacingProblem.id);
    const updated = problems.map((p) =>
      p.id === replacingProblem.id ? replacement : p
    );
    onUpdateProblems(updated);
    setStatusBanner(
      `Masalah "${replacingProblem.indicatorCode}" berhasil diganti dengan "${newInd.code} - ${newInd.name}".`
    );
    setReplacingProblem(null);
  };

  const handleReplaceWithAlternativeText = (
    alt: ReturnType<typeof getProblemAlternativesForIndicator>[number]
  ) => {
    if (!replacingProblem) return;
    const updated = problems.map((p) =>
      p.id === replacingProblem.id
        ? {
            ...p,
            actualCondition: alt.actualCondition,
            mainProblem: alt.mainProblem,
            dataProof: alt.dataProof,
            priority: alt.priority,
            status: 'Disetujui' as const,
          }
        : p
    );
    onUpdateProblems(updated);
    setStatusBanner(
      `Rumusan masalah untuk indikator ${replacingProblem.indicatorCode} berhasil diganti dengan opsi "${alt.label}".`
    );
    setReplacingProblem(null);
  };

  const handleSaveManualReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingProblem) return;
    const updated = problems.map((p) =>
      p.id === replacingProblem.id
        ? {
            ...p,
            actualCondition: manualActual.trim(),
            mainProblem: manualProblemText.trim(),
            dataProof: manualProof.trim(),
            priority: manualPriority,
            status: 'Disetujui' as const,
          }
        : p
    );
    onUpdateProblems(updated);
    setStatusBanner(`Perubahan manual pada masalah ${replacingProblem.indicatorCode} berhasil disimpan.`);
    setReplacingProblem(null);
  };

  const handleQuickAddCandidate = (ind: RaporIndicator) => {
    const newProb = buildProblemFromIndicator(ind, 0);
    onUpdateProblems([...problems, newProb]);
    setStatusBanner(`Menambahkan "${ind.code} - ${ind.name}" ke daftar identifikasi masalah.`);
  };

  const handleAddNewProblem = (e: React.FormEvent) => {
    e.preventDefault();
    const ind = indicators.find((i) => i.id === newIndicatorId);
    if (!ind) return;

    const newProb: IdentifiedProblem = {
      id: `prob-${Date.now()}`,
      indicatorId: ind.id,
      indicatorCode: ind.code,
      indicatorName: ind.name,
      actualCondition: newActualCondition,
      mainProblem: newMainProblem,
      dataProof: newDataProof,
      priority: newPriority,
      status: 'Disetujui',
      selectedForPBD: true,
    };

    onUpdateProblems([...problems, newProb]);
    setShowAddModal(false);
    setNewIndicatorId('');
    setNewActualCondition('');
    setNewMainProblem('');
    setNewDataProof('');
  };

  const rankedIndicators = sortIndicatorsByUrgency(indicators);
  const usedIndicatorIds = new Set(problems.map((p) => p.indicatorId));
  const unusedCandidates = rankedIndicators.filter((ind) => !usedIndicatorIds.has(ind.id));

  const currentIndicatorForReplace = replacingProblem
    ? indicators.find(
        (i) => i.id === replacingProblem.indicatorId || i.code === replacingProblem.indicatorCode
      )
    : undefined;

  const filteredReplaceIndicators = rankedIndicators.filter((ind) => {
    const q = replaceSearch.toLowerCase();
    return (
      ind.name.toLowerCase().includes(q) ||
      ind.code.toLowerCase().includes(q) ||
      ind.dimension.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>3.2 Identifikasi Masalah Prioritas (PBD)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem merekomendasikan masalah prioritas secara otomatis dari Rapor Pendidikan. Anda dapat mengganti masalah mana pun dengan indikator atau rumusan lain sesuai kondisi sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleRunAutoRecommend(false)}
            disabled={isGeneratingAI || indicators.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAI ? 'Merekomendasikan...' : 'Rekomendasi Otomatis (AI PBD)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            disabled={indicators.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Manual</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToRefleksi}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <span>Lanjut ke 5-Why</span>
            <Sparkles className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </div>

      {/* Confirmation Banner for Regenerating Recommendations */}
      {showRegenerateConfirm && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-950 space-y-0.5">
            <div className="font-bold">Buat Ulang Rekomendasi Masalah Otomatis?</div>
            <p className="text-amber-900">
              Daftar masalah saat ini akan diganti dengan hasil rekomendasi otomatis terbaru berdasarkan data Rapor Pendidikan ({indicators.length} indikator).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleRunAutoRecommend(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg whitespace-nowrap"
            >
              Ya, Rekomendasikan Ulang
            </button>
          </div>
        </div>
      )}

      {/* Status Info Banner */}
      {statusBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Empty Indicators Guard */}
      {indicators.length === 0 && problems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-2">
          <div className="text-sm font-bold text-slate-800">
            Belum Ada Indikator Rapor Pendidikan
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Silakan impor file Excel Rapor Pendidikan terlebih dahulu melalui menu Fasilitas Impor Rapor agar sistem dapat merekomendasikan masalah prioritas secara otomatis.
          </p>
        </div>
      ) : (
        /* Table Identifikasi Masalah Sesuai Format Resmi */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-3.5 w-14 text-center">Pilih PBD</th>
                  <th className="py-3 px-3.5 w-28">Indikator</th>
                  <th className="py-3 px-3.5 w-44">Kondisi Aktual</th>
                  <th className="py-3 px-3.5">Rumusan Masalah Utama</th>
                  <th className="py-3 px-3.5 w-44">Bukti Data Dukung</th>
                  <th className="py-3 px-3.5 w-40">Tingkat Prioritas</th>
                  <th className="py-3 px-3.5 w-24">Status</th>
                  <th className="py-3 px-3.5 w-40 text-center">Pilihan & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {problems.map((prob) => (
                  <tr key={prob.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={prob.selectedForPBD}
                        onChange={() => handleToggleSelect(prob.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        title="Sertakan masalah ini dalam dokumen PBD dan RKAS"
                      />
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-slate-900 block">{prob.indicatorCode}</span>
                      <span className="text-[11px] text-slate-500 block max-w-[140px] leading-snug">
                        {prob.indicatorName}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 text-[11px] leading-relaxed">
                      {prob.actualCondition}
                    </td>
                    <td className="py-3 px-3.5 text-slate-900 font-medium leading-relaxed">
                      {prob.mainProblem}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 text-[11px] font-mono leading-relaxed">
                      {prob.dataProof}
                    </td>
                    <td className="py-3 px-3.5">
                      <select
                        value={prob.priority}
                        onChange={(e) => {
                          const updated = problems.map((p) =>
                            p.id === prob.id ? { ...p, priority: e.target.value as IdentifiedProblem['priority'] } : p
                          );
                          onUpdateProblems(updated);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none"
                      >
                        <option value="Prioritas 1 (Mendesak)">Prioritas 1 (Mendesak)</option>
                        <option value="Prioritas 2 (Tinggi)">Prioritas 2 (Tinggi)</option>
                        <option value="Prioritas 3 (Sedang)">Prioritas 3 (Sedang)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          prob.status === 'Disetujui'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {prob.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {confirmDeleteId === prob.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteConfirm(prob.id)}
                            className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 whitespace-nowrap"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 whitespace-nowrap"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openReplaceModal(prob, 'indicators')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                            title="Ganti masalah ini dengan indikator atau rumusan masalah lain"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Ganti</span>
                          </button>
                          {prob.status !== 'Disetujui' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(prob.id)}
                              className="p-1.5 rounded text-emerald-700 hover:bg-emerald-50"
                              title="Setujui Masalah"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(prob.id)}
                            className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                            title="Hapus Masalah"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {problems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Belum ada masalah dalam daftar. Klik "Rekomendasi Otomatis (AI PBD)" di atas untuk mengisi rekomendasi otomatis.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table summary note */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              {problems.filter((p) => p.selectedForPBD).length} Masalah terpilih untuk masuk ke siklus refleksi dan pembenahan anggaran BOSP
            </span>
            <span className="font-semibold text-emerald-800">
              Terhubung ke ID Masalah → ID Akar Masalah → Rekomendasi
            </span>
          </div>
        </div>
      )}

      {/* Alternative / Unused Candidate Suggestions */}
      {unusedCandidates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Pilihan Indikator Lain dari Rapor Pendidikan Anda</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Indikator berikut tersedia sebagai alternatif tambahan atau pengganti jika sekolah ingin memprioritaskan aspek lain:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {unusedCandidates.slice(0, 4).map((ind) => (
              <div
                key={ind.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-700">{ind.code}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      Skor {ind.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                    {ind.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ind.category} · Tren {ind.changeFromLastYear > 0 ? `+${ind.changeFromLastYear}` : ind.changeFromLastYear}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAddCandidate(ind)}
                  className="w-full px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                >
                  + Tambahkan ke Daftar PBD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Ganti Masalah dengan Pilihan Lain */}
      {replacingProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-700" />
                  <span>Ganti Masalah dengan Pilihan Lain</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mengganti butir saat ini: <strong className="text-slate-700">[{replacingProblem.indicatorCode}] {replacingProblem.indicatorName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplacingProblem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none px-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 text-xs bg-slate-50">
              <button
                type="button"
                onClick={() => setReplaceTab('indicators')}
                className={`px-3.5 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  replaceTab === 'indicators'
                    ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Ganti Indikator Rapor Lain
              </button>
              <button
                type="button"
                onClick={() => setReplaceTab('alternatives')}
                className={`px-3.5 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  replaceTab === 'alternatives'
                    ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Alternatif Rumusan Masalah
              </button>
              <button
                type="button"
                onClick={() => setReplaceTab('manual')}
                className={`px-3.5 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  replaceTab === 'manual'
                    ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Ubah Manual
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {replaceTab === 'indicators' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={replaceSearch}
                      onChange={(e) => setReplaceSearch(e.target.value)}
                      placeholder="Cari indikator pengganti (kode atau nama indikator)..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredReplaceIndicators.map((ind) => {
                      const isCurrent = ind.id === replacingProblem.indicatorId;
                      const isUsedElsewhere = !isCurrent && usedIndicatorIds.has(ind.id);
                      const previewAlt = getProblemAlternativesForIndicator(ind)[0];

                      return (
                        <div
                          key={ind.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCurrent
                              ? 'border-emerald-400 bg-emerald-50/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{ind.code}</span>
                              <span className="font-semibold text-slate-900">{ind.name}</span>
                              <span className="font-mono text-[11px] font-bold text-slate-700">
                                · Skor {ind.score.toFixed(1)} ({ind.category})
                              </span>
                              {isUsedElsewhere && (
                                <span className="text-[10px] font-semibold text-amber-700">
                                  · Sudah ada di daftar
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              {previewAlt?.mainProblem}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleReplaceWithIndicator(ind, 0)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shrink-0 whitespace-nowrap"
                          >
                            {isCurrent ? 'Reset ke Default' : 'Pilih Pengganti Ini'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {replaceTab === 'alternatives' && (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Pilih salah satu alternatif sudut pandang rumusan masalah untuk indikator{' '}
                    <strong>{replacingProblem.indicatorCode} - {replacingProblem.indicatorName}</strong>:
                  </p>

                  {currentIndicatorForReplace ? (
                    <div className="space-y-2.5">
                      {getProblemAlternativesForIndicator(currentIndicatorForReplace).map((alt, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-emerald-800">{alt.label}</span>
                            <button
                              type="button"
                              onClick={() => handleReplaceWithAlternativeText(alt)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap"
                            >
                              Gunakan Rumusan Ini
                            </button>
                          </div>
                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            {alt.mainProblem}
                          </p>
                          <div className="text-[11px] text-slate-500">
                            {alt.actualCondition}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                      Indikator sumber tidak ditemukan di daftar Rapor saat ini. Silakan pilih indikator baru pada tab "Ganti Indikator Rapor Lain" atau ubah teks secara manual.
                    </div>
                  )}
                </div>
              )}

              {replaceTab === 'manual' && (
                <form onSubmit={handleSaveManualReplace} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kondisi Aktual Sekolah</label>
                    <textarea
                      rows={2}
                      required
                      value={manualActual}
                      onChange={(e) => setManualActual(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rumusan Masalah Utama *</label>
                    <textarea
                      rows={3}
                      required
                      value={manualProblemText}
                      onChange={(e) => setManualProblemText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bukti Data Dukung</label>
                    <input
                      type="text"
                      required
                      value={manualProof}
                      onChange={(e) => setManualProof(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tingkat Prioritas</label>
                    <select
                      value={manualPriority}
                      onChange={(e) => setManualPriority(e.target.value as IdentifiedProblem['priority'])}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Prioritas 1 (Mendesak)">Prioritas 1 (Mendesak)</option>
                      <option value="Prioritas 2 (Tinggi)">Prioritas 2 (Tinggi)</option>
                      <option value="Prioritas 3 (Sedang)">Prioritas 3 (Sedang)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setReplacingProblem(null)}
                      className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Simpan Penggantian</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Masalah Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Masalah Prioritas Baru</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddNewProblem} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Indikator Rapor Pendidikan *</label>
                <select
                  required
                  value={newIndicatorId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setNewIndicatorId(selId);
                    const sel = indicators.find((i) => i.id === selId);
                    if (sel) {
                      const autoDraft = buildProblemFromIndicator(sel, 0);
                      setNewActualCondition(autoDraft.actualCondition);
                      setNewMainProblem(autoDraft.mainProblem);
                      setNewDataProof(autoDraft.dataProof);
                      setNewPriority(autoDraft.priority);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Indikator --</option>
                  {rankedIndicators.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.code} - {ind.name} (Skor: {ind.score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kondisi Aktual Sekolah</label>
                <textarea
                  rows={2}
                  required
                  value={newActualCondition}
                  onChange={(e) => setNewActualCondition(e.target.value)}
                  placeholder="Contoh: Skor 58.2 (Perlu Intervensi Khusus), mengalami penurunan 3.8 poin."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rumusan Masalah Utama *</label>
                <textarea
                  rows={2}
                  required
                  value={newMainProblem}
                  onChange={(e) => setNewMainProblem(e.target.value)}
                  placeholder="Otomatis terisi saat memilih indikator, dapat diubah sesuai kebutuhan."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Bukti Data Dukung</label>
                <input
                  type="text"
                  required
                  value={newDataProof}
                  onChange={(e) => setNewDataProof(e.target.value)}
                  placeholder="Contoh: Hasil ANBK 2024 dan asesmen sumatif rata-rata 61.4."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tingkat Prioritas</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as IdentifiedProblem['priority'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Prioritas 1 (Mendesak)">Prioritas 1 (Mendesak)</option>
                  <option value="Prioritas 2 (Tinggi)">Prioritas 2 (Tinggi)</option>
                  <option value="Prioritas 3 (Sedang)">Prioritas 3 (Sedang)</option>
                </select>
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
                  Simpan Masalah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
