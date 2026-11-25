export type UserRole = 'super_admin' | 'admin_sekolah' | 'kepala_sekolah' | 'guru_tpmps' | 'bendahara';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  nip?: string;
  phone?: string;
  positionTitle?: string;
  registeredAt?: string;
  avatarUrl?: string;
}

export interface SchoolProfile {
  id: string;
  npsn: string;
  name: string;
  stage: 'SD' | 'SMP' | 'SMA' | 'SMK';
  status: 'Negeri' | 'Swasta';
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  principalName: string;
  principalNip?: string;
  establishedYear: number;
  accreditationGrade: 'A' | 'B' | 'C' | 'Belum Terakreditasi';
  accreditationYear: number;
  totalStudents: number;
  totalStudyGroups: number; // rombel
  totalTeachers: number;
  totalStaff: number;
  vision: string;
  mission: string;
  goals: string;
  letterheadText?: string; // kop surat
  logoUrl?: string;
  academicYear: string;
  planningPeriod: string; // e.g. "2024 - 2028"
}

export interface SupportingData {
  studentsSummary: {
    maleCount: number;
    femaleCount: number;
    specialNeedsCount: number;
    kipPipCount: number;
  };
  teachersSummary: {
    certifiedCount: number;
    civilServantCount: number;
    p3kCount: number;
    honoraryCount: number;
  };
  facilitiesSummary: {
    classroomsCount: number;
    goodConditionCount: number;
    moderateDamageCount: number;
    severeDamageCount: number;
    libraryCondition: 'Baik' | 'Sedang' | 'Kurang';
    laboratoriesCount: number;
    sanitationStatus: 'Layak' | 'Cukup' | 'Kurang';
    computerLabCount: number;
  };
  curriculum: string; // "Kurikulum Merdeka"
  averageSupervisionScore: number;
  studentAchievementsCount: number;
  budgetCapTotal: number; // Pagu Anggaran BOSP
}

export interface RaporIndicator {
  id: string;
  code: string; // e.g., "A.1", "A.2", "D.1"
  dimension: string; // e.g., "Mutu Hasil Belajar", "Kualitas Pembelajaran"
  name: string;
  score: number; // 0 - 100
  category: 'Mahir' | 'Cakap' | 'Dasar' | 'Perlu Intervensi Khusus' | 'Baik' | 'Sedang' | 'Kurang';
  changeFromLastYear: number; // e.g., +3.2, -1.5
  year: number;
  priorityLevel: 'Tinggi' | 'Sedang' | 'Rendah';
  nationalAverage?: number;
  districtAverage?: number;
  kemendikbudRootCause?: string;
  kemendikbudInspirasiBenahi?: string;
  aiAnalysis?: string;
}

export interface SavedRaporSnapshot {
  id: string;
  label: string;
  year: string;
  sourceName: string;
  savedAt: string;
  indicators: RaporIndicator[];
  problems?: IdentifiedProblem[];
  rootCauses?: RootCauseReflection[];
  recommendations?: RecommendationBenahi[];
  actionPlans?: ActionPlanItem[];
  snpData?: SNPStandardItem[];
  accreditationData?: AccreditationItem[];
  rkasItems?: RKASItem[];
  principalPrograms?: PrincipalProgramItem[];
  supervisionRecords?: TeacherSupervisionRecord[];
  literacyPrograms?: LiteracyProgramItem[];
  numeracyPrograms?: NumeracyProgramItem[];
  characterPrograms?: CharacterProgramItem[];
  documents?: OfficialDocument[];
}

export interface IdentifiedProblem {
  id: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  actualCondition: string;
  mainProblem: string;
  dataProof: string;
  priority: 'Prioritas 1 (Mendesak)' | 'Prioritas 2 (Tinggi)' | 'Prioritas 3 (Sedang)';
  status: 'Draf' | 'Disetujui' | 'Direvisi';
  selectedForPBD: boolean;
}

export interface RootCauseReflection {
  id: string;
  problemId: string;
  mainProblem: string;
  symptoms: string[];
  whyChain: string[]; // 5-Why
  rootCause: string;
  controllableFactors: string[];
  uncontrollableFactors: string[];
  isVerifiedBySchool: boolean;
}

export interface RecommendationBenahi {
  id: string;
  problemId: string;
  rootCauseId: string;
  title: string;
  type: 'Benahi 1 (Kompetensi GTK/Tata Kelola)' | 'Benahi 2 (Pengadaan Sarana/Anggaran)' | 'Benahi 3 (Budaya Sekolah & Pembelajaran)';
  objective: string;
  strategy: string;
  activities: string[];
  pic: string;
  targetAudience: string;
  successIndicator: string;
  targetValue: string;
  timeline: string;
  resourceNeeds: string;
  estimatedCost: number;
  requiresBudget: boolean;
}

export interface ActionPlanItem {
  id: string;
  recommendationId: string;
  activityName: string;
  pic: string;
  timeline: string;
  indicator: string;
  target: string;
  status: 'Belum direncanakan' | 'Direncanakan' | 'Sedang dilaksanakan' | 'Selesai' | 'Perlu tindak lanjut';
  budgetAllocated: number;
  actualBudgetSpent?: number;
  evidenceNotes?: string;
  evidenceUrl?: string;
  completionDate?: string;
}

