import React, { useState } from 'react';
import { RegulationItem } from '../../types';
import {
  Scale,
  ExternalLink,
  Plus,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

interface RegulasiViewProps {
  regulations: RegulationItem[];
  onUpdateRegulations: (updated: RegulationItem[]) => void;
}

export const RegulasiView: React.FC<RegulasiViewProps> = ({
  regulations,
  onUpdateRegulations,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New regulation form
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newAgency, setNewAgency] = useState('Kementerian Pendidikan Dasar dan Menengah');
  const [newEffectiveDate, setNewEffectiveDate] = useState('2026-01-01');
  const [newStatus, setNewStatus] = useState<RegulationItem['status']>('Berlaku');
  const [newCore, setNewCore] = useState('');
  const [newModule, setNewModule] = useState('PBD & RKAS');
  const [newUrl, setNewUrl] = useState('https://jdih.kemdikbud.go.id');

  const filteredRegulations = regulations.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.numberAndYear.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.coreContent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRegulation = (e: React.FormEvent) => {
    e.preventDefault();
    const item: RegulationItem = {
      id: `reg-${Date.now()}`,
      name: newName,
      numberAndYear: newNumber,
      issuingAgency: newAgency,
      effectiveDate: newEffectiveDate,
      status: newStatus,
      coreContent: newCore,
      relatedModule: newModule,
      officialSourceUrl: newUrl,
      lastVerifiedDate: new Date().toISOString().split('T')[0],
    };
    onUpdateRegulations([...regulations, item]);
    setShowAddModal(false);
    setNewName('');
    setNewNumber('');
    setNewCore('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-700" />
            <span>6.2 Pusat Regulasi & Landasan Hukum Pendidikan Indonesia</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Database regulasi resmi terkini (JDIH Kemendikdasmen, BPK, BAN-PDM). Sistem memastikan setiap dokumen perencanaan dan anggaran berlandaskan payung hukum yang masih berlaku aktif.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Referensi Regulasi</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari regulasi (misal: BOSP 2026, PP 57/2021, BSKAP, Akreditasi, PPKSP)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs border-none focus:outline-none"
        />
      </div>

      {/* Regulations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRegulations.map((reg) => (
          <div
            key={reg.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    reg.status === 'Berlaku'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : reg.status === 'Diubah'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  Status: {reg.status}
                </span>

                <span className="text-[11px] font-mono text-slate-400">
                  Diverifikasi: {reg.lastVerifiedDate}
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {reg.name}
              </h2>

              <div className="font-mono text-xs font-semibold text-emerald-800">
                {reg.numberAndYear}
              </div>

              <div className="text-[11px] text-slate-500">
                Instansi Penerbit: {reg.issuingAgency} · Berlaku: {reg.effectiveDate}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {reg.coreContent}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                Modul: {reg.relatedModule}
              </span>

              <a
                href={reg.officialSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Dokumen Resmi JDIH</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah Regulasi */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Tambah Referensi Regulasi Baru</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddRegulation} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Kebijakan / Peraturan *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Petunjuk Teknis Pengelolaan Dana BOSP"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nomor & Tahun *</label>
                  <input
                    type="text"
                    required
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="Permendikdasmen No. 8 Tahun 2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status Berlaku</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Berlaku">Berlaku Aktif</option>
                    <option value="Diubah">Diubah</option>
                    <option value="Dicabut">Dicabut</option>
                    <option value="Perlu Verifikasi">Perlu Verifikasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Instansi Penerbit</label>
                <input
                  type="text"
                  value={newAgency}
                  onChange={(e) => setNewAgency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pokok Pengaturan Penting</label>
                <textarea
                  rows={2}
                  required
                  value={newCore}
                  onChange={(e) => setNewCore(e.target.value)}
                  placeholder="Ringkasan poin-poin yang mengikat operasional sekolah..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Hubungan dengan Modul</label>
                  <input
                    type="text"
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Link Sumber Resmi (JDIH)</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
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
                  Simpan Regulasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
