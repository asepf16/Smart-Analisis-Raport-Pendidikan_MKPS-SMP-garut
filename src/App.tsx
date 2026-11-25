import React, { useState, useEffect } from 'react';
import { Sidebar, NavMenuId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import {
  StorageService,
  SchoolDatabase,
  UserRegistrationPayload,
  createEmptyCycleWorkspace,
  createSnapshotFromDatabase,
  hasActiveCycleData,
} from './services/storageService';
import { UserProfile, UserRole, RaporIndicator, SavedRaporSnapshot, OfficialDocument } from './types';
import { AIService } from './services/aiService';
import { recommendTopProblems } from './services/problemRecommendationService';
import {
  synthesizeAllModulesFromPBD,
  SynthesisOptions,
  SynthesisSummary,
  upsertDocumentInArchive,
  buildDetailedRKASMarkdown,
  buildDetailedPrincipalProgramMarkdown,
} from './services/pbdSynthesisService';
import { AlertTriangle } from 'lucide-react';

// Module views
import { DashboardView } from './modules/dashboard/DashboardView';
import { IdentitasSekolahView } from './modules/data-sekolah/IdentitasSekolahView';
import { DataPendukungView } from './modules/data-sekolah/DataPendukungView';
import { ImporRaporView } from './modules/impor-rapor/ImporRaporView';
import { AnalisisRaporView } from './modules/analisis-pbd/AnalisisRaporView';
import { IdentifikasiMasalahView } from './modules/analisis-pbd/IdentifikasiMasalahView';
import { RefleksiAkarMasalahView } from './modules/analisis-pbd/RefleksiAkarMasalahView';
import { RekomendasiPembenahanView } from './modules/analisis-pbd/RekomendasiPembenahanView';
import { ImplementasiAksiView } from './modules/analisis-pbd/ImplementasiAksiView';
import { IntegrasiSNPView } from './modules/dokumen-induk/IntegrasiSNPView';
import { AkreditasiView } from './modules/dokumen-induk/AkreditasiView';
import { GeneratorRKJMView } from './modules/dokumen-induk/GeneratorRKJMView';
import { GeneratorRKTView } from './modules/dokumen-induk/GeneratorRKTView';
import { GeneratorRKASView } from './modules/dokumen-induk/GeneratorRKASView';
import { ProgramKepsekView } from './modules/dokumen-induk/ProgramKepsekView';
import { SupervisiAkademikView } from './modules/mutu-pembelajaran/SupervisiAkademikView';
import { ProgramLiterasiView } from './modules/mutu-pembelajaran/ProgramLiterasiView';
import { ProgramNumerasiView } from './modules/mutu-pembelajaran/ProgramNumerasiView';
import { ProgramKarakterView } from './modules/mutu-pembelajaran/ProgramKarakterView';
import { MonevDashboardView } from './modules/pengawasan-arsip/MonevDashboardView';
import { RegulasiView } from './modules/pengawasan-arsip/RegulasiView';
import { DokumenSayaView } from './modules/pengawasan-arsip/DokumenSayaView';
import { OnboardingIdentitasView } from './modules/tata-kelola/OnboardingIdentitasView';
import { ProfilPenggunaView } from './modules/tata-kelola/ProfilPenggunaView';
import { HakAksesView } from './modules/tata-kelola/HakAksesView';
import { KeamananBackupView } from './modules/tata-kelola/KeamananBackupView';

export default function App() {
  const [isRegistered, setIsRegistered] = useState<boolean>(() => StorageService.isUserRegistered());
  const [activeMenu, setActiveMenu] = useState<NavMenuId>('dashboard');
  const [activeSchoolId, setActiveSchoolId] = useState<string>(() => StorageService.getActiveSchoolId());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => StorageService.getCurrentUser());
  const [db, setDb] = useState<SchoolDatabase>(() => StorageService.getSchoolDatabase(activeSchoolId));
  const [isAILoading, setIsAILoading] = useState(false);
  const [showHeaderResetConfirm, setShowHeaderResetConfirm] = useState(false);

  // Sync state whenever activeSchoolId changes while registered
  useEffect(() => {
    if (!isRegistered) return;
    StorageService.setActiveSchoolId(activeSchoolId);
    const newDb = StorageService.getSchoolDatabase(activeSchoolId);
    setDb(newDb);
  }, [activeSchoolId, isRegistered]);

  const handleRegisterIdentity = (payload: UserRegistrationPayload) => {
    const { user, db: newDb } = StorageService.registerUserIdentity(payload);
    setCurrentUser(user);
    setActiveSchoolId(user.schoolId);
    setDb(newDb);
    setActiveMenu('dashboard');
    setIsRegistered(true);
  };

  const handleResetRegistration = () => {
    StorageService.resetUserRegistration();
    setShowHeaderResetConfirm(false);
    setIsRegistered(false);
    setActiveMenu('dashboard');
  };

  // Helper to persist database changes
  const updateDb = (updater: (prev: SchoolDatabase) => SchoolDatabase, actionName?: string, moduleName?: string) => {
    setDb((prev) => {
      const updated = updater(prev);
      StorageService.saveSchoolDatabase(updated, activeSchoolId);
      if (actionName && moduleName) {
        StorageService.logActivity(currentUser.name, currentUser.role, actionName, moduleName, 'Data berhasil diperbarui');
      }
      return updated;
    });
  };

  const handleUpdateUserProfile = (updatedUser: UserProfile) => {
    StorageService.updateCurrentUserProfile(updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleChangeUserRole = (newRole: UserRole) => {
    const updatedUser: UserProfile = { ...currentUser, role: newRole };
    StorageService.setCurrentUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleApplyImportedIndicators = (
    indicators: RaporIndicator[],
    sourceLabel: string,
    options?: {
      savePrevious?: boolean;
      previousLabel?: string;
      newLabel?: string;
      newYear?: string;
    }
  ) => {
    const autoProblems = recommendTopProblems(indicators, 5);
    const shouldSavePrevious = options?.savePrevious !== false;

    updateDb(
      (prev) => {
        let snapshots: SavedRaporSnapshot[] = [...(prev.raporSnapshots || [])];
        const nowIso = new Date().toISOString();

        if (shouldSavePrevious && hasActiveCycleData(prev)) {
          const prevLabel =
            options?.previousLabel?.trim() ||
            prev.activeRaporLabel ||
            `Arsip Lengkap Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`;

          if (prev.activeRaporSnapshotId) {
            const existingIdx = snapshots.findIndex((s) => s.id === prev.activeRaporSnapshotId);
            const fullPrevSnap = createSnapshotFromDatabase(prev, {
              id: prev.activeRaporSnapshotId,
              label: existingIdx >= 0 ? options?.previousLabel?.trim() || snapshots[existingIdx].label : prevLabel,
              sourceName: existingIdx >= 0 ? snapshots[existingIdx].sourceName : 'Siklus Rapor, PBD & Mutu Pembelajaran Sebelumnya',
            });
            if (existingIdx >= 0) {
              snapshots[existingIdx] = fullPrevSnap;
            } else {
              snapshots.unshift(fullPrevSnap);
            }
          } else {
            snapshots.unshift(
              createSnapshotFromDatabase(prev, {
                id: `snap-prev-${Date.now()}`,
                label: prevLabel,
                sourceName: 'Arsip Otomatis Saat Ganti Data Rapor',
              })
            );
          }
        }

        const cleanWorkspace = createEmptyCycleWorkspace();
        const newSnap: SavedRaporSnapshot = {
          ...cleanWorkspace,
          id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: options?.newLabel?.trim() || sourceLabel,
          year: options?.newYear?.trim() || String(indicators[0]?.year || new Date().getFullYear()),
          sourceName: sourceLabel,
          savedAt: nowIso,
          indicators,
          problems: autoProblems,
          rootCauses: [],
          recommendations: [],
          actionPlans: [],
          rkasItems: [],
          principalPrograms: [],
          supervisionRecords: [],
          literacyPrograms: [],
          numeracyPrograms: [],
          characterPrograms: [],
          documents: [],
        };

        snapshots = [newSnap, ...snapshots];

        return {
          ...prev,
          ...cleanWorkspace,
          raporIndicators: indicators,
          problems: autoProblems,
          raporSnapshots: snapshots,
          activeRaporSnapshotId: newSnap.id,
          activeRaporLabel: newSnap.label,
        };
      },
      'Arsipkan Siklus Lama & Terapkan Data Rapor Baru',
      'Impor Rapor'
    );
    setActiveMenu('analisis-rapor');
  };

  const handleClearCurrentRaporCycle = (options?: {
    savePrevious?: boolean;
    previousLabel?: string;
  }) => {
    const shouldSavePrevious = options?.savePrevious !== false;

    updateDb(
      (prev) => {
        const snapshots: SavedRaporSnapshot[] = [...(prev.raporSnapshots || [])];

        if (shouldSavePrevious && hasActiveCycleData(prev)) {
          const prevLabel =
            options?.previousLabel?.trim() ||
            prev.activeRaporLabel ||
            `Arsip Lengkap Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`;

          if (prev.activeRaporSnapshotId) {
            const existingIdx = snapshots.findIndex((s) => s.id === prev.activeRaporSnapshotId);
            const fullPrevSnap = createSnapshotFromDatabase(prev, {
              id: prev.activeRaporSnapshotId,
              label: existingIdx >= 0 ? options?.previousLabel?.trim() || snapshots[existingIdx].label : prevLabel,
              sourceName: existingIdx >= 0 ? snapshots[existingIdx].sourceName : 'Siklus Rapor, PBD & Mutu Pembelajaran',
            });
            if (existingIdx >= 0) {
              snapshots[existingIdx] = fullPrevSnap;
            } else {
              snapshots.unshift(fullPrevSnap);
            }
          } else {
            snapshots.unshift(
              createSnapshotFromDatabase(prev, {
                id: `snap-prev-${Date.now()}`,
                label: prevLabel,
                sourceName: 'Arsip Sebelum Pengosongan Data Rapor',
              })
            );
          }
        }

        return {
          ...prev,
          ...createEmptyCycleWorkspace(),
          raporSnapshots: snapshots,
          activeRaporSnapshotId: undefined,
          activeRaporLabel: 'Belum Ada Data Rapor (Siap Impor Baru)',
        };
      },
      'Arsipkan & Kosongkan Data Rapor Aktif',
      'Impor Rapor'
    );
  };

  const handleSaveCurrentRaporSnapshot = (label: string, year: string) => {
    if (!hasActiveCycleData(db)) return;
    const newSnap = createSnapshotFromDatabase(db, {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: label.trim() || `Arsip Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`,
      year: year.trim() || String(db.raporIndicators[0]?.year || db.schoolProfile.academicYear),
      sourceName: db.activeRaporLabel || 'Simpanan Lengkap Pengguna',
    });

    updateDb(
      (prev) => ({
        ...prev,
        raporSnapshots: [newSnap, ...(prev.raporSnapshots || [])],
        activeRaporSnapshotId: newSnap.id,
        activeRaporLabel: newSnap.label,
      }),
      'Simpan Arsip Lengkap Rapor, PBD, Dokumen & Mutu Pembelajaran',
      'Arsip Rapor Pendidikan'
    );
  };

  const handleSwitchRaporSnapshot = (snapshotId: string) => {
    updateDb(
      (prev) => {
        const snapshots: SavedRaporSnapshot[] = [...(prev.raporSnapshots || [])];
        const target = snapshots.find((s) => s.id === snapshotId);
        if (!target) return prev;

        if (hasActiveCycleData(prev)) {
          if (prev.activeRaporSnapshotId) {
            const curIdx = snapshots.findIndex((s) => s.id === prev.activeRaporSnapshotId);
            const updatedCurrent = createSnapshotFromDatabase(prev, {
              id: prev.activeRaporSnapshotId,
              label: curIdx >= 0 ? snapshots[curIdx].label : prev.activeRaporLabel,
              sourceName: curIdx >= 0 ? snapshots[curIdx].sourceName : 'Siklus Rapor, PBD & Mutu Pembelajaran',
            });
            if (curIdx >= 0) {
              snapshots[curIdx] = updatedCurrent;
            } else {
              snapshots.unshift(updatedCurrent);
            }
          } else {
            snapshots.unshift(
              createSnapshotFromDatabase(prev, {
                id: `snap-auto-${Date.now()}`,
                label: prev.activeRaporLabel || `Arsip Lengkap Sebelumnya (${new Date().toLocaleDateString('id-ID')})`,
                sourceName: 'Tersimpan Otomatis Saat Ganti Data',
              })
            );
          }
        }

        const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
        const emptyBaseline = createEmptyCycleWorkspace();
        const restoredIndicators = clone(target.indicators || []);
        const restoredProblems =
          target.problems && target.problems.length > 0
            ? clone(target.problems)
            : recommendTopProblems(restoredIndicators, 5);

        return {
          ...prev,
          raporIndicators: restoredIndicators,
          problems: restoredProblems,
          rootCauses: clone(target.rootCauses ?? []),
          recommendations: clone(target.recommendations ?? []),
          actionPlans: clone(target.actionPlans ?? []),
          snpData:
            target.snpData && target.snpData.length > 0
              ? clone(target.snpData)
              : emptyBaseline.snpData,
          accreditationData:
            target.accreditationData && target.accreditationData.length > 0
              ? clone(target.accreditationData)
              : emptyBaseline.accreditationData,
          rkasItems: clone(target.rkasItems ?? []),
          principalPrograms: clone(target.principalPrograms ?? []),
          supervisionRecords: clone(target.supervisionRecords ?? []),
          literacyPrograms: clone(target.literacyPrograms ?? []),
          numeracyPrograms: clone(target.numeracyPrograms ?? []),
          characterPrograms: clone(target.characterPrograms ?? []),
          documents: clone(target.documents ?? []),
          raporSnapshots: snapshots,
          activeRaporSnapshotId: target.id,
          activeRaporLabel: target.label,
        };
      },
      'Pulihkan Arsip Lengkap Rapor, PBD & Mutu Pembelajaran',
      'Analisis Rapor'
    );
  };

  const handleDeleteRaporSnapshot = (snapshotId: string) => {
    updateDb(
      (prev) => ({
        ...prev,
        raporSnapshots: (prev.raporSnapshots || []).filter((s) => s.id !== snapshotId),
        activeRaporSnapshotId:
          prev.activeRaporSnapshotId === snapshotId ? undefined : prev.activeRaporSnapshotId,
      }),
      'Hapus Arsip Data Rapor',
      'Arsip Rapor Pendidikan'
    );
  };

  const handleTriggerAIAnalysis = async () => {
    setIsAILoading(true);
    try {
      await AIService.analyzeRapor(db.raporIndicators, db.schoolProfile, db.schoolProfile.academicYear);
      setActiveMenu('analisis-rapor');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSynthesizeAllFromPBD = (options: SynthesisOptions = { preserveManualItems: true }): SynthesisSummary => {
    const { updatedDb, summary } = synthesizeAllModulesFromPBD(db, options);
    updateDb(() => updatedDb, 'Generate Seluruh Dokumen Induk & Mutu Pembelajaran PBD', 'Integrasi PBD');
    return summary;
  };

  const handleSaveArchiveDoc = (params: {
    id: string;
    title: string;
    category: OfficialDocument['category'];
    academicYear: string;
    status: OfficialDocument['status'];
    fileFormat: OfficialDocument['fileFormat'];
    contentMarkdown: string;
  }) => {
    const todayIso = new Date().toISOString().split('T')[0];
    const newDoc: OfficialDocument = {
      id: params.id,
      title: params.title,
      category: params.category,
      academicYear: params.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: params.status,
      approvedBy: db.schoolProfile.principalName,
      approvalDate: todayIso,
      fileFormat: params.fileFormat,
      contentMarkdown: params.contentMarkdown,
    };
    updateDb(
      (prev) => ({
        ...prev,
        documents: upsertDocumentInArchive(prev.documents || [], newDoc),
      }),
      'Simpan Dokumen ke Arsip',
      params.category
    );
  };

  // First-time / shared app onboarding screen before user fills identity
  if (!isRegistered) {
    return <OnboardingIdentitasView onRegister={handleRegisterIdentity} />;
  }

  const moduleTitles: Record<NavMenuId, { group: string; title: string }> = {
    'dashboard': { group: '1. Ikhtisar Utama', title: 'Dashboard Mutu & PBD' },
    'identitas-sekolah': { group: '2. Data dan Sumber', title: 'Identitas Satuan Pendidikan' },
    'data-pendukung': { group: '2. Data dan Sumber', title: 'Data Pendukung Satuan Pendidikan' },
    'impor-rapor': { group: '2. Data dan Sumber', title: 'Fasilitas Impor Rapor Pendidikan' },
    'analisis-rapor': { group: '3. Perencanaan Berbasis Data', title: '3.1 Analisis Rapor Pendidikan' },
    'identifikasi-masalah': { group: '3. Perencanaan Berbasis Data', title: '3.2 Identifikasi Masalah Prioritas' },
    'refleksi-akar-masalah': { group: '3. Perencanaan Berbasis Data', title: '3.3 Refleksi Akar Masalah (5-Why)' },
    'rekomendasi-pembenahan': { group: '3. Perencanaan Berbasis Data', title: '3.4 Rekomendasi Pembenahan' },
    'implementasi-aksi': { group: '3. Perencanaan Berbasis Data', title: '3.5 Matriks Implementasi Rencana Aksi' },
    'integrasi-snp': { group: '4. Dokumen Induk & Anggaran', title: '4.1 Integrasi 8 Standar Nasional (SNP)' },
    'integrasi-akreditasi': { group: '4. Dokumen Induk & Anggaran', title: '4.2 Kesiapan Akreditasi BAN-PDM' },
    'generator-rkjm': { group: '4. Dokumen Induk & Anggaran', title: '4.3 Generator Dokumen RKJM (4 Tahun)' },
    'generator-rkt': { group: '4. Dokumen Induk & Anggaran', title: '4.4 Generator Dokumen RKT (1 Tahun)' },
    'generator-rkas': { group: '4. Dokumen Induk & Anggaran', title: '4.5 Generator RKAS / ARKAS BOSP' },
    'program-kepsek': { group: '4. Dokumen Induk & Anggaran', title: '4.6 Program Kerja Kepala Sekolah' },
    'supervisi-akademik': { group: '5. Mutu Pembelajaran', title: '5.1 Supervisi Akademik & Manajerial (Data-Driven)' },
    'program-literasi': { group: '5. Mutu Pembelajaran', title: '5.2 Program Gerakan Literasi Sekolah' },
    'program-numerasi': { group: '5. Mutu Pembelajaran', title: '5.3 Program Akselerasi Numerasi' },
    'program-karakter': { group: '5. Mutu Pembelajaran', title: '5.4 Program Pembiasaan & Karakter' },
    'monitoring-evaluasi': { group: '6. Pengawasan dan Arsip', title: '6.1 Monitoring & Evaluasi Keterlaksanaan' },
    'regulasi-referensi': { group: '6. Pengawasan dan Arsip', title: '6.2 Pusat Regulasi & Landasan Hukum' },
    'dokumen-saya': { group: '6. Pengawasan dan Arsip', title: '6.3 Arsip Dokumen Saya' },
    'profil-pengguna': { group: '7. Tata Kelola Sistem', title: '7.1 Identitas & Profil Pengguna' },
    'hak-akses': { group: '7. Tata Kelola Sistem', title: '7.2 Hak Akses Pengguna (RBAC)' },
    'keamanan-backup': { group: '7. Tata Kelola Sistem', title: '7.3 Keamanan, Audit & Cadangan Data' },
  };

  const currentMeta = moduleTitles[activeMenu] || { group: 'SMART RAPOR', title: 'Sistem Terpadu' };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={(id) => setActiveMenu(id)}
        schoolName={db.schoolProfile.name}
      />

      {/* 2. Main Content Body */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentModuleTitle={currentMeta.title}
          moduleGroup={currentMeta.group}
          activeSchool={db.schoolProfile}
          currentUser={currentUser}
          onChangeUserRole={handleChangeUserRole}
          onOpenSchoolIdentity={() => setActiveMenu('identitas-sekolah')}
          onOpenUserProfile={() => setActiveMenu('profil-pengguna')}
          onResetRegistration={() => setShowHeaderResetConfirm(true)}
          onOpenQuickImport={() => setActiveMenu('impor-rapor')}
          onPrintPage={() => window.print()}
        />

        {/* Modal Konfirmasi Ganti Pengguna */}
        {showHeaderResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Daftar Pengguna & Identitas Sekolah Baru?
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Anda akan keluar dari sesi <strong>{currentUser.name}</strong> ({db.schoolProfile.name}) dan kembali ke halaman pengisian identitas pengguna baru. Pastikan sudah mengunduh cadangan (.json) bila data masih dibutuhkan.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHeaderResetConfirm(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetRegistration}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg whitespace-nowrap"
                >
                  Ya, Isi Identitas Baru
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeMenu === 'dashboard' && (
            <DashboardView
              db={db}
              onNavigate={(id) => setActiveMenu(id)}
              onTriggerAIAnalysis={handleTriggerAIAnalysis}
              isAILoading={isAILoading}
            />
          )}

          {activeMenu === 'identitas-sekolah' && (
            <IdentitasSekolahView
              schoolProfile={db.schoolProfile}
              onUpdateSchool={(updated) => {
                updateDb(
                  (prev) => StorageService.syncSchoolIdentityUpdate(prev, updated),
                  'Perbarui Identitas',
                  'Identitas Sekolah'
                );
              }}
            />
          )}

          {activeMenu === 'data-pendukung' && (
            <DataPendukungView
              supportingData={db.supportingData}
              onUpdateSupportingData={(updated) => {
                updateDb((prev) => ({ ...prev, supportingData: updated }), 'Perbarui Data Pendukung', 'Data Pendukung');
              }}
            />
          )}

          {activeMenu === 'impor-rapor' && (
            <ImporRaporView
              currentIndicators={db.raporIndicators}
              onApplyImportedIndicators={handleApplyImportedIndicators}
              schoolName={db.schoolProfile.name}
              raporSnapshots={db.raporSnapshots || []}
              activeRaporSnapshotId={db.activeRaporSnapshotId}
              activeRaporLabel={db.activeRaporLabel}
              activeCycleStats={{
                hasAnyData: hasActiveCycleData(db),
                indicatorsCount: db.raporIndicators.length,
                pbdCount: db.problems.length + db.rootCauses.length + db.recommendations.length + db.actionPlans.length,
                rkasAndDocsCount: db.rkasItems.length + db.principalPrograms.length + db.documents.length,
                mutuCount:
                  db.supervisionRecords.length +
                  db.literacyPrograms.length +
                  db.numeracyPrograms.length +
                  db.characterPrograms.length,
              }}
              onSaveCurrentSnapshot={handleSaveCurrentRaporSnapshot}
              onClearCurrentCycle={handleClearCurrentRaporCycle}
              onSwitchSnapshot={(id) => {
                handleSwitchRaporSnapshot(id);
                setActiveMenu('analisis-rapor');
              }}
              onDeleteSnapshot={handleDeleteRaporSnapshot}
            />
          )}

          {activeMenu === 'analisis-rapor' && (
            <AnalisisRaporView
              indicators={db.raporIndicators}
              schoolProfile={db.schoolProfile}
              academicYear={db.schoolProfile.academicYear}
              raporSnapshots={db.raporSnapshots || []}
              activeRaporSnapshotId={db.activeRaporSnapshotId}
              activeRaporLabel={db.activeRaporLabel}
              onSaveCurrentSnapshot={handleSaveCurrentRaporSnapshot}
              onSwitchSnapshot={handleSwitchRaporSnapshot}
              onDeleteSnapshot={handleDeleteRaporSnapshot}
              onNavigateToImport={() => setActiveMenu('impor-rapor')}
            />
          )}

          {activeMenu === 'identifikasi-masalah' && (
            <IdentifikasiMasalahView
              problems={db.problems}
              indicators={db.raporIndicators}
              schoolProfile={db.schoolProfile}
              onUpdateProblems={(problems) => {
                updateDb((prev) => ({ ...prev, problems }), 'Perbarui Identifikasi Masalah', 'Identifikasi Masalah');
              }}
              onNavigateToRefleksi={() => setActiveMenu('refleksi-akar-masalah')}
            />
          )}

          {activeMenu === 'refleksi-akar-masalah' && (
            <RefleksiAkarMasalahView
              rootCauses={db.rootCauses}
              problems={db.problems}
              indicators={db.raporIndicators}
              schoolProfile={db.schoolProfile}
              onUpdateRootCauses={(rootCauses) => {
                updateDb((prev) => ({ ...prev, rootCauses }), 'Perbarui Akar Masalah 5-Why', 'Refleksi Akar Masalah');
              }}
              onNavigateToRekomendasi={() => setActiveMenu('rekomendasi-pembenahan')}
            />
          )}

          {activeMenu === 'rekomendasi-pembenahan' && (
            <RekomendasiPembenahanView
              recommendations={db.recommendations}
              rootCauses={db.rootCauses}
              problems={db.problems}
              schoolProfile={db.schoolProfile}
              onUpdateRecommendations={(recommendations) => {
                updateDb((prev) => ({ ...prev, recommendations }), 'Perbarui Rekomendasi Benahi', 'Rekomendasi Pembenahan');
              }}
              onNavigateToImplementasi={() => setActiveMenu('implementasi-aksi')}
            />
          )}

          {activeMenu === 'implementasi-aksi' && (
            <ImplementasiAksiView
              actionPlans={db.actionPlans}
              recommendations={db.recommendations}
              indicators={db.raporIndicators}
              problems={db.problems}
              rootCauses={db.rootCauses}
              schoolProfile={db.schoolProfile}
              onUpdateActionPlans={(actionPlans) => {
                updateDb((prev) => ({ ...prev, actionPlans }), 'Perbarui Matriks Rencana Aksi', 'Implementasi Aksi');
              }}
              onSynthesizeAllFromPBD={handleSynthesizeAllFromPBD}
              onNavigateToRKAS={() => setActiveMenu('generator-rkas')}
              onNavigateMenu={(id) => setActiveMenu(id)}
            />
          )}

          {activeMenu === 'integrasi-snp' && (
            <IntegrasiSNPView
              snpData={db.snpData}
              schoolProfile={db.schoolProfile}
              onUpdateSnp={(snpData) => {
                updateDb((prev) => ({ ...prev, snpData }), 'Perbarui Pemetaan 8 SNP', 'Integrasi SNP');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
            />
          )}

          {activeMenu === 'integrasi-akreditasi' && (
            <AkreditasiView
              accreditationData={db.accreditationData}
              schoolProfile={db.schoolProfile}
              onUpdateAccreditation={(accreditationData) => {
                updateDb((prev) => ({ ...prev, accreditationData }), 'Perbarui Kesiapan Akreditasi', 'Akreditasi BAN-PDM');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
            />
          )}

          {activeMenu === 'generator-rkjm' && (
            <GeneratorRKJMView
              schoolProfile={db.schoolProfile}
              problems={db.problems}
              recommendations={db.recommendations}
              rkasItems={db.rkasItems}
              raporIndicators={db.raporIndicators}
              rootCauses={db.rootCauses}
              actionPlans={db.actionPlans}
              snpData={db.snpData}
              onUpdateRecommendations={(recommendations) => {
                updateDb((prev) => ({ ...prev, recommendations }), 'Perbarui Matriks RKJM', 'Generator RKJM');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(markdown, status) =>
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-rkjm',
                  title: `Rencana Kerja Jangka Menengah (RKJM) ${db.schoolProfile.name} (${db.schoolProfile.planningPeriod})`,
                  category: 'RKJM',
                  academicYear: db.schoolProfile.planningPeriod,
                  status,
                  fileFormat: 'DOCX',
                  contentMarkdown: markdown,
                })
              }
            />
          )}

          {activeMenu === 'generator-rkt' && (
            <GeneratorRKTView
              schoolProfile={db.schoolProfile}
              actionPlans={db.actionPlans}
              recommendations={db.recommendations}
              problems={db.problems}
              rootCauses={db.rootCauses}
              rkasItems={db.rkasItems}
              onUpdateActionPlans={(actionPlans) => {
                updateDb((prev) => ({ ...prev, actionPlans }), 'Perbarui Matriks RKT', 'Generator RKT');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(markdown, status) =>
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-rkt',
                  title: `Rencana Kerja Tahunan (RKT) Berbasis PBD ${db.schoolProfile.name} TP ${db.schoolProfile.academicYear}`,
                  category: 'RKT',
                  academicYear: db.schoolProfile.academicYear,
                  status,
                  fileFormat: 'DOCX',
                  contentMarkdown: markdown,
                })
              }
            />
          )}

          {activeMenu === 'generator-rkas' && (
            <GeneratorRKASView
              rkasItems={db.rkasItems}
              schoolProfile={db.schoolProfile}
              budgetCapTotal={db.supportingData.budgetCapTotal}
              problems={db.problems}
              supportingData={db.supportingData}
              onUpdateRKAS={(rkasItems) => {
                updateDb((prev) => ({ ...prev, rkasItems }), 'Perbarui RKAS BOSP', 'Generator RKAS');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(customMarkdown) => {
                const md = customMarkdown || buildDetailedRKASMarkdown(db, db.supportingData.budgetCapTotal);
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-rkas',
                  title: `RKAS BOSP Terintegrasi PBD ${db.schoolProfile.name} TP ${db.schoolProfile.academicYear}`,
                  category: 'RKAS',
                  academicYear: db.schoolProfile.academicYear,
                  status: 'Disahkan',
                  fileFormat: 'DOCX',
                  contentMarkdown: md,
                });
              }}
            />
          )}

          {activeMenu === 'program-kepsek' && (
            <ProgramKepsekView
              programs={db.principalPrograms}
              schoolProfile={db.schoolProfile}
              problems={db.problems}
              raporIndicators={db.raporIndicators}
              onUpdatePrograms={(principalPrograms) => {
                updateDb((prev) => ({ ...prev, principalPrograms }), 'Perbarui Program Kepala Sekolah', 'Program Kepala Sekolah');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(customMarkdown) => {
                const md = customMarkdown || buildDetailedPrincipalProgramMarkdown(db);
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-kepsek',
                  title: `Program Kerja Kepala Sekolah & Supervisi ${db.schoolProfile.name} TP ${db.schoolProfile.academicYear}`,
                  category: 'Kepala Sekolah',
                  academicYear: db.schoolProfile.academicYear,
                  status: 'Disahkan',
                  fileFormat: 'DOCX',
                  contentMarkdown: md,
                });
              }}
            />
          )}

          {activeMenu === 'supervisi-akademik' && (
            <SupervisiAkademikView
              records={db.supervisionRecords}
              schoolProfile={db.schoolProfile}
              raporIndicators={db.raporIndicators}
              rootCauses={db.rootCauses}
              onUpdateRecords={(supervisionRecords) => {
                updateDb((prev) => ({ ...prev, supervisionRecords }), 'Perbarui Supervisi Akademik & Manajerial', 'Supervisi Berbasis Data');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(markdown, status) =>
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-supervisi',
                  title: `Program Supervisi Akademik & Manajerial Berbasis Data (Rapor Pendidikan) ${db.schoolProfile.name}`,
                  category: 'Supervisi',
                  academicYear: db.schoolProfile.academicYear,
                  status,
                  fileFormat: 'DOCX',
                  contentMarkdown: markdown,
                })
              }
            />
          )}

          {activeMenu === 'program-literasi' && (
            <ProgramLiterasiView
              programs={db.literacyPrograms}
              schoolProfile={db.schoolProfile}
              raporIndicators={db.raporIndicators}
              rootCauses={db.rootCauses}
              onUpdatePrograms={(literacyPrograms) => {
                updateDb((prev) => ({ ...prev, literacyPrograms }), 'Perbarui Program Literasi', 'Program Literasi');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(markdown) =>
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-literasi',
                  title: `Program Gerakan Literasi Sekolah (GLS) ${db.schoolProfile.name} TP ${db.schoolProfile.academicYear}`,
                  category: 'Literasi Numerasi',
                  academicYear: db.schoolProfile.academicYear,
                  status: 'Disahkan',
                  fileFormat: 'DOCX',
                  contentMarkdown: markdown,
                })
              }
            />
          )}

          {activeMenu === 'program-numerasi' && (
            <ProgramNumerasiView
              programs={db.numeracyPrograms}
              schoolProfile={db.schoolProfile}
              raporIndicators={db.raporIndicators}
              rootCauses={db.rootCauses}
              onUpdatePrograms={(numeracyPrograms) => {
                updateDb((prev) => ({ ...prev, numeracyPrograms }), 'Perbarui Program Numerasi', 'Program Numerasi');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(markdown) =>
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-numerasi',
                  title: `Program Akselerasi Numerasi Kontekstual ${db.schoolProfile.name} TP ${db.schoolProfile.academicYear}`,
                  category: 'Literasi Numerasi',
                  academicYear: db.schoolProfile.academicYear,
                  status: 'Disahkan',
                  fileFormat: 'DOCX',
                  contentMarkdown: markdown,
                })
              }
            />
          )}

          {activeMenu === 'program-karakter' && (
            <ProgramKarakterView
              programs={db.characterPrograms}
              schoolProfile={db.schoolProfile}
              raporIndicators={db.raporIndicators}
              onUpdatePrograms={(characterPrograms) => {
                updateDb((prev) => ({ ...prev, characterPrograms }), 'Perbarui Program Karakter', 'Program Karakter');
              }}
              onSyncFromPbd={() => handleSynthesizeAllFromPBD({ preserveManualItems: true })}
              onSaveToArchive={(markdown) =>
                handleSaveArchiveDoc({
                  id: 'pbd-gen-doc-karakter',
                  title: `Program Pembiasaan & Penguatan Karakter (PPKSP) ${db.schoolProfile.name} TP ${db.schoolProfile.academicYear}`,
                  category: 'Karakter',
                  academicYear: db.schoolProfile.academicYear,
                  status: 'Disahkan',
                  fileFormat: 'DOCX',
                  contentMarkdown: markdown,
                })
              }
            />
          )}

          {activeMenu === 'monitoring-evaluasi' && (
            <MonevDashboardView
              actionPlans={db.actionPlans}
              rkasItems={db.rkasItems}
              schoolProfile={db.schoolProfile}
            />
          )}

          {activeMenu === 'regulasi-referensi' && (
            <RegulasiView
              regulations={StorageService.getRegulations()}
              onUpdateRegulations={(regs) => {
                StorageService.saveRegulations(regs);
                StorageService.logActivity(currentUser.name, currentUser.role, 'Perbarui Regulasi', 'Pusat Regulasi', 'Database regulasi disinkronkan');
              }}
            />
          )}

          {activeMenu === 'dokumen-saya' && (
            <DokumenSayaView
              documents={db.documents}
              schoolProfile={db.schoolProfile}
              currentUserName={currentUser.name}
              onUpdateDocuments={(documents) => {
                updateDb((prev) => ({ ...prev, documents }), 'Perbarui Dokumen Saya', 'Dokumen Saya');
              }}
            />
          )}

          {activeMenu === 'profil-pengguna' && (
            <ProfilPenggunaView
              currentUser={currentUser}
              schoolProfile={db.schoolProfile}
              onUpdateUser={handleUpdateUserProfile}
              onNavigate={(id) => setActiveMenu(id)}
              onResetRegistration={handleResetRegistration}
            />
          )}

          {activeMenu === 'hak-akses' && (
            <HakAksesView
              currentUser={currentUser}
              onChangeUserRole={handleChangeUserRole}
            />
          )}

          {activeMenu === 'keamanan-backup' && (
            <KeamananBackupView
              auditLogs={StorageService.getAuditLogs()}
              schoolProfile={db.schoolProfile}
              onRefreshData={() => {
                setDb(StorageService.getSchoolDatabase(activeSchoolId));
                setCurrentUser(StorageService.getCurrentUser());
                setIsRegistered(StorageService.isUserRegistered());
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
