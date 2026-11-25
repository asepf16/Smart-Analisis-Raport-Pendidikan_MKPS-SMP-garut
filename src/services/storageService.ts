import {
  SchoolProfile,
  SupportingData,
  RaporIndicator,
  IdentifiedProblem,
  RootCauseReflection,
  RecommendationBenahi,
  ActionPlanItem,
  SNPStandardItem,
  AccreditationItem,
  RKASItem,
  PrincipalProgramItem,
  TeacherSupervisionRecord,
  LiteracyProgramItem,
  NumeracyProgramItem,
  CharacterProgramItem,
  OfficialDocument,
  RegulationItem,
  AuditLogItem,
  UserProfile,
  UserRole,
  SavedRaporSnapshot,
} from '../types';
import {
  INITIAL_SCHOOLS,
  INITIAL_USERS,
  INITIAL_SUPPORTING_DATA,
  INITIAL_RAPOR_INDICATORS,
  INITIAL_PROBLEMS,
  INITIAL_ROOT_CAUSES,
  INITIAL_RECOMMENDATIONS,
  INITIAL_ACTION_PLANS,
  INITIAL_SNP_DATA,
  INITIAL_ACCREDITATION_DATA,
  INITIAL_RKAS_ITEMS,
  INITIAL_PRINCIPAL_PROGRAMS,
  INITIAL_SUPERVISION_RECORDS,
  INITIAL_LITERACY_PROGRAMS,
  INITIAL_NUMERACY_PROGRAMS,
  INITIAL_CHARACTER_PROGRAMS,
  INITIAL_DOCUMENTS,
  INITIAL_REGULATIONS,
} from './sampleData';
import {
  buildDefaultLetterhead,
  hasStaleSchoolReferences,
  syncDocumentsWithSchoolProfile,
  syncLetterheadWithProfile,
} from './schoolIdentitySync';

const STORAGE_PREFIX = 'smart_rapor_v2_';
const ACTIVE_SCHOOL_DEFAULT_ID = 'school-user-active';

export interface SchoolDatabase {
  schoolProfile: SchoolProfile;
  supportingData: SupportingData;
  raporIndicators: RaporIndicator[];
  problems: IdentifiedProblem[];
  rootCauses: RootCauseReflection[];
  recommendations: RecommendationBenahi[];
  actionPlans: ActionPlanItem[];
  snpData: SNPStandardItem[];
  accreditationData: AccreditationItem[];
  rkasItems: RKASItem[];
  principalPrograms: PrincipalProgramItem[];
  supervisionRecords: TeacherSupervisionRecord[];
  literacyPrograms: LiteracyProgramItem[];
  numeracyPrograms: NumeracyProgramItem[];
  characterPrograms: CharacterProgramItem[];
  documents: OfficialDocument[];
  raporSnapshots?: SavedRaporSnapshot[];
  activeRaporSnapshotId?: string;
  activeRaporLabel?: string;
}

function clonePayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createEmptyCycleWorkspace() {
  return {
    raporIndicators: [] as RaporIndicator[],
    problems: [] as IdentifiedProblem[],
    rootCauses: [] as RootCauseReflection[],
    recommendations: [] as RecommendationBenahi[],
    actionPlans: [] as ActionPlanItem[],
    snpData: INITIAL_SNP_DATA.map((std) => ({
      ...std,
      actualCondition: 'Belum dipetakan (Lakukan analisis Rapor Pendidikan terlebih dahulu).',
      gapAnalysis: '-',
      relatedPrograms: [],
      compliancePercentage: 0,
    })),
    accreditationData: INITIAL_ACCREDITATION_DATA.map((item) => ({
      ...item,
      physicalEvidenceUploaded: false,
      digitalEvidenceUploaded: false,
      readinessStatus: 'Belum Ada' as const,
    })),
    rkasItems: [] as RKASItem[],
    principalPrograms: [] as PrincipalProgramItem[],
    supervisionRecords: [] as TeacherSupervisionRecord[],
    literacyPrograms: [] as LiteracyProgramItem[],
    numeracyPrograms: [] as NumeracyProgramItem[],
    characterPrograms: [] as CharacterProgramItem[],
    documents: [] as OfficialDocument[],
  };
}

