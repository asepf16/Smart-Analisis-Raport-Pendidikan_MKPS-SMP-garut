import React, { useState } from 'react';
import { SchoolProfile, UserRole } from '../../types';
import { UserRegistrationPayload } from '../../services/storageService';
import {
  UserCheck,
  Building2,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface OnboardingIdentitasViewProps {
  onRegister: (payload: UserRegistrationPayload) => void;
}

export const OnboardingIdentitasView: React.FC<OnboardingIdentitasViewProps> = ({
  onRegister,
}) => {
  // User Identity State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('kepala_sekolah');
  const [userNip, setUserNip] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [positionTitle, setPositionTitle] = useState('');

  // School Identity State
  const [schoolName, setSchoolName] = useState('');
  const [npsn, setNpsn] = useState('');
  const [stage, setStage] = useState<SchoolProfile['stage']>('SMP');
  const [status, setStatus] = useState<SchoolProfile['status']>('Negeri');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [principalName, setPrincipalName] = useState('');
  const [totalStudents, setTotalStudents] = useState<string>('');
  const [totalTeachers, setTotalTeachers] = useState<string>('');

  // Workspace Data Mode
  const [initMode, setInitMode] = useState<'template' | 'empty'>('template');
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickFillDemo = () => {
    setUserName('Drs. Ahmad Hidayat, M.Pd.');
    setUserEmail('ahmad.hidayat@sekolah.belajar.id');
    setUserRole('kepala_sekolah');
    setUserNip('19760817 200212 1 003');
    setUserPhone('0812-3456-7890');
    setPositionTitle('Kepala Sekolah');
    setSchoolName('SMP Negeri 2 Harapan Nusantara');
    setNpsn('20219876');
    setStage('SMP');
    setStatus('Negeri');
    setCity('Kota Bandung');
    setProvince('Jawa Barat');
    setDistrict('Coblong');
    setAddress('Jl. Taman Pendidikan No. 18');
    setAcademicYear('2025/2026');
    setTotalStudents('480');
    setTotalTeachers('28');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !schoolName.trim() || !npsn.trim() || !city.trim() || !province.trim()) {
      setErrorMsg('Mohon lengkapi seluruh kolom bertanda wajib (*) terlebih dahulu.');
      return;
    }

    onRegister({
      user: {
        name: userName,
        email: userEmail,
        role: userRole,
        nip: userNip,
        phone: userPhone,
        positionTitle: positionTitle || undefined,
      },
      school: {
        name: schoolName,
        npsn,
        stage,
        status,
        city,
        province,
        district,
        address,
        academicYear,
        principalName: userRole === 'kepala_sekolah' ? userName : principalName,
        totalStudents: totalStudents ? parseInt(totalStudents, 10) : undefined,
        totalTeachers: totalTeachers ? parseInt(totalTeachers, 10) : undefined,
      },
      initMode,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Registrasi Pengguna Aplikasi Otomatis</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                SMART RAPOR PENDIDIKAN
              </h1>
              <div className="text-xs sm:text-sm font-semibold text-amber-300">
                Sistem Terintegrasi PBD &amp; Mutu · MKPS SMP Kab. Garut
              </div>
              <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
                Lengkapi identitas diri dan satuan pendidikan Anda di bawah ini. Setelah disimpan, Anda otomatis menjadi pengguna aktif aplikasi dan seluruh dokumen PBD, RKJM, RKT, serta RKAS akan terhubung dengan identitas sekolah Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={handleQuickFillDemo}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors whitespace-nowrap shrink-0 self-start md:self-center"
            >
              Isi Contoh Cepat (Uji Coba)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium px-4 py-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Identitas Pengguna */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">1. Identitas Pengguna Aplikasi</h2>
                  <p className="text-xs text-slate-500">Data Anda akan aktif sebagai pengguna utama sistem.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Contoh: Dra. Siti Nurjanah, M.Pd."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Aktif / Akun Belajar.id *</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="nama@sekolah.belajar.id"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Peran / Kewenangan di Sekolah *</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none font-medium text-slate-800"
                >
                  <option value="kepala_sekolah">Kepala Sekolah (Akses Penuh & Pengesahan)</option>
                  <option value="guru_tpmps">Guru / Ketua Tim TPMPS</option>
                  <option value="admin_sekolah">Admin Sekolah / Operator Dapodik</option>
                  <option value="bendahara">Bendahara BOSP / RKAS</option>
                  <option value="super_admin">Pengawas Pembina / Manajemen Mutu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP / NUPTK (Opsional)</label>
                <input
                  type="text"
                  value={userNip}
                  onChange={(e) => setUserNip(e.target.value)}
                  placeholder="19760817 200212 1 003"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jabatan / Keterangan Tugas (Opsional)</label>
                <input
                  type="text"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  placeholder="Misal: Wakil Kepala Sekolah Bidang Kurikulum"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp (Opsional)</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Identitas Satuan Pendidikan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">2. Identitas Satuan Pendidikan</h2>
                <p className="text-xs text-slate-500">Digunakan otomatis untuk kop dokumen, analisis Rapor Pendidikan, dan RKAS.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nama Satuan Pendidikan *</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SD Negeri 01 Sukamaju / SMP Negeri 2 Bandung"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NPSN *</label>
                <input
                  type="text"
                  required
                  value={npsn}
                  onChange={(e) => setNpsn(e.target.value)}
                  placeholder="20104829"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenjang *</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as SchoolProfile['stage'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="SD">SD / MI</option>
                  <option value="SMP">SMP / MTs</option>
                  <option value="SMA">SMA / MA</option>
                  <option value="SMK">SMK</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Sekolah *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SchoolProfile['status'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="Negeri">Negeri</option>
                  <option value="Swasta">Swasta</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025/2026"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kabupaten / Kota *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Kota Bandung"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Provinsi *</label>
                <input
                  type="text"
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Contoh: Jawa Barat"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kecamatan (Opsional)</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Nama Kecamatan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {userRole !== 'kepala_sekolah' && (
                <div className="md:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Kepala Sekolah (Untuk Pengesahan Dokumen)</label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="Nama Lengkap Kepala Sekolah beserta gelar"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="md:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Estimasi Jumlah Siswa (Opsional)</label>
                <input
                  type="number"
                  min={0}
                  value={totalStudents}
                  onChange={(e) => setTotalStudents(e.target.value)}
                  placeholder="Contoh: 480"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Estimasi Jumlah Guru (Opsional)</label>
                <input
                  type="number"
                  min={0}
                  value={totalTeachers}
                  onChange={(e) => setTotalTeachers(e.target.value)}
                  placeholder="Contoh: 28"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block font-semibold text-slate-700 mb-1">Alamat Jalan (Opsional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Pendidikan No. 1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Pilihan Data Awal */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">3. Inisialisasi Data Ruang Kerja</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <button
                type="button"
                onClick={() => setInitMode('template')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  initMode === 'template'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${initMode === 'template' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Sertakan Data Contoh Rapor & RKAS</span>
                    {initMode === 'template' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Cocok untuk langsung mempelajari alur PBD, analisis AI, dan contoh dokumen. Anda tetap dapat menimpa data kapan saja dengan Impor Excel Rapor sekolah Anda.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInitMode('empty')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  initMode === 'empty'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 shrink-0 mt-0.5 ${initMode === 'empty' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>Mulai Ruang Kerja Kosong (Siap Impor Excel)</span>
                    {initMode === 'empty' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Database bersih khusus sekolah Anda tanpa indikator contoh, langsung siap mengunggah file Excel resmi Rapor Pendidikan.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <p className="text-xs text-slate-500">
              Data tersimpan aman secara lokal di perangkat Anda dan dapat diekspor/dicadangkan kapan saja melalui menu Tata Kelola.
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>Simpan Identitas & Masuk ke Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
