import React from 'react';
import { UserProfile, UserRole } from '../../types';
import { Users, Shield, Check, X, ShieldAlert, Key } from 'lucide-react';

interface HakAksesViewProps {
  currentUser: UserProfile;
  onChangeUserRole: (role: UserRole) => void;
}

export const HakAksesView: React.FC<HakAksesViewProps> = ({
  currentUser,
  onChangeUserRole,
}) => {
  const rolesInfo: {
    role: UserRole;
    title: string;
    description: string;
    badge: string;
  }[] = [
    {
      role: 'super_admin',
      title: 'Super Admin / Pengawas Pembina',
      description: 'Mengelola seluruh satuan pendidikan, audit log, konfigurasi pusat regulasi, dan supervisi terpusat.',
      badge: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    {
      role: 'admin_sekolah',
      title: 'Admin Sekolah / Operator Dapodik',
      description: 'Mengelola identitas fisik sekolah, data pendukung, fasilitas impor Excel Rapor Pendidikan, dan arsip dokumen.',
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      role: 'kepala_sekolah',
      title: 'Kepala Sekolah (Principal)',
      description: 'Akses penuh seluruh modul, memvalidasi hasil analisis AI, menyetujui program kerja, mengesahkan dokumen RKJM, RKT, RKAS.',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      role: 'guru_tpmps',
      title: 'Guru / Tim Pengembang Sekolah (TPMPS)',
      description: 'Menganalisis Rapor Pendidikan, menyusun refleksi akar masalah, merancang program mutu literasi/numerasi, dan melengkapi bukti pelaksanaan.',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      role: 'bendahara',
      title: 'Bendahara BOSP',
      description: 'Mengakses modul penganggaran RKAS/ARKAS, memantau batas belanja juknis BOSP, dan mencatat realisasi anggaran belanja.',
      badge: 'bg-teal-50 text-teal-800 border-teal-200',
    },
  ];

  const permissionMatrix: {
    moduleName: string;
    super_admin: boolean;
    admin_sekolah: boolean;
    kepala_sekolah: boolean;
    guru_tpmps: boolean;
    bendahara: boolean;
  }[] = [
    { moduleName: 'Identitas & Data Pendukung', super_admin: true, admin_sekolah: true, kepala_sekolah: true, guru_tpmps: false, bendahara: false },
    { moduleName: 'Impor Excel Rapor Pendidikan', super_admin: true, admin_sekolah: true, kepala_sekolah: true, guru_tpmps: true, bendahara: false },
    { moduleName: 'Analisis PBD & 5-Why AI', super_admin: true, admin_sekolah: false, kepala_sekolah: true, guru_tpmps: true, bendahara: false },
    { moduleName: 'Generator RKJM & RKT', super_admin: true, admin_sekolah: false, kepala_sekolah: true, guru_tpmps: true, bendahara: false },
    { moduleName: 'Generator RKAS / BOSP', super_admin: true, admin_sekolah: false, kepala_sekolah: true, guru_tpmps: false, bendahara: true },
    { moduleName: 'Program Kepala Sekolah & Supervisi', super_admin: true, admin_sekolah: false, kepala_sekolah: true, guru_tpmps: true, bendahara: false },
    { moduleName: 'Pengesahan Dokumen Resmi', super_admin: true, admin_sekolah: false, kepala_sekolah: true, guru_tpmps: false, bendahara: false },
    { moduleName: 'Pusat Regulasi & Landasan Hukum', super_admin: true, admin_sekolah: true, kepala_sekolah: true, guru_tpmps: true, bendahara: true },
    { moduleName: 'Backup & Restore Database', super_admin: true, admin_sekolah: true, kepala_sekolah: true, guru_tpmps: false, bendahara: false },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <span>7.2 Hak Akses Pengguna & Matriks Kewenangan (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based Access Control (RBAC) menjamin keamanan data dan pemisahan tugas antara Pengawas, Kepala Sekolah, Operator, Guru TPMPS, dan Bendahara.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-700" />
          <span className="text-emerald-950 font-semibold">
            Akun Aktif Saat Ini: <span className="font-bold text-emerald-800">{currentUser.name}</span> ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Role Cards with Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rolesInfo.map((item) => {
          const isCurrent = currentUser.role === item.role;

          return (
            <div
              key={item.role}
              className={`bg-white rounded-xl border p-5 space-y-3 transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.badge}`}>
                    {item.role.toUpperCase()}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Sedang Dipakai
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                {!isCurrent ? (
                  <button
                    onClick={() => onChangeUserRole(item.role)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg transition-colors"
                  >
                    Beralih ke Peran Ini
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">Peran Aktif</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Matriks Kewenangan Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Matriks Hak Akses & Kewenangan Modul Aplikasi (RBAC Matrix)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Modul Aplikasi</th>
                <th className="py-2.5 px-3 text-center w-28">Super Admin</th>
                <th className="py-2.5 px-3 text-center w-28">Admin Sekolah</th>
                <th className="py-2.5 px-3 text-center w-28">Kepala Sekolah</th>
                <th className="py-2.5 px-3 text-center w-28">Guru TPMPS</th>
                <th className="py-2.5 px-3 text-center w-28">Bendahara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{row.moduleName}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {row.super_admin ? <Check className="w-4 h-4 mx-auto" /> : <X className="w-4 h-4 mx-auto text-slate-300" />}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {row.admin_sekolah ? <Check className="w-4 h-4 mx-auto" /> : <X className="w-4 h-4 mx-auto text-slate-300" />}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {row.kepala_sekolah ? <Check className="w-4 h-4 mx-auto" /> : <X className="w-4 h-4 mx-auto text-slate-300" />}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {row.guru_tpmps ? <Check className="w-4 h-4 mx-auto" /> : <X className="w-4 h-4 mx-auto text-slate-300" />}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {row.bendahara ? <Check className="w-4 h-4 mx-auto" /> : <X className="w-4 h-4 mx-auto text-slate-300" />}
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
