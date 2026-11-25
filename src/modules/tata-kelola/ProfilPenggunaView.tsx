import React, { useState, useEffect } from 'react';
import { SchoolProfile, UserProfile, UserRole } from '../../types';
import {
  UserCheck,
  Building2,
  Save,
  CheckCircle2,
  UserPlus,
  Mail,
  Phone,
  IdCard,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { NavMenuId } from '../../components/layout/Sidebar';

interface ProfilPenggunaViewProps {
  currentUser: UserProfile;
  schoolProfile: SchoolProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigate: (menu: NavMenuId) => void;
  onResetRegistration: () => void;
}

export const ProfilPenggunaView: React.FC<ProfilPenggunaViewProps> = ({
  currentUser,
  schoolProfile,
  onUpdateUser,
  onNavigate,
  onResetRegistration,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [role, setRole] = useState<UserRole>(currentUser.role);
  const [nip, setNip] = useState(currentUser.nip || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [positionTitle, setPositionTitle] = useState(currentUser.positionTitle || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setRole(currentUser.role);
    setNip(currentUser.nip || '');
    setPhone(currentUser.phone || '');
    setPositionTitle(currentUser.positionTitle || '');
  }, [currentUser]);

  const roleLabels: Record<UserRole, string> = {
    kepala_sekolah: 'Kepala Sekolah',
    guru_tpmps: 'Guru / Tim TPMPS',
    admin_sekolah: 'Admin Sekolah / Operator',
    bendahara: 'Bendahara BOSP',
    super_admin: 'Pengawas Pembina / Super Admin',
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onUpdateUser({
      ...currentUser,
      name: name.trim(),
      email: email.trim(),
      role,
      nip: nip.trim() || undefined,
      phone: phone.trim() || undefined,
      positionTitle: positionTitle.trim() || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            <span>7.1 Identitas & Profil Pengguna Aplikasi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aplikasi menggunakan model pengguna tunggal otomatis: identitas yang Anda isikan menjadi akun aktif dan pemilik ruang kerja satuan pendidikan ini.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ganti Pengguna / Daftar Identitas Baru</span>
        </button>
      </div>

      {/* Inline Reset Confirmation Banner */}
      {showResetConfirm && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-amber-950">
                Konfirmasi Daftar Ulang Pengguna & Satuan Pendidikan Baru
              </div>
              <p className="text-amber-900 leading-relaxed">
                Tindakan ini akan menutup sesi pengguna saat ini dan membuka formulir registrasi identitas baru untuk pengguna berikutnya. Pastikan Anda sudah mencadangkan data (.json) di menu Keamanan & Backup jika masih diperlukan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onResetRegistration}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg whitespace-nowrap"
            >
              Ya, Daftar Pengguna Baru
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User Edit Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Data Identitas Pengguna Aktif
            </h2>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profil Tersimpan</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Pengguna *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Peran / Hak Akses Aktif</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="kepala_sekolah">Kepala Sekolah</option>
                <option value="guru_tpmps">Guru / Tim TPMPS</option>
                <option value="admin_sekolah">Admin Sekolah / Operator</option>
                <option value="bendahara">Bendahara BOSP</option>
                <option value="super_admin">Pengawas Pembina / Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">NIP / NUPTK</label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Opsional"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Jabatan / Keterangan Tugas</label>
              <input
                type="text"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="Misal: Ketua TPMPS / Kepala Sekolah"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Opsional"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              Terdaftar: {currentUser.registeredAt ? new Date(currentUser.registeredAt).toLocaleString('id-ID') : 'Sesi Aktif'}
            </span>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Profil</span>
            </button>
          </div>
        </form>

        {/* Right: Active User & Bound School Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</div>
                <div className="text-xs font-medium text-emerald-700">
                  {roleLabels[currentUser.role] || currentUser.role}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              {currentUser.nip && (
                <div className="flex items-center gap-2 font-mono">
                  <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>NIP {currentUser.nip}</span>
                </div>
              )}
              {currentUser.phone && (
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{currentUser.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Satuan Pendidikan Terhubung</span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">{schoolProfile.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                NPSN {schoolProfile.npsn} · {schoolProfile.stage} {schoolProfile.status}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {schoolProfile.city}, {schoolProfile.province} · TP {schoolProfile.academicYear}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('identitas-sekolah')}
              className="w-full px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>Kelola Identitas Lengkap Sekolah</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
