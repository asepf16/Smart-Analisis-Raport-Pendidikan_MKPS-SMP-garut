import React, { useState } from 'react';
import { AuditLogItem, SchoolProfile } from '../../types';
import {
  Shield,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
} from 'lucide-react';
import { StorageService } from '../../services/storageService';

interface KeamananBackupViewProps {
  auditLogs: AuditLogItem[];
  schoolProfile: SchoolProfile;
  onRefreshData: () => void;
}

export const KeamananBackupView: React.FC<KeamananBackupViewProps> = ({
  auditLogs,
  schoolProfile,
  onRefreshData,
}) => {
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetSimConfirm, setShowResetSimConfirm] = useState(false);

  const handleExportBackup = () => {
    try {
      const jsonStr = StorageService.exportFullBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_SMART_RAPOR_${schoolProfile.npsn}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ type: 'success', text: 'Cadangan database lengkap berhasil diunduh ke komputer Anda.' });
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: `Gagal membuat cadangan: ${e.message}` });
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const ok = StorageService.restoreFullBackupJSON(content);
        if (ok) {
          setStatusMsg({
            type: 'success',
            text: 'Database sekolah berhasil dipulihkan dari file cadangan! Data telah disegarkan.',
          });
          onRefreshData();
        } else {
          setStatusMsg({ type: 'error', text: 'File cadangan rusak atau format tidak cocok.' });
        }
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: `Gagal memulihkan cadangan: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmResetToSimulation = () => {
    StorageService.resetToSimulationData();
    onRefreshData();
    setShowResetSimConfirm(false);
    setStatusMsg({
      type: 'success',
      text: `Ruang kerja ${schoolProfile.name} telah diisi ulang dengan Data Simulasi Standar Kemendikdasmen.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>7.3 Keamanan Sistem, Audit Log, dan Cadangan Data (Backup & Restore)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan riwayat aktivitas pengguna (audit trail), ekspor cadangan database terstruktur, dan pemulihan data instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Cadangan Lengkap (.json)</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
              : 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Backup and Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Restore Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Pulihkan Database dari Cadangan (Restore)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Unggah file backup (.json) yang sebelumnya telah Anda unduh untuk mengembalikan kondisi seluruh dokumen, anggaran, identitas, dan analisis PBD.
          </p>

          <div>
            <label className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap">
              <Upload className="w-4 h-4" />
              <span>Pilih File Backup (.json)</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreFile}
              />
            </label>
          </div>
        </div>

        {/* Reset Simulation Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <span>Muat Data Simulasi Resmi Kemendikdasmen</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Isi ruang kerja <strong>{schoolProfile.name}</strong> dengan contoh data Rapor Pendidikan, akar masalah, dan RKAS resmi untuk keperluan uji coba atau pelatihan (identitas pengguna & sekolah Anda tetap dipertahankan).
          </p>

          {!showResetSimConfirm ? (
            <button
              onClick={() => setShowResetSimConfirm(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>Muat Data Simulasi ke Sekolah Ini</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-amber-900">Timpa data analisis & RKAS saat ini dengan data contoh?</span>
              <button
                onClick={handleConfirmResetToSimulation}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg whitespace-nowrap"
              >
                Ya, Muat Ulang
              </button>
              <button
                onClick={() => setShowResetSimConfirm(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg whitespace-nowrap"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audit Trail Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Log Audit Aktivitas Pengguna (Audit Trail)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {auditLogs.length} Rekam Aktivitas Terbaru
          </span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-40">Waktu (WIB)</th>
                <th className="py-2.5 px-3 w-44">Nama Pengguna</th>
                <th className="py-2.5 px-3 w-28">Peran</th>
                <th className="py-2.5 px-3 w-36">Tindakan</th>
                <th className="py-2.5 px-3 w-36">Modul Terkait</th>
                <th className="py-2.5 px-3">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">{log.userName}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-800">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-emerald-800">{log.action}</td>
                  <td className="py-2 px-3 text-slate-600">{log.moduleName}</td>
                  <td className="py-2 px-3 text-slate-600 text-[11px]">{log.details}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
