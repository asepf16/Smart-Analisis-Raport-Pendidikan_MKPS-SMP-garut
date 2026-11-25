import React, { useMemo, useState } from 'react';
import { AccreditationItem, SchoolProfile } from '../../types';
import { Award, CheckCircle2, Building2, Plus, Trash2, RefreshCw } from 'lucide-react';

interface AkreditasiViewProps {
  accreditationData: AccreditationItem[];
  schoolProfile?: SchoolProfile;
  onUpdateAccreditation: (updated: AccreditationItem[]) => void;
  onSyncFromPbd?: () => void;
}

const COMPONENT_LIST: AccreditationItem['component'][] = [
  'Kinerja Pendidik',
  'Kepemimpinan Kepala Sekolah',
  'Iklim Lingkungan Belajar',
  'Hasil Belajar Peserta Didik',
];

function statusScore(status: AccreditationItem['readinessStatus']): number {
  switch (status) {
    case 'Sangat Siap':
      return 100;
    case 'Siap':
      return 80;
    case 'Kurang Siap':
      return 45;
    case 'Belum Ada':
    default:
      return 10;
  }
}

export const AkreditasiView: React.FC<AkreditasiViewProps> = ({
  accreditationData,
  schoolProfile,
  onUpdateAccreditation,
  onSyncFromPbd,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [newComponent, setNewComponent] = useState<AccreditationItem['component']>('Kinerja Pendidik');
  const [newCode, setNewCode] = useState(`BUTIR-0${accreditationData.length + 1}`);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEvidenceText, setNewEvidenceText] = useState('');
  const [newStatus, setNewStatus] = useState<AccreditationItem['readinessStatus']>('Siap');
  const [newScoreTarget, setNewScoreTarget] = useState(4);

  const readinessPercent = useMemo(() => {
    if (accreditationData.length === 0) return 0;
    const sum = accreditationData.reduce((acc, a) => acc + statusScore(a.readinessStatus), 0);
    return Math.round(sum / accreditationData.length);
  }, [accreditationData]);

  const componentStats = useMemo(() => {
    return COMPONENT_LIST.map((compName, index) => {
      const items = accreditationData.filter((a) => a.component === compName);
      const avg =
        items.length > 0
          ? Math.round(items.reduce((acc, i) => acc + statusScore(i.readinessStatus), 0) / items.length)
          : 0;
      return {
        number: index + 1,
        name: compName,
        count: items.length,
        avgPercent: avg,
      };
    });
  }, [accreditationData]);

  const handleTogglePhysical = (id: string) => {
    const updated = accreditationData.map((item) =>
      item.id === id ? { ...item, physicalEvidenceUploaded: !item.physicalEvidenceUploaded } : item
    );
    onUpdateAccreditation(updated);
  };

  const handleToggleDigital = (id: string) => {
    const updated = accreditationData.map((item) =>
      item.id === id ? { ...item, digitalEvidenceUploaded: !item.digitalEvidenceUploaded } : item
    );
    onUpdateAccreditation(updated);
  };

  const handleStatusChange = (id: string, readinessStatus: AccreditationItem['readinessStatus']) => {
    onUpdateAccreditation(
      accreditationData.map((item) => (item.id === id ? { ...item, readinessStatus } : item))
    );
  };

  const handleDelete = (id: string) => {
    onUpdateAccreditation(accreditationData.filter((item) => item.id !== id));
    setDeleteConfirmId(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const evidenceList = newEvidenceText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newItem: AccreditationItem = {
      id: `manual-akred-${Date.now()}`,
      component: newComponent,
      indicatorCode: newCode.trim() || `BUTIR-${accreditationData.length + 1}`,
      indicatorTitle: newTitle.trim(),
      description: newDesc.trim() || 'Terhubung dengan dokumen perencanaan dan bukti kinerja PBD sekolah.',
      requiredEvidence:
        evidenceList.length > 0 ? evidenceList : ['Dokumen Perencanaan & Bukti Implementasi Sekolah'],
      physicalEvidenceUploaded: true,
      digitalEvidenceUploaded: false,
      readinessStatus: newStatus,
      scoreTarget: Math.min(4, Math.max(1, newScoreTarget)),
    };

    onUpdateAccreditation([...accreditationData, newItem]);
    setShowAddModal(false);
    setNewCode(`BUTIR-0${accreditationData.length + 2}`);
    setNewTitle('');
    setNewDesc('');
    setNewEvidenceText('');
  };

  const handleSync = () => {
    if (!onSyncFromPbd) return;
    onSyncFromPbd();
    setSyncNotice('Kesiapan butir Akreditasi BAN-PDM berhasil disinkronkan dari hasil PBD & RKAS terbaru.');
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
            <Award className="w-5 h-5 text-amber-500" />
            <span>4.2 Dashboard Kesiapan Akreditasi BAN-PDM Terbaru</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Berdasarkan instrumen resmi BAN-PDM. Menghubungkan setiap butir akreditasi dengan data dukung PBD dan RKAS pada {schoolProfile ? schoolProfile.name : 'satuan pendidikan'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span className="text-emerald-950 font-semibold whitespace-nowrap">
              Kesiapan: <span className="font-bold text-emerald-800">{schoolProfile?.accreditationGrade || 'A'} ({readinessPercent}%)</span>
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

          <button
            type="button"
            onClick={() => {
              setNewCode(`BUTIR-0${accreditationData.length + 1}`);
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Butir Akreditasi</span>
          </button>
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

      {/* 4 Komponen Summary (Dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {componentStats.map((stat) => (
          <div key={stat.number} className="bg-white border border-slate-200 p-4 rounded-xl">
            <div className="text-slate-500 text-[11px] font-semibold uppercase">Komponen {stat.number}</div>
            <div className="font-bold text-slate-900 mt-1">{stat.name}</div>
            <div
              className={`text-[11px] font-medium mt-1 font-mono ${
                stat.avgPercent >= 80 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {stat.count} Butir · {stat.avgPercent}% Siap
            </div>
          </div>
        ))}
      </div>

      {/* Main List of Accreditation Indicators */}
      <div className="space-y-4">
        {accreditationData.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 hover:border-emerald-300 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded text-slate-700">
                  {item.indicatorCode}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Komponen: {item.component}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={item.readinessStatus}
                  onChange={(e) => handleStatusChange(item.id, e.target.value as AccreditationItem['readinessStatus'])}
                  className={`text-xs font-bold px-2.5 py-1 rounded border focus:outline-none ${
                    item.readinessStatus === 'Sangat Siap'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : item.readinessStatus === 'Siap'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <option value="Sangat Siap">Sangat Siap (Target {item.scoreTarget})</option>
                  <option value="Siap">Siap (Target {item.scoreTarget})</option>
                  <option value="Kurang Siap">Kurang Siap</option>
                  <option value="Belum Ada">Belum Ada</option>
                </select>

                {deleteConfirmId === item.id ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 whitespace-nowrap"
                    >
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 text-[10px] font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200 whitespace-nowrap"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-1.5 rounded text-rose-500 hover:bg-rose-50"
                    title="Hapus butir akreditasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {item.indicatorTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Evidence Checklist */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Dokumen Bukti Fisik & Digital yang Wajib Disiapkan:
              </span>
              <ul className="space-y-1 text-xs text-slate-600">
                {item.requiredEvidence.map((ev, idx) => (
                  <li key={idx} className="flex items-center gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>

              {/* Status Checklist Toggles */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.physicalEvidenceUploaded}
                    onChange={() => handleTogglePhysical(item.id)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Bukti Berkas Fisik Tersedia di Ruang Akreditasi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.digitalEvidenceUploaded}
                    onChange={() => handleToggleDigital(item.id)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Bukti Digital Telah Diunggah ke Arsip Sekolah / Cloud</span>
                </label>
              </div>
            </div>
          </div>
        ))}

        {accreditationData.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            Belum ada butir akreditasi. Klik &quot;Sinkronkan dari PBD&quot; atau &quot;Tambah Butir Akreditasi&quot; di atas.
          </div>
        )}
      </div>

      {/* Modal Tambah Butir Akreditasi */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Butir Instrumen Akreditasi BAN-PDM</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Komponen Akreditasi</label>
                  <select
                    value={newComponent}
                    onChange={(e) => setNewComponent(e.target.value as AccreditationItem['component'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {COMPONENT_LIST.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kode Butir *</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="BUTIR-06"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul / Pernyataan Butir *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Sekolah mengembangkan sistem evaluasi pembelajaran berkelanjutan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Keterangan / Keterkaitan dengan PBD</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Uraian bukti ketercapaian..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Daftar Bukti Fisik & Digital (1 baris per bukti)</label>
                <textarea
                  rows={3}
                  value={newEvidenceText}
                  onChange={(e) => setNewEvidenceText(e.target.value)}
                  placeholder={'Dokumen RKT & RKAS\nDokumentasi Supervisi Kelas\nRekap Asesmen Siswa'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status Kesiapan</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AccreditationItem['readinessStatus'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Sangat Siap">Sangat Siap</option>
                    <option value="Siap">Siap</option>
                    <option value="Kurang Siap">Kurang Siap</option>
                    <option value="Belum Ada">Belum Ada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Level Skor (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={newScoreTarget}
                    onChange={(e) => setNewScoreTarget(parseInt(e.target.value) || 4)}
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
                  Simpan Butir Akreditasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