export interface SNPStandardItem {
  standardNumber: number; // 1 - 8
  standardName: string; // e.g. "Standar Kompetensi Lulusan"
  actualCondition: string;
  gapAnalysis: string;
  targetImprovement: string;
  relatedPrograms: string[];
  compliancePercentage: number;
}

export interface AccreditationItem {
  id: string;
  component: 'Kinerja Pendidik' | 'Kepemimpinan Kepala Sekolah' | 'Iklim Lingkungan Belajar' | 'Hasil Belajar Peserta Didik';
  indicatorCode: string;
  indicatorTitle: string;
  description: string;
  requiredEvidence: string[];
  physicalEvidenceUploaded: boolean;
  digitalEvidenceUploaded: boolean;
  readinessStatus: 'Sangat Siap' | 'Siap' | 'Kurang Siap' | 'Belum Ada';
  scoreTarget: number;
}

export interface RKASItem {
  id: string;
  actionPlanId?: string;
  programName: string;
  activityName: string;
  bospCode: string; // e.g. "03.02.01"
  componentCategory: string; // e.g. "Pengembangan Perpustakaan", "Kegiatan Pembelajaran dan Ekstrakurikuler"
  volume: number;
  unit: string; // e.g., "Paket", "Orang/Bulan", "Rim", "Kegiatan"
  unitPrice: number;
  totalAmount: number;
  fundingSource: 'BOS Reguler' | 'BOS Kinerja' | 'BOSDA / Yayasan' | 'Lainnya';
  isBOSPCompliant: boolean;
  complianceWarning?: string;
  realizedAmount?: number;
}

export interface PrincipalProgramItem {
  id: string;
  dimension: 'Manajerial' | 'Kewirausahaan' | 'Supervisi Guru & Tendik' | 'Mutu Pembelajaran' | 'Budaya & Karakter' | 'Sarana & Prasarana' | 'Kemitraan Masyarakat';
  title: string;
  goals: string;
  pic: string;
  schedule: string;
  indicators: string;
  budget: number;
  status: 'Belum dimulai' | 'Sedang berjalan' | 'Selesai';
}

export interface TeacherSupervisionRecord {
  id: string;
  teacherName: string;
  teacherNip?: string;
  supervisionType?: 'Akademik (Guru)' | 'Manajerial (Tendik/Unit)';
  subject: string;
  gradeLevel: string;
  scheduledDate: string;
  priorityIndicatorCode?: string;
  priorityIndicatorName?: string;
  indicatorLabelStatus?: 'Kurang (Merah)' | 'Sedang (Kuning)' | 'Baik (Hijau)';
  rootCauseLevel2?: string;
  coachingNeedGroup?: string;
  behaviorTarget?: string;
  observationFocusAspects?: string[];
  preObservationNotes: string;
  observationScore: number; // 0 - 100
  postObservationReflection: string;
  followUpPlan: string;
  kombelTopic?: string;
  pmmTopic?: string;
  requiresFollowUpSupervision?: boolean;
  followUpRescheduleDate?: string;
  internalImpactNotes?: string;
  status: 'Dijadwalkan' | 'Pra-Observasi' | 'Observasi Dilakukan' | 'Tuntas Ditindaklanjuti';
}

export interface LiteracyProgramItem {
  id: string;
  title: string;
  type: 'Pembiasaan 15 Menit' | 'Pojok Baca Kelas' | 'Literasi Digital' | 'Perpustakaan' | 'Pelibatan Ortu/Komite';
  description: string;
  pic: string;
  targetParticipation: string;
  frequency: string;
  progress: number; // 0 - 100
}

export interface NumeracyProgramItem {
  id: string;
  title: string;
  type: 'Numerasi Lintas Mapel' | 'Alat Peraga Manipulatif' | 'Math Corner' | 'Asesmen Diagnostik Numerasi';
  description: string;
  pic: string;
  targetParticipation: string;
  frequency: string;
  progress: number;
}

export interface CharacterProgramItem {
  id: string;
  title: string;
  focusArea: '7 Pembiasaan Positif' | 'Pencegahan Kekerasan (PPKSP)' | 'Gotong Royong & Peduli Lingkungan' | 'Integritas & Kejujuran' | 'Dimensi Profil Pancasila';
  description: string;
  pic: string;
  implementationSchedule: string;
  progress: number;
}

export interface OfficialDocument {
  id: string;
  title: string;
  category: 'Identitas' | 'PBD' | 'RKJM' | 'RKT' | 'RKAS' | 'Kepala Sekolah' | 'Supervisi' | 'Literasi Numerasi' | 'Karakter' | 'Monev' | 'Akreditasi';
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draf' | 'Direvisi' | 'Divalidasi' | 'Disahkan';
  approvedBy?: string;
  approvalDate?: string;
  contentMarkdown?: string;
  fileFormat: 'PDF' | 'DOCX' | 'XLSX';
}

export interface RegulationItem {
  id: string;
  name: string;
  numberAndYear: string;
  issuingAgency: string;
  effectiveDate: string;
  status: 'Berlaku' | 'Diubah' | 'Dicabut' | 'Perlu Verifikasi';
  coreContent: string;
  relatedModule: string;
  officialSourceUrl: string;
  lastVerifiedDate: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  moduleName: string;
  details: string;
}