export function hasActiveCycleData(db: SchoolDatabase): boolean {
  return (
    db.raporIndicators.length > 0 ||
    db.problems.length > 0 ||
    db.rootCauses.length > 0 ||
    db.recommendations.length > 0 ||
    db.actionPlans.length > 0 ||
    db.rkasItems.length > 0 ||
    db.principalPrograms.length > 0 ||
    db.supervisionRecords.length > 0 ||
    db.literacyPrograms.length > 0 ||
    db.numeracyPrograms.length > 0 ||
    db.characterPrograms.length > 0 ||
    db.documents.length > 0
  );
}

export function createSnapshotFromDatabase(
  db: SchoolDatabase,
  overrides?: {
    id?: string;
    label?: string;
    year?: string;
    sourceName?: string;
  }
): SavedRaporSnapshot {
  const nowIso = new Date().toISOString();
  return {
    id: overrides?.id || db.activeRaporSnapshotId || `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label:
      overrides?.label?.trim() ||
      db.activeRaporLabel ||
      `Arsip Rapor & PBD (${new Date().toLocaleDateString('id-ID')})`,
    year:
      overrides?.year?.trim() ||
      String(db.raporIndicators[0]?.year || db.schoolProfile.academicYear),
    sourceName: overrides?.sourceName || db.activeRaporLabel || 'Siklus Rapor, PBD & Mutu Pembelajaran',
    savedAt: nowIso,
    indicators: clonePayload(db.raporIndicators || []),
    problems: clonePayload(db.problems || []),
    rootCauses: clonePayload(db.rootCauses || []),
    recommendations: clonePayload(db.recommendations || []),
    actionPlans: clonePayload(db.actionPlans || []),
    snpData: clonePayload(db.snpData || []),
    accreditationData: clonePayload(db.accreditationData || []),
    rkasItems: clonePayload(db.rkasItems || []),
    principalPrograms: clonePayload(db.principalPrograms || []),
    supervisionRecords: clonePayload(db.supervisionRecords || []),
    literacyPrograms: clonePayload(db.literacyPrograms || []),
    numeracyPrograms: clonePayload(db.numeracyPrograms || []),
    characterPrograms: clonePayload(db.characterPrograms || []),
    documents: clonePayload(db.documents || []),
  };
}

export interface UserRegistrationPayload {
  user: {
    name: string;
    email: string;
    role: UserRole;
    nip?: string;
    phone?: string;
    positionTitle?: string;
  };
  school: {
    name: string;
    npsn: string;
    stage: SchoolProfile['stage'];
    status: SchoolProfile['status'];
    address?: string;
    district?: string;
    city: string;
    province: string;
    academicYear: string;
    principalName?: string;
    principalNip?: string;
    totalStudents?: number;
    totalTeachers?: number;
  };
  initMode: 'template' | 'empty';
}

export class StorageService {
  // 1. User Self-Registration Status
  static isUserRegistered(): boolean {
    const flag = localStorage.getItem(`${STORAGE_PREFIX}is_registered`);
    const userRaw = localStorage.getItem(`${STORAGE_PREFIX}current_user`);
    return flag === 'true' && Boolean(userRaw);
  }

  static registerUserIdentity(payload: UserRegistrationPayload): {
    user: UserProfile;
    db: SchoolDatabase;
  } {
    const schoolId = ACTIVE_SCHOOL_DEFAULT_ID;
    const nowIso = new Date().toISOString();

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: payload.user.name.trim(),
      email: payload.user.email.trim(),
      role: payload.user.role,
      schoolId,
      nip: payload.user.nip?.trim() || undefined,
      phone: payload.user.phone?.trim() || undefined,
      positionTitle: payload.user.positionTitle?.trim() || undefined,
      registeredAt: nowIso,
    };

    const totalStudents = payload.school.totalStudents && payload.school.totalStudents > 0
      ? payload.school.totalStudents
      : payload.initMode === 'template'
        ? 480
        : 0;

    const totalTeachers = payload.school.totalTeachers && payload.school.totalTeachers > 0
      ? payload.school.totalTeachers
      : payload.initMode === 'template'
        ? 28
        : 0;

    const principalName =
      payload.school.principalName?.trim() ||
      (payload.user.role === 'kepala_sekolah' ? newUser.name : 'Kepala Sekolah (Belum Diisi)');

    const principalNip =
      payload.school.principalNip?.trim() ||
      (payload.user.role === 'kepala_sekolah' ? newUser.nip : undefined);

    const newSchool: SchoolProfile = {
      id: schoolId,
      npsn: payload.school.npsn.trim(),
      name: payload.school.name.trim(),
      stage: payload.school.stage,
      status: payload.school.status,
      address: payload.school.address?.trim() || '-',
      village: '-',
      district: payload.school.district?.trim() || '-',
      city: payload.school.city.trim(),
      province: payload.school.province.trim(),
      postalCode: '-',
      phone: payload.user.phone?.trim() || '-',
      email: payload.user.email.trim(),
      principalName,
      principalNip,
      establishedYear: new Date().getFullYear(),
      accreditationGrade: 'A',
      accreditationYear: new Date().getFullYear(),
      totalStudents,
      totalStudyGroups: totalStudents > 0 ? Math.max(6, Math.round(totalStudents / 32)) : 0,
      totalTeachers,
      totalStaff: totalTeachers > 0 ? Math.max(2, Math.round(totalTeachers / 4)) : 0,
      vision:
        'Terwujudnya peserta didik yang berakhlak mulia, bernalar kritis, unggul dalam literasi dan numerasi, serta berdaya saing.',
      mission:
        '1. Menyelenggarakan pembelajaran bermakna yang berpusat pada peserta didik.\n2. Menguatkan budaya literasi, numerasi, dan karakter positif di seluruh ekosistem sekolah.\n3. Melaksanakan perencanaan berbasis data dan pengelolaan anggaran yang akuntabel.',
      goals:
        'Meningkatkan capaian seluruh indikator Rapor Pendidikan dan kualitas layanan pembelajaran secara berkelanjutan.',
      letterheadText: `PEMERINTAH ${payload.school.city.trim().toUpperCase()} - DINAS PENDIDIKAN\n${payload.school.name.trim().toUpperCase()}\nNPSN: ${payload.school.npsn.trim()} - AKREDITASI A`,
      academicYear: payload.school.academicYear.trim() || '2025/2026',
      planningPeriod: '2025 - 2029',
    };
    newSchool.letterheadText = buildDefaultLetterhead(newSchool);

    const emptySupportingData: SupportingData = {
      studentsSummary: {
        maleCount: Math.floor(totalStudents / 2),
        femaleCount: totalStudents - Math.floor(totalStudents / 2),
        specialNeedsCount: 0,
        kipPipCount: 0,
      },
      teachersSummary: {
        certifiedCount: 0,
        civilServantCount: 0,
        p3kCount: 0,
        honoraryCount: 0,
      },
      facilitiesSummary: {
        classroomsCount: newSchool.totalStudyGroups,
        goodConditionCount: newSchool.totalStudyGroups,
        moderateDamageCount: 0,
        severeDamageCount: 0,
        libraryCondition: 'Baik',
        laboratoriesCount: 0,
        sanitationStatus: 'Layak',
        computerLabCount: 0,
      },
      curriculum: 'Kurikulum Merdeka',
      averageSupervisionScore: 0,
      studentAchievementsCount: 0,
      budgetCapTotal: totalStudents > 0 ? totalStudents * 1000000 : 150000000,
    };

    const syncedTemplateDocs = syncDocumentsWithSchoolProfile(INITIAL_DOCUMENTS, newSchool);
    const templateSnapshot: SavedRaporSnapshot = {
      id: 'snap-simulasi-2025',
      label: 'Rapor Pendidikan Simulasi 2025',
      year: '2025',
      sourceName: 'Data Simulasi Resmi Kemendikdasmen',
      savedAt: nowIso,
      indicators: clonePayload(INITIAL_RAPOR_INDICATORS),
      problems: clonePayload(INITIAL_PROBLEMS),
      rootCauses: clonePayload(INITIAL_ROOT_CAUSES),
      recommendations: clonePayload(INITIAL_RECOMMENDATIONS),
      actionPlans: clonePayload(INITIAL_ACTION_PLANS),
      snpData: clonePayload(INITIAL_SNP_DATA),
      accreditationData: clonePayload(INITIAL_ACCREDITATION_DATA),
      rkasItems: clonePayload(INITIAL_RKAS_ITEMS),
      principalPrograms: clonePayload(INITIAL_PRINCIPAL_PROGRAMS),
      supervisionRecords: clonePayload(INITIAL_SUPERVISION_RECORDS),
      literacyPrograms: clonePayload(INITIAL_LITERACY_PROGRAMS),
      numeracyPrograms: clonePayload(INITIAL_NUMERACY_PROGRAMS),
      characterPrograms: clonePayload(INITIAL_CHARACTER_PROGRAMS),
      documents: clonePayload(syncedTemplateDocs),
    };

    const initialDb: SchoolDatabase =
      payload.initMode === 'template'
        ? {
            schoolProfile: newSchool,
            supportingData: {
              ...INITIAL_SUPPORTING_DATA,
              budgetCapTotal:
                totalStudents > 0 ? totalStudents * 1100000 : INITIAL_SUPPORTING_DATA.budgetCapTotal,
            },
            raporIndicators: INITIAL_RAPOR_INDICATORS,
            problems: INITIAL_PROBLEMS,
            rootCauses: INITIAL_ROOT_CAUSES,
            recommendations: INITIAL_RECOMMENDATIONS,
            actionPlans: INITIAL_ACTION_PLANS,
            snpData: INITIAL_SNP_DATA,
            accreditationData: INITIAL_ACCREDITATION_DATA,
            rkasItems: INITIAL_RKAS_ITEMS,
            principalPrograms: INITIAL_PRINCIPAL_PROGRAMS,
            supervisionRecords: INITIAL_SUPERVISION_RECORDS,
            literacyPrograms: INITIAL_LITERACY_PROGRAMS,
            numeracyPrograms: INITIAL_NUMERACY_PROGRAMS,
            characterPrograms: INITIAL_CHARACTER_PROGRAMS,
            documents: syncedTemplateDocs,
            raporSnapshots: [templateSnapshot],
            activeRaporSnapshotId: templateSnapshot.id,
            activeRaporLabel: templateSnapshot.label,
          }
        : {
            schoolProfile: newSchool,
            supportingData: emptySupportingData,
            ...createEmptyCycleWorkspace(),
            raporSnapshots: [],
            activeRaporLabel: 'Belum Ada Data Rapor',
          };

    localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(newUser));
    localStorage.setItem(`${STORAGE_PREFIX}active_school_id`, schoolId);
    localStorage.setItem(`${STORAGE_PREFIX}schools`, JSON.stringify([newSchool]));
    localStorage.setItem(`${STORAGE_PREFIX}school_data_${schoolId}`, JSON.stringify(initialDb));
    localStorage.setItem(`${STORAGE_PREFIX}is_registered`, 'true');

    this.logActivity(
      newUser.name,
      newUser.role,
      'Registrasi Pengguna & Sekolah',
      'Identitas Pengguna',
      `${newUser.name} terdaftar otomatis sebagai pengguna aplikasi untuk ${newSchool.name} (${payload.initMode === 'template' ? 'Data Contoh' : 'Ruang Kerja Kosong'}).`
    );

    return { user: newUser, db: initialDb };
  }

  static resetUserRegistration(): void {
    const activeId = this.getActiveSchoolId();
    localStorage.removeItem(`${STORAGE_PREFIX}is_registered`);
    localStorage.removeItem(`${STORAGE_PREFIX}current_user`);
    localStorage.removeItem(`${STORAGE_PREFIX}active_school_id`);
    localStorage.removeItem(`${STORAGE_PREFIX}schools`);
    localStorage.removeItem(`${STORAGE_PREFIX}school_data_${activeId}`);
  }

  // 2. Active School Helpers (Single-School Bound to Registered User)
  static getSchools(): SchoolProfile[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}schools`);
    if (!raw) {
      return [INITIAL_SCHOOLS[0]];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_SCHOOLS[0]];
    } catch {
      return [INITIAL_SCHOOLS[0]];
    }
  }

  static saveSchools(schools: SchoolProfile[]): void {
    localStorage.setItem(`${STORAGE_PREFIX}schools`, JSON.stringify(schools));
  }

  static getActiveSchoolId(): string {
    const active = localStorage.getItem(`${STORAGE_PREFIX}active_school_id`);
    if (active) return active;
    return ACTIVE_SCHOOL_DEFAULT_ID;
  }

  static setActiveSchoolId(id: string): void {
    localStorage.setItem(`${STORAGE_PREFIX}active_school_id`, id);
  }

  // 3. User & Session Management
  static getCurrentUser(): UserProfile {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}current_user`);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    return INITIAL_USERS[0];
  }

  static setCurrentUser(user: UserProfile): void {
    localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(user));
    this.logActivity(user.name, user.role, 'Perbarui Profil / Peran', 'Identitas Pengguna', `Profil aktif: ${user.name} (${user.role})`);
  }

  static updateCurrentUserProfile(user: UserProfile): void {
    localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(user));
    this.logActivity(user.name, user.role, 'Perbarui Identitas Pengguna', 'Profil Pengguna', `Identitas pengguna ${user.name} (${user.email}) diperbarui.`);
  }

  // 4. Isolated School Database (Single Source of Truth for Registered School)
  static getSchoolDatabase(schoolId?: string): SchoolDatabase {
    const id = schoolId || this.getActiveSchoolId();
    const key = `${STORAGE_PREFIX}school_data_${id}`;
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SchoolDatabase;
        if (parsed?.schoolProfile && hasStaleSchoolReferences(parsed.schoolProfile, parsed.documents || [])) {
          const cleanedSchool: SchoolProfile = {
            ...parsed.schoolProfile,
            letterheadText: syncLetterheadWithProfile(
              parsed.schoolProfile.letterheadText,
              parsed.schoolProfile
            ),
          };
          const cleanedDb: SchoolDatabase = {
            ...parsed,
            schoolProfile: cleanedSchool,
            documents: syncDocumentsWithSchoolProfile(parsed.documents || [], cleanedSchool),
          };
          localStorage.setItem(key, JSON.stringify(cleanedDb));
          this.saveSchools([cleanedSchool]);
          return cleanedDb;
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing school database:', e);
      }
    }

    const schools = this.getSchools();
    const currentSchool = schools.find((s) => s.id === id) || schools[0] || INITIAL_SCHOOLS[0];
    const syncedSchool: SchoolProfile = {
      ...currentSchool,
      letterheadText: syncLetterheadWithProfile(currentSchool.letterheadText, currentSchool),
    };

    const initialDb: SchoolDatabase = {
      schoolProfile: syncedSchool,
      supportingData: INITIAL_SUPPORTING_DATA,
      raporIndicators: INITIAL_RAPOR_INDICATORS,
      problems: INITIAL_PROBLEMS,
      rootCauses: INITIAL_ROOT_CAUSES,
      recommendations: INITIAL_RECOMMENDATIONS,
      actionPlans: INITIAL_ACTION_PLANS,
      snpData: INITIAL_SNP_DATA,
      accreditationData: INITIAL_ACCREDITATION_DATA,
      rkasItems: INITIAL_RKAS_ITEMS,
      principalPrograms: INITIAL_PRINCIPAL_PROGRAMS,
      supervisionRecords: INITIAL_SUPERVISION_RECORDS,
      literacyPrograms: INITIAL_LITERACY_PROGRAMS,
      numeracyPrograms: INITIAL_NUMERACY_PROGRAMS,
      characterPrograms: INITIAL_CHARACTER_PROGRAMS,
      documents: syncDocumentsWithSchoolProfile(INITIAL_DOCUMENTS, syncedSchool),
    };

    localStorage.setItem(key, JSON.stringify(initialDb));
    return initialDb;
  }

  static syncSchoolIdentityUpdate(
    prevDb: SchoolDatabase,
    updatedSchool: SchoolProfile
  ): SchoolDatabase {
    const syncedLetterhead = syncLetterheadWithProfile(
      updatedSchool.letterheadText,
      updatedSchool,
      prevDb.schoolProfile
    );
    const nextSchool: SchoolProfile = {
      ...updatedSchool,
      letterheadText: syncedLetterhead,
    };
    return {
      ...prevDb,
      schoolProfile: nextSchool,
      documents: syncDocumentsWithSchoolProfile(
        prevDb.documents || [],
        nextSchool,
        prevDb.schoolProfile
      ),
    };
  }

  static saveSchoolDatabase(data: SchoolDatabase, schoolId?: string): void {
    const id = schoolId || this.getActiveSchoolId();
    const key = `${STORAGE_PREFIX}school_data_${id}`;
    localStorage.setItem(key, JSON.stringify(data));
    this.saveSchools([data.schoolProfile]);
  }

  // 5. Regulations Management (Global)
  static getRegulations(): RegulationItem[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}regulations`);
    if (!raw) {
      localStorage.setItem(`${STORAGE_PREFIX}regulations`, JSON.stringify(INITIAL_REGULATIONS));
      return INITIAL_REGULATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_REGULATIONS;
    }
  }

  static saveRegulations(regs: RegulationItem[]): void {
    localStorage.setItem(`${STORAGE_PREFIX}regulations`, JSON.stringify(regs));
  }

  // 6. Audit Logging
  static getAuditLogs(): AuditLogItem[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}audit_logs`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static logActivity(userName: string, userRole: UserRole, action: string, moduleName: string, details: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userName,
      userRole,
      action,
      moduleName,
      details,
    };
    logs.unshift(newLog);
    if (logs.length > 100) logs.pop();
    localStorage.setItem(`${STORAGE_PREFIX}audit_logs`, JSON.stringify(logs));
  }

  // 7. Backup & Restore
  static exportFullBackupJSON(): string {
    const activeSchoolId = this.getActiveSchoolId();
    const currentUser = this.getCurrentUser();
    const schools = this.getSchools();
    const db = this.getSchoolDatabase(activeSchoolId);
    const regulations = this.getRegulations();
    const logs = this.getAuditLogs();

    const backupPayload = {
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      activeSchoolId,
      currentUser,
      isRegistered: this.isUserRegistered(),
      schools,
      schoolData: db,
      regulations,
      auditLogs: logs,
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  static restoreFullBackupJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data.schoolData) {
        throw new Error('Format file backup tidak valid');
      }

      const activeId = data.activeSchoolId || this.getActiveSchoolId();
      this.setActiveSchoolId(activeId);

      if (data.currentUser) {
        localStorage.setItem(`${STORAGE_PREFIX}current_user`, JSON.stringify(data.currentUser));
        localStorage.setItem(`${STORAGE_PREFIX}is_registered`, 'true');
      }

      if (Array.isArray(data.schools)) {
        this.saveSchools(data.schools);
      }

      this.saveSchoolDatabase(data.schoolData, activeId);

      if (Array.isArray(data.regulations)) {
        this.saveRegulations(data.regulations);
      }

      this.logActivity('System', 'super_admin', 'Restore Database', 'Pengaturan & Keamanan', 'Berhasil memulihkan database dan identitas pengguna dari file cadangan.');
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  }

  // 8. Reset current school's PBD data to Official Simulation Data (keeping registered user & school identity)
  static resetToSimulationData(): void {
    const activeId = this.getActiveSchoolId();
    const currentDb = this.getSchoolDatabase(activeId);
    const currentUser = this.getCurrentUser();

    const syncedSimDocs = syncDocumentsWithSchoolProfile(INITIAL_DOCUMENTS, currentDb.schoolProfile);
    const simSnapshot: SavedRaporSnapshot = {
      id: 'snap-simulasi-2025',
      label: 'Rapor Pendidikan Simulasi 2025',
      year: '2025',
      sourceName: 'Data Simulasi Resmi Kemendikdasmen',
      savedAt: new Date().toISOString(),
      indicators: clonePayload(INITIAL_RAPOR_INDICATORS),
      problems: clonePayload(INITIAL_PROBLEMS),
      rootCauses: clonePayload(INITIAL_ROOT_CAUSES),
      recommendations: clonePayload(INITIAL_RECOMMENDATIONS),
      actionPlans: clonePayload(INITIAL_ACTION_PLANS),
      snpData: clonePayload(INITIAL_SNP_DATA),
      accreditationData: clonePayload(INITIAL_ACCREDITATION_DATA),
      rkasItems: clonePayload(INITIAL_RKAS_ITEMS),
      principalPrograms: clonePayload(INITIAL_PRINCIPAL_PROGRAMS),
      supervisionRecords: clonePayload(INITIAL_SUPERVISION_RECORDS),
      literacyPrograms: clonePayload(INITIAL_LITERACY_PROGRAMS),
      numeracyPrograms: clonePayload(INITIAL_NUMERACY_PROGRAMS),
      characterPrograms: clonePayload(INITIAL_CHARACTER_PROGRAMS),
      documents: clonePayload(syncedSimDocs),
    };

    const existingSnapshots = (currentDb.raporSnapshots || []).filter(
      (s) => s.id !== simSnapshot.id
    );

    const initialDb: SchoolDatabase = {
      schoolProfile: currentDb.schoolProfile,
      supportingData: INITIAL_SUPPORTING_DATA,
      raporIndicators: INITIAL_RAPOR_INDICATORS,
      problems: INITIAL_PROBLEMS,
      rootCauses: INITIAL_ROOT_CAUSES,
      recommendations: INITIAL_RECOMMENDATIONS,
      actionPlans: INITIAL_ACTION_PLANS,
      snpData: INITIAL_SNP_DATA,
      accreditationData: INITIAL_ACCREDITATION_DATA,
      rkasItems: INITIAL_RKAS_ITEMS,
      principalPrograms: INITIAL_PRINCIPAL_PROGRAMS,
      supervisionRecords: INITIAL_SUPERVISION_RECORDS,
      literacyPrograms: INITIAL_LITERACY_PROGRAMS,
      numeracyPrograms: INITIAL_NUMERACY_PROGRAMS,
      characterPrograms: INITIAL_CHARACTER_PROGRAMS,
      documents: syncedSimDocs,
      raporSnapshots: [simSnapshot, ...existingSnapshots],
      activeRaporSnapshotId: simSnapshot.id,
      activeRaporLabel: simSnapshot.label,
    };

    this.saveSchoolDatabase(initialDb, activeId);
    this.saveRegulations(INITIAL_REGULATIONS);
    this.logActivity(currentUser.name, currentUser.role, 'Muat Data Simulasi', 'Sistem', `Mengisi ruang kerja ${currentDb.schoolProfile.name} dengan data simulasi resmi Kemendikdasmen.`);
  }
}
