import React, { useState, useMemo } from 'react';
import { OfficialDocument, SchoolProfile } from '../../types';
import {
  FolderArchive,
  Search,
  Filter,
  Printer,
  Trash2,
  Eye,
  Building2,
  FileDown,
} from 'lucide-react';
import { syncDocumentsWithSchoolProfile, syncLetterheadWithProfile } from '../../services/schoolIdentitySync';
import { exportMarkdownDocumentToWord } from '../../services/wordExportService';

interface DokumenSayaViewProps {
  documents: OfficialDocument[];
  schoolProfile: SchoolProfile;
  currentUserName?: string;
  onUpdateDocuments: (updated: OfficialDocument[]) => void;
}

export const DokumenSayaView: React.FC<DokumenSayaViewProps> = ({
  documents,
  schoolProfile,
  currentUserName,
  onUpdateDocuments,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedDocPreview, setSelectedDocPreview] = useState<OfficialDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const syncedDocuments = useMemo(
    () => syncDocumentsWithSchoolProfile(documents, schoolProfile),
    [documents, schoolProfile]
  );

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

  const categories = Array.from(new Set(syncedDocuments.map((d) => d.category)));

  const filteredDocs = syncedDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const handleDelete = (id: string) => {
    onUpdateDocuments(documents.filter((d) => d.id !== id));
    setDeleteConfirmId(null);
  };

  const handleStatusChange = (id: string, newStatus: OfficialDocument['status']) => {
    const updated = documents.map((d) => (d.id === id ? { ...d, status: newStatus } : d));
    onUpdateDocuments(updated);
  };

  const handleDownloadWord = async (doc: OfficialDocument) => {
    const fallbackMd = `DOKUMEN RESMI MUTU PENDIDIKAN\n\nJudul: ${doc.title}\nSatuan Pendidikan: ${schoolProfile.name}\nStatus: ${doc.status}\n\nDokumen ini merupakan arsip resmi perencanaan dan peningkatan mutu sekolah berbasis Rapor Pendidikan.`;
    await exportMarkdownDocumentToWord({
      title: doc.title,
      category: doc.category,
      academicYear: doc.academicYear,
      status: doc.status,
      approvedBy: doc.approvedBy,
      contentMarkdown: doc.contentMarkdown || fallbackMd,
      schoolProfile,
    });
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
            <FolderArchive className="w-5 h-5 text-emerald-700" />
            <span>6.3 Arsip Digital & Repositori Dokumen Mutu Sekolah</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penyimpanan seluruh produk dokumen perencanaan {schoolProfile.name} (RKJM, RKT, RKAS, Program Kepala Sekolah) yang siap diunduh dan dicetak ber-kop resmi.
          </p>
        </div>

        <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl shrink-0">
          Total Dokumen Tersimpan: <span className="font-mono text-sm">{syncedDocuments.length} Berkas</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari judul dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Kategori Dokumen</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800">
                  {doc.category}
                </span>

                <select
                  value={doc.status}
                  onChange={(e) => handleStatusChange(doc.id, e.target.value as any)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border focus:outline-none ${
                    doc.status === 'Disahkan'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : doc.status === 'Divalidasi'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <option value="Draf">Draf</option>
                  <option value="Direvisi">Direvisi</option>
                  <option value="Divalidasi">Divalidasi</option>
                  <option value="Disahkan">Disahkan</option>
                </select>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {doc.title}
              </h2>

              <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                <div>TP: {doc.academicYear} · Format: {doc.fileFormat}</div>
                {doc.approvedBy && (
                  <div className="text-emerald-800 font-medium truncate">
                    Disahkan: {doc.approvedBy}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDocPreview(doc)}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadWord(doc)}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1 transition-colors"
                  title="Unduh file Microsoft Word (.docx)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Word (.docx)</span>
                </button>
              </div>

              {deleteConfirmId === doc.id ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
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
                  onClick={() => setDeleteConfirmId(doc.id)}
                  className="p-1 rounded text-rose-500 hover:bg-rose-50"
                  title="Hapus Dokumen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Preview Dokumen */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedDocPreview.title}
                </h2>
                <div className="text-[11px] text-slate-500 font-mono">
                  Kategori: {selectedDocPreview.category} · Status: {selectedDocPreview.status}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadWord(selectedDocPreview)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh MS Word (.docx)</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg flex items-center gap-1 hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak</span>
                </button>
                <button
                  onClick={() => setSelectedDocPreview(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none px-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs leading-relaxed">
              {/* Kop Surat Dokumen */}
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-0.5">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  {letterheadTopLine}
                </div>
                <div className="text-sm font-bold uppercase text-slate-900">
                  {schoolProfile.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  NPSN: {schoolProfile.npsn} · {schoolProfile.address}, {schoolProfile.city}
                </div>
              </div>

              <div className="whitespace-pre-line text-slate-800 prose prose-slate max-w-none text-xs">
                {selectedDocPreview.contentMarkdown ||
                  `DOKUMEN RESMI MUTU PENDIDIKAN\n\nJudul: ${selectedDocPreview.title}\nSatuan Pendidikan: ${schoolProfile.name}\nStatus: ${selectedDocPreview.status}\n\nDokumen ini merupakan arsip resmi perencanaan dan peningkatan mutu sekolah berbasis Rapor Pendidikan.`}
              </div>

              {/* Tanda Tangan */}
              <div className="pt-6 border-t border-slate-100 flex justify-between items-end text-xs">
                <div className="text-center">
                  <div>Mengetahui,</div>
                  <div className="font-semibold text-slate-700">Tim Pengembang Sekolah (TPMPS)</div>
                  <div className="h-16" />
                  <div className="font-bold text-slate-900 underline">
                    {currentUserName && currentUserName !== schoolProfile.principalName
                      ? currentUserName
                      : `TPMPS ${schoolProfile.name}`}
                  </div>
                </div>

                <div className="text-center">
                  <div>{schoolProfile.city}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="font-semibold text-slate-700">Kepala Sekolah,</div>
                  <div className="h-16" />
                  <div className="font-bold text-slate-900 underline">{schoolProfile.principalName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">NIP. {schoolProfile.principalNip || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
