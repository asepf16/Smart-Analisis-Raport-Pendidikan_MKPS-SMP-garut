import React, { useState } from 'react';
import { SchoolProfile, SNPStandardItem } from '../../types';
import { Layers, ShieldCheck, Building2, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';

interface IntegrasiSNPViewProps {
  snpData: SNPStandardItem[];
  schoolProfile?: SchoolProfile;
  onUpdateSnp?: (updated: SNPStandardItem[]) => void;
  onSyncFromPbd?: () => void;
}

export const IntegrasiSNPView: React.FC<IntegrasiSNPViewProps> = ({
  snpData,
  schoolProfile,
  onUpdateSnp,
  onSyncFromPbd,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [newStdNumber, setNewStdNumber] = useState<number>(snpData.length + 1);
  const [newStdName, setNewStdName] = useState('');
  const [newActual, setNewActual] = useState('');
  const [newGap, setNewGap] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newProgramsText, setNewProgramsText] = useState('');
  const [newCompliance, setNewCompliance] = useState(75);

  const avgCompliance =
    snpData.length > 0
      ? Math.round(snpData.reduce((acc, curr) => acc + curr.compliancePercentage, 0) / snpData.length)
      : 0;

  const handleSync = () => {
    if (!onSyncFromPbd) return;
    onSyncFromPbd();
    setSyncNotice('Pemetaan 8 SNP berhasil disinkronkan secara presisi dengan data Rapor Pendidikan & PBD terkini.');
  };

  const handleDelete = (indexToRemove: number) => {
    if (!onUpdateSnp) return;
    onUpdateSnp(snpData.filter((_, idx) => idx !== indexToRemove));
    setDeleteConfirmIdx(null);
  };

  const handleComplianceChange = (indexToEdit: number, value: number) => {
    if (!onUpdateSnp) return;
    onUpdateSnp(
      snpData.map((item, idx) =>
        idx === indexToEdit ? { ...item, compliancePercentage: Math.min(100, Math.max(0, value)) } : item
      )
    );
  };

  const handleAddStandard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSnp) return;
    const programs = newProgramsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newItem: SNPStandardItem = {
      standardNumber: newStdNumber || snpData.length + 1,
      standardName: newStdName.trim(),
      actualCondition: newActual.trim(),
      gapAnalysis: newGap.trim() || 'Perlu penguatan implementasi berkelanjutan.',
      targetImprovement: newTarget.trim() || 'Mencapai standar mutu minimal 90%.',
      relatedPrograms: programs.length > 0 ? programs : ['Program Terintegrasi Sekolah'],
      compliancePercentage: Math.min(100, Math.max(0, newCompliance)),
    };

    onUpdateSnp([...snpData, newItem]);
    setShowAddModal(false);
    setNewStdNumber(snpData.length + 2);
    setNewStdName('');
    setNewActual('');
    setNewGap('');
    setNewTarget('');
    setNewProgramsText('');
    setNewCompliance(75);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          {schoolProfile && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md mb-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{schoolProfile.name}</span>
              <span className="text-emerald-400">·</span>
              <span className="font-mono">NPSN {schoolProfile.npsn}</span>
            </div>
          )}
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <span>4.1 Integrasi 8 Standar Nasional Pendidikan (SNP)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Merujuk PP No. 57 Tahun 2021 jo PP No. 4 Tahun 2022. Memetakan hasil analisis Rapor Pendidikan dan rekomendasi PBD ke dalam delapan pilar standar mutu {schoolProfile ? schoolProfile.name : 'satuan pendidikan'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="text-emerald-900 font-semibold whitespace-nowrap">
              Rata-rata SNP: <span className="font-mono text-sm">{avgCompliance}%</span>
            </span>
          </div>

          {onSyncFromPbd && (
            <button
              type="button"
              onClick={handleSync}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan dari PBD</span>
            </button>
          )}

          {onUpdateSnp && (
            <button
              type="button"
              onClick={() => {
                setNewStdNumber(snpData.length + 1);
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Standar / Indikator</span>
            </button>
          )}
        </div>
      </div>

      {syncNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-emerald-700 font-bold text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 8 SNP Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {snpData.map((std, idx) => (
          <div
            key={`${std.standardNumber}-${idx}`}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded whitespace-nowrap">
                  STANDAR {std.standardNumber}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 font-mono tabular-nums whitespace-nowrap">
                    {std.compliancePercentage}% Terpenuhi
                  </span>
                  {onUpdateSnp && (
                    deleteConfirmIdx === idx ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(idx)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 whitespace-nowrap"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmIdx(null)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 whitespace-nowrap"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmIdx(idx)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                        title="Hapus standar ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>

              <h2 className="text-sm font-bold text-slate-900">
                {std.standardName}
              </h2>

              {/* Progress bar + optional quick adjust slider */}
              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${std.compliancePercentage}%` }}
                  />
                </div>
                {onUpdateSnp && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={std.compliancePercentage}
                    onChange={(e) => handleComplianceChange(idx, parseInt(e.target.value) || 0)}
                    className="w-full accent-emerald-600 cursor-pointer h-1.5"
                    title="Sesuaikan persentase keterpenuhan standar"
                  />
                )}
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block text-[11px]">Kondisi Aktual:</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{std.actualCondition}</p>
                </div>

                <div>
                  <span className="font-bold text-rose-700 block text-[11px]">Analisis Kesenjangan:</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{std.gapAnalysis}</p>
                </div>

                <div>
                  <span className="font-bold text-emerald-800 block text-[11px]">Target Pemenuhan:</span>
                  <p className="text-slate-800 font-medium leading-relaxed text-[11px]">{std.targetImprovement}</p>
                </div>
              </div>
            </div>

            {/* Related Programs */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Program Terintegrasi PBD & RKAS:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {std.relatedPrograms.map((prog, pIdx) => (
                  <span
                    key={pIdx}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium"
                  >
                    {prog}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {snpData.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          Belum ada pemetaan SNP. Klik &quot;Sinkronkan dari PBD&quot; atau &quot;Tambah Standar / Indikator&quot; di atas.
        </div>
      )}

      {/* Modal Tambah Standar SNP */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Pemetaan Standar / Kekhasan Sekolah</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddStandard} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nomor Standar</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newStdNumber}
                    onChange={(e) => setNewStdNumber(parseInt(e.target.value) || 9)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Nama Standar / Fokus Mutu *</label>
                  <input
                    type="text"
                    required
                    value={newStdName}
                    onChange={(e) => setNewStdName(e.target.value)}
                    placeholder="Contoh: Standar Kekhasan Sekolah / Adiwiyata"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kondisi Aktual *</label>
                <textarea
                  rows={2}
                  required
                  value={newActual}
                  onChange={(e) => setNewActual(e.target.value)}
                  placeholder="Deskripsi kondisi mutu aktual satuan pendidikan..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Analisis Kesenjangan</label>
                <textarea
                  rows={2}
                  value={newGap}
                  onChange={(e) => setNewGap(e.target.value)}
                  placeholder="Kesenjangan yang perlu ditangani melalui PBD..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Target Pemenuhan</label>
                  <input
                    type="text"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="Target ketercapaian 1 tahun ke depan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Keterpenuhan (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCompliance}
                    onChange={(e) => setNewCompliance(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Program Terintegrasi (pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={newProgramsText}
                  onChange={(e) => setNewProgramsText(e.target.value)}
                  placeholder="Contoh: Kombel Mingguan, Pengadaan Media Belajar"
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
                  Simpan Standar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
