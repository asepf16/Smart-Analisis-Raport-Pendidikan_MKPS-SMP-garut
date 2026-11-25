import React, { useState } from 'react';
import { ActionPlanItem, RKASItem, SchoolProfile } from '../../types';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileCheck,
  Printer,
  Sparkles,
} from 'lucide-react';

interface MonevDashboardViewProps {
  actionPlans: ActionPlanItem[];
  rkasItems: RKASItem[];
  schoolProfile: SchoolProfile;
}

export const MonevDashboardView: React.FC<MonevDashboardViewProps> = ({
  actionPlans,
  rkasItems,
  schoolProfile,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'bulan' | 'semester' | 'tahunan'>('semester');

  const totalPrograms = actionPlans.length;
  const completed = actionPlans.filter((a) => a.status === 'Selesai').length;
  const ongoing = actionPlans.filter((a) => a.status === 'Sedang dilaksanakan').length;
  const planned = actionPlans.filter((a) => a.status === 'Direncanakan').length;
  const needFollowUp = actionPlans.filter((a) => a.status === 'Perlu tindak lanjut').length;

  const totalBudgetPlanned = rkasItems.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalBudgetRealized = rkasItems.reduce((acc, curr) => acc + (curr.realizedAmount || 0), 0);
  const budgetRealizationRate = totalBudgetPlanned > 0 ? (totalBudgetRealized / totalBudgetPlanned) * 100 : 0;
  const programCompletionRate = totalPrograms > 0 ? (completed / totalPrograms) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-700" />
            <span>6.1 Dashboard Monitoring & Evaluasi Keterlaksanaan Program (Monev)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis kesenjangan antara rencana program PBD dan realisasi lapangan serta penyerapan anggaran BOSP pada {schoolProfile.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center text-xs">
            <button
              onClick={() => setSelectedPeriod('bulan')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedPeriod === 'bulan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setSelectedPeriod('semester')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedPeriod === 'semester' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semesteran
            </button>
            <button
              onClick={() => setSelectedPeriod('tahunan')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                selectedPeriod === 'tahunan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tahunan
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Monev</span>
          </button>
        </div>
      </div>

      {/* KPI 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Tingkat Penyelesaian Program</div>
          <div className="font-bold text-emerald-800 text-xl mt-1 font-mono tabular-nums">
            {programCompletionRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {completed} dari {totalPrograms} kegiatan selesai
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Realisasi Anggaran BOSP</div>
          <div className="font-bold text-slate-900 text-xl mt-1 font-mono tabular-nums">
            {budgetRealizationRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Rp {totalBudgetRealized.toLocaleString('id-ID')} terserap
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Kegiatan On-Track (Sedang Berjalan)</div>
          <div className="font-bold text-blue-700 text-xl mt-1 font-mono tabular-nums">
            {ongoing}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sesuai linimasa kalender</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl">
          <div className="text-slate-500 text-[11px] font-semibold uppercase">Perlu Tindak Lanjut Khusus</div>
          <div className="font-bold text-amber-700 text-xl mt-1 font-mono tabular-nums">
            {needFollowUp}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Membutuhkan pembinaan Kepala Sekolah</div>
        </div>
      </div>

      {/* Detailed Status Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Laporan Keterlaksanaan Program & Bukti Pelaksanaan
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Nama Kegiatan</th>
                <th className="py-2.5 px-3 w-32">PIC</th>
                <th className="py-2.5 px-3 w-32">Target Mutu</th>
                <th className="py-2.5 px-3 text-right w-28">Pagu Anggaran</th>
                <th className="py-2.5 px-3 text-right w-28">Realisasi</th>
                <th className="py-2.5 px-3 w-28">Status</th>
                <th className="py-2.5 px-3 min-w-[200px]">Bukti Fisik & Catatan Kendala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actionPlans.map((act, idx) => (
                <tr key={act.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{act.activityName}</td>
                  <td className="py-3 px-3 text-slate-600">{act.pic}</td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">{act.target}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                    Rp {act.budgetAllocated.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 tabular-nums">
                    Rp {(act.actualBudgetSpent || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        act.status === 'Selesai'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : act.status === 'Sedang dilaksanakan'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {act.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    {act.evidenceNotes || 'Bukti pelaksanaan tersimpan di arsip dokumen sekolah.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
