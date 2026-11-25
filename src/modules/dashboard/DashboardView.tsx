import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Calculator,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  BarChart2,
  Calendar,
  Layers,
  FileCheck,
} from 'lucide-react';
import { SchoolProfile, RaporIndicator, RKASItem, PrincipalProgramItem, AccreditationItem } from '../../types';
import { SchoolDatabase } from '../../services/storageService';
import { NavMenuId } from '../../components/layout/Sidebar';

interface DashboardViewProps {
  db: SchoolDatabase;
  onNavigate: (menuId: NavMenuId) => void;
  onTriggerAIAnalysis: () => void;
  isAILoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  onNavigate,
  onTriggerAIAnalysis,
  isAILoading,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

  const {
    schoolProfile,
    raporIndicators,
    problems,
    rootCauses,
    recommendations,
    actionPlans,
    rkasItems,
    principalPrograms,
    supervisionRecords,
    literacyPrograms,
    numeracyPrograms,
    characterPrograms,
  } = db;

  // Calculations
  const goodIndicators = raporIndicators.filter(
    (i) => i.score >= 70 || i.category === 'Baik' || i.category === 'Mahir'
  );
  const lowIndicators = raporIndicators.filter(
    (i) => i.score < 65 || i.category === 'Perlu Intervensi Khusus' || i.category === 'Dasar'
  );
  const highPriorityIndicators = raporIndicators.filter((i) => i.priorityLevel === 'Tinggi');

  const totalPlannedBudget = rkasItems.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalRealizedBudget = rkasItems.reduce((acc, curr) => acc + (curr.realizedAmount || 0), 0);
  const remainingBudget = totalPlannedBudget - totalRealizedBudget;
  const realizationPercent = totalPlannedBudget > 0 ? (totalRealizedBudget / totalPlannedBudget) * 100 : 0;

