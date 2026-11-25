import React, { useState, useEffect } from 'react';
import { SchoolProfile } from '../../types';
import { Building, Save, CheckCircle, Printer, RefreshCw } from 'lucide-react';
import { buildDefaultLetterhead, isOutdatedLetterhead } from '../../services/schoolIdentitySync';

interface IdentitasSekolahViewProps {
  schoolProfile: SchoolProfile;
  onUpdateSchool: (updated: SchoolProfile) => void;
}

export const IdentitasSekolahView: React.FC<IdentitasSekolahViewProps> = ({
  schoolProfile,
  onUpdateSchool,
}) => {
  const [formData, setFormData] = useState<SchoolProfile>({ ...schoolProfile });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormData({ ...schoolProfile });
  }, [schoolProfile]);

  const handleChange = (field: keyof SchoolProfile, value: any) => {
    setFormData((prev) => {
      const next: SchoolProfile = {
        ...prev,
        [field]: value,
      };
      if (field === 'name' || field === 'city' || field === 'npsn' || field === 'accreditationGrade') {
        if (isOutdatedLetterhead(prev.letterheadText, next, prev)) {
          next.letterheadText = buildDefaultLetterhead(next);
        }
      }
      return next;
    });
  };

  const handleResetLetterhead = () => {
    setFormData((prev) => ({
      ...prev,
      letterheadText: buildDefaultLetterhead(prev),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: SchoolProfile = {
      ...formData,
      letterheadText: isOutdatedLetterhead(formData.letterheadText, formData, schoolProfile)
        ? buildDefaultLetterhead(formData)
        : (formData.letterheadText || '').trim() || buildDefaultLetterhead(formData),
    };
    setFormData(finalProfile);
    onUpdateSchool(finalProfile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-700" />
            <span>Identitas Satuan Pendidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Data identitas ini menjadi rujukan otomatis pada kop surat, lembar pengesahan, dan seluruh dokumen perencanaan sekolah (RKJM, RKT, RKAS).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold px-2.5 py-1.5 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>Tersimpan Sukses!</span>
            </div>
          )}
          <button
            onClick={() => window.print()}
            type="button"
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Profil</span>
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Profil Pokok Satuan Pendidikan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            A. Informasi Pokok & Kelembagaan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Nama Satuan Pendidikan *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor Pokok Sekolah Nasional (NPSN) *</label>
              <input
                type="text"
                required
                value={formData.npsn}
                onChange={(e) => handleChange('npsn', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Jenjang *</label>
                <select
                  value={formData.stage}
                  onChange={(e) => handleChange('stage', e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                  <option value="SMK">SMK</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Negeri">Negeri</option>
                  <option value="Swasta">Swasta</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Alamat Lengkap *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Kelurahan / Desa</label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => handleChange('village', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Kecamatan</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Kabupaten / Kota *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Provinsi *</label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Kode Pos</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Resmi Sekolah</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pimpinan & Akreditasi */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            B. Kepala Sekolah, Akreditasi, dan Rombongan Belajar
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Nama Lengkap Kepala Sekolah (beserta gelar) *</label>
              <input
                type="text"
                required
                value={formData.principalName}
                onChange={(e) => handleChange('principalName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">NIP Kepala Sekolah (jika ada)</label>
              <input
                type="text"
                value={formData.principalNip || ''}
                onChange={(e) => handleChange('principalNip', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Peringkat Akreditasi Terakhir</label>
              <select
                value={formData.accreditationGrade}
                onChange={(e) => handleChange('accreditationGrade', e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-emerald-800"
              >
                <option value="A">Akreditasi A (Unggul)</option>
                <option value="B">Akreditasi B (Baik)</option>
                <option value="C">Akreditasi C (Cukup)</option>
                <option value="Belum Terakreditasi">Belum Terakreditasi</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tahun Akreditasi</label>
              <input
                type="number"
                value={formData.accreditationYear}
                onChange={(e) => handleChange('accreditationYear', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tahun Berdiri Sekolah</label>
              <input
                type="number"
                value={formData.establishedYear}
                onChange={(e) => handleChange('establishedYear', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tahun Pelajaran Berjalan *</label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                placeholder="2025/2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Jumlah Peserta Didik (Siswa)</label>
              <input
                type="number"
                value={formData.totalStudents}
                onChange={(e) => handleChange('totalStudents', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Jumlah Rombongan Belajar (Rombel)</label>
              <input
                type="number"
                value={formData.totalStudyGroups}
                onChange={(e) => handleChange('totalStudyGroups', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Jumlah Tenaga Pendidik (Guru)</label>
              <input
                type="number"
                value={formData.totalTeachers}
                onChange={(e) => handleChange('totalTeachers', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Jumlah Tenaga Kependidikan (Tendik)</label>
              <input
                type="number"
                value={formData.totalStaff}
                onChange={(e) => handleChange('totalStaff', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Visi, Misi, dan Tujuan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            C. Visi, Misi, Tujuan Sekolah, dan Kop Surat
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Visi Sekolah *</label>
              <textarea
                rows={2}
                value={formData.vision}
                onChange={(e) => handleChange('vision', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Misi Sekolah (Poin-poin)</label>
              <textarea
                rows={3}
                value={formData.mission}
                onChange={(e) => handleChange('mission', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Tujuan Strategis Satuan Pendidikan</label>
              <textarea
                rows={2}
                value={formData.goals}
                onChange={(e) => handleChange('goals', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block font-medium text-slate-700">Teks Kop Surat Resmi Sekolah</label>
                <button
                  type="button"
                  onClick={handleResetLetterhead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sesuaikan Kop ke Identitas Terbaru</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={formData.letterheadText || ''}
                onChange={(e) => handleChange('letterheadText', e.target.value)}
                placeholder="PEMERINTAH KOTA ... - DINAS PENDIDIKAN ..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Otomatis menyesuaikan saat Nama Sekolah, Kota/Kabupaten, NPSN, atau Akreditasi diubah, dan dicetak pada bagian atas dokumen resmi RKJM, RKT, RKAS, serta SK Supervisi.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Identitas Sekolah</span>
          </button>
        </div>
      </form>
    </div>
  );
};
