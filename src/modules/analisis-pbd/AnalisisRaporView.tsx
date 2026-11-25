import React, { useState } from 'react';
import {
  RaporIndicator,
  SchoolProfile,
  SavedRaporSnapshot,
} from '../../types';
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  Save,
  Upload,
  FolderArchive,
  ArrowLeftRight,
} from 'lucide-react';
import { AIService, AIAnalysisResult } from '../../services/aiService';

interface AnalisisRaporViewProps {
  indicators: RaporIndicator[];
  schoolProfile: SchoolProfile;
  academicYear: string;
  raporSnapshots: SavedRaporSnapshot[];
  activeRaporSnapshotId?: string;
  activeRaporLabel?: string;
  onSaveCurrentSnapshot: (label: string, year: string) => void;
  onSwitchSnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onNavigateToImport: () => void;
}

export const AnalisisRaporView: React.FC<AnalisisRaporViewProps> = ({
  indicators,
  schoolProfile,
  academicYear,
  raporSnapshots,
  activeRaporSnapshotId,
  activeRaporLabel,
  onSaveCurrentSnapshot,
  onSwitchSnapshot,
  onNavigateToImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDimension, setFilterDimension] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  // Save & Switch UI state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveYear, setSaveYear] = useState(String(indicators[0]?.year || new Date().getFullYear()));
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);

  const dimensions = Array.from(new Set(indicators.map((i) => i.dimension)));

  const filteredIndicators = indicators.filter((ind) => {
    const matchesSearch =
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDimension =
      filterDimension === 'all' || ind.dimension === filterDimension;
    const matchesPriority =
      filterPriority === 'all' || ind.priorityLevel === filterPriority;
    return matchesSearch && matchesDimension && matchesPriority;
  });

  const handleRunAIAnalysis = async () => {
    if (indicators.length === 0) return;
    setIsAnalyzing(true);
    try {
      const res = await AIService.analyzeRapor(indicators, schoolProfile, academicYear);
      setAiResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (indicators.length === 0) return;
    onSaveCurrentSnapshot(
      saveLabel.trim() || `Arsip Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`,
      saveYear.trim()
    );
    setShowSaveForm(false);
    setSaveLabel('');
    setSwitchNotice('Seluruh siklus Rapor Pendidikan saat ini (termasuk PBD, Dokumen & Anggaran, serta Mutu Pembelajaran) berhasil diamankan ke arsip.');
  };

  const handleSelectSnapshot = (snapId: string) => {
    if (!snapId || snapId === activeRaporSnapshotId) return;
    const target = raporSnapshots.find((s) => s.id === snapId);
    onSwitchSnapshot(snapId);
    setAiResult(null);
    if (target) {
      setSwitchNotice(
        `Berhasil memulihkan siklus "${target.label}" (${target.indicators.length} indikator beserta PBD, Dokumen & Mutu Pembelajaran terkait). Siklus sebelumnya tetap tersimpan aman di arsip.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
            <span>3.1 Analisis Komprehensif Rapor Pendidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis otomatis berbasis data aktual Rapor Pendidikan Kemendikdasmen untuk memetakan capaian mutu, tren perkembangan antartahun, dan disparitas layanan belajar.
          </p>
        </div>

        <button
          onClick={handleRunAIAnalysis}
          disabled={isAnalyzing || indicators.length === 0}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>{isAnalyzing ? 'AI Sedang Menganalisis Data...' : 'Jalankan Analisis AI PBD'}</span>
        </button>
      </div>

      {/* Switch & Save Active Rapor Dataset Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Siklus & Dataset Rapor yang Sedang Aktif
              </div>
              <div className="text-xs font-bold text-slate-900 truncate">
                {activeRaporLabel || (indicators.length > 0 ? `Rapor Pendidikan (${indicators.length} Indikator)` : 'Belum Ada Data Rapor')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {raporSnapshots.length > 0 && (
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <select
                  value={activeRaporSnapshotId || ''}
                  onChange={(e) => handleSelectSnapshot(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none max-w-[260px]"
                  title="Beralih ke arsip siklus Rapor, PBD, Dokumen & Mutu Pembelajaran lainnya"
                >
                  {!activeRaporSnapshotId && (
                    <option value="">-- Pilih Arsip Siklus Tersimpan --</option>
                  )}
                  {raporSnapshots.map((snap) => (
                    <option key={snap.id} value={snap.id}>
                      {snap.label} ({snap.year} · {snap.indicators.length} ind.)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {indicators.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSaveLabel(
                    activeRaporLabel
                      ? `${activeRaporLabel} (Salinan)`
                      : `Arsip Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`
                  );
                  setShowSaveForm(!showSaveForm);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Siklus Ini</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateToImport}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ganti / Kosongkan Rapor</span>
            </button>
          </div>
        </div>

        {/* Inline Save Form */}
        {showSaveForm && (
          <form
            onSubmit={handleSaveSubmit}
            className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 text-xs"
          >
            <div className="flex-1">
              <label className="block font-medium text-slate-700 mb-1">Nama Simpanan Rapor *</label>
              <input
                type="text"
                required
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Misal: Rapor Pendidikan 2025 (Sebelum Revisi)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="w-full sm:w-28">
              <label className="block font-medium text-slate-700 mb-1">Tahun</label>
              <input
                type="text"
                required
                value={saveYear}
                onChange={(e) => setSaveYear(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg whitespace-nowrap"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg whitespace-nowrap"
              >
                Simpan Arsip
              </button>
            </div>
          </form>
        )}

        {switchNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{switchNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setSwitchNotice(null)}
              className="font-bold text-emerald-700 hover:text-emerald-900 shrink-0"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* AI Analysis Result Card if generated */}
      {aiResult && (
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Laporan Telaah & Analisis AI Tim Pakar PBD Kemendikdasmen
                </h2>
                <div className="text-[11px] text-emerald-300">
                  Satuan Pendidikan: {schoolProfile.name} · Tahun: {academicYear}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
              Model: Gemini 3.8 Flash (PBD Rule Verified)
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {aiResult.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-3.5 space-y-2">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Kekuatan Utama Sekolah:</span>
              </div>
              <ul className="space-y-1 text-slate-200 text-[11px] list-disc list-inside">
                {aiResult.strengths.map((s, idx) => (
                  <li key={idx} className="leading-relaxed">{s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950/60 border border-rose-900/60 rounded-xl p-3.5 space-y-2">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Kelemahan & Kesenjangan Mendesak:</span>
              </div>
              <ul className="space-y-1 text-slate-200 text-[11px] list-disc list-inside">
                {aiResult.weaknesses.map((w, idx) => (
                  <li key={idx} className="leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-700/60">
              <span className="font-semibold text-amber-300">Kesenjangan Capaian: </span>
              <span className="text-slate-300 text-[11px]">{aiResult.achievementGaps}</span>
            </div>
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-700/60">
              <span className="font-semibold text-amber-300">Dampak Terhadap Mutu: </span>
              <span className="text-slate-300 text-[11px]">{aiResult.impactOnQuality}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari kode (A.1, D.1) atau nama indikator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterDimension}
              onChange={(e) => setFilterDimension(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Dimensi</option>
              {dimensions.map((dim, idx) => (
                <option key={idx} value={dim}>
                  {dim}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Prioritas</option>
            <option value="Tinggi">Prioritas Tinggi</option>
            <option value="Sedang">Prioritas Sedang</option>
            <option value="Rendah">Prioritas Rendah</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-16">Kode</th>
                <th className="py-3 px-3.5">Nama Indikator Rapor Pendidikan</th>
                <th className="py-3 px-3.5 text-right w-24">Capaian</th>
                <th className="py-3 px-3.5 w-32">Kategori</th>
                <th className="py-3 px-3.5 text-right w-24">Perubahan</th>
                <th className="py-3 px-3.5 w-28">Prioritas</th>
                <th className="py-3 px-3.5 min-w-[260px]">Akar Masalah & Catatan PBD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIndicators.map((ind) => {
                const isGood = ind.score >= 70;
                const isModerate = ind.score >= 60 && ind.score < 70;

                return (
                  <tr key={ind.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-700">{ind.code}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{ind.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{ind.dimension}</div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-sm tabular-nums text-slate-900">
                      {ind.score.toFixed(1)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                          isGood
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isModerate
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {ind.category}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                      <span
                        className={`inline-flex items-center text-xs font-semibold ${
                          ind.changeFromLastYear > 0
                            ? 'text-emerald-700'
                            : ind.changeFromLastYear < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {ind.changeFromLastYear > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                        ) : ind.changeFromLastYear < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                        ) : null}
                        {ind.changeFromLastYear > 0 ? `+${ind.changeFromLastYear}` : ind.changeFromLastYear}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`text-xs font-bold ${
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
                    <td className="py-3 px-3.5 text-slate-600 leading-relaxed text-[11px]">
                      <div>{ind.kemendikbudRootCause || ind.aiAnalysis || 'Perlu telaah di komunitas belajar sekolah.'}</div>
                      {ind.kemendikbudInspirasiBenahi && (
                        <div className="text-emerald-800 font-medium mt-1">
                          Inspirasi: {ind.kemendikbudInspirasiBenahi}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredIndicators.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    {indicators.length === 0
                      ? 'Belum ada data Rapor Pendidikan untuk dianalisis. Silakan impor file Rapor baru atau pilih dari Arsip Rapor Tersimpan di atas.'
                      : 'Tidak ada indikator yang cocok dengan pencarian/filter Anda.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer count */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredIndicators.length} dari total {indicators.length} indikator</span>
          <span className="font-mono">Standar Acuan: Kepka BSKAP 034/H/M/2025 & Kepmendikdasmen 63/2026</span>
        </div>
      </div>
    </div>
  );
};