  const completedPrograms = principalPrograms.filter((p) => p.status === 'Selesai').length;
  const ongoingPrograms = principalPrograms.filter((p) => p.status === 'Sedang berjalan').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: School Profile & Filter */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-300 mb-1">
            <span>IKHTISAR UTAMA MUTU SEKOLAH</span>
            <span>·</span>
            <span>{schoolProfile.stage} {schoolProfile.status}</span>
            <span>·</span>
            <span className="font-semibold text-amber-300">AKREDITASI {schoolProfile.accreditationGrade}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {schoolProfile.name}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl line-clamp-2">
            {schoolProfile.vision}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-emerald-200/90 font-mono">
            <span>NPSN: {schoolProfile.npsn}</span>
            <span>·</span>
            <span>{schoolProfile.district}, {schoolProfile.city}</span>
            <span>·</span>
            <span>{schoolProfile.totalStudents} Siswa</span>
            <span>·</span>
            <span>{schoolProfile.totalTeachers} Guru</span>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs text-white px-2.5 py-1.5 font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="2024" className="bg-slate-900 text-white">Data 2024</option>
              <option value="2025" className="bg-slate-900 text-white">Data 2025 (Aktif)</option>
              <option value="2026" className="bg-slate-900 text-white">Target 2026</option>
            </select>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as any)}
              className="bg-transparent text-xs text-white px-2 py-1.5 font-medium rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="Ganjil" className="bg-slate-900 text-white">Semester Ganjil</option>
              <option value="Genap" className="bg-slate-900 text-white">Semester Genap</option>
            </select>
          </div>

          <button
            onClick={onTriggerAIAnalysis}
            disabled={isAILoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isAILoading ? 'Menganalisis...' : 'Analisis AI Otomatis'}</span>
          </button>
        </div>
      </div>

      {/* Row 1: 4 Key Metric Clusters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Mutu Rapor Pendidikan */}
        <div
          onClick={() => onNavigate('analisis-rapor')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Analisis Mutu Rapor</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {raporIndicators.length}
            </span>
            <span className="text-xs text-slate-500">Indikator Teranalisis</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {goodIndicators.length} Capaian Baik
            </span>
            <span className="text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {lowIndicators.length} Perlu Benahi
            </span>
          </div>
        </div>

        {/* Metric 2: Rantai PBD (Identifikasi -> Refleksi -> Benahi) */}
        <div
          onClick={() => onNavigate('identifikasi-masalah')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Perencanaan PBD</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {problems.length}
            </span>
            <span className="text-xs text-slate-500">Masalah Prioritas</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{rootCauses.length} Akar Masalah (5-Why)</span>
            <span>·</span>
            <span className="text-emerald-700 font-medium">{recommendations.length} Rekomendasi</span>
          </div>
        </div>

        {/* Metric 3: Dokumen & Anggaran RKAS */}
        <div
          onClick={() => onNavigate('generator-rkas')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alokasi BOSP & RKAS</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 tabular-nums truncate">
              Rp {totalPlannedBudget.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Realisasi:</span>
            <span className="font-semibold text-emerald-700 font-mono tabular-nums">
              {realizationPercent.toFixed(1)}% (Rp {totalRealizedBudget.toLocaleString('id-ID')})
            </span>
          </div>
        </div>

        {/* Metric 4: Keterlaksanaan Program & Mutu */}
        <div
          onClick={() => onNavigate('program-kepsek')}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Program Kepala Sekolah</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {principalPrograms.length}
            </span>
            <span className="text-xs text-slate-500">Program Terintegrasi</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">{completedPrograms} Selesai</span>
            <span>·</span>
            <span className="text-amber-700 font-medium">{ongoingPrograms} Berjalan</span>
          </div>
        </div>
      </div>

      {/* Row 2: Visualisasi Capaian Rapor & Analisis Kesenjangan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Bar Chart of Major Indicators */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Capaian Indikator Prioritas Rapor Pendidikan (Tahun {selectedYear})
              </h2>
              <p className="text-xs text-slate-500">
                Membandingkan capaian aktual sekolah terhadap target ketuntasan (skor 70) dan rata-rata nasional
              </p>
            </div>
            <button
              onClick={() => onNavigate('analisis-rapor')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Detail Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bar Chart Representation */}
          <div className="space-y-3 pt-2">
            {raporIndicators.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center space-y-3">
                <div className="text-sm font-bold text-slate-800">
                  Belum Ada Data Indikator Rapor Pendidikan
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Silakan unggah file Excel Rapor Pendidikan resmi sekolah Anda untuk menampilkan analisis capaian, identifikasi masalah, dan rekomendasi pembenahan secara otomatis.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('impor-rapor')}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Impor Excel Rapor Pendidikan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              raporIndicators.slice(0, 7).map((ind) => {
                const score = ind.score;
                const isHigh = score >= 70;
                const isModerate = score >= 60 && score < 70;

                return (
                  <div key={ind.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-mono font-semibold text-slate-500">{ind.code}</span>
                        <span className="text-slate-800 font-medium truncate">{ind.name}</span>
                        <span className="text-[11px] text-slate-500">({ind.dimension})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono text-xs tabular-nums">
                        <span
                          className={`font-bold ${
                            isHigh ? 'text-emerald-700' : isModerate ? 'text-amber-700' : 'text-rose-600'
                          }`}
                        >
                          {score.toFixed(1)}
                        </span>
                        <span
                          className={`text-[11px] flex items-center ${
                            ind.changeFromLastYear >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {ind.changeFromLastYear >= 0 ? (
                            <TrendingUp className="w-3 h-3 inline mr-0.5" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline mr-0.5" />
                          )}
                          {ind.changeFromLastYear > 0 ? `+${ind.changeFromLastYear}` : ind.changeFromLastYear}
                        </span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                      {/* Target 70 line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                        style={{ left: '70%' }}
                        title="Garis Standar Ketuntasan (70.0)"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh
                            ? 'bg-emerald-600'
                            : isModerate
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Baik (&ge; 70)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sedang (60 - 69.9)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Kurang / Intervensi (&lt; 60)
              </span>
            </div>
            <span>Garis abu-abu = Target Ketuntasan Nasional (70.0)</span>
          </div>
        </div>

        {/* Right Column: Status Integrasi 8 SNP & Akreditasi */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Kesiapan Akreditasi & 8 SNP</h2>
            <button
              onClick={() => onNavigate('integrasi-akreditasi')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              Lihat Instrumen
            </button>
          </div>

          {/* Akreditasi Card */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-emerald-950">Status Kesiapan Akreditasi</span>
              <span className="text-xs font-bold text-emerald-800 px-2 py-0.5 bg-emerald-100 rounded-md">
                {db.accreditationData.filter((a) => a.readinessStatus === 'Sangat Siap').length > 0
                  ? `Akreditasi ${schoolProfile.accreditationGrade}`
                  : 'Perlu Pemetaan'}
              </span>
            </div>
            <div className="text-xs text-emerald-800/90 leading-relaxed">
              Instrumen BAN-PDM berbasis 4 komponen ({db.accreditationData.length} butir) dipetakan dengan status bukti fisik dan digital sekolah.
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-emerald-700 font-mono">
              <span>{db.accreditationData.filter((a) => a.readinessStatus === 'Sangat Siap').length} dari {db.accreditationData.length} Butir Sangat Siap</span>
              <button
                onClick={() => onNavigate('integrasi-akreditasi')}
                className="underline hover:text-emerald-900"
              >
                Cek Bukti Unggah
              </button>
            </div>
          </div>

          {/* 8 SNP Progress Overview */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">Keterpenuhan 8 Standar Nasional:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(db.snpData.length >= 4 ? db.snpData.slice(0, 4) : db.snpData).map((std) => (
                <div key={std.standardNumber} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500 text-[11px] truncate">{std.standardName}</div>
                  <div className="font-bold text-slate-800 mt-0.5 tabular-nums">
                    {std.compliancePercentage}% Kepatuhan
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Jump to Induk Documents */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2">Status Dokumen Perencanaan:</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Dokumen RKJM ({schoolProfile.planningPeriod})</span>
                <span className="font-semibold text-emerald-700">
                  {problems.length > 0 ? 'Siap Cetak' : 'Menunggu PBD'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Rencana Kerja Tahunan (TP {schoolProfile.academicYear})</span>
                <span className="font-semibold text-emerald-700">
                  {actionPlans.length > 0 ? 'Siap Cetak' : 'Menunggu Rencana'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>RKAS / BOSP Online ARKAS</span>
                <span className="font-semibold text-emerald-700">
                  {rkasItems.length > 0 ? `${rkasItems.length} Pos Anggaran` : 'Belum Diisi'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: PBD Action Cycle (Single Source of Truth Flow) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Siklus Perencanaan Berbasis Data (PBD) Terintegrasi</span>
            </h2>
            <p className="text-xs text-slate-500">
              Prinsip: Satu Data → Analisis → Identifikasi → Refleksi 5-Why → Benahi → RKAS BOSP → Evaluasi
            </p>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            ID Masalah Aktif: <span className="font-bold text-slate-900">{problems.length} Butir</span>
          </div>
        </div>

        {/* Steps Horizontal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div
            onClick={() => onNavigate('analisis-rapor')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase">Langkah 1</div>
            <div className="font-semibold text-slate-900 text-xs mt-1">Analisis Rapor</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              {raporIndicators.length} Indikator dipetakan dengan kategori mutu.
            </p>
          </div>

          <div
            onClick={() => onNavigate('identifikasi-masalah')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono text-amber-700 font-bold uppercase">Langkah 2</div>
            <div className="font-semibold text-slate-900 text-xs mt-1">Identifikasi Masalah</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              {problems.length} Masalah prioritas (Numerasi & Literasi).
            </p>
          </div>

          <div
            onClick={() => onNavigate('refleksi-akar-masalah')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono text-purple-700 font-bold uppercase">Langkah 3</div>
            <div className="font-semibold text-slate-900 text-xs mt-1">Refleksi 5-Why</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Menemukan akar penyebab di Kombel & metode mengajar.
            </p>
          </div>

          <div
            onClick={() => onNavigate('rekomendasi-pembenahan')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono text-teal-700 font-bold uppercase">Langkah 4</div>
            <div className="font-semibold text-slate-900 text-xs mt-1">Benahi 1, 2, 3</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              {recommendations.length} Program (Non-anggaran & belanja BOSP).
            </p>
          </div>

          <div
            onClick={() => onNavigate('generator-rkas')}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="text-[10px] font-mono text-blue-700 font-bold uppercase">Langkah 5</div>
            <div className="font-semibold text-slate-900 text-xs mt-1">Masuk ke RKAS</div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Terkunci otomatis ke ARKAS sesuai juknis Permendikdasmen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
