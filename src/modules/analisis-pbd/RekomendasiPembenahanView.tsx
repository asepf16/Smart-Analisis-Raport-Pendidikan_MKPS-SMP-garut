import React, { useState } from 'react';
import { RecommendationBenahi, RootCauseReflection, IdentifiedProblem, SchoolProfile } from '../../types';
import {
  Lightbulb,
  Sparkles,
  Plus,
  Trash2,
  UserCheck,
  ArrowRight,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { AIService } from '../../services/aiService';
import { buildRecommendationsForAllProblems } from '../../services/pbdSynthesisService';

interface RekomendasiPembenahanViewProps {
  recommendations: RecommendationBenahi[];
  rootCauses: RootCauseReflection[];
  problems: IdentifiedProblem[];
  schoolProfile: SchoolProfile;
  onUpdateRecommendations: (updated: RecommendationBenahi[]) => void;
  onNavigateToImplementasi: () => void;
}

export const RekomendasiPembenahanView: React.FC<RekomendasiPembenahanViewProps> = ({
  recommendations,
  rootCauses,
  problems,
  schoolProfile,
  onUpdateRecommendations,
  onNavigateToImplementasi,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Add manual recommendation modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProblemId, setNewProblemId] = useState(problems[0]?.id || '');
  const [newType, setNewType] = useState<RecommendationBenahi['type']>('Benahi 1 (Kompetensi GTK/Tata Kelola)');
  const [newTitle, setNewTitle] = useState('');
  const [newStrategy, setNewStrategy] = useState('');
  const [newActivitiesText, setNewActivitiesText] = useState('');
  const [newPic, setNewPic] = useState('Wakasek Kurikulum & Tim TPMPS');
  const [newTargetValue, setNewTargetValue] = useState('Peningkatan skor >= 70 (Cakap/Baik)');
  const [newTimeline, setNewTimeline] = useState(`TP ${schoolProfile.academicYear}`);
  const [newCost, setNewCost] = useState(0);

  const filteredRecs = recommendations.filter((r) => {
    if (filterType === 'all') return true;
    if (filterType === 'budget') return r.requiresBudget;
    if (filterType === 'non-budget') return !r.requiresBudget;
    return true;
  });

  const handleGenerateAllFromProblems = () => {
    if (problems.length === 0) return;
    const beforeCount = recommendations.length;
    const merged = buildRecommendationsForAllProblems(
      problems,
      rootCauses,
      recommendations,
      schoolProfile
    );
    const addedCount = merged.length - beforeCount;
    onUpdateRecommendations(merged);
    setStatusMessage(
      addedCount > 0
        ? `Berhasil menyusun ${addedCount} rekomendasi pembenahan (Benahi 1, 2, 3) secara presisi dari seluruh masalah prioritas PBD.`
        : 'Seluruh masalah prioritas PBD sudah memiliki rekomendasi pembenahan terkait.'
    );
  };

  const handleGenerateAIRecommendations = async () => {
    if (problems.length === 0) return;
    setIsGenerating(true);
    try {
      const prob = problems.find((p) => p.selectedForPBD) || problems[0];
      const rc = rootCauses.find((r) => r.problemId === prob.id);
      const res = await AIService.generateRecommendations(
        prob.mainProblem,
        rc?.rootCause || 'Kombel belum dioptimalkan',
        undefined,
        schoolProfile
      );

      const newRec1: RecommendationBenahi = {
        id: `rec-${Date.now()}-1`,
        problemId: prob.id,
        rootCauseId: rc?.id || 'rc-1',
        title: res.benahi1.title,
        type: 'Benahi 1 (Kompetensi GTK/Tata Kelola)',
        objective: 'Peningkatan kompetensi guru dan perbaikan tata kelola kombel',
        strategy: res.benahi1.description,
        activities: res.benahi1.activities,
        pic: res.benahi1.pic,
        targetAudience: 'Seluruh Pendidik',
        successIndicator: 'Keaktifan 100% guru dalam kombel',
        targetValue: res.benahi1.target,
        timeline: res.benahi1.timeline,
        resourceNeeds: 'Modul PMM & ruang kombel',
        estimatedCost: res.benahi1.costEstimate,
        requiresBudget: res.benahi1.costEstimate > 0,
      };

      const newRec2: RecommendationBenahi = {
        id: `rec-${Date.now()}-2`,
        problemId: prob.id,
        rootCauseId: rc?.id || 'rc-1',
        title: res.benahi2.title,
        type: 'Benahi 2 (Pengadaan Sarana/Anggaran)',
        objective: 'Penyediaan sarana belajar konkrit didukung BOSP',
        strategy: res.benahi2.description,
        activities: res.benahi2.activities,
        pic: res.benahi2.pic,
        targetAudience: 'Peserta Didik',
        successIndicator: 'Tersedianya sarana belajar memadai',
        targetValue: res.benahi2.target,
        timeline: res.benahi2.timeline,
        resourceNeeds: 'Katalog SIPLah',
        estimatedCost: res.benahi2.costEstimate,
        requiresBudget: true,
      };

      onUpdateRecommendations([...recommendations, newRec1, newRec2]);
      setStatusMessage('Berhasil menambahkan draf rekomendasi pembenahan dari analisis AI.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddManualRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProbId = newProblemId || problems[0]?.id || 'prob-manual';
    const matchingRc = rootCauses.find((r) => r.problemId === targetProbId);
    const activities = newActivitiesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const newItem: RecommendationBenahi = {
      id: `manual-rec-${Date.now()}`,
      problemId: targetProbId,
      rootCauseId: matchingRc?.id || 'rc-manual',
      title: newTitle.trim(),
      type: newType,
      objective: newStrategy.trim() || `Mendukung pembenahan mutu di ${schoolProfile.name}`,
      strategy: newStrategy.trim(),
      activities: activities.length > 0 ? activities : [newTitle.trim()],
      pic: newPic.trim(),
      targetAudience: `${schoolProfile.totalStudents || 180} Siswa & ${schoolProfile.totalTeachers || 15} Guru`,
      successIndicator: `Terlaksananya ${newTitle.trim()}`,
      targetValue: newTargetValue.trim(),
      timeline: newTimeline.trim(),
      resourceNeeds: newCost > 0 ? 'Alokasi Dana BOSP / RKAS' : 'Tata Kelola Internal Sekolah',
      estimatedCost: Math.max(0, newCost),
      requiresBudget: newCost > 0,
    };

    onUpdateRecommendations([...recommendations, newItem]);
    setShowAddModal(false);
    setNewTitle('');
    setNewStrategy('');
    setNewActivitiesText('');
    setNewCost(0);
    setStatusMessage(`Rekomendasi "${newItem.title}" berhasil ditambahkan.`);
  };

  const handleDelete = (id: string) => {
    onUpdateRecommendations(recommendations.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>3.4 Rekomendasi Pembenahan Mutu Terpadu</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dikelompokkan secara terstruktur: Benahi 1 (Peningkatan kompetensi GTK & Tata Kelola), Benahi 2 (Sarana belajar didukung Dana BOSP), dan Benahi 3 (Pembiasaan budaya mutu sekolah).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAllFromProblems}
            disabled={problems.length === 0}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>Susun Otomatis Semua Masalah</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewProblemId(problems[0]?.id || '');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekomendasi</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateAIRecommendations}
            disabled={isGenerating || problems.length === 0}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isGenerating ? 'AI Menyusun...' : 'Generate Rekomendasi AI'}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToImplementasi}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <span>Ke Rencana Aksi & Dokumen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 font-bold text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterType === 'all'
              ? 'bg-slate-900 text-white font-semibold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Semua Rekomendasi ({recommendations.length})
        </button>
        <button
          onClick={() => setFilterType('budget')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterType === 'budget'
              ? 'bg-emerald-700 text-white font-semibold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Memerlukan Anggaran BOSP ({recommendations.filter((r) => r.requiresBudget).length})
        </button>
        <button
          onClick={() => setFilterType('non-budget')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            filterType === 'non-budget'
              ? 'bg-blue-700 text-white font-semibold'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tata Kelola & Non-Anggaran ({recommendations.filter((r) => !r.requiresBudget).length})
        </button>
      </div>

      {/* Empty state */}
      {filteredRecs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="text-sm font-bold text-slate-800">
            Belum Ada Rekomendasi Pembenahan
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Klik &quot;Susun Otomatis Semua Masalah&quot; untuk menghasilkan paket Benahi 1, 2, dan 3 dari daftar masalah prioritas Anda, atau tambahkan rekomendasi secara manual.
          </p>
        </div>
      ) : (
        /* Recommendations Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecs.map((rec) => {
            const isBenahi1 = rec.type.includes('Benahi 1');
            const isBenahi2 = rec.type.includes('Benahi 2');

            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        isBenahi1
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : isBenahi2
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-teal-50 text-teal-800 border border-teal-200'
                      }`}
                    >
                      {rec.type}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold shrink-0">
                      {rec.requiresBudget ? (
                        <span className="text-emerald-700">
                          Rp {rec.estimatedCost.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-400">Non-Anggaran</span>
                      )}
                    </div>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900 leading-snug">
                    {rec.title}
                  </h2>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {rec.strategy}
                  </p>

                  {/* Activities list */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Bentuk Kegiatan Konkret:
                    </span>
                    <ul className="space-y-0.5 text-xs text-slate-600 list-disc list-inside">
                      {rec.activities.map((act, aIdx) => (
                        <li key={aIdx} className="leading-relaxed">{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-[11px]">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>PIC: {rec.pic}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-emerald-800">
                      Target: {rec.targetValue}
                    </span>
                    {deleteConfirmId === rec.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
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
                        title="Hapus Rekomendasi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Rekomendasi Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Rekomendasi Pembenahan</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddManualRecommendation} className="space-y-3 text-xs">
              {problems.length > 0 && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Terkait Masalah Prioritas</label>
                  <select
                    value={newProblemId}
                    onChange={(e) => setNewProblemId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {problems.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.indicatorCode}] {p.indicatorName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kategori Benahi *</label>
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
                <label className="block font-medium text-slate-700 mb-1">Judul Rekomendasi Program *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Klinik Numerasi Terdiferensiasi & Penggunaan Alat Peraga"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Strategi Pelaksanaan *</label>
                <textarea
                  rows={2}
                  required
                  value={newStrategy}
                  onChange={(e) => setNewStrategy(e.target.value)}
                  placeholder="Uraikan strategi pembenahan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Daftar Kegiatan Konkret (1 baris = 1 kegiatan)</label>
                <textarea
                  rows={2}
                  value={newActivitiesText}
                  onChange={(e) => setNewActivitiesText(e.target.value)}
                  placeholder={'Workshop penyusunan modul ajar\nPengadaan kit alat peraga kelas'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">PIC</label>
                  <input
                    type="text"
                    value={newPic}
                    onChange={(e) => setNewPic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
                  <label className="block font-medium text-slate-700 mb-1">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCost}
                    onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Keberhasilan</label>
                <input
                  type="text"
                  value={newTargetValue}
                  onChange={(e) => setNewTargetValue(e.target.value)}
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
                  Simpan Rekomendasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
