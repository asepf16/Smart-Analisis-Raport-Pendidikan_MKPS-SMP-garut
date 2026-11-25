import React, { useMemo, useState } from 'react';
import { CharacterProgramItem, RaporIndicator, SchoolProfile } from '../../types';
import { HeartHandshake, Plus, Trash2, Building2, RefreshCw, CheckCircle2, FileDown, Printer, FolderPlus } from 'lucide-react';
import { syncLetterheadWithProfile } from '../../services/schoolIdentitySync';
import { buildDetailedCharacterProgramMarkdown } from '../../services/pbdSynthesisService';
import { exportCharacterProgramToWord } from '../../services/wordExportService';
import { SchoolDatabase } from '../../services/storageService';

interface ProgramKarakterViewProps {
  programs: CharacterProgramItem[];
  schoolProfile: SchoolProfile;
  raporIndicators?: RaporIndicator[];
  onUpdatePrograms: (updated: CharacterProgramItem[]) => void;
  onSyncFromPbd?: () => void;
  onSaveToArchive?: (markdown: string) => void;
}

export const ProgramKarakterView: React.FC<ProgramKarakterViewProps> = ({
  programs,
  schoolProfile,
  raporIndicators = [],
  onUpdatePrograms,
  onSyncFromPbd,
  onSaveToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'kartu' | 'dokumen'>('kartu');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newFocus, setNewFocus] = useState<CharacterProgramItem['focusArea']>('7 Pembiasaan Positif');
  const [newDesc, setNewDesc] = useState('');
  const [newPic, setNewPic] = useState('Guru BK & Kesiswaan');
  const [newSched, setNewSched] = useState('Setiap Hari');

  const resolvedLetterhead = useMemo(
    () => syncLetterheadWithProfile(schoolProfile.letterheadText, schoolProfile),
    [schoolProfile]
  );
  const letterheadTopLine = useMemo(() => {
    const firstLine = resolvedLetterhead.split('\n').map((l) => l.trim()).filter(Boolean)[0];
    if (firstLine && firstLine.toUpperCase() !== schoolProfile.name.trim().toUpperCase()) {
      return firstLine;
    }
    return `PEMERINTAH ${schoolProfile.city.toUpperCase()} - DINAS PENDIDIKAN`;
  }, [resolvedLetterhead, schoolProfile.city, schoolProfile.name]);

  const partialDb = useMemo(
    () =>
      ({
        schoolProfile,
        raporIndicators,
        characterPrograms: programs,
      }) as SchoolDatabase,
    [schoolProfile, raporIndicators, programs]
  );

  const formalMarkdown = useMemo(() => buildDetailedCharacterProgramMarkdown(partialDb), [partialDb]);

  const handleDownloadWord = async () => {
    await exportCharacterProgramToWord(partialDb);
    setNotice('Dokumen MS Word (.docx) Program Pembiasaan & Penguatan Karakter lengkap dengan Latar Belakang & Landasan Hukum berhasil diunduh.');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const item: CharacterProgramItem = {
      id: `manual-kar-${Date.now()}`,
      title: newTitle,
      focusArea: newFocus,
      description: newDesc,
      pic: newPic,
      implementationSchedule: newSched,
      progress: 80,
    };
    onUpdatePrograms([...programs, item]);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const handleDelete = (id: string) => {
    onUpdatePrograms(programs.filter((p) => p.id !== id));
    setDeleteConfirmId(null);
  };

  const handleProgressChange = (id: string, progress: number) => {
    onUpdatePrograms(programs.map((p) => (p.id === id ? { ...p, progress } : p)));
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{schoolProfile.name}</span>
            <span className="text-emerald-400">·</span>
            <span className="font-mono">NPSN {schoolProfile.npsn}</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-700" />
            <span>5.4 Program Pembiasaan & Penguatan Karakter Satuan Pendidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Merujuk Permendikbudristek No. 46 Tahun 2023 tentang PPKSP dan kerangka Profil Pelajar Pancasila untuk {schoolProfile.name}. Mencakup 7 pembiasaan positif, posko anti-perundungan, dan gotong royong warga sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSyncFromPbd && (
            <button
              type="button"
              onClick={() => {
                onSyncFromPbd();
                setNotice('Program Pembiasaan & Penguatan Karakter berhasil disinkronkan presisi dari Rapor & PBD terkini.');
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
                setNotice('Dokumen Program Pembiasaan & Penguatan Karakter berhasil disimpan ke menu 6.3 Arsip Dokumen Saya.');
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
            <span>Tambah Program Karakter</span>
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
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak</span>
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
          Daftar Program Penguatan Karakter ({programs.length})
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

      {/* Program Cards */}
      {activeTab === 'kartu' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {programs.map((prog) => (
          <div
            key={prog.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-800 border border-purple-200">
                  {prog.focusArea}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {prog.progress}% Terlaksana
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {prog.title}
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                {prog.description}
              </p>

              {/* Progress Slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={prog.progress}
                  onChange={(e) => handleProgressChange(prog.id, parseInt(e.target.value) || 0)}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                <div>
                  <span className="font-bold text-slate-700">Jadwal: </span>
                  {prog.implementationSchedule}
                </div>
                <div>
                  <span className="font-bold text-slate-700">PIC: </span>
                  {prog.pic}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              {deleteConfirmId === prog.id ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDelete(prog.id)}
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
                  onClick={() => setDeleteConfirmId(prog.id)}
                  className="p-1 rounded text-rose-500 hover:bg-rose-50"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {activeTab === 'kartu' && programs.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
          Belum ada program karakter. Klik &quot;Sinkronkan dari PBD&quot; atau &quot;Tambah Program Karakter&quot;.
        </div>
      )}

      {/* Modal Tambah */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Program Karakter</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Fokus Karakter</label>
                <select
                  value={newFocus}
                  onChange={(e) => setNewFocus(e.target.value as CharacterProgramItem['focusArea'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="7 Pembiasaan Positif">7 Pembiasaan Positif (Senyum, Sapa, Salam, dll)</option>
                  <option value="Pencegahan Kekerasan (PPKSP)">Pencegahan Kekerasan & Anti Perundungan (PPKSP)</option>
                  <option value="Gotong Royong & Peduli Lingkungan">Gotong Royong & Peduli Lingkungan</option>
                  <option value="Integritas & Kejujuran">Integritas & Kejujuran</option>
                  <option value="Dimensi Profil Pancasila">Dimensi Profil Pelajar Pancasila</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul Program *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Operasi Semut Bersih Sekolah & Gerakan Zero Sampah Plastik"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi Kegiatan *</label>
                <textarea
                  rows={2}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Uraian kegiatan pembiasaan karakter..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    value={newSched}
                    onChange={(e) => setNewSched(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">PIC</label>
                  <input
                    type="text"
                    value={newPic}
                    onChange={(e) => setNewPic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
                  Simpan Program Karakter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
