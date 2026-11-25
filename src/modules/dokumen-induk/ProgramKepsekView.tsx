import React, { useState } from 'react';
import { PrincipalProgramItem, SchoolProfile } from '../../types';
import {
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  Printer,
  Building2,
  RefreshCw,
  FolderPlus,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import { syncLetterheadWithProfile } from '../../services/schoolIdentitySync';
import { buildDetailedPrincipalProgramMarkdown } from '../../services/pbdSynthesisService';
import { exportPrincipalProgramToWord } from '../../services/wordExportService';
import { IdentifiedProblem, RaporIndicator } from '../../types';
import { SchoolDatabase } from '../../services/storageService';

interface ProgramKepsekViewProps {
  programs: PrincipalProgramItem[];
  schoolProfile: SchoolProfile;
  problems?: IdentifiedProblem[];
  raporIndicators?: RaporIndicator[];
  onUpdatePrograms: (updated: PrincipalProgramItem[]) => void;
  onSyncFromPbd?: () => void;
  onSaveToArchive?: (customMarkdown?: string) => void;
}

export const ProgramKepsekView: React.FC<ProgramKepsekViewProps> = ({
  programs,
  schoolProfile,
  problems = [],
  raporIndicators = [],
  onUpdatePrograms,
  onSyncFromPbd,
  onSaveToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'kartu' | 'dokumen'>('kartu');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newDimension, setNewDimension] = useState<PrincipalProgramItem['dimension']>('Manajerial');
  const [newTitle, setNewTitle] = useState('');
  const [newGoals, setNewGoals] = useState('');
  const [newPic, setNewPic] = useState('Kepala Sekolah');
  const [newSchedule, setNewSchedule] = useState('Sepanjang Tahun Ajaran');
  const [newIndicators, setNewIndicators] = useState('');
  const [newBudget, setNewBudget] = useState(1500000);

  const resolvedLetterhead = syncLetterheadWithProfile(schoolProfile.letterheadText, schoolProfile);
  const letterheadTopLine =
    resolvedLetterhead.split('\n').map((l) => l.trim()).filter(Boolean)[0] ||
    `PEMERINTAH ${schoolProfile.city.toUpperCase()} - DINAS PENDIDIKAN`;

  const partialDb = {
    schoolProfile,
    principalPrograms: programs,
    problems,
    raporIndicators,
  } as SchoolDatabase;
  const formalMarkdown = buildDetailedPrincipalProgramMarkdown(partialDb);

  const handleDownloadWord = async () => {
    await exportPrincipalProgramToWord(partialDb);
    setNotice('Dokumen MS Word (.docx) Program Kerja Kepala Sekolah lengkap dengan Latar Belakang & Landasan Hukum berhasil diunduh.');
  };

  const handleAddProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const newProg: PrincipalProgramItem = {
      id: `manual-pkepsek-${Date.now()}`,
      dimension: newDimension,
      title: newTitle,
      goals: newGoals,
      pic: newPic,
      schedule: newSchedule,
      indicators: newIndicators,
      budget: newBudget,
      status: 'Sedang berjalan',
    };
    onUpdatePrograms([...programs, newProg]);
    setShowAddModal(false);
    // reset
    setNewTitle('');
    setNewGoals('');
    setNewIndicators('');
  };

  const handleDelete = (id: string) => {
    onUpdatePrograms(programs.filter((p) => p.id !== id));
    setDeleteConfirmId(null);
  };

  const handleStatusChange = (id: string, status: PrincipalProgramItem['status']) => {
    const updated = programs.map((p) => (p.id === id ? { ...p, status } : p));
    onUpdatePrograms(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{schoolProfile.name}</span>
            <span className="text-emerald-400">·</span>
            <span className="font-mono">NPSN {schoolProfile.npsn}</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-700" />
            <span>4.6 Program Kerja Kepala Sekolah Terpadu</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencakup 12 dimensi kepemimpinan sekolah (manajerial, supervisi akademik, kewirausahaan, kurikulum, sarpras, kemitraan masyarakat, dan evaluasi PBD) untuk {schoolProfile.principalName} di {schoolProfile.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSyncFromPbd && (
            <button
              type="button"
              onClick={() => {
                onSyncFromPbd();
                setNotice('Program Kerja Kepala Sekolah berhasil disinkronkan presisi dari hasil PBD.');
              }}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan dari PBD</span>
            </button>
          )}

          {onSaveToArchive && (
            <button
              type="button"
              onClick={() => {
                onSaveToArchive(formalMarkdown);
                setNotice('Program Kerja Kepala Sekolah berhasil disimpan ke menu 6.3 Arsip Dokumen Saya.');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simpan ke Arsip</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Program Kerja</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWord}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <FileDown className="w-4 h-4" />
            <span>Unduh MS Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Program Kerja</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700 font-bold text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print text-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('kartu')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'kartu'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Program Kerja Kepala Sekolah ({programs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dokumen')}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dokumen'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dokumen Resmi Lengkap (Latar Belakang, Landasan Hukum &amp; Pengesahan)
        </button>
      </div>

      {/* Kop Identitas Program Kerja */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {letterheadTopLine}
          </div>
          <div className="text-sm font-extrabold uppercase text-slate-900">
            PROGRAM KERJA KEPALA SEKOLAH — {schoolProfile.name}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-mono">
          <span>Kepala Sekolah: {schoolProfile.principalName}</span>
          <span>·</span>
          <span>TP {schoolProfile.academicYear}</span>
        </div>
      </div>

      {activeTab === 'dokumen' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-slate-900 pb-3 text-center space-y-0.5">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-600">
              {letterheadTopLine}
            </div>
            <div className="text-base font-extrabold uppercase text-slate-900">
              {schoolProfile.name}
            </div>
            <div className="text-[11px] text-slate-600">
              {schoolProfile.address}, {schoolProfile.district}, {schoolProfile.city} - Telp: {schoolProfile.phone}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              NPSN: {schoolProfile.npsn} · Akreditasi: {schoolProfile.accreditationGrade} · Email: {schoolProfile.email}
            </div>
          </div>
          <div className="prose prose-slate max-w-none text-xs leading-relaxed">
            <div className="whitespace-pre-line text-slate-800">{formalMarkdown}</div>
          </div>
        </div>
      )}

      {/* Program Grid */}
      {activeTab === 'kartu' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-800">
                  {p.dimension}
                </span>

                <select
                  value={p.status}
                  onChange={(e) => handleStatusChange(p.id, e.target.value as any)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border focus:outline-none ${
                    p.status === 'Selesai'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <option value="Belum dimulai">Belum dimulai</option>
                  <option value="Sedang berjalan">Sedang berjalan</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {p.title}
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-700">Tujuan: </span>
                {p.goals}
              </p>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Indikator Keberhasilan: </span>
                  {p.indicators}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Jadwal: {p.schedule}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono font-bold text-slate-800">
                Pagu: Rp {p.budget.toLocaleString('id-ID')}
              </span>
              {deleteConfirmId === p.id ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700"
                  >
                    Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(p.id)}
                  className="p-1 rounded text-rose-500 hover:bg-rose-50"
                  title="Hapus Program"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal Tambah Program */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Program Kerja Kepala Sekolah</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddProgram} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Dimensi Tugas *</label>
                <select
                  value={newDimension}
                  onChange={(e) => setNewDimension(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Manajerial">Manajerial</option>
                  <option value="Supervisi Guru & Tendik">Supervisi Guru & Tendik</option>
                  <option value="Mutu Pembelajaran">Mutu Pembelajaran</option>
                  <option value="Budaya & Karakter">Budaya & Karakter</option>
                  <option value="Kewirausahaan">Kewirausahaan</option>
                  <option value="Sarana & Prasarana">Sarana & Prasarana</option>
                  <option value="Kemitraan Masyarakat">Kemitraan Masyarakat</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul Program Kerja *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Supervisi Klinis Berkelanjutan Pembelajaran Berdiferensiasi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tujuan & Sasaran *</label>
                <textarea
                  rows={2}
                  required
                  value={newGoals}
                  onChange={(e) => setNewGoals(e.target.value)}
                  placeholder="Contoh: Meningkatkan kualitas manajemen kelas dan asesmen formatif"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jadwal Pelaksanaan</label>
                  <input
                    type="text"
                    value={newSchedule}
                    onChange={(e) => setNewSchedule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Estimasi Anggaran (Rp)</label>
                  <input
                    type="number"
                    value={newBudget}
                    onChange={(e) => setNewBudget(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Indikator Keberhasilan</label>
                <input
                  type="text"
                  required
                  value={newIndicators}
                  onChange={(e) => setNewIndicators(e.target.value)}
                  placeholder="Contoh: 100% Guru disupervisi dengan tindak lanjut tuntas"
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
                  Simpan Program Kerja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
