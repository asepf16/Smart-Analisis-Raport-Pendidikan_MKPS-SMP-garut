import React, { useEffect, useMemo, useState } from 'react';
import {
  OfficialDocument,
  RaporIndicator,
  RootCauseReflection,
  SchoolProfile,
  TeacherSupervisionRecord,
} from '../../types';
import {
  GraduationCap,
  Plus,
  Trash2,
  Calendar,
  Building2,
  RefreshCw,
  CheckCircle2,
  Target,
  ClipboardCheck,
  MessageSquareHeart,
  Users,
  BookOpen,
  RotateCcw,
  Activity,
  Printer,
  FolderPlus,
  Edit3,
  AlertTriangle,
  ShieldCheck,
  FileDown,
} from 'lucide-react';
import {
  analyzeSixPriorityIndicators,
  buildDetailedSupervisionProgramMarkdown,
} from '../../services/pbdSynthesisService';
import { syncLetterheadWithProfile } from '../../services/schoolIdentitySync';
import { SchoolDatabase } from '../../services/storageService';
import { exportSupervisionProgramToWord } from '../../services/wordExportService';

interface SupervisiAkademikViewProps {
  records: TeacherSupervisionRecord[];
  schoolProfile?: SchoolProfile;
  raporIndicators?: RaporIndicator[];
  rootCauses?: RootCauseReflection[];
  onUpdateRecords: (updated: TeacherSupervisionRecord[]) => void;
  onSyncFromPbd?: () => void;
  onSaveToArchive?: (markdown: string, status: OfficialDocument['status']) => void;
}

const PRIORITY_INDICATOR_OPTIONS: Array<{
  code: 'A.1' | 'A.2' | 'D.1' | 'A.3' | 'D.4' | 'D.8';
  name: string;
  defaultRootCauseL2: string;
  defaultAspects: string[];
  defaultKombel: string;
  defaultPmm: string;
}> = [
  {
    code: 'A.1',
    name: 'Kemampuan Literasi',
    defaultRootCauseL2: 'Metode Pembelajaran & Refleksi Perbaikan Pembelajaran oleh Guru (D.1 / D.2)',
    defaultAspects: [
      'Integrasi teks bacaan bermakna dalam mata pelajaran non-bahasa',
      'Keterampilan guru memantik pertanyaan terbuka dan inferensi isi teks',
    ],
    defaultKombel: 'Integrasi Teks Informasi & Pertanyaan Terbuka Lintas Mapel',
    defaultPmm: 'Ruang GTK / PMM: Penguatan Kompetensi Literasi dalam Pembelajaran',
  },
  {
    code: 'A.2',
    name: 'Kemampuan Numerasi',
    defaultRootCauseL2: 'Metode Pembelajaran & Asesmen Formatif Berdiferensiasi (D.1 / D.2)',
    defaultAspects: [
      'Integrasi penalaran matematika dan data kontekstual ke mapel non-matematika',
      'Penggunaan pertanyaan terbuka & asesmen diagnostik awal bab',
    ],
    defaultKombel: 'Praktik Baik Numerasi Kontekstual & Asesmen Diagnostik',
    defaultPmm: 'Ruang GTK / PMM: Numerasi Lintas Mapel & Asesmen Formatif',
  },
  {
    code: 'D.1',
    name: 'Kualitas Pembelajaran',
    defaultRootCauseL2: 'Refleksi dan Perbaikan Pembelajaran oleh Guru & Dukungan Psikologis (D.2)',
    defaultAspects: [
      'Manajemen kelas efektif & keterlibatan aktif murid (student-centered)',
      'Dukungan psikologis guru agar murid berani bertanya dan berdiskusi',
    ],
    defaultKombel: 'Manajemen Kelas Aktif, Diskusi Interaktif & Pembelajaran Berdiferensiasi',
    defaultPmm: 'Ruang GTK / PMM: Kualitas Pembelajaran & Dukungan Psikologis Murid',
  },
  {
    code: 'A.3',
    name: 'Karakter',
    defaultRootCauseL2: 'Metode Pembelajaran Reflektif & Kepemimpinan Instruksional (D.1 / D.3)',
    defaultAspects: [
      'Pembiasaan sikap kolaboratif, kemandirian, dan etika diskusi kelas',
      'Refleksi penguatan nilai karakter Profil Pelajar Pancasila',
    ],
    defaultKombel: 'Integrasi Dimensi Karakter & 7 Pembiasaan Positif di Kelas',
    defaultPmm: 'Ruang GTK / PMM: Penguatan Karakter Murid',
  },
  {
    code: 'D.4',
    name: 'Iklim Keamanan Satuan Pendidikan',
    defaultRootCauseL2: 'Kepemimpinan Instruksional & Tata Kelola Pencegahan Perundungan (D.3)',
    defaultAspects: [
      'Interaksi sosial ramah anak & deteksi dini pencegahan perundungan (bullying)',
      'Kepatuhan layanan satuan pendidikan terhadap SOP Satgas PPKSP',
    ],
    defaultKombel: 'Disiplin Positif & Pencegahan Kekerasan (Satgas PPKSP)',
    defaultPmm: 'Ruang GTK / PMM: Pencegahan Kekerasan di Satuan Pendidikan (PPKSP)',
  },
  {
    code: 'D.8',
    name: 'Iklim Kebinekaan',
    defaultRootCauseL2: 'Refleksi Pembelajaran & Kepemimpinan Instruksional Berpihak Inklusi (D.2 / D.3)',
    defaultAspects: [
      'Sikap inklusif guru/tendik terhadap murid dengan latar belakang & kebutuhan belajar beragam',
      'Kesetaraan partisipasi dan akses layanan ramah bagi semua murid',
    ],
    defaultKombel: 'Pembelajaran Inklusif & Penghargaan Keberagaman',
    defaultPmm: 'Ruang GTK / PMM: Iklim Kebinekaan & Layanan Pendidikan Inklusif',
  },
];

