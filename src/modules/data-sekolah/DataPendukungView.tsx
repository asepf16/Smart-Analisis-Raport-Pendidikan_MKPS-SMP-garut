import React, { useState } from 'react';
import { SupportingData } from '../../types';
import { Database, Save, CheckCircle, Users, School, BookOpen, Calculator } from 'lucide-react';

interface DataPendukungViewProps {
  supportingData: SupportingData;
  onUpdateSupportingData: (updated: SupportingData) => void;
}

export const DataPendukungView: React.FC<DataPendukungViewProps> = ({
  supportingData,
  onUpdateSupportingData,
}) => {
  const [data, setData] = useState<SupportingData>({ ...supportingData });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleNestedChange = (category: keyof SupportingData, key: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [key]: value,
      },
    }));
  };

  const handleSimpleChange = (key: keyof SupportingData, value: any) => {
    setData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSupportingData(data);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-700" />
            <span>Data Pendukung Satuan Pendidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Digunakan oleh AI dan Tim Pengembang Sekolah untuk mengonfirmasi kesenjangan sarana prasarana, profil pendidik, dan kebutuhan riil siswa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold px-2.5 py-1.5 bg-emerald-50 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>Tersimpan!</span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Data Pendukung</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cluster 1: Peserta Didik */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <span>1. Demografi & Kebutuhan Khusus Peserta Didik</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Peserta Didik Laki-laki</label>
              <input
                type="number"
                value={data.studentsSummary.maleCount}
                onChange={(e) =>
                  handleNestedChange('studentsSummary', 'maleCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Peserta Didik Perempuan</label>
              <input
                type="number"
                value={data.studentsSummary.femaleCount}
                onChange={(e) =>
                  handleNestedChange('studentsSummary', 'femaleCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Penerima PIP / KIP</label>
              <input
                type="number"
                value={data.studentsSummary.kipPipCount}
                onChange={(e) =>
                  handleNestedChange('studentsSummary', 'kipPipCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Peserta Didik Berkebutuhan Khusus (PDBK)</label>
              <input
                type="number"
                value={data.studentsSummary.specialNeedsCount}
                onChange={(e) =>
                  handleNestedChange('studentsSummary', 'specialNeedsCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cluster 2: Pendidik dan Tenaga Kependidikan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            <School className="w-4 h-4 text-emerald-700" />
            <span>2. Status Kepegawaian dan Sertifikasi Pendidik</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Guru Bersertifikat Pendidik (Serdik)</label>
              <input
                type="number"
                value={data.teachersSummary.certifiedCount}
                onChange={(e) =>
                  handleNestedChange('teachersSummary', 'certifiedCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Guru ASN PNS</label>
              <input
                type="number"
                value={data.teachersSummary.civilServantCount}
                onChange={(e) =>
                  handleNestedChange('teachersSummary', 'civilServantCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Guru ASN PPPK</label>
              <input
                type="number"
                value={data.teachersSummary.p3kCount}
                onChange={(e) =>
                  handleNestedChange('teachersSummary', 'p3kCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Guru Honorer / Non-ASN</label>
              <input
                type="number"
                value={data.teachersSummary.honoraryCount}
                onChange={(e) =>
                  handleNestedChange('teachersSummary', 'honoraryCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cluster 3: Sarana dan Prasarana */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>3. Sarana Prasarana Belajar & Perpustakaan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Jumlah Ruang Kelas Baik</label>
              <input
                type="number"
                value={data.facilitiesSummary.goodConditionCount}
                onChange={(e) =>
                  handleNestedChange('facilitiesSummary', 'goodConditionCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Ruang Kelas Rusak Sedang</label>
              <input
                type="number"
                value={data.facilitiesSummary.moderateDamageCount}
                onChange={(e) =>
                  handleNestedChange('facilitiesSummary', 'moderateDamageCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Kondisi Perpustakaan</label>
              <select
                value={data.facilitiesSummary.libraryCondition}
                onChange={(e) =>
                  handleNestedChange('facilitiesSummary', 'libraryCondition', e.target.value as any)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="Baik">Baik (Nyaman & Terawat)</option>
                <option value="Sedang">Sedang (Perlu Penataan Koleksi)</option>
                <option value="Kurang">Kurang (Minim Koleksi & Sarana)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Laboratorium Komputer / IPA</label>
              <input
                type="number"
                value={data.facilitiesSummary.computerLabCount}
                onChange={(e) =>
                  handleNestedChange('facilitiesSummary', 'computerLabCount', parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cluster 4: Kurikulum & Pagu Anggaran BOSP */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span>4. Kurikulum dan Total Pagu Anggaran BOSP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Kurikulum yang Digunakan *</label>
              <input
                type="text"
                value={data.curriculum}
                onChange={(e) => handleSimpleChange('curriculum', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Total Pagu BOSP Tahunan (Rp) *</label>
              <input
                type="number"
                value={data.budgetCapTotal}
                onChange={(e) => handleSimpleChange('budgetCapTotal', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-emerald-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Estimasi Pagu BOS Reguler: Rp {data.budgetCapTotal.toLocaleString('id-ID')}
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Rata-rata Skor Supervisi Guru</label>
              <input
                type="number"
                step="0.1"
                value={data.averageSupervisionScore}
                onChange={(e) =>
                  handleSimpleChange('averageSupervisionScore', parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Data Pendukung</span>
          </button>
        </div>
      </form>
    </div>
  );
};