export const SupervisiAkademikView: React.FC<SupervisiAkademikViewProps> = ({
  records,
  schoolProfile,
  raporIndicators = [],
  rootCauses = [],
  onUpdateRecords,
  onSyncFromPbd,
  onSaveToArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'program' | 'jadwal' | 'monitoring' | 'dokumen'>('program');
  const [filterType, setFilterType] = useState<'all' | 'Akademik (Guru)' | 'Manajerial (Tendik/Unit)' | 'revisit'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasManualMarkdownOverride, setHasManualMarkdownOverride] = useState(false);

  // Modal Form States
  const [formType, setFormType] = useState<'Akademik (Guru)' | 'Manajerial (Tendik/Unit)'>('Akademik (Guru)');
  const [formTeacherName, setFormTeacherName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formGradeLevel, setFormGradeLevel] = useState(
    schoolProfile?.stage === 'SD'
      ? 'Kelas IV'
      : schoolProfile?.stage === 'SMA' || schoolProfile?.stage === 'SMK'
      ? 'Kelas X'
      : 'Kelas VII'
  );
  const [formScheduledDate, setFormScheduledDate] = useState('2025-09-15');
  const [formPriorityCode, setFormPriorityCode] = useState<'A.1' | 'A.2' | 'D.1' | 'A.3' | 'D.4' | 'D.8'>('D.1');
  const [formRootCauseL2, setFormRootCauseL2] = useState('');
  const [formNeedGroup, setFormNeedGroup] = useState('');
  const [formBehaviorTarget, setFormBehaviorTarget] = useState('');
  const [formAspectsText, setFormAspectsText] = useState('');
  const [formPreNotes, setFormPreNotes] = useState('');
  const [formScore, setFormScore] = useState(82);
  const [formPostNotes, setFormPostNotes] = useState('');
  const [formKombel, setFormKombel] = useState('');
  const [formPmm, setFormPmm] = useState('');
  const [formFollowUpPlan, setFormFollowUpPlan] = useState('');
  const [formRequiresRevisit, setFormRequiresRevisit] = useState(false);
  const [formRevisitDate, setFormRevisitDate] = useState('');
  const [formImpactNotes, setFormImpactNotes] = useState('');
  const [formStatus, setFormStatus] = useState<TeacherSupervisionRecord['status']>('Pra-Observasi');

  const sixAnalysis = useMemo(
    () => analyzeSixPriorityIndicators(raporIndicators, rootCauses),
    [raporIndicators, rootCauses]
  );

  const attentionIndicators = useMemo(
    () => sixAnalysis.filter((item) => item.needsAttention),
    [sixAnalysis]
  );

  const avgScore =
    records.length > 0
      ? (records.reduce((acc, curr) => acc + curr.observationScore, 0) / records.length).toFixed(1)
      : '0';

  const completedCount = records.filter((r) => r.status === 'Tuntas Ditindaklanjuti').length;
  const inProgressCount = records.filter(
    (r) => r.status === 'Observasi Dilakukan' || r.status === 'Tuntas Ditindaklanjuti'
  ).length;
  const revisitRecords = records.filter((r) => r.requiresFollowUpSupervision);
  const implementationRate = records.length > 0 ? Math.round((inProgressCount / records.length) * 100) : 0;

  const defaultProgramMarkdown = useMemo(() => {
    if (!schoolProfile) return '';
    return buildDetailedSupervisionProgramMarkdown({
      schoolProfile,
      raporIndicators,
      rootCauses,
      supervisionRecords: records,
    } as SchoolDatabase);
  }, [schoolProfile, raporIndicators, rootCauses, records]);

  const [documentMarkdown, setDocumentMarkdown] = useState(defaultProgramMarkdown);

  useEffect(() => {
    if (!hasManualMarkdownOverride && defaultProgramMarkdown) {
      setDocumentMarkdown(defaultProgramMarkdown);
    }
  }, [defaultProgramMarkdown, hasManualMarkdownOverride]);

  const handleDownloadWord = async () => {
    if (!schoolProfile) return;
    await exportSupervisionProgramToWord(
      {
        schoolProfile,
        raporIndicators,
        rootCauses,
        supervisionRecords: records,
      } as SchoolDatabase,
      hasManualMarkdownOverride ? documentMarkdown : undefined
    );
    setNotice('Dokumen MS Word (.docx) Program Supervisi Akademik & Manajerial berhasil diunduh.');
  };

  const resolvedLetterhead = useMemo(() => {
    if (!schoolProfile) return '';
    return syncLetterheadWithProfile(schoolProfile.letterheadText, schoolProfile);
  }, [schoolProfile]);

  const letterheadTopLine = useMemo(() => {
    if (!schoolProfile) return 'DINAS PENDIDIKAN';
    const firstLine = resolvedLetterhead.split('\n').map((l) => l.trim()).filter(Boolean)[0];
    if (firstLine && firstLine.toUpperCase() !== schoolProfile.name.trim().toUpperCase()) {
      return firstLine;
    }
    return `PEMERINTAH ${schoolProfile.city.toUpperCase()} - DINAS PENDIDIKAN`;
  }, [resolvedLetterhead, schoolProfile]);

  const applyPriorityDefaults = (code: 'A.1' | 'A.2' | 'D.1' | 'A.3' | 'D.4' | 'D.8') => {
    const matchedAnalysis = sixAnalysis.find((s) => s.code === code);
    const spec = PRIORITY_INDICATOR_OPTIONS.find((o) => o.code === code);
    setFormPriorityCode(code);
    setFormRootCauseL2(matchedAnalysis?.rootCauseLevel2 || spec?.defaultRootCauseL2 || '');
    setFormNeedGroup(matchedAnalysis?.coachingNeedGroup || '');
    setFormBehaviorTarget(matchedAnalysis?.behaviorTarget || '');
    setFormAspectsText((matchedAnalysis?.observationFocusAspects || spec?.defaultAspects || []).join('\n'));
    setFormKombel(matchedAnalysis?.kombelTopic || spec?.defaultKombel || '');
    setFormPmm(matchedAnalysis?.pmmTopic || spec?.defaultPmm || '');
  };

  const openAddModal = () => {
    setEditingRecordId(null);
    setFormType('Akademik (Guru)');
    setFormTeacherName('');
    setFormSubject('');
    setFormGradeLevel(
      schoolProfile?.stage === 'SD'
        ? 'Kelas IV'
        : schoolProfile?.stage === 'SMA' || schoolProfile?.stage === 'SMK'
        ? 'Kelas X'
        : 'Kelas VII'
    );
    setFormScheduledDate('2025-09-15');
    const topPriority = attentionIndicators[0]?.code || 'D.1';
    applyPriorityDefaults(topPriority);
    setFormPreNotes('');
    setFormScore(82);
    setFormPostNotes('');
    setFormFollowUpPlan('');
    setFormRequiresRevisit(false);
    setFormRevisitDate('');
    setFormImpactNotes('');
    setFormStatus('Pra-Observasi');
    setShowModal(true);
  };

  const openEditModal = (rec: TeacherSupervisionRecord) => {
    setEditingRecordId(rec.id);
    setFormType(rec.supervisionType || 'Akademik (Guru)');
    setFormTeacherName(rec.teacherName);
    setFormSubject(rec.subject);
    setFormGradeLevel(rec.gradeLevel);
    setFormScheduledDate(rec.scheduledDate);
    const code = (rec.priorityIndicatorCode as 'A.1' | 'A.2' | 'D.1' | 'A.3' | 'D.4' | 'D.8') || 'D.1';
    setFormPriorityCode(code);
    setFormRootCauseL2(rec.rootCauseLevel2 || '');
    setFormNeedGroup(rec.coachingNeedGroup || '');
    setFormBehaviorTarget(rec.behaviorTarget || '');
    setFormAspectsText((rec.observationFocusAspects || []).join('\n'));
    setFormPreNotes(rec.preObservationNotes);
    setFormScore(rec.observationScore);
    setFormPostNotes(rec.postObservationReflection);
    setFormKombel(rec.kombelTopic || '');
    setFormPmm(rec.pmmTopic || '');
    setFormFollowUpPlan(rec.followUpPlan);
    setFormRequiresRevisit(Boolean(rec.requiresFollowUpSupervision));
    setFormRevisitDate(rec.followUpRescheduleDate || '');
    setFormImpactNotes(rec.internalImpactNotes || '');
    setFormStatus(rec.status);
    setShowModal(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSix = sixAnalysis.find((x) => x.code === formPriorityCode);
    const aspects = formAspectsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: TeacherSupervisionRecord = {
      id: editingRecordId || `manual-sup-${Date.now()}`,
      teacherName: formTeacherName.trim(),
      supervisionType: formType,
      subject: formSubject.trim(),
      gradeLevel: formGradeLevel.trim(),
      scheduledDate: formScheduledDate,
      priorityIndicatorCode: formPriorityCode,
      priorityIndicatorName: matchedSix?.title || 'Kualitas Pembelajaran',
      indicatorLabelStatus: matchedSix?.labelStatus || 'Sedang (Kuning)',
      rootCauseLevel2: formRootCauseL2.trim() || matchedSix?.rootCauseLevel2,
      coachingNeedGroup: formNeedGroup.trim() || matchedSix?.coachingNeedGroup,
      behaviorTarget: formBehaviorTarget.trim() || matchedSix?.behaviorTarget,
      observationFocusAspects: aspects.length > 0 ? aspects : matchedSix?.observationFocusAspects,
      preObservationNotes:
        formPreNotes.trim() ||
        `Pra-Observasi menyepakati fokus peningkatan indikator ${formPriorityCode} (${matchedSix?.title || ''}).`,
      observationScore: Math.min(100, Math.max(0, formScore)),
      postObservationReflection:
        formPostNotes.trim() ||
        'Dialog coaching reflektif pasca-observasi mengidentifikasi kekuatan praktik baik & area perbaikan.',
      followUpPlan:
        formFollowUpPlan.trim() ||
        `Dibahas di Kombel (${formKombel || matchedSix?.kombelTopic}) & belajar mandiri ${formPmm || matchedSix?.pmmTopic}.`,
      kombelTopic: formKombel.trim() || matchedSix?.kombelTopic,
      pmmTopic: formPmm.trim() || matchedSix?.pmmTopic,
      requiresFollowUpSupervision: formRequiresRevisit,
      followUpRescheduleDate: formRequiresRevisit ? formRevisitDate || formScheduledDate : undefined,
      internalImpactNotes:
        formImpactNotes.trim() ||
        'Dipantau melalui asesmen diagnostik berkala dan survei kenyamanan belajar murid.',
      status: formStatus,
    };

    if (editingRecordId) {
      onUpdateRecords(records.map((r) => (r.id === editingRecordId ? payload : r)));
      setNotice(`Data supervisi & coaching "${payload.teacherName}" berhasil diperbarui.`);
    } else {
      onUpdateRecords([...records, payload]);
      setNotice(`Agenda supervisi berbasis data untuk "${payload.teacherName}" berhasil ditambahkan.`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    onUpdateRecords(records.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
  };

  const handleStatusChange = (id: string, status: TeacherSupervisionRecord['status']) => {
    onUpdateRecords(records.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const handleToggleRevisit = (id: string) => {
    onUpdateRecords(
      records.map((r) =>
        r.id === id
          ? {
              ...r,
              requiresFollowUpSupervision: !r.requiresFollowUpSupervision,
              followUpRescheduleDate: !r.requiresFollowUpSupervision
                ? r.followUpRescheduleDate || '2025-11-15'
                : undefined,
            }
          : r
      )
    );
  };

  const handleUpdateImpactNote = (id: string, note: string) => {
    onUpdateRecords(records.map((r) => (r.id === id ? { ...r, internalImpactNotes: note } : r)));
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterType === 'all') return true;
      if (filterType === 'revisit') return Boolean(r.requiresFollowUpSupervision);
      return (r.supervisionType || 'Akademik (Guru)') === filterType;
    });
  }, [records, filterType]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 no-print">
        <div>
          {schoolProfile && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md mb-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{schoolProfile.name}</span>
              <span className="text-emerald-400">·</span>
              <span className="font-mono">NPSN {schoolProfile.npsn}</span>
            </div>
          )}
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-700" />
            <span>5.1 Program Supervisi Akademik &amp; Manajerial Berbasis Data (Rapor Pendidikan)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Bersifat <span className="font-semibold text-slate-700">data-driven</span> untuk mendampingi guru &amp; tenaga kependidikan memperbaiki kualitas pembelajaran dan layanan satuan pendidikan pada indikator prioritas merah/kuning—bukan sekadar memeriksa kelengkapan administrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-900 whitespace-nowrap">
            Skor Coaching: <span className="font-mono text-sm">{avgScore}</span>
          </div>

          {onSyncFromPbd && (
            <button
              type="button"
              onClick={() => {
                onSyncFromPbd();
                setHasManualMarkdownOverride(false);
                setNotice('Program Supervisi Akademik & Manajerial 6 Komponen berhasil disinkronkan presisi dari Rapor Pendidikan & PBD terkini.');
              }}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan dari Rapor &amp; PBD</span>
            </button>
          )}

          {onSaveToArchive && (
            <button
              type="button"
              onClick={() => {
                onSaveToArchive(documentMarkdown || defaultProgramMarkdown, 'Disahkan');
                setNotice('Program Supervisi Berbasis Data berhasil disimpan ke menu 6.3 Arsip Dokumen Saya.');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simpan ke Arsip</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sasaran Supervisi</span>
          </button>

          {schoolProfile && (
            <button
              type="button"
              onClick={handleDownloadWord}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh MS Word (.docx)</span>
            </button>
          )}

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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print text-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('program')}
          className={`px-4 py-2.5 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'program'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          1. Rancangan 6 Komponen (Data-Driven)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jadwal')}
          className={`px-4 py-2.5 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'jadwal'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          2. Jadwal, Instrumen &amp; Coaching ({records.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2.5 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'monitoring'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          3. Evaluasi &amp; Monitoring Dampak
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dokumen')}
          className={`px-4 py-2.5 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dokumen'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          4. Dokumen Resmi Cetak &amp; Edit Redaksi
        </button>
      </div>

      {/* TAB 1: 6-COMPONENT DATA-DRIVEN DESIGN */}
      {activeTab === 'program' && (
        <div className="space-y-6">
          {/* Komponen 1: Analisis Akar Masalah dari Rapor Pendidikan */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  KOMPONEN 1 · PEMETAAN RAPOR PENDIDIKAN
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  Analisis Akar Masalah dari 6 Indikator Utama &amp; Akar Masalah Level 2
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                {attentionIndicators.length} Indikator Merah/Kuning Prioritas Pendampingan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sixAnalysis.map((item) => {
                const badgeCls =
                  item.labelStatus === 'Kurang (Merah)'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : item.labelStatus === 'Sedang (Kuning)'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200';
                return (
                  <div
                    key={item.code}
                    className={`rounded-xl border p-4 space-y-2 ${
                      item.needsAttention ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                        {item.labelStatus}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                      <div className="font-mono text-xs font-bold text-slate-800 tabular-nums shrink-0">
                        {item.score.toFixed(1)}{' '}
                        <span className={item.change >= 0 ? 'text-emerald-700 text-[10px]' : 'text-rose-600 text-[10px]'}>
                          ({item.change >= 0 ? `+${item.change}` : item.change})
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-100">
                      <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider mb-0.5">
                        Akar Masalah Level 2:
                      </span>
                      {item.rootCauseLevel2}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Komponen 2: Tujuan dan Sasaran Supervisi yang Spesifik */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                KOMPONEN 2 · SASARAN BERBASIS KEBUTUHAN
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-700" />
                <span>Tujuan &amp; Sasaran Supervisi Spesifik (Dikelompokkan Sesuai Kebutuhan Pendampingan)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {(attentionIndicators.length > 0 ? attentionIndicators : sixAnalysis.slice(0, 4)).map((item) => (
                <div key={item.code} className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-900 text-xs">{item.coachingNeedGroup}</span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
                      Fokus {item.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900">Target Peningkatan Indikator &amp; Perilaku: </span>
                    {item.behaviorTarget}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Komponen 3: Fokus Aspek Observasi Kelas (Instrumen Supervisi) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                KOMPONEN 3 · INSTRUMEN OBSERVASI KELAS &amp; LAYANAN
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                <span>Fokus Aspek Observasi Sesuai Indikator Rapor Pendidikan</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                <div className="font-bold text-emerald-900">A. Fokus Literasi &amp; Numerasi (A.1 &amp; A.2)</div>
                <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside leading-relaxed">
                  <li>Mengamati bagaimana guru mengintegrasikan teks bacaan bermakna ke mata pelajaran non-bahasa.</li>
                  <li>Mengamati integrasi penalaran matematika &amp; pembacaan data ke mata pelajaran non-matematika.</li>
                  <li>Mengamati cara guru memantik pertanyaan terbuka dan umpan balik bernalar tinggi.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
                <div className="font-bold text-blue-900">B. Fokus Kualitas Pembelajaran (D.1)</div>
                <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside leading-relaxed">
                  <li>Mengamati manajemen kelas yang efektif dan suasana belajar kondusif.</li>
                  <li>Mengamati dukungan psikologis guru kepada murid (rasa aman bertanya/berpendapat).</li>
                  <li>Mengamati keterlibatan aktif murid melalui diskusi interaktif (<em>student-centered</em>).</li>
                </ul>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
                <div className="font-bold text-purple-900">C. Fokus Iklim Keamanan, Karakter &amp; Kebinekaan (A.3, D.4, D.8)</div>
                <ul className="space-y-1.5 text-[11px] text-slate-700 list-disc list-inside leading-relaxed">
                  <li>Mengamati interaksi sosial kelas dan layanan tendik serta pencegahan perundungan (<em>bullying</em>).</li>
                  <li>Mengamati sikap inklusif guru &amp; tendik terhadap murid dengan latar belakang/kebutuhan belajar beragam.</li>
                  <li>Memastikan SOP layanan ramah anak &amp; Satgas PPKSP berjalan efektif.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Komponen 4 & 5: Siklus Coaching & RTL Terintegrasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Komponen 4 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="border-b border-slate-100 pb-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  KOMPONEN 4 · PENDEKATAN PEMBERDAYAAN
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                  <MessageSquareHeart className="w-4 h-4 text-emerald-700" />
                  <span>Metode Pendampingan Berkelanjutan (Siklus Coaching)</span>
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900">1. Pra-Observasi</div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Diskusi awal antara kepala sekolah/supervisor dan guru atau tendik untuk menyepakati indikator Rapor Pendidikan serta aspek instrumen yang akan dilatihkan pada pertemuan tersebut.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900">2. Observasi Pembelajaran / Layanan</div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Pengamatan langsung di kelas atau unit layanan memakai instrumen yang telah disepakati bersama tanpa menginterupsi jalannya pelajaran.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="font-bold text-emerald-950">3. Pasca-Observasi (Coaching dan Umpan Balik)</div>
                  <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                    Dialog reflektif berbasis bukti observasi di mana supervisor membantu guru/tendik menemukan sendiri kekuatan, kelemahan, dan solusi perbaikan pembelajarannya.
                  </p>
                </div>
              </div>
            </div>

            {/* Komponen 5 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="border-b border-slate-100 pb-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  KOMPONEN 5 · RENCANA TINDAK LANJUT (RTL) TERINTEGRASI
                </div>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Tindak Lanjut Kombel, Ruang GTK / PMM &amp; Supervisi Klinis Ulang</span>
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Integrasi dengan Komunitas Belajar (Kombel)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Temuan umum supervisi diangkat menjadi topik utama pertemuan Kombel sekolah (seperti praktik baik modul ajar berdiferensiasi dan integrasi literasi-numerasi).
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pemanfaatan Platform Belajar (Ruang GTK / PMM)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Guru diarahkan mempelajari topik spesifik di Ruang GTK / PMM yang relevan langsung dengan catatan observasinya.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="font-bold text-amber-950 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>Supervisi Klinis Ulang</span>
                    </span>
                    <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200">
                      {revisitRecords.length} Terjadwal Ulang
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                    Pendampingan lanjutan terjadwal khusus bagi pendidik/tendik yang masih mengalami kesulitan setelah mengikuti tindak lanjut pertama.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Komponen 6 Preview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                KOMPONEN 6 · EVALUASI DAN MONITORING DAMPAK
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Pengukuran Keberhasilan Sebelum Rilis Rapor Pendidikan Tahun Berikutnya
              </h2>
              <p className="text-xs text-slate-600">
                Mencakup Evaluasi Tengah Semester (keterlaksanaan jadwal &amp; konsistensi penerapan coaching) serta Asesmen Internal &amp; Survei Lingkungan Belajar Internal siswa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('monitoring')}
              className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shrink-0 whitespace-nowrap"
            >
              Buka Matriks Evaluasi &amp; Monitoring
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: JADWAL, INSTRUMEN & COACHING RECORDS (FULL CRUD) */}
      {activeTab === 'jadwal' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filterType === 'all' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua Sasaran ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Akademik (Guru)')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filterType === 'Akademik (Guru)' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Supervisi Akademik Guru ({records.filter((r) => (r.supervisionType || 'Akademik (Guru)') === 'Akademik (Guru)').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Manajerial (Tendik/Unit)')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filterType === 'Manajerial (Tendik/Unit)' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Supervisi Manajerial / Tendik ({records.filter((r) => r.supervisionType === 'Manajerial (Tendik/Unit)').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('revisit')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filterType === 'revisit' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Perlu Supervisi Klinis Ulang ({revisitRecords.length})
              </button>
            </div>
          </div>

          {/* Records Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          rec.supervisionType === 'Manajerial (Tendik/Unit)'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {rec.supervisionType || 'Akademik (Guru)'}
                      </span>
                      {rec.priorityIndicatorCode && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          {rec.priorityIndicatorCode} · {rec.priorityIndicatorName}
                        </span>
                      )}
                      <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {rec.gradeLevel}
                      </span>
                    </div>

                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                      Skor: {rec.observationScore}
                    </span>
                  </div>

                  {/* Teacher / Unit Info */}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">
                      {rec.teacherName}
                    </h2>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      Bidang / Layanan: {rec.subject}
                    </div>
                  </div>

                  {/* Root Cause Level 2 + Need Group + Target */}
                  {(rec.rootCauseLevel2 || rec.coachingNeedGroup || rec.behaviorTarget) && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1.5 text-[11px]">
                      {rec.rootCauseLevel2 && (
                        <div>
                          <span className="font-bold text-rose-700">Akar Masalah Level 2: </span>
                          <span className="text-slate-700">{rec.rootCauseLevel2}</span>
                        </div>
                      )}
                      {rec.coachingNeedGroup && (
                        <div>
                          <span className="font-bold text-slate-800">Kelompok Kebutuhan: </span>
                          <span className="text-slate-700">{rec.coachingNeedGroup}</span>
                        </div>
                      )}
                      {rec.behaviorTarget && (
                        <div>
                          <span className="font-bold text-emerald-800">Target Perubahan Perilaku: </span>
                          <span className="text-emerald-950 font-medium">{rec.behaviorTarget}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Observation Focus Checklist */}
                  {rec.observationFocusAspects && rec.observationFocusAspects.length > 0 && (
                    <div className="space-y-1 text-[11px]">
                      <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                        Fokus Aspek Observasi Instrumen:
                      </span>
                      <ul className="space-y-1 text-slate-600">
                        {rec.observationFocusAspects.map((asp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{asp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 3-Step Coaching Notes */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-700">1. Pra-Observasi: </span>
                      <span className="text-slate-600">{rec.preObservationNotes}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">2-3. Pasca-Observasi (Coaching Reflektif): </span>
                      <span className="text-slate-600">{rec.postObservationReflection}</span>
                    </div>
                    <div>
                      <span className="font-bold text-emerald-800">RTL Kombel &amp; Ruang GTK/PMM: </span>
                      <span className="text-emerald-900 font-medium">
                        {rec.kombelTopic ? `Kombel: ${rec.kombelTopic}. ` : ''}
                        {rec.pmmTopic ? `Modul: ${rec.pmmTopic}. ` : ''}
                        {!rec.kombelTopic && !rec.pmmTopic ? rec.followUpPlan : ''}
                      </span>
                    </div>
                  </div>

                  {rec.requiresFollowUpSupervision && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                      <span className="font-bold flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>Dijadwalkan Supervisi Klinis Ulang</span>
                      </span>
                      <span className="font-mono font-semibold">
                        {rec.followUpRescheduleDate || 'Jadwal Menyusul'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rec.scheduledDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={rec.status}
                      onChange={(e) => handleStatusChange(rec.id, e.target.value as TeacherSupervisionRecord['status'])}
                      className="text-[10px] font-bold text-emerald-800 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 focus:outline-none"
                    >
                      <option value="Dijadwalkan">Dijadwalkan</option>
                      <option value="Pra-Observasi">Pra-Observasi</option>
                      <option value="Observasi Dilakukan">Observasi Dilakukan</option>
                      <option value="Tuntas Ditindaklanjuti">Tuntas Ditindaklanjuti</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => openEditModal(rec)}
                      className="p-1.5 rounded text-slate-600 hover:bg-slate-100"
                      title="Edit / Catat Hasil Coaching"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {deleteConfirmId === rec.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
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
                        onClick={() => setDeleteConfirmId(rec.id)}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-50"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              Tidak ada agenda supervisi pada filter ini. Klik &quot;Sinkronkan dari Rapor &amp; PBD&quot; atau &quot;Tambah Sasaran Supervisi&quot;.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KOMPONEN 6 — EVALUASI & MONITORING DAMPAK */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Evaluasi Tengah Semester</div>
              <div className="text-lg font-bold font-mono text-emerald-800 mt-1 tabular-nums">
                {implementationRate}% Terlaksana
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {inProgressCount} dari {records.length} sasaran telah diobservasi
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Tindak Lanjut Coaching</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {completedCount} Tuntas
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Konsisten menerapkan hasil coaching di kelas/layanan
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Supervisi Klinis Ulang</div>
              <div className="text-lg font-bold font-mono text-amber-700 mt-1 tabular-nums">
                {revisitRecords.length} Sasaran
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Pendampingan intensif lanjutan pasca-RTL pertama
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Asesmen &amp; Survei Internal</div>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                {records.filter((r) => Boolean(r.internalImpactNotes)).length} Terpantau
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Pra-rilis Rapor Pendidikan tahun berikutnya
              </div>
            </div>
          </div>

          {/* Impact Tracking Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span>Matriks Evaluasi Tengah Semester, Supervisi Klinis Ulang &amp; Asesmen Internal Siswa</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mengukur apakah perubahan cara mengajar guru dan layanan tendik sudah berdampak pada pemahaman dan kenyamanan belajar siswa.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Guru / Unit Layanan</th>
                    <th className="py-2.5 px-3 w-36">Indikator Target</th>
                    <th className="py-2.5 px-3 w-44">Supervisi Klinis Ulang</th>
                    <th className="py-2.5 px-3 min-w-[260px]">Hasil Survei Lingkungan / Asesmen Diagnostik Internal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-slate-900">{rec.teacherName}</div>
                        <div className="text-[11px] text-slate-500">{rec.subject} · {rec.gradeLevel}</div>
                        <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">{rec.status}</div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {rec.priorityIndicatorCode || 'PBD'}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-1">{rec.priorityIndicatorName || 'Mutu Pembelajaran'}</div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(rec.requiresFollowUpSupervision)}
                            onChange={() => handleToggleRevisit(rec.id)}
                            className="w-3.5 h-3.5 accent-amber-500 rounded"
                          />
                          <span>{rec.requiresFollowUpSupervision ? 'Perlu Klinis Ulang' : 'Tidak Perlu'}</span>
                        </label>
                        {rec.requiresFollowUpSupervision && (
                          <div className="text-[10px] font-mono text-amber-800 mt-1">
                            Jadwal: {rec.followUpRescheduleDate || 'Belum ditetapkan'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <textarea
                          rows={2}
                          value={rec.internalImpactNotes || ''}
                          onChange={(e) => handleUpdateImpactNote(rec.id, e.target.value)}
                          placeholder="Catat temuan survei kenyamanan belajar siswa atau hasil asesmen diagnostik berkala..."
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOKUMEN CETAK RESMI & EDIT REDAKSI */}
      {activeTab === 'dokumen' && schoolProfile && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-2 no-print text-xs">
            <span className="font-semibold text-slate-700">
              Pratinjau &amp; Penyuntingan Naskah Resmi Program Supervisi Berbasis Data ({schoolProfile.name})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHasManualMarkdownOverride(false);
                  setDocumentMarkdown(defaultProgramMarkdown);
                  setNotice('Redaksi dokumen program supervisi dimuat ulang presisi dari data Rapor Pendidikan & PBD terbaru.');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang dari Data Rapor &amp; PBD</span>
              </button>
              {onSaveToArchive && (
                <button
                  type="button"
                  onClick={() => {
                    onSaveToArchive(documentMarkdown, 'Disahkan');
                    setNotice('Dokumen Program Supervisi disimpan ke menu 6.3 Arsip Dokumen Saya.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Simpan ke Arsip</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadWord}
                className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh MS Word (.docx)</span>
              </button>
            </div>
          </div>

          {/* Printable Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0">
            <div className="border-b-2 border-slate-900 pb-3 text-center space-y-0.5">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-600">
                {letterheadTopLine}
              </div>
              <div className="text-base font-extrabold uppercase text-slate-900">
                {schoolProfile.name}
              </div>
              <div className="text-[11px] text-slate-600">
                {schoolProfile.address}, {schoolProfile.district}, {schoolProfile.city}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                NPSN: {schoolProfile.npsn} · Akreditasi: {schoolProfile.accreditationGrade} · TP {schoolProfile.academicYear}
              </div>
            </div>

            <div className="prose prose-slate max-w-none text-xs leading-relaxed">
              <div className="whitespace-pre-line text-slate-800">{documentMarkdown}</div>
            </div>
          </div>

          {/* Redaction Editor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 no-print max-w-4xl mx-auto">
            <label className="block text-xs font-bold text-slate-800">
              Edit Redaksi Teks Program Supervisi Akademik &amp; Manajerial (Opsional):
            </label>
            <textarea
              rows={14}
              value={documentMarkdown}
              onChange={(e) => {
                setHasManualMarkdownOverride(true);
                setDocumentMarkdown(e.target.value);
              }}
              className="w-full p-4 border border-slate-200 rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Sasaran Supervisi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                {editingRecordId
                  ? 'Perbarui Agenda & Catatan Coaching Supervisi'
                  : 'Tambah Sasaran Supervisi Akademik / Manajerial Berbasis Data'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jenis Supervisi</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'Akademik (Guru)' | 'Manajerial (Tendik/Unit)')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Akademik (Guru)">Supervisi Akademik (Guru)</option>
                    <option value="Manajerial (Tendik/Unit)">Supervisi Manajerial (Tendik/Unit)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Indikator Prioritas Rapor Pendidikan (6 Utama)</label>
                  <select
                    value={formPriorityCode}
                    onChange={(e) => applyPriorityDefaults(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {PRIORITY_INDICATOR_OPTIONS.map((opt) => {
                      const live = sixAnalysis.find((s) => s.code === opt.code);
                      return (
                        <option key={opt.code} value={opt.code}>
                          [{opt.code}] {opt.name} — Skor {live ? live.score.toFixed(1) : '-'} ({live?.labelStatus || 'Prioritas'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Guru / Tendik / Unit Layanan *</label>
                  <input
                    type="text"
                    required
                    value={formTeacherName}
                    onChange={(e) => setFormTeacherName(e.target.value)}
                    placeholder="Contoh: Rina Melati, S.Pd. atau Tim Perpustakaan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mata Pelajaran / Bidang Layanan *</label>
                  <input
                    type="text"
                    required
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="IPA / Bahasa Indonesia / Layanan BK & Perpustakaan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kelas / Unit</label>
                  <input
                    type="text"
                    value={formGradeLevel}
                    onChange={(e) => setFormGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Jadwal</label>
                  <input
                    type="date"
                    value={formScheduledDate}
                    onChange={(e) => setFormScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Skor Praktik (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formScore}
                    onChange={(e) => setFormScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status Tahap</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TeacherSupervisionRecord['status'])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Dijadwalkan">Dijadwalkan</option>
                    <option value="Pra-Observasi">Pra-Observasi</option>
                    <option value="Observasi Dilakukan">Observasi Dilakukan</option>
                    <option value="Tuntas Ditindaklanjuti">Tuntas Ditindaklanjuti</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">1. Akar Masalah Level 2 yang Dibenahi</label>
                <input
                  type="text"
                  value={formRootCauseL2}
                  onChange={(e) => setFormRootCauseL2(e.target.value)}
                  placeholder="Misal: Metode Pembelajaran, Refleksi Guru, atau Kepemimpinan Instruksional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">2a. Kelompok Kebutuhan Pendampingan</label>
                  <input
                    type="text"
                    value={formNeedGroup}
                    onChange={(e) => setFormNeedGroup(e.target.value)}
                    placeholder="Diferensiasi / Asesmen Formatif / Literasi Lintas Mapel"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">2b. Target Perubahan Perilaku Mengajar/Layanan</label>
                  <input
                    type="text"
                    value={formBehaviorTarget}
                    onChange={(e) => setFormBehaviorTarget(e.target.value)}
                    placeholder="Perilaku spesifik yang diharapkan pasca supervisi..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">3. Fokus Aspek Observasi Instrumen (1 baris per aspek)</label>
                <textarea
                  rows={2}
                  value={formAspectsText}
                  onChange={(e) => setFormAspectsText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">4a. Kesepakatan Pra-Observasi</label>
                  <textarea
                    rows={2}
                    value={formPreNotes}
                    onChange={(e) => setFormPreNotes(e.target.value)}
                    placeholder="Indikator Rapor & instrumen yang disepakati..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">4b. Dialog Reflektif Pasca-Observasi (Coaching)</label>
                  <textarea
                    rows={2}
                    value={formPostNotes}
                    onChange={(e) => setFormPostNotes(e.target.value)}
                    placeholder="Kekuatan, kelemahan & solusi yang ditemukan bersama..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">5a. Topik Komunitas Belajar (Kombel)</label>
                  <input
                    type="text"
                    value={formKombel}
                    onChange={(e) => setFormKombel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">5b. Topik Ruang GTK / PMM</label>
                  <input
                    type="text"
                    value={formPmm}
                    onChange={(e) => setFormPmm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-amber-950">
                  <input
                    type="checkbox"
                    checked={formRequiresRevisit}
                    onChange={(e) => setFormRequiresRevisit(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>5c. Jadwalkan Supervisi Klinis Ulang (Pendampingan Lanjutan)</span>
                </label>
                {formRequiresRevisit && (
                  <input
                    type="date"
                    value={formRevisitDate}
                    onChange={(e) => setFormRevisitDate(e.target.value)}
                    className="px-2.5 py-1 border border-amber-300 rounded-lg bg-white font-mono text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">6. Catatan Evaluasi Tengah Semester &amp; Asesmen Internal Siswa</label>
                <input
                  type="text"
                  value={formImpactNotes}
                  onChange={(e) => setFormImpactNotes(e.target.value)}
                  placeholder="Dampak perubahan mengajar pada pemahaman & kenyamanan siswa..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  {editingRecordId ? 'Simpan Perubahan' : 'Simpan Sasaran Supervisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
