import {
  AccreditationItem,
  ActionPlanItem,
  CharacterProgramItem,
  IdentifiedProblem,
  LiteracyProgramItem,
  NumeracyProgramItem,
  OfficialDocument,
  PrincipalProgramItem,
  RaporIndicator,
  RecommendationBenahi,
  RKASItem,
  RootCauseReflection,
  SchoolProfile,
  SNPStandardItem,
  SupportingData,
  TeacherSupervisionRecord,
} from '../types';
import { SchoolDatabase } from './storageService';
import { recommendTopProblems } from './problemRecommendationService';

interface StageMeta {
  gradesLabel: string;
  teacherCoordinator: string;
  coreSubjects: string[];
  classUnitSample: string[];
}

function getStageMeta(stage: SchoolProfile['stage']): StageMeta {
  switch (stage) {
    case 'SD':
      return {
        gradesLabel: 'Kelas I - VI',
        teacherCoordinator: 'Koordinator KKG & Guru Kelas',
        coreSubjects: ['Guru Kelas (Literasi)', 'Guru Kelas (Numerasi)', 'PJOK & IPAS'],
        classUnitSample: ['Kelas II', 'Kelas IV', 'Kelas V'],
      };
    case 'SMA':
      return {
        gradesLabel: 'Kelas X - XII',
        teacherCoordinator: 'Wakasek Kurikulum & Tim MGMP',
        coreSubjects: ['Matematika', 'Bahasa Indonesia', 'Fisika / IPS'],
        classUnitSample: ['Kelas X', 'Kelas XI', 'Kelas XII'],
      };
    case 'SMK':
      return {
        gradesLabel: 'Kelas X - XII',
        teacherCoordinator: 'Wakasek Kurikulum & Ketua Kompetensi Keahlian',
        coreSubjects: ['Matematika Terapan', 'Bahasa Indonesia', 'Konsentrasi Keahlian'],
        classUnitSample: ['Kelas X', 'Kelas XI', 'Kelas XII'],
      };
    case 'SMP':
    default:
      return {
        gradesLabel: 'Kelas VII - IX',
        teacherCoordinator: 'Wakasek Kurikulum & Koordinator Kombel',
        coreSubjects: ['Matematika', 'Bahasa Indonesia', 'IPA Terpadu'],
        classUnitSample: ['Kelas VII', 'Kelas VIII', 'Kelas IX'],
      };
  }
}

function findIndicatorByHint(
  indicators: RaporIndicator[],
  codePrefixes: string[],
  keywords: string[]
): RaporIndicator | undefined {
  for (const prefix of codePrefixes) {
    const byCode = indicators.find((i) => i.code.toUpperCase().startsWith(prefix.toUpperCase()));
    if (byCode) return byCode;
  }
  const lowerKws = keywords.map((k) => k.toLowerCase());
  return indicators.find((i) =>
    lowerKws.some((kw) => i.name.toLowerCase().includes(kw) || i.dimension.toLowerCase().includes(kw))
  );
}

function avgScore(items: Array<RaporIndicator | undefined>, fallback = 65): number {
  const valid = items.filter((x): x is RaporIndicator => Boolean(x));
  if (valid.length === 0) return fallback;
  return Math.round((valid.reduce((s, i) => s + i.score, 0) / valid.length) * 10) / 10;
}

function pickBospMapping(
  text: string,
  recType?: RecommendationBenahi['type']
): { bospCode: string; componentCategory: string; defaultUnit: string; unitPrice: number } {
  const lower = text.toLowerCase();
  if (lower.includes('buku') || lower.includes('perpustakaan') || lower.includes('pojok baca') || lower.includes('literasi')) {
    return {
      bospCode: '02.01.01',
      componentCategory: 'Pengembangan Perpustakaan',
      defaultUnit: 'Paket Buku/Media',
      unitPrice: 4500000,
    };
  }
  if (
    lower.includes('alat peraga') ||
    lower.includes('kit') ||
    lower.includes('numerasi') ||
    lower.includes('manipulatif') ||
    lower.includes('media')
  ) {
    return {
      bospCode: '03.02.04',
      componentCategory: 'Kegiatan Pembelajaran dan Ekstrakurikuler',
      defaultUnit: 'Set Kit Pembelajaran',
      unitPrice: 1500000,
    };
  }
  if (
    lower.includes('kombel') ||
    lower.includes('workshop') ||
    lower.includes('pelatihan') ||
    lower.includes('guru') ||
    lower.includes('supervisi') ||
    lower.includes('pmm') ||
    recType === 'Benahi 1 (Kompetensi GTK/Tata Kelola)'
  ) {
    return {
      bospCode: '04.01.02',
      componentCategory: 'Pengembangan Profesi Pendidik dan Tenaga Kependidikan',
      defaultUnit: 'Kegiatan',
      unitPrice: 1250000,
    };
  }
  if (lower.includes('asesmen') || lower.includes('anbk') || lower.includes('diagnostik') || lower.includes('evaluasi')) {
    return {
      bospCode: '05.02.01',
      componentCategory: 'Kegiatan Asesmen dan Evaluasi Pembelajaran',
      defaultUnit: 'Paket Asesmen',
      unitPrice: 3500000,
    };
  }
  if (lower.includes('karakter') || lower.includes('ppksp') || lower.includes('pembiasaan') || lower.includes('anti')) {
    return {
      bospCode: '03.01.03',
      componentCategory: 'Kegiatan Pembelajaran dan Ekstrakurikuler',
      defaultUnit: 'Program',
      unitPrice: 1200000,
    };
  }
  return {
    bospCode: '03.01.05',
    componentCategory: 'Kegiatan Pembelajaran dan Ekstrakurikuler',
    defaultUnit: 'Paket Kegiatan',
    unitPrice: 2000000,
  };
}

/**
 * Ensures missing PBD links (rootCauses, recommendations, actionPlans) can be derived cleanly
 * from selected problems without discarding user-created entries.
 */
export function buildActionPlansFromRecommendations(
  recommendations: RecommendationBenahi[],
  existingActionPlans: ActionPlanItem[],
  schoolProfile: SchoolProfile
): ActionPlanItem[] {
  const existingByRecId = new Set(existingActionPlans.map((a) => a.recommendationId));
  const newPlans: ActionPlanItem[] = [];

  recommendations.forEach((rec, idx) => {
    if (existingByRecId.has(rec.id)) return;
    newPlans.push({
      id: `pbd-gen-act-${Date.now()}-${idx}`,
      recommendationId: rec.id,
      activityName: `${rec.title} (${schoolProfile.name})`,
      pic: rec.pic || 'Tim TPMPS & Guru Terkait',
      timeline: rec.timeline || `TP ${schoolProfile.academicYear}`,
      indicator: rec.successIndicator || `Terlaksananya ${rec.title}`,
      target: rec.targetValue || '100% Terlaksana',
      status: 'Direncanakan',
      budgetAllocated: rec.requiresBudget ? Math.max(0, rec.estimatedCost || 0) : 0,
      actualBudgetSpent: 0,
      evidenceNotes: `Terhubung ke rekomendasi PBD (${rec.type}).`,
    });
  });

  return [...existingActionPlans, ...newPlans];
}

export function buildRecommendationsForAllProblems(
  problems: IdentifiedProblem[],
  rootCauses: RootCauseReflection[],
  existingRecommendations: RecommendationBenahi[],
  schoolProfile: SchoolProfile
): RecommendationBenahi[] {
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const sourceProblems = activeProblems.length > 0 ? activeProblems : problems;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const existingProblemIds = new Set(existingRecommendations.map((r) => r.problemId));
  const generated: RecommendationBenahi[] = [];

  sourceProblems.forEach((prob, idx) => {
    if (existingProblemIds.has(prob.id)) return;
    const rc = rootCauses.find((r) => r.problemId === prob.id);
    const lower = `${prob.indicatorCode} ${prob.indicatorName} ${prob.mainProblem}`.toLowerCase();

    const isLiteracy = lower.includes('literasi') || prob.indicatorCode.toUpperCase().startsWith('A.1');
    const isNumeracy = lower.includes('numerasi') || prob.indicatorCode.toUpperCase().startsWith('A.2');
    const isSafetyOrCharacter =
      lower.includes('karakter') ||
      lower.includes('keamanan') ||
      lower.includes('kebinekaan') ||
      lower.includes('perundungan') ||
      prob.indicatorCode.toUpperCase().startsWith('A.3') ||
      prob.indicatorCode.toUpperCase().startsWith('D.4') ||
      prob.indicatorCode.toUpperCase().startsWith('D.8');

    const benahi1Cost = 1200000;
    const benahi2Cost = isNumeracy ? 6500000 : isLiteracy ? 7500000 : isSafetyOrCharacter ? 2500000 : 4000000;
    const benahi3Cost = 900000;

    generated.push({
      id: `pbd-gen-rec-${prob.id}-b1`,
      problemId: prob.id,
      rootCauseId: rc?.id || `rc-${prob.id}`,
      title: `Penguatan Komunitas Belajar (Kombel) & Coaching Pembelajaran Terfokus pada ${prob.indicatorName}`,
      type: 'Benahi 1 (Kompetensi GTK/Tata Kelola)',
      objective: `Mengatasi akar masalah pada indikator ${prob.indicatorCode} (${prob.indicatorName}) melalui peningkatan kapasitas ${schoolProfile.totalTeachers} pendidik.`,
      strategy: rc?.rootCause
        ? `Menjawab akar masalah: ${rc.rootCause}`
        : `Bedah modul ajar berdiferensiasi dan asesmen formatif di Kombel ${schoolProfile.name} setiap pekan.`,
      activities: [
        `Workshop & refleksi rutin mingguan Kombel membahas strategi pembenahan ${prob.indicatorName}.`,
        `Supervisi akademik klinis kepala sekolah dan berbagi praktik baik guru (${stageMeta.gradesLabel}).`,
      ],
      pic: stageMeta.teacherCoordinator,
      targetAudience: `${schoolProfile.totalTeachers} Pendidik (${stageMeta.gradesLabel})`,
      successIndicator: `100% guru menyusun dan menerapkan perangkat ajar berdiferensiasi terkait ${prob.indicatorCode}`,
      targetValue: `Kenaikan skor ${prob.indicatorCode} ke kategori Baik/Cakap (>= 70)`,
      timeline: `Juli - Oktober (${schoolProfile.academicYear})`,
      resourceNeeds: 'Panduan Kombel, Modul PMM, Ruang Pertemuan Sekolah',
      estimatedCost: benahi1Cost,
      requiresBudget: true,
    });

    generated.push({
      id: `pbd-gen-rec-${prob.id}-b2`,
      problemId: prob.id,
      rootCauseId: rc?.id || `rc-${prob.id}`,
      title: isNumeracy
        ? `Pengadaan Kit Alat Peraga Numerasi Manipulatif & Bahan Ajar Kontekstual (${prob.indicatorCode})`
        : isLiteracy
        ? `Pengadaan Buku Bacaan Non-Teks Bermutu & Revitalisasi Pojok Baca (${prob.indicatorCode})`
        : isSafetyOrCharacter
        ? `Pengadaan Media Kampanye Sekolah Ramah Anak, Satgas PPKSP & Konseling (${prob.indicatorCode})`
        : `Pengadaan Sarana Penunjang Pembelajaran Aktif Berbasis BOSP (${prob.indicatorCode})`,
      type: 'Benahi 2 (Pengadaan Sarana/Anggaran)',
      objective: `Menyediakan sarana konkret pendukung peningkatan capaian ${prob.indicatorName} di seluruh ${schoolProfile.totalStudyGroups || 6} rombel.`,
      strategy: `Belanja sarana pembelajaran melalui SIPLah sesuai Juknis BOSP (Permendikdasmen No. 8 Tahun 2026).`,
      activities: [
        isNumeracy
          ? 'Pengadaan alat peraga geometri, pecahan, dan pengukuran untuk eksplorasi kelas.'
          : isLiteracy
          ? 'Pengadaan buku pengayaan fiksi/non-fiksi bermutu untuk perpustakaan dan sudut baca kelas.'
          : 'Pengadaan media ajar visual, papan edukasi, dan perangkat asesmen diagnostik.',
        `Distribusi dan pencatatan inventaris sarana di ${schoolProfile.totalStudyGroups || 6} rombongan belajar.`,
      ],
      pic: 'Tim Sarpras, Bendahara BOSP & Guru Terkait',
      targetAudience: `${schoolProfile.totalStudents || 180} Siswa (${schoolProfile.totalStudyGroups || 6} Rombel)`,
      successIndicator: `Seluruh rombongan belajar menerima dukungan sarana pembenahan ${prob.indicatorCode}`,
      targetValue: `100% rombel terfasilitasi media ${prob.indicatorName}`,
      timeline: `Triwulan II - III (${schoolProfile.academicYear})`,
      resourceNeeds: 'Katalog SIPLah, RKAS BOSP Reguler',
      estimatedCost: benahi2Cost,
      requiresBudget: true,
    });

    if (idx < 2 || isLiteracy || isNumeracy || isSafetyOrCharacter) {
      generated.push({
        id: `pbd-gen-rec-${prob.id}-b3`,
        problemId: prob.id,
        rootCauseId: rc?.id || `rc-${prob.id}`,
        title: isLiteracy
          ? 'Pembiasaan 15 Menit Membaca Terpandu & Jurnal Literasi Harian'
          : isNumeracy
          ? 'Pembiasaan Klinik Numerasi Kontekstual & Asesmen Diagnostik Awal Bab'
          : `Program Pembiasaan Budaya Sekolah Positif untuk Penguatan ${prob.indicatorName}`,
        type: 'Benahi 3 (Budaya Sekolah & Pembelajaran)',
        objective: `Membangun ekosistem kebiasaan belajar bermakna secara konsisten di ${schoolProfile.name}.`,
        strategy: 'Pelaksanaan program pembiasaan terjadwal melibatkan wali kelas, guru mapel, OSIS/siswa, dan orang tua.',
        activities: [
          `Penerapan jadwal pembiasaan rutin mingguan pada seluruh kelas (${stageMeta.gradesLabel}).`,
          'Pemantauan keterlaksanaan bulanan oleh Tim Pengembang Sekolah (TPMPS) dan apresiasi capaian siswa.',
        ],
        pic: 'Wakasek Kesiswaan, Wali Kelas & Tim TPMPS',
        targetAudience: `Seluruh Siswa (${schoolProfile.totalStudents || 180} anak)`,
        successIndicator: `Minimal 90% kelas melaksanakan pembiasaan rutin setiap pekan`,
        targetValue: `Peningkatan tren ${prob.indicatorCode} minimal +8 poin`,
        timeline: `Sepanjang Tahun Pelajaran ${schoolProfile.academicYear}`,
        resourceNeeds: 'Jurnal pemantauan, papan apresiasi karya siswa',
        estimatedCost: benahi3Cost,
        requiresBudget: true,
      });
    }
  });

  return [...existingRecommendations, ...generated];
}

/**
 * Generates precise RKJM Markdown fully grounded in the school's PBD results.
 */
export function buildDetailedRKJMMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, raporIndicators, problems, rootCauses, recommendations, snpData, rkasItems } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;

  const strengths = raporIndicators
    .filter((i) => i.score >= 70 || i.category === 'Baik' || i.category === 'Mahir')
    .slice(0, 4);
  const weakOnes = [...raporIndicators]
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  const avgSNP =
    snpData.length > 0
      ? Math.round(snpData.reduce((acc, s) => acc + s.compliancePercentage, 0) / snpData.length)
      : 0;

  const totalRKAS = rkasItems.reduce((acc, item) => acc + item.totalAmount, 0);

  const strengthsText =
    strengths.length > 0
      ? strengths.map((s) => `- **${s.code} ${s.name}**: Skor ${s.score.toFixed(1)} (${s.category})`).join('\n')
      : '- Belum terdapat indikator dengan capaian >= 70 pada data Rapor saat ini.';

  const weakText =
    weakOnes.length > 0
      ? weakOnes.map((w) => `- **${w.code} ${w.name}**: Skor ${w.score.toFixed(1)} (${w.category}, tren ${w.changeFromLastYear >= 0 ? `+${w.changeFromLastYear}` : w.changeFromLastYear})`).join('\n')
      : '- Data Rapor Pendidikan belum diimpor.';

  const problemsText =
    usedProblems.length > 0
      ? usedProblems
          .map(
            (p, idx) =>
              `${idx + 1}. **[${p.indicatorCode}] ${p.indicatorName}** (${p.priority})\n   - Kondisi Aktual: ${p.actualCondition}\n   - Masalah Utama: ${p.mainProblem}\n   - Bukti Data: ${p.dataProof}`
          )
          .join('\n')
      : 'Belum ada masalah prioritas yang dipilih.';

  const rootCausesText =
    rootCauses.length > 0
      ? rootCauses
          .map(
            (rc, idx) =>
              `${idx + 1}. **Akar Masalah Terverifikasi**: ${rc.rootCause}\n   - Faktor Terkendali Sekolah: ${rc.controllableFactors.slice(0, 2).join('; ') || '-'}`
          )
          .join('\n')
      : 'Refleksi akar masalah (5-Why) siap dilengkapi pada modul 3.3.';

  const strategicProgramsText =
    recommendations.length > 0
      ? recommendations
          .map(
            (rec, idx) =>
              `${idx + 1}. **${rec.title}** [${rec.type}]\n   - Sasaran: ${rec.targetAudience} | Target Mutu: ${rec.targetValue}\n   - Linimasa: ${rec.timeline} | Estimasi Biaya: Rp ${rec.estimatedCost.toLocaleString('id-ID')}`
          )
          .join('\n')
      : 'Rekomendasi program strategis sedang disusun dari hasil PBD.';

  return `# DOKUMEN RENCANA KERJA JANGKA MENENGAH (RKJM)
## ${schoolProfile.name.toUpperCase()}
### PERIODE: ${schoolProfile.planningPeriod}

---

### LEMBAR PENGESAHAN
Dokumen Rencana Kerja Jangka Menengah (RKJM) ${schoolProfile.name} periode ${schoolProfile.planningPeriod} disusun berdasarkan siklus Perencanaan Berbasis Data (PBD) Rapor Pendidikan (${raporIndicators.length} indikator teranalisis, ${usedProblems.length} masalah prioritas, ${recommendations.length} program pembenahan), telah dimusyawarahkan dan disetujui oleh Tim Pengembang Sekolah (TPMPS), Dewan Pendidik, serta Komite Sekolah.

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Pengawas Pembina Satuan Pendidikan
Dinas Pendidikan ${schoolProfile.city}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Transformasi layanan pembelajaran yang berpusat pada murid di ${schoolProfile.name} (${stageMeta.gradesLabel}) menuntut perencanaan strategis jangka menengah (4 tahunan) yang terukur, transparan, dan berbasis bukti empiris. Melalui mekanisme Perencanaan Berbasis Data (PBD) yang bersumber dari Rapor Pendidikan, satuan pendidikan melakukan identifikasi capaian mutu, refleksi akar masalah, serta perumusan langkah pembenahan yang diselaraskan dengan 8 Standar Nasional Pendidikan (SNP) dan pembiayaan BOSP. Penyusunan RKJM periode ${schoolProfile.planningPeriod} ini menjadi arah kebijakan utama bagi seluruh pemangku kepentingan untuk mewujudkan peningkatan kualitas literasi, numerasi, karakter, kualitas pembelajaran, serta iklim sekolah yang aman dan inklusif.

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022 (Keterpenuhan 8 SNP saat ini: ${avgSNP}%).
3. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan oleh Pemerintah Pusat dan Pemerintah Daerah terhadap Pendidikan Anak Usia Dini, Pendidikan Dasar, dan Pendidikan Menengah.
4. Permendikbudristek Nomor 46 Tahun 2023 tentang Pencegahan dan Penanganan Kekerasan di Lingkungan Satuan Pendidikan (PPKSP).
5. Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.
6. Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.
7. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana Bantuan Operasional Satuan Pendidikan (BOSP).

#### 1.3 Tujuan Penyusunan RKJM
1. Memberikan arah pengembangan satuan pendidikan selama 4 (empat) tahun secara terencana, bertahap, dan berkesinambungan.
2. Menjamin keselarasan antara hasil evaluasi Rapor Pendidikan, pemenuhan 8 SNP, kesiapan akreditasi BAN-PDM, dan alokasi anggaran RKAS.
3. Menjadi acuan resmi dalam penyusunan Rencana Kerja Tahunan (RKT) dan evaluasi ketercapaian kinerja sekolah.

### BAB II: PROFIL SATUAN PENDIDIKAN
- **Nama Sekolah**: ${schoolProfile.name} (NPSN: ${schoolProfile.npsn})
- **Jenjang / Status**: ${schoolProfile.stage} ${schoolProfile.status} (${stageMeta.gradesLabel})
- **Alamat**: ${schoolProfile.address}, ${schoolProfile.district}, ${schoolProfile.city}, ${schoolProfile.province}
- **Sumber Daya**: ${schoolProfile.totalStudents} Peserta Didik, ${schoolProfile.totalStudyGroups} Rombongan Belajar, ${schoolProfile.totalTeachers} Pendidik, ${schoolProfile.totalStaff} Tenaga Kependidikan
- **Akreditasi**: ${schoolProfile.accreditationGrade} (Tahun ${schoolProfile.accreditationYear})

### BAB III: ANALISIS CAPAIAN RAPOR PENDIDIKAN & 8 SNP
**A. Kekuatan Utama Sekolah:**
${strengthsText}

**B. Aspek yang Memerlukan Percepatan Pembenahan:**
${weakText}

### BAB IV: IDENTIFIKASI MASALAH & AKAR MASALAH (5-WHY)
**Masalah Prioritas PBD:**
${problemsText}

**Hasil Penelusuran Akar Masalah:**
${rootCausesText}

### BAB V: VISI, MISI, DAN TUJUAN SEKOLAH
- **Visi**: ${schoolProfile.vision}
- **Misi**:
${schoolProfile.mission}
- **Tujuan**: ${schoolProfile.goals}

### BAB VI: PROGRAM STRATEGIS 4 TAHUNAN (${schoolProfile.planningPeriod})
${strategicProgramsText}

### BAB VII: PROYEKSI PEMBIAYAAN, MONITORING, DAN PENUTUP
Total alokasi tahunan RKAS berbasis PBD yang telah terpetakan saat ini sebesar **Rp ${totalRKAS.toLocaleString('id-ID')}** (${rkasItems.length} kegiatan). Pengawasan keterlaksanaan RKJM dilaksanakan setiap semester oleh Kepala ${schoolProfile.name} bersama TPMPS dan dilaporkan kepada Pengawas Pembina serta Dinas Pendidikan ${schoolProfile.city}.

Demikian dokumen RKJM ${schoolProfile.name} periode ${schoolProfile.planningPeriod} ini disusun untuk dilaksanakan dengan penuh tanggung jawab oleh seluruh warga sekolah.`;
}

/**
 * Generates precise RKT Markdown fully grounded in the school's PBD results & Action Plans.
 */
export function buildDetailedRKTMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, problems, rootCauses, recommendations, actionPlans, rkasItems } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;
  const totalBudgetAction = actionPlans.reduce((s, a) => s + a.budgetAllocated, 0);
  const totalBudgetRKAS = rkasItems.reduce((s, r) => s + r.totalAmount, 0);

  const problemLines =
    usedProblems.length > 0
      ? usedProblems
          .map((p, i) => `${i + 1}. **[${p.indicatorCode}] ${p.indicatorName}** — ${p.mainProblem} (${p.priority})`)
          .join('\n')
      : '- Belum ada masalah prioritas PBD.';

  const rootCauseSummary =
    rootCauses.length > 0
      ? rootCauses.map((r, i) => `${i + 1}. ${r.rootCause}`).join('\n')
      : '- Akar masalah ditelusuri bersama Komunitas Belajar (Kombel) sekolah.';

  const actionRowsText =
    actionPlans.length > 0
      ? actionPlans
          .map(
            (act, idx) =>
              `${idx + 1}. **${act.activityName}**\n   - PIC: ${act.pic} | Jadwal: ${act.timeline}\n   - Indikator: ${act.indicator} | Target: ${act.target}\n   - Alokasi Anggaran: Rp ${act.budgetAllocated.toLocaleString('id-ID')} | Status: ${act.status}`
          )
          .join('\n')
      : recommendations.length > 0
      ? recommendations
          .map(
            (rec, idx) =>
              `${idx + 1}. **${rec.title}** (${rec.timeline}) — PIC: ${rec.pic}, Estimasi: Rp ${rec.estimatedCost.toLocaleString('id-ID')}`
          )
          .join('\n')
      : '- Rencana aksi operasional belum diisi.';

  return `# RENCANA KERJA TAHUNAN (RKT) BERBASIS PBD
## ${schoolProfile.name.toUpperCase()}
### TAHUN PELAJARAN ${schoolProfile.academicYear}

---

### LEMBAR PENGESAHAN
Dokumen Rencana Kerja Tahunan (RKT) ${schoolProfile.name} Tahun Pelajaran ${schoolProfile.academicYear} merupakan penjabaran operasional tahunan dari RKJM (${schoolProfile.planningPeriod}) berdasarkan hasil Analisis Rapor Pendidikan, Identifikasi Masalah, Refleksi Akar Masalah, Rekomendasi Pembenahan, dan Matriks Rencana Aksi.

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Ketua Komite Sekolah ${schoolProfile.name}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Rencana Kerja Tahunan (RKT) merupakan dokumen operasional tahunan yang menerjemahkan arah kebijakan strategis jangka menengah (RKJM ${schoolProfile.planningPeriod}) ke dalam program dan kegiatan nyata selama satu tahun pelajaran. Di ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}), penyusunan RKT Tahun Pelajaran ${schoolProfile.academicYear} didasarkan sepenuhnya pada hasil Perencanaan Berbasis Data (PBD) Rapor Pendidikan sehingga setiap kegiatan yang dirancang benar-benar menjawab akar masalah pembelajaran, kompetensi pendidik, dan layanan peserta didik (${schoolProfile.totalStudents} siswa pada ${schoolProfile.totalStudyGroups} rombongan belajar, ${stageMeta.gradesLabel}).

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.
3. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
4. Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan Satuan Pendidikan.
5. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.

#### 1.3 Tujuan dan Sasaran RKT
1. Menjadi pedoman kerja operasional bagi ${schoolProfile.totalTeachers} pendidik, ${schoolProfile.totalStaff} tenaga kependidikan, dan tim TPMPS sepanjang Tahun Pelajaran ${schoolProfile.academicYear}.
2. Memastikan keterlaksanaan program pembenahan prioritas Rapor Pendidikan secara terjadwal dan terukur.
3. Menjadi dasar penyusunan Rencana Kegiatan dan Anggaran Sekolah (RKAS) pada aplikasi ARKAS.

### BAB II: RINGKASAN MASALAH PRIORITAS & AKAR MASALAH PBD
**Fokus Masalah Terpilih:**
${problemLines}

**Akar Masalah Utama (5-Why):**
${rootCauseSummary}

### BAB III: MATRIKS PROGRAM & RENCANA AKSI TAHUN ${schoolProfile.academicYear}
${actionRowsText}

### BAB IV: SINKRONISASI ANGGARAN & PEMBIAYAAN (RKAS BOSP)
- Total kebutuhan anggaran pada Matriks Rencana Aksi: **Rp ${totalBudgetAction.toLocaleString('id-ID')}**
- Total pagu kegiatan terpetakan di RKAS ARKAS: **Rp ${totalBudgetRKAS.toLocaleString('id-ID')}** (${rkasItems.length} pos kegiatan sesuai kode rekening BOSP Permendikdasmen No. 8 Tahun 2026).

### BAB V: MONITORING, EVALUASI, DAN PENUTUP
Evaluasi keterlaksanaan RKT dilaksanakan berkala setiap bulan dan tengah semester oleh Kepala ${schoolProfile.name} bersama Tim Pengembang Sekolah (TPMPS), terintegrasi dengan jadwal Supervisi Akademik & Manajerial Berbasis Data serta pemantauan realisasi RKAS. Demikian RKT Tahun Pelajaran ${schoolProfile.academicYear} ini disahkan sebagai pedoman pelaksanaan kegiatan sekolah.`;
}

/**
 * Generates formal RKAS Markdown with Latar Belakang, Landasan Hukum, Rekap Komponen & Rincian BOSP.
 */
export function buildDetailedRKASMarkdown(db: SchoolDatabase, budgetCapOverride?: number): string {
  const { schoolProfile, supportingData, rkasItems, problems } = db;
  const budgetCap = budgetCapOverride ?? supportingData?.budgetCapTotal ?? (schoolProfile.totalStudents || 180) * 1100000;
  const totalPlanned = rkasItems.reduce((s, r) => s + r.totalAmount, 0);
  const totalRealized = rkasItems.reduce((s, r) => s + (r.realizedAmount || 0), 0);
  const remaining = budgetCap - totalPlanned;
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const componentTotals = new Map<string, number>();
  rkasItems.forEach((item) => {
    componentTotals.set(item.componentCategory, (componentTotals.get(item.componentCategory) || 0) + item.totalAmount);
  });

  const componentLines = Array.from(componentTotals.entries())
    .map(([comp, amt], i) => `${i + 1}. **${comp}**: Rp ${amt.toLocaleString('id-ID')}`)
    .join('\n');

  const rkasLines =
    rkasItems.length > 0
      ? rkasItems
          .map(
            (item, idx) =>
              `${idx + 1}. **[${item.bospCode}] ${item.activityName}**\n   - Program PBD: ${item.programName}\n   - Komponen BOSP: ${item.componentCategory} | Sumber: ${item.fundingSource}\n   - Rincian: ${item.volume} ${item.unit} x Rp ${item.unitPrice.toLocaleString('id-ID')} = **Rp ${item.totalAmount.toLocaleString('id-ID')}**`
          )
          .join('\n')
      : '- Belum ada rincian kegiatan RKAS terdaftar.';

  return `# RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS BOSP) BERBASIS PBD
## ${schoolProfile.name.toUpperCase()}
### TAHUN ANGGARAN / PELAJARAN ${schoolProfile.academicYear}

---

### LEMBAR PENGESAHAN
Rencana Kegiatan dan Anggaran Sekolah (RKAS) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} telah disusun melalui musyawarah Tim BOSP Sekolah, TPMPS, dan Komite Sekolah sesuai hasil Perencanaan Berbasis Data (PBD) dan ketentuan Juknis BOSP.

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Ketua Komite Sekolah & Bendahara BOSP ${schoolProfile.name}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Pengelolaan pembiayaan pendidikan yang efektif, efisien, transparan, dan akuntabel merupakan kunci keberhasilan peningkatan mutu layanan di ${schoolProfile.name}. Penyusunan RKAS Tahun Pelajaran ${schoolProfile.academicYear} ini tidak lagi bersifat penganggaran rutin semata, melainkan disusun berdasarkan **Perencanaan Berbasis Data (PBD)** Rapor Pendidikan. Setiap pos belanja diarahkan secara presisi untuk membiayai pembenahan indikator prioritas (${usedProblems.map((p) => `${p.indicatorCode} ${p.indicatorName}`).join(', ') || 'Literasi, Numerasi, Kualitas Pembelajaran, dan Karakter'}) pada ${schoolProfile.totalStudents} peserta didik dan ${schoolProfile.totalStudyGroups} rombongan belajar.

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. PP Nomor 48 Tahun 2008 tentang Pendanaan Pendidikan sebagaimana diubah dengan PP Nomor 18 Tahun 2022.
3. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan (Standar Pembiayaan).
4. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
5. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana Bantuan Operasional Satuan Pendidikan (BOSP).

#### 1.3 Prinsip & Tujuan Pengelolaan Anggaran
1. **Fleksibilitas & Efektivitas**: Penggunaan dana BOSP disesuaikan dengan kebutuhan pembenahan mutu nyata hasil PBD.
2. **Efisiensi & Akuntabilitas**: Setiap pengeluaran tercatat pada kode rekening resmi ARKAS, menggunakan mekanisme pengadaan resmi (SIPLah), dan dapat dipertanggungjawabkan secara administratif maupun kinerja.
3. **Transparansi**: Melibatkan dewan guru, komite sekolah, dan warga sekolah dalam perencanaan serta pelaporan realisasi anggaran.

### BAB II: RINGKASAN PAGU & REKAPITULASI KOMPONEN PEMBIAYAAN
- **Satuan Pendidikan**: ${schoolProfile.name} (NPSN: ${schoolProfile.npsn})
- **Total Pagu Dana BOSP Tahunan**: Rp ${budgetCap.toLocaleString('id-ID')}
- **Total Rencana Belanja (RKAS)**: **Rp ${totalPlanned.toLocaleString('id-ID')}** (${budgetCap > 0 ? ((totalPlanned / budgetCap) * 100).toFixed(1) : 0}% dari pagu)
- **Total Realisasi Tercatat**: Rp ${totalRealized.toLocaleString('id-ID')}
- **Sisa Pagu Tersedia**: Rp ${remaining.toLocaleString('id-ID')}

**Rekapitulasi Per Komponen Pembiayaan BOSP:**
${componentLines || '- Belum ada komponen terpetakan.'}

### BAB III: RINCIAN KEGIATAN DAN ANGGARAN SEKOLAH (${rkasItems.length} POS KEGIATAN)
${rkasLines}

### BAB IV: PENGAWASAN, PELAPORAN & PENUTUP
Realisasi anggaran dipantau setiap triwulan oleh Kepala Sekolah, Bendahara BOSP, dan Komite Sekolah serta dilaporkan melalui sistem pelaporan resmi ARKAS Kemendikdasmen. Demikian dokumen RKAS BOSP ${schoolProfile.name} ini ditetapkan sebagai acuan pelaksanaan anggaran Tahun Pelajaran ${schoolProfile.academicYear}.`;
}

/**
 * Generates formal Principal Work Program Markdown with Latar Belakang & Landasan Hukum.
 */
export function buildDetailedPrincipalProgramMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, principalPrograms, problems, raporIndicators } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const totalBudget = principalPrograms.reduce((s, p) => s + p.budget, 0);
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const programLines =
    principalPrograms.length > 0
      ? principalPrograms
          .map(
            (p, idx) =>
              `${idx + 1}. **[${p.dimension}] ${p.title}**\n   - Tujuan & Sasaran: ${p.goals}\n   - Penanggung Jawab: ${p.pic} | Jadwal: ${p.schedule}\n   - Indikator Keberhasilan: ${p.indicators}\n   - Pagu Dukungan: Rp ${p.budget.toLocaleString('id-ID')} | Status: ${p.status}`
          )
          .join('\n')
      : '- Program kerja kepala sekolah belum ditambahkan.';

  return `# PROGRAM KERJA KEPALA SEKOLAH TERPADU
## ${schoolProfile.name.toUpperCase()}
### TAHUN PELAJARAN ${schoolProfile.academicYear}

---

### LEMBAR PENGESAHAN
Program Kerja Kepala ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun sebagai panduan kepemimpinan manajerial, supervisi guru/tendik, kewirausahaan, dan pengawalan mutu pembelajaran berbasis Rapor Pendidikan (${raporIndicators.length} indikator teranalisis).

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Pengawas Pembina Satuan Pendidikan
Dinas Pendidikan ${schoolProfile.city}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Kepala sekolah memegang peran sentral sebagai pemimpin pembelajaran (*instructional leader*) sekaligus manajer satuan pendidikan. Di tengah tantangan peningkatan mutu pendidikan dan implementasi Kurikulum Merdeka di ${schoolProfile.name} (${stageMeta.gradesLabel}, ${schoolProfile.totalTeachers} guru, ${schoolProfile.totalStaff} tenaga kependidikan, ${schoolProfile.totalStudents} siswa), kepala sekolah dituntut menyusun program kerja yang terintegrasi langsung dengan temuan Rapor Pendidikan serta fokus pembenahan PBD (${usedProblems.map((p) => `${p.indicatorCode} ${p.indicatorName}`).join(', ') || 'Literasi, Numerasi, dan Kualitas Pembelajaran'}).

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.
3. Permendikbudristek Nomor 40 Tahun 2021 tentang Penugasan Guru sebagai Kepala Sekolah (dan regulasi turunan tata kelola penugasan kepala sekolah).
4. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
5. Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan pada PAUD, Pendidikan Dasar, dan Pendidikan Menengah.
6. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.

#### 1.3 Tujuan dan Sasaran
1. Mewujudkan kepemimpinan manajerial yang akuntabel dalam pengawalan RKJM, RKT, dan RKAS berbasis data.
2. Mendampingi peningkatan kompetensi ${schoolProfile.totalTeachers} guru dan ${schoolProfile.totalStaff} tendik melalui supervisi klinis, Komunitas Belajar (Kombel), dan Ruang GTK/PMM.
3. Menguatkan budaya sekolah yang aman, inklusif, berkarakter, serta kemitraan aktif dengan Komite Sekolah dan orang tua.

### BAB II: MATRIKS PROGRAM KERJA KEPALA SEKOLAH (${principalPrograms.length} PROGRAM)
Total dukungan anggaran terpetakan: **Rp ${totalBudget.toLocaleString('id-ID')}**

${programLines}

### BAB III: STRATEGI PENGAWALAN MUTU & KEMITRAAN
1. **Rapat Koordinasi Bulanan TPMPS**: Memantau ketercapaian indikator kinerja setiap bidang dan progres rencana aksi PBD.
2. **Coaching & Supervisi Berkelanjutan**: Menjalankan siklus pra-observasi, observasi, dan pasca-observasi secara partisipatif.
3. **Pelibatan Orang Tua & Komite Sekolah**: Menyelaraskan dukungan belajar di rumah dan transparansi realisasi program.

### BAB IV: EVALUASI DAN PENUTUP
Keterlaksanaan Program Kerja Kepala Sekolah dievaluasi setiap akhir semester melalui instrumen monitoring keterlaksanaan program dan refleksi Rapor Pendidikan. Demikian program kerja ini disusun sebagai komitmen kepemimpinan mutu di ${schoolProfile.name}.`;
}

/**
 * Generates formal Literacy Program (GLS) Markdown grounded in A.1 Rapor Pendidikan & PBD.
 */
export function buildDetailedLiteracyProgramMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, raporIndicators, literacyPrograms, rootCauses } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const indLit = findIndicatorByHint(raporIndicators, ['A.1'], ['literasi']);
  const litScore = indLit?.score ?? 65;
  const litChange = indLit?.changeFromLastYear ?? 0;
  const litRC = rootCauses.find((r) => r.mainProblem.toLowerCase().includes('literasi'))?.rootCause ||
    indLit?.kemendikbudRootCause ||
    'Peserta didik perlu pembiasaan membaca teks informasi bermakna dan diskusi reflektif lintas mata pelajaran.';
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const progLines =
    literacyPrograms.length > 0
      ? literacyPrograms
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.title}** [${p.type}]\n   - Strategi & Uraian: ${p.description}\n   - Sasaran: ${p.targetParticipation} | Frekuensi: ${p.frequency}\n   - Penanggung Jawab: ${p.pic} | Progres Terlaksana: ${p.progress}%`
          )
          .join('\n')
      : '- Belum ada program literasi terdaftar.';

  return `# PROGRAM GERAKAN LITERASI SEKOLAH (GLS) BERBASIS PBD
## ${schoolProfile.name.toUpperCase()}
### TAHUN PELAJARAN ${schoolProfile.academicYear}

---

### LEMBAR PENGESAHAN
Program Gerakan Literasi Sekolah (GLS) ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun sebagai tindak lanjut capaian Rapor Pendidikan Indikator A.1 (Kemampuan Literasi) untuk seluruh ${schoolProfile.totalStudents} peserta didik (${stageMeta.gradesLabel}).

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Koordinator Tim GLS & Perpustakaan ${schoolProfile.name}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Kemampuan literasi merupakan fondasi utama bagi peserta didik dalam memahami informasi, berpikir kritis, dan menguasai seluruh mata pelajaran. Berdasarkan data Rapor Pendidikan ${schoolProfile.name}, capaian indikator **A.1 Kemampuan Literasi** berada pada skor **${litScore.toFixed(1)}** (${indLit?.category || 'Sedang'}, tren ${litChange >= 0 ? `+${litChange}` : litChange} poin). Kondisi ini menuntut intervensi terstruktur melalui Program Gerakan Literasi Sekolah (GLS) yang mencakup tahap pembiasaan, pengembangan minat baca, dan pembelajaran literasi lintas mata pelajaran di ${schoolProfile.totalStudyGroups} rombongan belajar.

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Undang-Undang Nomor 3 Tahun 2017 tentang Sistem Perbukuan.
3. Permendikbud Nomor 23 Tahun 2015 tentang Penumbuhan Budi Pekerti (Pembiasaan 15 Menit Membaca).
4. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.
5. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
6. Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum.
7. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP (Alokasi Pengembangan Perpustakaan & Buku Bacaan).

#### 1.3 Tujuan dan Sasaran
1. Meningkatkan kecakapan peserta didik dalam mengakses, menafsirkan, dan merefleksikan teks sastra maupun teks informasi.
2. Membangun ekosistem sekolah yang kaya teks melalui pojok baca aktif di ${schoolProfile.totalStudyGroups} kelas dan perpustakaan sekolah.
3. Melibatkan ${schoolProfile.totalTeachers} pendidik lintas mapel dalam mengintegrasikan strategi membaca bermakna di kelas.

### BAB II: ANALISIS KONDISI LITERASI & AKAR MASALAH
- **Skor Indikator A.1**: ${litScore.toFixed(1)} (${indLit?.category || 'Sedang'})
- **Akar Masalah Teridentifikasi**: ${litRC}
- **Arah Pembenahan**: Optimalisasi buku bacaan non-teks bermutu BOSP, pembiasaan jurnal baca harian, dan pelatihan strategi literasi di Komunitas Belajar (Kombel).

### BAB III: MATRIKS PROGRAM GERAKAN LITERASI SEKOLAH (${literacyPrograms.length} PROGRAM)
${progLines}

### BAB IV: DUKUNGAN SARANA, KOMBEL & PELAKSANAAN
Pelaksanaan program didukung oleh pengadaan buku pengayaan bermutu melalui anggaran RKAS BOSP, pemanfaatan platform Ruang GTK / PMM untuk topik literasi oleh guru, serta pelibatan orang tua dalam mendampingi kebiasaan membaca siswa di rumah.

### BAB V: EVALUASI, TINDAK LANJUT & PENUTUP
Monitoring program dilaksanakan bulanan melalui rekap jurnal baca siswa, asesmen diagnostik literasi awal dan tengah semester, serta laporan evaluasi kepada Kepala Sekolah dan TPMPS. Demikian Program Gerakan Literasi Sekolah ini disusun untuk dilaksanakan secara konsisten di ${schoolProfile.name}.`;
}

/**
 * Generates formal Contextual Numeracy Acceleration Program Markdown grounded in A.2 Rapor Pendidikan & PBD.
 */
export function buildDetailedNumeracyProgramMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, raporIndicators, numeracyPrograms, rootCauses } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const indNum = findIndicatorByHint(raporIndicators, ['A.2'], ['numerasi']);
  const numScore = indNum?.score ?? 60;
  const numChange = indNum?.changeFromLastYear ?? 0;
  const numRC = rootCauses.find((r) => r.mainProblem.toLowerCase().includes('numerasi'))?.rootCause ||
    indNum?.kemendikbudRootCause ||
    'Kemampuan bernalar matematis pada konteks nyata (bilangan, aljabar, geometri, pengukuran, dan data) memerlukan penguatan lintas mata pelajaran dan media konkret.';
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const progLines =
    numeracyPrograms.length > 0
      ? numeracyPrograms
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.title}** [${p.type}]\n   - Metode & Uraian: ${p.description}\n   - Sasaran: ${p.targetParticipation} | Frekuensi: ${p.frequency}\n   - Penanggung Jawab: ${p.pic} | Progres Terlaksana: ${p.progress}%`
          )
          .join('\n')
      : '- Belum ada program numerasi terdaftar.';

  return `# PROGRAM AKSELERASI NUMERASI KONTEKSTUAL BERBASIS PBD
## ${schoolProfile.name.toUpperCase()}
### TAHUN PELAJARAN ${schoolProfile.academicYear}

---

### LEMBAR PENGESAHAN
Program Akselerasi Numerasi Kontekstual ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun berdasarkan hasil Analisis Rapor Pendidikan Indikator A.2 (Kemampuan Numerasi) untuk mendampingi ${schoolProfile.totalStudents} siswa (${stageMeta.gradesLabel}).

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Wakasek Kurikulum & Koordinator Numerasi ${schoolProfile.name}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Numerasi bukan sekadar kemampuan berhitung mekanis, melainkan kecakapan mengaplikasikan konsep bilangan, operasi hitung, geometri, pengukuran, dan interpretasi data dalam memecahkan masalah kehidupan sehari-hari. Berdasarkan Rapor Pendidikan ${schoolProfile.name}, indikator **A.2 Kemampuan Numerasi** saat ini memperoleh skor **${numScore.toFixed(1)}** (${indNum?.category || 'Sedang'}, tren ${numChange >= 0 ? `+${numChange}` : numChange} poin). Oleh karena itu, diperlukan Program Akselerasi Numerasi Kontekstual yang menghubungkan matematika dengan situasi nyata siswa serta melibatkan seluruh guru lintas mata pelajaran.

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.
3. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
4. Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum pada PAUD, Pendidikan Dasar, dan Pendidikan Menengah.
5. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP (Pengadaan Alat Peraga Edukatif / Kit Numerasi & Asesmen).

#### 1.3 Tujuan dan Sasaran
1. Mengangkat skor Kemampuan Numerasi peserta didik ${schoolProfile.name} menuju kategori Baik/Cakap (>= 70).
2. Membiasakan ${schoolProfile.totalTeachers} guru mengintegrasikan pembacaan tabel, grafik, estimasi, dan penalaran logis ke dalam mapel non-matematika.
3. Menjembatani pemahaman konsep abstrak melalui penggunaan alat peraga manipulatif konkret dan asesmen diagnostik awal bab.

### BAB II: ANALISIS KONDISI NUMERASI & AKAR MASALAH
- **Skor Indikator A.2**: ${numScore.toFixed(1)} (${indNum?.category || 'Sedang'})
- **Akar Masalah Teridentifikasi**: ${numRC}
- **Strategi Pembenahan**: Pembelajaran berbasis masalah kontekstual (*Problem-Based Learning*), pemanfaatan kit manipulatif, *Math Corner*, serta klinik pendampingan terdiferensiasi bagi peserta didik kategori Perlu Intervensi Khusus.

### BAB III: MATRIKS PROGRAM AKSELERASI NUMERASI KONTEKSTUAL (${numeracyPrograms.length} PROGRAM)
${progLines}

### BAB IV: INTEGRASI KOMBEL, SARPRAS & ASESMEN DIAGNOSTIK
Setiap guru melaksanakan asesmen diagnostik awal untuk memetakan tingkat kesiapan belajar siswa, merancang aktivitas kontekstual pada pertemuan Komunitas Belajar (Kombel), dan memanfaatkan alat peraga matematika hasil pengadaan BOSP pada ${schoolProfile.totalStudyGroups} rombongan belajar.

### BAB V: EVALUASI DAMPAK & PENUTUP
Evaluasi keberhasilan diukur melalui perbandingan hasil asesmen diagnostik awal dan tengah semester serta pemantauan kemajuan belajar per domain kompetensi. Demikian Program Akselerasi Numerasi Kontekstual ini disahkan untuk menjadi acuan pelaksanaan mutu pembelajaran di ${schoolProfile.name}.`;
}

/**
 * Generates formal Character Strengthening & PPKSP Program Markdown grounded in A.3, D.4, D.8 Rapor Pendidikan.
 */
export function buildDetailedCharacterProgramMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, raporIndicators, characterPrograms } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const indChar = findIndicatorByHint(raporIndicators, ['A.3'], ['karakter']);
  const indSafe = findIndicatorByHint(raporIndicators, ['D.4'], ['keamanan']);
  const indDiv = findIndicatorByHint(raporIndicators, ['D.8'], ['kebinekaan']);
  const charScore = indChar?.score ?? 72;
  const safeScore = indSafe?.score ?? 78;
  const divScore = indDiv?.score ?? 76;
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const progLines =
    characterPrograms.length > 0
      ? characterPrograms
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.title}** [${p.focusArea}]\n   - Uraian Kegiatan: ${p.description}\n   - Jadwal Pelaksanaan: ${p.implementationSchedule} | PIC: ${p.pic}\n   - Progres Terlaksana: ${p.progress}%`
          )
          .join('\n')
      : '- Belum ada program penguatan karakter terdaftar.';

  return `# PROGRAM PEMBIASAAN & PENGUATAN KARAKTER SATUAN PENDIDIKAN
## ${schoolProfile.name.toUpperCase()}
### TAHUN PELAJARAN ${schoolProfile.academicYear}

---

### LEMBAR PENGESAHAN
Program Pembiasaan dan Penguatan Karakter ${schoolProfile.name} (NPSN: ${schoolProfile.npsn}) Tahun Pelajaran ${schoolProfile.academicYear} disusun untuk mengawal pencapaian Rapor Pendidikan indikator Karakter (A.3), Iklim Keamanan Satuan Pendidikan (D.4), dan Iklim Kebinekaan (D.8) bagi ${schoolProfile.totalStudents} peserta didik (${stageMeta.gradesLabel}).

Disahkan di: ${schoolProfile.city}
Pada tanggal: ${todayFormatted}

**Kepala Sekolah,**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

**Mengetahui,**
Ketua Satgas PPKSP & Koordinator Kesiswaan ${schoolProfile.name}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang
Pendidikan bermutu tidak hanya berorientasi pada capaian akademik, melainkan juga pembentukan akhlak mulia, integritas, kemandirian, toleransi, dan terciptanya satuan pendidikan yang aman dari segala bentuk kekerasan. Berdasarkan data Rapor Pendidikan ${schoolProfile.name}, capaian **Karakter (A.3)** berada pada skor **${charScore.toFixed(1)}**, **Iklim Keamanan Satuan Pendidikan (D.4)** pada skor **${safeScore.toFixed(1)}**, serta **Iklim Kebinekaan (D.8)** pada skor **${divScore.toFixed(1)}**. Oleh karena itu, sekolah menyusun Program Pembiasaan & Penguatan Karakter secara sistemik yang mengintegrasikan 7 pembiasaan positif, kinerja Satgas PPKSP, budaya gotong royong, dan sikap inklusif di kelas maupun lingkungan sekolah.

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Peraturan Presiden Nomor 87 Tahun 2017 tentang Penguatan Pendidikan Karakter.
3. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan.
4. Permendikbudristek Nomor 46 Tahun 2023 tentang Pencegahan dan Penanganan Kekerasan di Lingkungan Satuan Pendidikan (PPKSP).
5. Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum (Projek Penguatan Profil Pelajar Pancasila).
6. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.

#### 1.3 Tujuan dan Sasaran
1. Menumbuhkan budaya sekolah yang religius, jujur, disiplin, gotong royong, dan peduli lingkungan bagi seluruh ${schoolProfile.totalStudents} peserta didik.
2. Menjamin lingkungan belajar yang aman, bebas perundungan (*bullying*), dan inklusif terhadap keberagaman latar belakang maupun kebutuhan belajar murid.
3. Mengoptimalkan peran Satgas PPKSP, guru BK, wali kelas, OSIS, dan orang tua dalam pendampingan karakter murid.

### BAB II: ANALISIS KONDISI KARAKTER & IKLIM SEKOLAH
- **A.3 Karakter Peserta Didik**: Skor ${charScore.toFixed(1)} (${indChar?.category || 'Baik'})
- **D.4 Iklim Keamanan Satuan Pendidikan**: Skor ${safeScore.toFixed(1)} (${indSafe?.category || 'Baik'})
- **D.8 Iklim Kebinekaan**: Skor ${divScore.toFixed(1)} (${indDiv?.category || 'Baik'})

### BAB III: MATRIKS PROGRAM PEMBIASAAN & PENGUATAN KARAKTER (${characterPrograms.length} PROGRAM)
${progLines}

### BAB IV: MEKANISME PENCEGAHAN KEKERASAN (PPKSP) & PELIBATAN ORANG TUA
1. **Sosialisasi & Kanal Aduan Aman**: Menyediakan kotak/kanal pelaporan rahasia anti-perundungan yang mudah diakses siswa.
2. **Disiplin Positif**: Seluruh ${schoolProfile.totalTeachers} guru dan ${schoolProfile.totalStaff} tendik menerapkan pendekatan restitutif dan komunikatif tanpa hukuman fisik maupun verbal.
3. **Kemitraan Keluarga**: Forum parenting triwulanan bersama Komite Sekolah untuk menyelaraskan pembiasaan karakter di sekolah dan di rumah.

### BAB V: MONITORING, SURVEI INTERNAL & PENUTUP
Pemantauan dampak dilaksanakan melalui jurnal pembiasaan harian wali kelas, catatan BK, serta survei lingkungan belajar internal siswa per semester. Demikian Program Pembiasaan dan Penguatan Karakter ${schoolProfile.name} ini disahkan untuk dilaksanakan oleh seluruh warga sekolah.`;
}

export interface SixPriorityAnalysisItem {
  code: 'A.1' | 'A.2' | 'A.3' | 'D.1' | 'D.4' | 'D.8';
  title: string;
  score: number;
  change: number;
  categoryLabel: string;
  labelStatus: 'Kurang (Merah)' | 'Sedang (Kuning)' | 'Baik (Hijau)';
  needsAttention: boolean;
  rootCauseLevel2: string;
  coachingNeedGroup: string;
  behaviorTarget: string;
  observationFocusAspects: string[];
  kombelTopic: string;
  pmmTopic: string;
}

const SIX_PRIORITY_SPECS: Array<{
  code: SixPriorityAnalysisItem['code'];
  title: string;
  keywords: string[];
  defaultRootCauseL2: string;
  coachingNeedGroup: string;
  behaviorTarget: string;
  observationFocusAspects: string[];
  kombelTopic: string;
  pmmTopic: string;
}> = [
  {
    code: 'A.1',
    title: 'Kemampuan Literasi',
    keywords: ['literasi'],
    defaultRootCauseL2: 'Metode Pembelajaran & Refleksi Perbaikan Pembelajaran oleh Guru (D.1 / D.2)',
    coachingNeedGroup: 'Pendampingan Integrasi Teks Bacaan & Pertanyaan Terbuka Lintas Mapel',
    behaviorTarget: 'Guru mengintegrasikan teks bacaan/informasi ke mapel non-bahasa dan memantik pertanyaan terbuka bernalar tinggi.',
    observationFocusAspects: [
      'Integrasi teks bacaan/informasi bermakna dalam mata pelajaran non-bahasa',
      'Keterampilan guru memantik pertanyaan terbuka dan diskusi reflektif murid',
      'Diferensiasi pendampingan bagi murid dengan kemampuan membaca dasar',
    ],
    kombelTopic: 'Strategi Integrasi Teks Bacaan & Pertanyaan Terbuka Lintas Mata Pelajaran',
    pmmTopic: 'Ruang GTK / PMM: Penguatan Kompetensi Literasi dalam Pembelajaran',
  },
  {
    code: 'A.2',
    title: 'Kemampuan Numerasi',
    keywords: ['numerasi'],
    defaultRootCauseL2: 'Metode Pembelajaran & Asesmen Formatif Berdiferensiasi (D.1 / D.2)',
    coachingNeedGroup: 'Pendampingan Penalaran Numerasi Lintas Mapel & Asesmen Diagnostik',
    behaviorTarget: 'Guru mengaitkan penalaran matematis/data kontekstual ke dalam berbagai mata pelajaran dan menggunakan asesmen formatif.',
    observationFocusAspects: [
      'Integrasi penalaran matematika, data, dan grafik ke mata pelajaran non-matematika',
      'Penggunaan pertanyaan terbuka yang melatih logika pemecahan masalah',
      'Pemanfaatan media/alat peraga konkret dan asesmen diagnostik awal bab',
    ],
    kombelTopic: 'Berbagi Praktik Baik Numerasi Kontekstual & Asesmen Formatif Berdiferensiasi',
    pmmTopic: 'Ruang GTK / PMM: Numerasi Lintas Mata Pelajaran & Asesmen Diagnostik',
  },
  {
    code: 'D.1',
    title: 'Kualitas Pembelajaran',
    keywords: ['kualitas pembelajaran', 'metode pembelajaran'],
    defaultRootCauseL2: 'Refleksi dan Perbaikan Pembelajaran oleh Guru serta Dukungan Psikologis (D.2)',
    coachingNeedGroup: 'Penguatan Manajemen Kelas, Dukungan Psikologis & Pembelajaran Student-Centered',
    behaviorTarget: 'Meningkatnya penerapan diskusi interaktif di kelas, dukungan psikologis guru, dan keterlibatan aktif murid.',
    observationFocusAspects: [
      'Manajemen kelas yang kondusif, terstruktur, dan berpusat pada murid (student-centered)',
      'Dukungan psikologis dan afektif guru untuk membangun rasa aman murid saat belajar',
      'Keterlibatan aktif seluruh murid melalui diskusi interaktif dan umpan balik konstruktif',
    ],
    kombelTopic: 'Praktik Baik Pembelajaran Interaktif, Manajemen Kelas & Diferensiasi',
    pmmTopic: 'Ruang GTK / PMM: Kualitas Pembelajaran & Dukungan Psikologis Murid',
  },
  {
    code: 'A.3',
    title: 'Karakter',
    keywords: ['karakter'],
    defaultRootCauseL2: 'Metode Pembelajaran Reflektif & Kepemimpinan Instruksional (D.1 / D.3)',
    coachingNeedGroup: 'Pengintegrasian Profil Pelajar Pancasila & Refleksi Karakter Harian',
    behaviorTarget: 'Guru membiasakan kolaborasi, kemandirian, dan nalar kritis murid secara konsisten dalam aktivitas kelas.',
    observationFocusAspects: [
      'Pembiasaan sikap gotong royong, kemandirian, dan etika diskusi di kelas',
      'Keteladanan guru dalam memberikan penguatan positif berbasis karakter',
      'Integrasi refleksi nilai karakter pada penutup sesi pembelajaran',
    ],
    kombelTopic: 'Pengintegrasian Dimensi Karakter & 7 Pembiasaan Positif di Kelas',
    pmmTopic: 'Ruang GTK / PMM: Penguatan Karakter & Projek Profil Pelajar Pancasila',
  },
  {
    code: 'D.4',
    title: 'Iklim Keamanan Satuan Pendidikan',
    keywords: ['keamanan'],
    defaultRootCauseL2: 'Kepemimpinan Instruksional & Tata Kelola Pencegahan Perundungan (D.3)',
    coachingNeedGroup: 'Pengelolaan Interaksi Kelas Aman & Pencegahan Perundungan (Guru & Tendik)',
    behaviorTarget: 'Guru dan tendik menerapkan disiplin positif, pencegahan perundungan (bullying), serta menjaga interaksi sosial aman.',
    observationFocusAspects: [
      'Interaksi sosial yang saling menghormati antarwarga kelas dan bebas perundungan',
      'Kesiapan guru dan tendik dalam deteksi dini serta respons cepat pencegahan kekerasan',
      'Kepatuhan layanan satuan pendidikan terhadap SOP Satgas PPKSP',
    ],
    kombelTopic: 'Disiplin Positif, Manajemen Konflik Kelas & Peran Satgas PPKSP',
    pmmTopic: 'Ruang GTK / PMM: Pencegahan Kekerasan di Satuan Pendidikan (PPKSP)',
  },
  {
    code: 'D.8',
    title: 'Iklim Kebinekaan',
    keywords: ['kebinekaan', 'inklusif'],
    defaultRootCauseL2: 'Refleksi Pembelajaran & Kepemimpinan Instruksional Berpihak Inklusi (D.2 / D.3)',
    coachingNeedGroup: 'Pendampingan Sikap Inklusif & Layanan Murid Beragam Kebutuhan Belajar',
    behaviorTarget: 'Guru dan tendik menunjukkan sikap inklusif tanpa diskriminasi terhadap perbedaan latar belakang dan kebutuhan belajar murid.',
    observationFocusAspects: [
      'Sikap inklusif guru dan tendik terhadap keragaman latar belakang dan gaya belajar murid',
      'Kesetaraan kesempatan berpartisipasi dalam diskusi kelompok maupun layanan sekolah',
      'Penyesuaian bahan ajar atau layanan yang ramah bagi murid berkebutuhan khusus',
    ],
    kombelTopic: 'Pembelajaran Inklusif & Penghargaan Keberagaman di Sekolah',
    pmmTopic: 'Ruang GTK / PMM: Iklim Kebinekaan & Layanan Pendidikan Inklusif',
  },
];

export function analyzeSixPriorityIndicators(
  indicators: RaporIndicator[],
  rootCauses: RootCauseReflection[] = []
): SixPriorityAnalysisItem[] {
  const indD1 = findIndicatorByHint(indicators, ['D.1'], ['kualitas pembelajaran']);
  const indD2 = findIndicatorByHint(indicators, ['D.2'], ['refleksi', 'perbaikan pembelajaran']);
  const indD3 = findIndicatorByHint(indicators, ['D.3'], ['kepemimpinan instruksional']);

  const l2Drivers = [
    indD1 ? { label: `Metode/Kualitas Pembelajaran (D.1: ${indD1.score.toFixed(1)})`, score: indD1.score } : null,
    indD2 ? { label: `Refleksi & Perbaikan Pembelajaran Guru (D.2: ${indD2.score.toFixed(1)})`, score: indD2.score } : null,
    indD3 ? { label: `Kepemimpinan Instruksional (D.3: ${indD3.score.toFixed(1)})`, score: indD3.score } : null,
  ]
    .filter((x): x is { label: string; score: number } => Boolean(x))
    .sort((a, b) => a.score - b.score);

  return SIX_PRIORITY_SPECS.map((spec) => {
    const matched = findIndicatorByHint(indicators, [spec.code], spec.keywords);
    const score = matched?.score ?? 65;
    const change = matched?.changeFromLastYear ?? 0;
    const cat = matched?.category || (score >= 75 ? 'Baik' : score >= 60 ? 'Sedang' : 'Kurang');

    let labelStatus: SixPriorityAnalysisItem['labelStatus'] = 'Baik (Hijau)';
    if (score < 60 || cat === 'Kurang' || cat === 'Perlu Intervensi Khusus') {
      labelStatus = 'Kurang (Merah)';
    } else if (score < 75 || cat === 'Sedang' || cat === 'Dasar' || change < 0) {
      labelStatus = 'Sedang (Kuning)';
    }

    const matchedSchoolRC = rootCauses.find(
      (rc) =>
        rc.mainProblem.toLowerCase().includes(spec.title.toLowerCase()) ||
        rc.rootCause.toLowerCase().includes(spec.keywords[0])
    );

    const dynamicRootCauseL2 =
      matchedSchoolRC?.rootCause ||
      matched?.kemendikbudRootCause ||
      (l2Drivers.length > 0 && spec.code !== 'D.1'
        ? `Akar Masalah Level 2 dominan pada ${l2Drivers[0].label}`
        : spec.defaultRootCauseL2);

    return {
      code: spec.code,
      title: spec.title,
      score,
      change,
      categoryLabel: cat,
      labelStatus,
      needsAttention: labelStatus !== 'Baik (Hijau)' || change < 0,
      rootCauseLevel2: dynamicRootCauseL2,
      coachingNeedGroup: spec.coachingNeedGroup,
      behaviorTarget: spec.behaviorTarget,
      observationFocusAspects: spec.observationFocusAspects,
      kombelTopic: spec.kombelTopic,
      pmmTopic: spec.pmmTopic,
    };
  });
}

export function buildDataDrivenSupervisionRecords(
  db: SchoolDatabase,
  preserveManual = true
): TeacherSupervisionRecord[] {
  const { schoolProfile, raporIndicators, rootCauses } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const manualRecords = preserveManual
    ? (db.supervisionRecords || []).filter((s) => !isGeneratedId(s.id))
    : [];

  const sixAnalysis = analyzeSixPriorityIndicators(raporIndicators, rootCauses);
  // Prioritize Merah first, then Kuning / negative trend, fallback to top 3-4
  const sortedByUrgency = [...sixAnalysis].sort((a, b) => {
    const rank = (s: SixPriorityAnalysisItem['labelStatus']) =>
      s === 'Kurang (Merah)' ? 0 : s === 'Sedang (Kuning)' ? 1 : 2;
    if (rank(a.labelStatus) !== rank(b.labelStatus)) {
      return rank(a.labelStatus) - rank(b.labelStatus);
    }
    return a.score - b.score;
  });

  const baseYearNum = parseInt((schoolProfile.academicYear || '2025').slice(0, 4), 10) || new Date().getFullYear();

  const academicFocuses = sortedByUrgency.filter((x) => ['A.1', 'A.2', 'D.1', 'A.3'].includes(x.code)).slice(0, 3);
  const managerialFocus = sortedByUrgency.find((x) => ['D.4', 'D.8'].includes(x.code)) || sixAnalysis[4];

  const academicRecords: TeacherSupervisionRecord[] = academicFocuses.map((item, idx) => {
    const subj =
      item.code === 'A.1'
        ? `${stageMeta.coreSubjects[2] || 'IPAS / IPS'} (Integrasi Literasi Non-Bahasa)`
        : item.code === 'A.2'
        ? `${stageMeta.coreSubjects[1] || 'IPA / IPS / Mapel'} (Integrasi Numerasi Kontekstual)`
        : stageMeta.coreSubjects[idx % stageMeta.coreSubjects.length] || 'Guru Mapel / Kelas';
    const grade = stageMeta.classUnitSample[idx % stageMeta.classUnitSample.length] || stageMeta.gradesLabel;
    const isLow = item.labelStatus === 'Kurang (Merah)';

    return {
      id: `pbd-gen-sup-${idx + 1}`,
      teacherName: `Kelompok Pendidik ${idx + 1} (${schoolProfile.name})`,
      supervisionType: 'Akademik (Guru)',
      subject: subj,
      gradeLevel: grade,
      scheduledDate: `${baseYearNum}-0${8 + idx}-15`,
      priorityIndicatorCode: item.code,
      priorityIndicatorName: item.title,
      indicatorLabelStatus: item.labelStatus,
      rootCauseLevel2: item.rootCauseLevel2,
      coachingNeedGroup: item.coachingNeedGroup,
      behaviorTarget: item.behaviorTarget,
      observationFocusAspects: item.observationFocusAspects,
      preObservationNotes: `Pra-Observasi: menyepakati fokus indikator ${item.code} ${item.title} (${item.labelStatus}) serta aspek instrumen pembelajaran berdiferensiasi dan pertanyaan terbuka.`,
      observationScore: Math.round(Math.min(92, Math.max(72, item.score + 12)) * 10) / 10,
      postObservationReflection: `Coaching Pasca-Observasi: dialog reflektif membedah kekuatan & kendala kelas terhadap akar masalah (${item.rootCauseLevel2}).`,
      followUpPlan: `Dibahas di Kombel (${item.kombelTopic}) & mempelajari modul "${item.pmmTopic}".${isLow ? ' Dijadwalkan Supervisi Klinis Ulang.' : ''}`,
      kombelTopic: item.kombelTopic,
      pmmTopic: item.pmmTopic,
      requiresFollowUpSupervision: isLow || idx === 2,
      followUpRescheduleDate: isLow || idx === 2 ? `${baseYearNum}-11-10` : undefined,
      internalImpactNotes: `Asesmen diagnostik & survei kelas tengah semester memantau dampak perubahan praktik mengajar terhadap ${item.title}.`,
      status: idx === 0 ? 'Tuntas Ditindaklanjuti' : idx === 1 ? 'Observasi Dilakukan' : 'Pra-Observasi',
    };
  });

  const managerialRecord: TeacherSupervisionRecord = {
    id: 'pbd-gen-sup-4',
    teacherName: `Tim Tendik, BK, Perpustakaan & Satgas PPKSP (${schoolProfile.name})`,
    supervisionType: 'Manajerial (Tendik/Unit)',
    subject: 'Layanan Satuan Pendidikan, Perpustakaan & Keamanan Lingkungan Belajar',
    gradeLevel: 'Unit Layanan Sekolah',
    scheduledDate: `${baseYearNum}-10-24`,
    priorityIndicatorCode: managerialFocus.code,
    priorityIndicatorName: managerialFocus.title,
    indicatorLabelStatus: managerialFocus.labelStatus,
    rootCauseLevel2: managerialFocus.rootCauseLevel2,
    coachingNeedGroup: managerialFocus.coachingNeedGroup,
    behaviorTarget: managerialFocus.behaviorTarget,
    observationFocusAspects: managerialFocus.observationFocusAspects,
    preObservationNotes: `Pra-Observasi Manajerial: menyepakati instrumen layanan satuan pendidikan pada indikator ${managerialFocus.code} (${managerialFocus.title}) — fokus pencegahan perundungan, sikap inklusif, dan tata kelola layanan siswa.`,
    observationScore: Math.round(Math.min(94, Math.max(76, managerialFocus.score + 8)) * 10) / 10,
    postObservationReflection: `Coaching Manajerial: tim layanan mengevaluasi keaktifan kanal aduan aman, layanan inklusif bagi murid beragam kebutuhan, serta ketersediaan pojok baca aktif.`,
    followUpPlan: `Tindak lanjut di forum GTK (${managerialFocus.kombelTopic}) serta pendalaman modul "${managerialFocus.pmmTopic}".`,
    kombelTopic: managerialFocus.kombelTopic,
    pmmTopic: managerialFocus.pmmTopic,
    requiresFollowUpSupervision: managerialFocus.labelStatus === 'Kurang (Merah)',
    followUpRescheduleDate: managerialFocus.labelStatus === 'Kurang (Merah)' ? `${baseYearNum}-11-18` : undefined,
    internalImpactNotes: 'Survei lingkungan belajar internal memverifikasi tingkat kenyamanan & rasa aman seluruh peserta didik.',
    status: 'Pra-Observasi',
  };

  return [...manualRecords, ...academicRecords, managerialRecord];
}

export function buildDetailedSupervisionProgramMarkdown(db: SchoolDatabase): string {
  const { schoolProfile, raporIndicators, rootCauses, supervisionRecords } = db;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const sixAnalysis = analyzeSixPriorityIndicators(raporIndicators, rootCauses);
  const priorityFocus = sixAnalysis.filter((x) => x.needsAttention);
  const usedFocus = priorityFocus.length > 0 ? priorityFocus : sixAnalysis.slice(0, 3);
  const followUpRevisits = supervisionRecords.filter((s) => s.requiresFollowUpSupervision);
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sixTableText = sixAnalysis
    .map(
      (item, i) =>
        `${i + 1}. **[${item.code}] ${item.title}** — Skor: ${item.score.toFixed(1)} (${item.labelStatus}, tren ${
          item.change >= 0 ? `+${item.change}` : item.change
        })\n   - Akar Masalah Level 2: ${item.rootCauseLevel2}`
    )
    .join('\n');

  const groupTargetsText = usedFocus
    .map(
      (item, i) =>
        `${i + 1}. **Kelompok Kebutuhan: ${item.coachingNeedGroup}** (Fokus ${item.code} ${item.title})\n   - Target Perubahan Perilaku Mengajar/Layanan: ${item.behaviorTarget}`
    )
    .join('\n');

  const scheduleText =
    supervisionRecords.length > 0
      ? supervisionRecords
          .map(
            (s, i) =>
              `${i + 1}. **${s.teacherName}** [${s.supervisionType || 'Akademik (Guru)'} — ${s.subject}, ${s.gradeLevel}]\n   - Fokus Rapor: ${s.priorityIndicatorCode || 'PBD'} ${s.priorityIndicatorName || ''} | Tanggal: ${s.scheduledDate} | Status: ${s.status}\n   - Pra-Observasi: ${s.preObservationNotes}\n   - RTL Kombel & Ruang GTK/PMM: ${s.kombelTopic || s.followUpPlan}${s.requiresFollowUpSupervision ? ` | **Supervisi Klinis Ulang**: ${s.followUpRescheduleDate || 'Dijadwalkan ulang'}` : ''}`
          )
          .join('\n')
      : '- Jadwal supervisi berbasis data siap disusun.';

  return `# PROGRAM SUPERVISI AKADEMIK DAN MANAJERIAL BERBASIS DATA (RAPOR PENDIDIKAN)
## ${schoolProfile.name.toUpperCase()} — TAHUN PELAJARAN ${schoolProfile.academicYear}
NPSN: ${schoolProfile.npsn} | Jenjang: ${schoolProfile.stage} ${schoolProfile.status} (${stageMeta.gradesLabel}) | Jumlah Guru: ${schoolProfile.totalTeachers} | Tendik: ${schoolProfile.totalStaff}

---

### LEMBAR PENGESAHAN
Program Supervisi Akademik dan Manajerial Berbasis Data ${schoolProfile.name} Tahun Pelajaran ${schoolProfile.academicYear} disusun berdasarkan pemetaan 6 indikator prioritas Rapor Pendidikan dan refleksi akar masalah untuk mendampingi peningkatan kualitas pembelajaran dan layanan satuan pendidikan.

Disahkan di: ${schoolProfile.city}, ${todayFormatted}
**Kepala ${schoolProfile.name},**
${schoolProfile.principalName}
NIP. ${schoolProfile.principalNip || '-'}

---

### BAB I: PENDAHULUAN
#### 1.1 Latar Belakang & Prinsip Dasar Program
Program supervisi akademik dan manajerial di ${schoolProfile.name} disusun secara **berbasis data (data-driven)** dan terhubung langsung dengan capaian Rapor Pendidikan. Tujuannya bukan sekadar memeriksa kelengkapan administrasi guru, melainkan mendampingi ${schoolProfile.totalTeachers} guru dan ${schoolProfile.totalStaff} tenaga kependidikan untuk memperbaiki kualitas pembelajaran dan layanan satuan pendidikan pada indikator yang skornya masih rendah atau mengalami penurunan.

#### 1.2 Landasan Hukum
1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
2. Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen.
3. PP Nomor 57 Tahun 2021 jo PP Nomor 4 Tahun 2022 tentang Standar Nasional Pendidikan (Standar Proses & Standar PTK).
4. Permendikbudristek Nomor 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
5. Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan Satuan Pendidikan.
6. Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.

---

### 1. ANALISIS AKAR MASALAH DARI RAPOR PENDIDIKAN
Pemetaan enam indikator utama prioritas (${schoolProfile.name}) berlabel merah (kurang), kuning (sedang), atau hijau (baik) beserta penelusuran Akar Masalah Level 2 (Metode Pembelajaran, Refleksi dan Perbaikan Pembelajaran oleh Guru, atau Kepemimpinan Instruksional):

${sixTableText}

---

### 2. TUJUAN DAN SASARAN SUPERVISI YANG SPESIFIK
Sasaran supervisi dikelompokkan berdasarkan kebutuhan pendampingan nyata (bukan menyamaratakan perlakuan untuk semua guru/tendik) dengan target perubahan perilaku yang terukur:

${groupTargetsText}

---

### 3. FOKUS ASPEK OBSERVASI KELAS & LAYANAN (INSTRUMEN SUPERVISI)
Instrumen observasi disesuaikan langsung dengan indikator Rapor Pendidikan yang sedang dibenahi:
- **Fokus Literasi & Numerasi (A.1 & A.2)**: Mengamati bagaimana guru mengintegrasikan teks bacaan bermakna atau penalaran matematika ke dalam mata pelajaran non-bahasa dan non-matematika, serta bagaimana guru memantik pertanyaan terbuka.
- **Fokus Kualitas Pembelajaran (D.1)**: Mengamati manajemen kelas yang efektif, dukungan psikologis guru kepada murid, serta keterlibatan aktif siswa dalam pembelajaran berpusat pada murid (*student-centered*).
- **Fokus Iklim Keamanan & Kebinekaan (D.4, D.8 & Manajerial Tendik)**: Mengamati interaksi sosial kelas dan layanan sekolah, pencegahan perundungan (*bullying*), serta sikap inklusif guru dan tendik terhadap murid dengan latar belakang atau kebutuhan belajar beragam.

---

### 4. PENDEKATAN DAN METODE PENDAMPINGAN (SIKLUS COACHING)
Supervisi mengutamakan pemberdayaan guru dan tendik melalui 3 tahap siklus coaching berkelanjutan:
1. **Pra-Observasi**: Diskusi awal kepala sekolah/tim supervisi dengan guru atau tendik untuk menyepakati indikator Rapor Pendidikan dan instrumen aspek yang akan dilatihkan pada pertemuan tersebut.
2. **Observasi Pembelajaran / Layanan**: Pengamatan langsung di kelas atau unit layanan menggunakan instrumen yang telah disepakati tanpa menginterupsi jalannya pelajaran.
3. **Pasca-Observasi (Coaching dan Umpan Balik)**: Dialog reflektif berbasis bukti pengamatan untuk membantu guru/tendik menemukan sendiri kekuatan, kelemahan, dan solusi perbaikan.

---

### 5. RENCANA TINDAK LANJUT (RTL) TERINTEGRASI & JADWAL PENDAMPINGAN
Hasil supervisi ditindaklanjuti secara sistemik melalui:
- **Integrasi Komunitas Belajar (Kombel)**: Temuan umum dari supervisi dijadikan topik utama pertemuan Kombel sekolah (antara lain praktik baik modul ajar berdiferensiasi dan integrasi literasi-numerasi).
- **Pemanfaatan Platform Belajar (Ruang GTK / PMM)**: Guru diarahkan mempelajari topik spesifik di Ruang GTK / PMM sesuai catatan observasinya.
- **Supervisi Klinis Ulang**: Pendampingan lanjutan terjadwal khusus bagi pendidik/tendik yang masih memerlukan penguatan pasca tindak lanjut pertama (saat ini tercatat **${followUpRevisits.length} agenda** membutuhkan supervisi klinis ulang).

**Daftar Agenda Supervisi & Coaching (${supervisionRecords.length} Sasaran):**
${scheduleText}

---

### 6. EVALUASI DAN MONITORING DAMPAK
Keberhasilan program diukur sebelum rilis Rapor Pendidikan tahun berikutnya melalui:
1. **Evaluasi Tengah Semester**: Memeriksa tingkat keterlaksanaan jadwal supervisi dan konsistensi guru menerapkan kesepakatan hasil *coaching* di kelas.
2. **Asesmen Internal & Survei Lingkungan Belajar Internal**: Melaksanakan survei lingkungan belajar internal serta asesmen diagnostik berkala kepada ${schoolProfile.totalStudents} siswa untuk mengukur dampak langsung perubahan cara mengajar dan layanan sekolah terhadap pemahaman serta kenyamanan belajar murid.

---
### PENUTUP
Demikian Program Supervisi Akademik dan Manajerial Berbasis Data ${schoolProfile.name} Tahun Pelajaran ${schoolProfile.academicYear} ini disusun untuk dilaksanakan secara konsisten dan kolaboratif.`;
}

export interface SynthesisOptions {
  preserveManualItems?: boolean;
}

export interface SynthesisSummary {
  problemsUsed: number;
  rootCausesReady: number;
  recommendationsReady: number;
  actionPlansReady: number;
  snpCount: number;
  accreditationCount: number;
  rkasCount: number;
  totalRkasBudget: number;
  principalProgramsCount: number;
  supervisionCount: number;
  literacyCount: number;
  numeracyCount: number;
  characterCount: number;
  documentsCount: number;
}

function isGeneratedId(id: string): boolean {
  if (id.startsWith('pbd-gen-') || id.startsWith('doc-simulasi-')) {
    return true;
  }
  return /^(rec|act|rkas|pkepsek|sup|lit|num|kar|akred|doc)-\d{1,2}$/.test(id);
}

export function upsertDocumentInArchive(
  existingDocs: OfficialDocument[],
  newDoc: OfficialDocument
): OfficialDocument[] {
  const idx = existingDocs.findIndex((d) => d.id === newDoc.id);
  if (idx >= 0) {
    const next = [...existingDocs];
    next[idx] = newDoc;
    return next;
  }
  return [newDoc, ...existingDocs];
}

/**
 * Master PBD Synthesis Engine:
 * Converts completed PBD stages (Rapor -> Masalah -> Akar Masalah -> Rekomendasi -> Rencana Aksi)
 * into precise Section 4 (Dokumen Induk & Anggaran), Section 5 (Mutu Pembelajaran), and Section 6.3 (Arsip Dokumen).
 */
export function synthesizeAllModulesFromPBD(
  prevDb: SchoolDatabase,
  options: SynthesisOptions = {}
): { updatedDb: SchoolDatabase; summary: SynthesisSummary } {
  const preserveManual = Boolean(options.preserveManualItems);
  const { schoolProfile, supportingData, raporIndicators } = prevDb;
  const stageMeta = getStageMeta(schoolProfile.stage);
  const studentsCount = schoolProfile.totalStudents || 180;
  const rombelCount = schoolProfile.totalStudyGroups || 6;
  const teachersCount = schoolProfile.totalTeachers || 15;
  const budgetCap = supportingData.budgetCapTotal || studentsCount * 1100000;
  const todayIso = new Date().toISOString().split('T')[0];

  // 1. Ensure PBD pipeline completeness if anything was skipped
  let problems = [...prevDb.problems];
  if (problems.length === 0 && raporIndicators.length > 0) {
    problems = recommendTopProblems(raporIndicators, 5);
  }
  const activeProblems = problems.filter((p) => p.selectedForPBD);
  const usedProblems = activeProblems.length > 0 ? activeProblems : problems;

  const rootCauses: RootCauseReflection[] = [...prevDb.rootCauses];
  usedProblems.forEach((prob, idx) => {
    if (!rootCauses.some((r) => r.problemId === prob.id)) {
      const ind = raporIndicators.find((i) => i.id === prob.indicatorId || i.code === prob.indicatorCode);
      rootCauses.push({
        id: `pbd-gen-rc-${idx}-${Date.now()}`,
        problemId: prob.id,
        mainProblem: prob.mainProblem,
        symptoms: [
          prob.actualCondition,
          `Sebagian peserta didik masih kesulitan menguasai kompetensi inti ${prob.indicatorName}.`,
        ],
        whyChain: [
          `Mengapa ${prob.indicatorName} belum optimal? Aktivitas belajar belum sepenuhnya melatih nalar tingkat tinggi siswa.`,
          `Mengapa belum melatih nalar? Strategi diferensiasi dan media pembelajaran konkret belum merata di semua kelas.`,
          `Mengapa belum merata? Guru memerlukan pendampingan praktis di Komunitas Belajar (Kombel) sekolah.`,
        ],
        rootCause:
          ind?.kemendikbudRootCause ||
          `Optimalisasi Komunitas Belajar (Kombel) guru dan ketersediaan media pembelajaran kontekstual pada aspek ${prob.indicatorName} perlu diperkuat.`,
        controllableFactors: [
          'Penjadwalan Kombel rutin mingguan dan supervisi akademik klinis.',
          'Pengalokasian dana BOSP untuk sarana pembelajaran prioritas.',
        ],
        uncontrollableFactors: [
          'Latar belakang dukungan belajar siswa di lingkungan keluarga.',
        ],
        isVerifiedBySchool: true,
      });
    }
  });

  const recommendations = buildRecommendationsForAllProblems(
    usedProblems,
    rootCauses,
    prevDb.recommendations,
    schoolProfile
  );

  const actionPlans = buildActionPlansFromRecommendations(
    recommendations,
    prevDb.actionPlans,
    schoolProfile
  );

  // Locate key Rapor indicators for precision SNP & Mutu Pembelajaran mapping
  const indLit = findIndicatorByHint(raporIndicators, ['A.1'], ['literasi']);
  const indNum = findIndicatorByHint(raporIndicators, ['A.2'], ['numerasi']);
  const indChar = findIndicatorByHint(raporIndicators, ['A.3'], ['karakter']);
  const indQual = findIndicatorByHint(raporIndicators, ['D.1'], ['kualitas pembelajaran']);
  const indReflect = findIndicatorByHint(raporIndicators, ['D.2'], ['refleksi', 'perbaikan pembelajaran']);
  const indLead = findIndicatorByHint(raporIndicators, ['D.3'], ['kepemimpinan instruksional']);
  const indSafe = findIndicatorByHint(raporIndicators, ['D.4'], ['keamanan']);
  const indDiv = findIndicatorByHint(raporIndicators, ['D.8'], ['kebinekaan']);
  const indPtk = findIndicatorByHint(raporIndicators, ['C.1', 'C.2', 'C.3'], ['pmm', 'guru', 'pelatihan']);
  const indPart = findIndicatorByHint(raporIndicators, ['E.1', 'E.5'], ['partisipasi', 'berbasis data']);
  const indBudget = findIndicatorByHint(raporIndicators, ['E.2', 'E.3'], ['anggaran', 'sumber daya']);

  const litScore = indLit?.score ?? 65;
  const numScore = indNum?.score ?? 60;
  const charScore = indChar?.score ?? 72;
  const qualScore = indQual?.score ?? 66;
  const safeScore = indSafe?.score ?? 78;

  // 2. Precision 8 SNP Data (4.1 Integrasi SNP)
  const problemNamesList = usedProblems.map((p) => `[${p.indicatorCode}] ${p.indicatorName}`);
  const benahi1Titles = recommendations
    .filter((r) => r.type.includes('Benahi 1'))
    .map((r) => r.title)
    .slice(0, 2);
  const benahi2Titles = recommendations
    .filter((r) => r.type.includes('Benahi 2'))
    .map((r) => r.title)
    .slice(0, 2);
  const benahi3Titles = recommendations
    .filter((r) => r.type.includes('Benahi 3'))
    .map((r) => r.title)
    .slice(0, 2);

  const goodClassRatio =
    supportingData.facilitiesSummary.classroomsCount > 0
      ? Math.round(
          (supportingData.facilitiesSummary.goodConditionCount /
            supportingData.facilitiesSummary.classroomsCount) *
            100
        )
      : 85;
  const certifiedRatio =
    teachersCount > 0
      ? Math.min(100, Math.round(((supportingData.teachersSummary.certifiedCount || Math.round(teachersCount * 0.6)) / teachersCount) * 100))
      : 70;

  const generatedSnpData: SNPStandardItem[] = [
    {
      standardNumber: 1,
      standardName: 'Standar Kompetensi Lulusan (SKL)',
      actualCondition: `Rata-rata capaian hasil belajar murid: Literasi ${litScore.toFixed(1)} (${indLit?.category || 'Sedang'}), Numerasi ${numScore.toFixed(1)} (${indNum?.category || 'Sedang'}), Karakter ${charScore.toFixed(1)} (${indChar?.category || 'Baik'}).`,
      gapAnalysis:
        usedProblems.find((p) => p.indicatorCode.startsWith('A.'))?.mainProblem ||
        `Masih terdapat kesenjangan ketuntasan kompetensi bernalar pada indikator ${problemNamesList[0] || 'utama'}.`,
      targetImprovement: `Mendorong capaian Literasi, Numerasi, dan Karakter ${schoolProfile.name} minimal mencapai skor >= 72 (Cakap/Baik).`,
      relatedPrograms:
        actionPlans.slice(0, 2).map((a) => a.activityName).length > 0
          ? actionPlans.slice(0, 2).map((a) => a.activityName)
          : ['Akselerasi Literasi & Numerasi Berbasis PBD'],
      compliancePercentage: Math.min(98, Math.max(40, Math.round(avgScore([indLit, indNum, indChar])))),
    },
    {
      standardNumber: 2,
      standardName: 'Standar Isi',
      actualCondition: `Kurikulum satuan pendidikan (${supportingData.curriculum}) telah diterapkan pada ${rombelCount} rombongan belajar (${stageMeta.gradesLabel}).`,
      gapAnalysis: `Integrasi materi pembenahan PBD (${usedProblems.map((p) => p.indicatorCode).join(', ') || 'Literasi & Numerasi'}) ke dalam seluruh modul ajar lintas mapel perlu diseragamkan.`,
      targetImprovement: `100% modul ajar ${teachersCount} pendidik memuat penguatan kompetensi prioritas Rapor Pendidikan.`,
      relatedPrograms:
        benahi1Titles.length > 0 ? benahi1Titles : ['Review Kurikulum & Modul Ajar di Komunitas Belajar'],
      compliancePercentage: Math.min(98, Math.max(50, Math.round(avgScore([indQual, indLit, indNum], 74) + 6))),
    },
    {
      standardNumber: 3,
      standardName: 'Standar Proses',
      actualCondition: `Skor Kualitas Pembelajaran (${indQual?.code || 'D.1'}) sebesar ${qualScore.toFixed(1)} dan Refleksi Pembelajaran (${indReflect?.code || 'D.2'}) sebesar ${(indReflect?.score ?? 65).toFixed(1)}.`,
      gapAnalysis:
        rootCauses[0]?.rootCause ||
        'Pembelajaran aktif, berdiferensiasi, dan pemanfaatan media konkret perlu diperluas di seluruh kelas.',
      targetImprovement: `Seluruh guru menerapkan pembelajaran berdiferensiasi dan tuntas supervisi klinis minimal 2 kali per tahun pelajaran ${schoolProfile.academicYear}.`,
      relatedPrograms: [
        ...benahi1Titles,
        `Supervisi Akademik Klinis ${schoolProfile.name}`,
      ].slice(0, 3),
      compliancePercentage: Math.min(98, Math.max(45, Math.round(avgScore([indQual, indReflect], 68)))),
    },
    {
      standardNumber: 4,
      standardName: 'Standar Penilaian Pendidikan',
      actualCondition: `Asesmen sumatif terlaksana tertib; asesmen diagnostik awal untuk pemetaan kesiapan belajar ${studentsCount} siswa sedang diintensifkan.`,
      gapAnalysis:
        'Tindak lanjut hasil asesmen diagnostik ke dalam pengelompokan bimbingan belajar intensif belum seragam di setiap kelas.',
      targetImprovement: `100% pendidik melaksanakan asesmen diagnostik literasi-numerasi dan umpan balik formatif berkelanjutan.`,
      relatedPrograms: ['Asesmen Diagnostik & Evaluasi Pembelajaran Berbasis Data'],
      compliancePercentage: Math.min(96, Math.max(55, Math.round(avgScore([indQual, indNum], 70) + 4))),
    },
    {
      standardNumber: 5,
      standardName: 'Standar Pendidik dan Tenaga Kependidikan',
      actualCondition: `Didukung ${teachersCount} guru dan ${schoolProfile.totalStaff} tendik; rasio sertifikasi/kompetensi terdata ${certifiedRatio}% (Indikator PTK: ${(indPtk?.score ?? 68).toFixed(1)}).`,
      gapAnalysis:
        'Partisipasi aktif guru dalam berbagi praktik baik dan penyelesaian aksi nyata PMM di Kombel sekolah perlu didorong konsisten.',
      targetImprovement: `100% pendidik aktif dalam Kombel ${schoolProfile.name} sepanjang TP ${schoolProfile.academicYear}.`,
      relatedPrograms: benahi1Titles.length > 0 ? benahi1Titles : ['Penguatan Kombel & Klinik Aksi Nyata PMM'],
      compliancePercentage: Math.min(98, Math.max(50, Math.round((certifiedRatio + (indPtk?.score ?? 70)) / 2))),
    },
    {
      standardNumber: 6,
      standardName: 'Standar Sarana dan Prasarana',
      actualCondition: `${supportingData.facilitiesSummary.goodConditionCount} dari ${supportingData.facilitiesSummary.classroomsCount} ruang kelas dalam kondisi baik (${goodClassRatio}%); kondisi perpustakaan: ${supportingData.facilitiesSummary.libraryCondition}.`,
      gapAnalysis: `Ketersediaan sarana penunjang spesifik PBD (kit alat peraga dan koleksi buku non-teks) pada ${rombelCount} rombel perlu dipenuhi melalui BOSP.`,
      targetImprovement: `Terpenuhinya sarana pembelajaran prioritas pada seluruh ${rombelCount} rombongan belajar.`,
      relatedPrograms: benahi2Titles.length > 0 ? benahi2Titles : ['Pengadaan Sarana Belajar & Buku Pengayaan BOSP'],
      compliancePercentage: Math.min(98, Math.max(50, Math.round(goodClassRatio * 0.9))),
    },
    {
      standardNumber: 7,
      standardName: 'Standar Pengelolaan',
      actualCondition: `Partisipasi warga sekolah & PBD (${indPart?.code || 'E.1/E.5'}) berada di skor ${(indPart?.score ?? 72).toFixed(1)} dengan iklim keamanan ${safeScore.toFixed(1)} dan kebinekaan ${(indDiv?.score ?? 76).toFixed(1)}.`,
      gapAnalysis:
        'Keterlaksanaan RKJM, RKT, dan program pembiasaan perlu dipantau berkala per bulan oleh tim TPMPS.',
      targetImprovement: `100% program kerja RKT & RKJM ${schoolProfile.name} termonitor dan terdokumentasi digital.`,
      relatedPrograms: [
        `RKJM ${schoolProfile.planningPeriod} & RKT ${schoolProfile.academicYear}`,
        ...benahi3Titles,
      ].slice(0, 3),
      compliancePercentage: Math.min(98, Math.max(55, Math.round(avgScore([indPart, indLead, indSafe], 76)))),
    },
    {
      standardNumber: 8,
      standardName: 'Standar Pembiayaan',
      actualCondition: `Pagu BOSP tahunan sebesar Rp ${budgetCap.toLocaleString('id-ID')} (Indikator pengelolaan sumber daya: ${(indBudget?.score ?? 70).toFixed(1)}).`,
      gapAnalysis:
        'Belanja operasional rutin perlu diseimbangkan agar porsi signifikan terarah pada pembenahan indikator prioritas PBD.',
      targetImprovement: `100% pos belanja pembenahan mutu PBD masuk dalam RKAS ARKAS sesuai Permendikdasmen No. 8 Tahun 2026.`,
      relatedPrograms: ['Sinkronisasi RKAS BOSP dengan Rencana Aksi PBD'],
      compliancePercentage: Math.min(98, Math.max(60, Math.round(indBudget?.score ?? 78))),
    },
  ];
  const manualSnpData = preserveManual
    ? prevDb.snpData.filter((s) => s.standardNumber > 8)
    : [];
  const finalSnpData = [...generatedSnpData, ...manualSnpData];

  // 3. Precision RKAS Items (4.5 Generator RKAS) derived from ActionPlans & PBD
  const manualRkas = preserveManual
    ? prevDb.rkasItems.filter((r) => !isGeneratedId(r.id))
    : [];
  const manualRkasTotal = manualRkas.reduce((s, r) => s + r.totalAmount, 0);

  const generatedRkas: RKASItem[] = [];
  actionPlans.forEach((act, idx) => {
    const rec = recommendations.find((r) => r.id === act.recommendationId);
    const mapping = pickBospMapping(`${act.activityName} ${rec?.title || ''}`, rec?.type);
    const desiredBudget = act.budgetAllocated > 0 ? act.budgetAllocated : rec?.estimatedCost || mapping.unitPrice;
    if (desiredBudget <= 0) return;

    const unitPrice = desiredBudget >= mapping.unitPrice ? mapping.unitPrice : desiredBudget;
    const volume = Math.max(1, Math.round(desiredBudget / unitPrice));
    const exactUnitPrice = Math.round(desiredBudget / volume);
    const totalAmount = volume * exactUnitPrice;

    generatedRkas.push({
      id: `pbd-gen-rkas-${idx + 1}`,
      actionPlanId: act.id,
      programName: `${rec?.type || 'Program PBD'} — ${rec?.title || act.activityName}`,
      activityName: act.activityName,
      bospCode: mapping.bospCode,
      componentCategory: mapping.componentCategory,
      volume,
      unit: mapping.defaultUnit,
      unitPrice: exactUnitPrice,
      totalAmount,
      fundingSource: 'BOS Reguler',
      isBOSPCompliant: true,
      realizedAmount: act.actualBudgetSpent || 0,
    });
  });

  // Add essential core BOSP operational & assessment lines if within cap
  const currentPbdRkasSum = manualRkasTotal + generatedRkas.reduce((s, r) => s + r.totalAmount, 0);
  const remainingCap = Math.max(0, budgetCap - currentPbdRkasSum);
  if (remainingCap >= 6000000) {
    generatedRkas.push({
      id: 'pbd-gen-rkas-anbk',
      programName: 'Penyelenggaraan Asesmen & Evaluasi Pembelajaran (Rapor Pendidikan)',
      activityName: `Pelaksanaan Asesmen Diagnostik, Sumatif, dan ANBK ${schoolProfile.name}`,
      bospCode: '05.02.01',
      componentCategory: 'Kegiatan Asesmen dan Evaluasi Pembelajaran',
      volume: 1,
      unit: 'Paket Tahun',
      unitPrice: Math.min(6500000, Math.round(remainingCap * 0.25)),
      totalAmount: Math.min(6500000, Math.round(remainingCap * 0.25)),
      fundingSource: 'BOS Reguler',
      isBOSPCompliant: true,
      realizedAmount: 0,
    });
  }
  const sumAfterAnbk = manualRkasTotal + generatedRkas.reduce((s, r) => s + r.totalAmount, 0);
  const remainingAfterAnbk = Math.max(0, budgetCap - sumAfterAnbk);
  if (remainingAfterAnbk >= 12000000) {
    const monthlyInternet = Math.min(1000000, Math.floor((remainingAfterAnbk * 0.4) / 12));
    if (monthlyInternet >= 250000) {
      generatedRkas.push({
        id: 'pbd-gen-rkas-internet',
        programName: 'Layanan Daya, Jasa & Infrastruktur Pembelajaran Digital',
        activityName: `Langganan Internet Pembelajaran & Pemeliharaan Sarpras ${schoolProfile.name}`,
        bospCode: '08.01.01',
        componentCategory: 'Pemeliharaan Sarana dan Prasarana Sekolah',
        volume: 12,
        unit: 'Bulan',
        unitPrice: monthlyInternet,
        totalAmount: monthlyInternet * 12,
        fundingSource: 'BOS Reguler',
        isBOSPCompliant: true,
        realizedAmount: 0,
      });
    }
  }

  const finalRkasItems = [...manualRkas, ...generatedRkas];
  const totalRkasBudget = finalRkasItems.reduce((s, r) => s + r.totalAmount, 0);

  // 4. Precision Akreditasi BAN-PDM (4.2)
  const manualAkred = preserveManual
    ? prevDb.accreditationData.filter((a) => !isGeneratedId(a.id))
    : [];
  const generatedAkred: AccreditationItem[] = [
    {
      id: 'pbd-gen-akred-1',
      component: 'Kinerja Pendidik',
      indicatorCode: 'BUTIR-01',
      indicatorTitle: `Pendidik ${schoolProfile.name} menciptakan lingkungan belajar aman, nyaman, dan berpusat pada murid.`,
      description: `Didukung capaian kualitas pembelajaran (skor ${qualScore.toFixed(1)}) dan pelaksanaan supervisi klinis pada ${teachersCount} guru.`,
      requiredEvidence: [
        `Modul Ajar Berdiferensiasi (${supportingData.curriculum})`,
        `Catatan Observasi Supervisi Klinis Kepala ${schoolProfile.name}`,
        `Dokumentasi Umpan Balik Formatif Siswa (${stageMeta.gradesLabel})`,
      ],
      physicalEvidenceUploaded: qualScore >= 65,
      digitalEvidenceUploaded: true,
      readinessStatus: qualScore >= 72 ? 'Sangat Siap' : qualScore >= 60 ? 'Siap' : 'Kurang Siap',
      scoreTarget: 4,
    },
    {
      id: 'pbd-gen-akred-2',
      component: 'Kinerja Pendidik',
      indicatorCode: 'BUTIR-02',
      indicatorTitle: `Pendidik memfasilitasi pembelajaran efektif membangun nalar literasi (${litScore.toFixed(1)}) dan numerasi (${numScore.toFixed(1)}).`,
      description: `Tersinkronisasi dengan ${usedProblems.length} fokus pembenahan PBD dan program Komunitas Belajar sekolah.`,
      requiredEvidence: [
        'Portofolio Karya Literasi & Jurnal Baca Siswa',
        'Hasil Asesmen Diagnostik & Rekap Analisis PBD',
        'Dokumentasi Pemanfaatan Alat Peraga & Pojok Baca Kelas',
      ],
      physicalEvidenceUploaded: true,
      digitalEvidenceUploaded: litScore >= 65 && numScore >= 65,
      readinessStatus: litScore >= 70 && numScore >= 70 ? 'Sangat Siap' : 'Siap',
      scoreTarget: litScore >= 70 && numScore >= 70 ? 4 : 3,
    },
    {
      id: 'pbd-gen-akred-3',
      component: 'Kepemimpinan Kepala Sekolah',
      indicatorCode: 'BUTIR-03',
      indicatorTitle: `Kepala ${schoolProfile.name} (${schoolProfile.principalName}) memimpin perencanaan RKJM, RKT, dan RKAS berbasis Rapor Pendidikan.`,
      description: `Seluruh dokumen induk terintegrasi dengan ${actionPlans.length} rencana aksi dan Rp ${totalRkasBudget.toLocaleString('id-ID')} pos anggaran RKAS.`,
      requiredEvidence: [
        `Dokumen RKJM (${schoolProfile.planningPeriod}) & RKT (${schoolProfile.academicYear})`,
        'Berita Acara / Matriks Identifikasi Masalah & Refleksi 5-Why',
        `Dokumen RKAS BOSP ${schoolProfile.name} Format ARKAS`,
      ],
      physicalEvidenceUploaded: true,
      digitalEvidenceUploaded: true,
      readinessStatus: usedProblems.length > 0 && finalRkasItems.length > 0 ? 'Sangat Siap' : 'Siap',
      scoreTarget: 4,
    },
    {
      id: 'pbd-gen-akred-4',
      component: 'Iklim Lingkungan Belajar',
      indicatorCode: 'BUTIR-04',
      indicatorTitle: `Iklim lingkungan belajar inklusif, toleran, dan bebas kekerasan (Skor Keamanan: ${safeScore.toFixed(1)}).`,
      description: `Pengawalan Satgas PPKSP (Permendikbudristek 46/2023) dan program pembiasaan positif seluruh warga ${schoolProfile.name}.`,
      requiredEvidence: [
        `SK Satgas PPKSP ${schoolProfile.name}`,
        'SOP Pencegahan Perundungan & Layanan Konseling Ramah Anak',
        'Laporan Pelaksanaan 7 Pembiasaan Positif & Gotong Royong',
      ],
      physicalEvidenceUploaded: true,
      digitalEvidenceUploaded: safeScore >= 70,
      readinessStatus: safeScore >= 75 ? 'Sangat Siap' : 'Siap',
      scoreTarget: 4,
    },
    {
      id: 'pbd-gen-akred-5',
      component: 'Hasil Belajar Peserta Didik',
      indicatorCode: 'BUTIR-05',
      indicatorTitle: `Capaian kompetensi lulusan (${studentsCount} siswa): Literasi ${litScore.toFixed(1)}, Numerasi ${numScore.toFixed(1)}, Karakter ${charScore.toFixed(1)}.`,
      description: 'Dipantau melalui tren Rapor Pendidikan, rekam nilai asesmen diagnostik, dan program akselerasi mutu pembelajaran.',
      requiredEvidence: [
        `Rekap Data Rapor Pendidikan ${schoolProfile.name} (${raporIndicators.length} Indikator)`,
        'Laporan Perkembangan Program Gerakan Literasi & Numerasi',
        'Dokumentasi Prestasi Akademik & Non-Akademik Peserta Didik',
      ],
      physicalEvidenceUploaded: raporIndicators.length > 0,
      digitalEvidenceUploaded: true,
      readinessStatus: litScore >= 70 && numScore >= 70 && charScore >= 70 ? 'Sangat Siap' : 'Siap',
      scoreTarget: litScore >= 70 && numScore >= 70 ? 4 : 3,
    },
  ];
  const finalAccreditation = [...manualAkred, ...generatedAkred];

  // 5. Precision Program Kerja Kepala Sekolah (4.6)
  const manualPrincipal = preserveManual
    ? prevDb.principalPrograms.filter((p) => !isGeneratedId(p.id))
    : [];
  const pbdActionBudgetTotal = actionPlans.reduce((s, a) => s + a.budgetAllocated, 0);
  const generatedPrincipal: PrincipalProgramItem[] = [
    {
      id: 'pbd-gen-pkepsek-1',
      dimension: 'Manajerial',
      title: `Penetapan & Pengawalan Dokumen PBD, RKJM (${schoolProfile.planningPeriod}), RKT, dan RKAS (${schoolProfile.academicYear})`,
      goals: `Menjamin seluruh sumber daya ${schoolProfile.name} diarahkan tepat sasaran ke ${usedProblems.length} masalah prioritas Rapor Pendidikan.`,
      pic: `${schoolProfile.principalName} & Tim TPMPS`,
      schedule: `Awal Tahun Pelajaran ${schoolProfile.academicYear}`,
      indicators: `Tersahkannya RKJM, RKT, dan RKAS senilai Rp ${totalRkasBudget.toLocaleString('id-ID')}.`,
      budget: Math.round(budgetCap * 0.01) || 1500000,
      status: 'Selesai',
    },
    {
      id: 'pbd-gen-pkepsek-2',
      dimension: 'Supervisi Guru & Tendik',
      title: `Supervisi Akademik Klinis & Coaching Komunitas Belajar pada ${teachersCount} Pendidik`,
      goals: `Meningkatkan skor Kualitas Pembelajaran (${indQual?.code || 'D.1'}: ${qualScore.toFixed(1)}) melalui observasi kelas dan refleksi pembelajaran berdiferensiasi.`,
      pic: `${schoolProfile.principalName} & ${stageMeta.teacherCoordinator}`,
      schedule: `Semester Ganjil & Genap ${schoolProfile.academicYear}`,
      indicators: `100% dari ${teachersCount} guru mengikuti supervisi pra-observasi, observasi kelas, dan tindak lanjut.`,
      budget: 1800000,
      status: 'Sedang berjalan',
    },
    {
      id: 'pbd-gen-pkepsek-3',
      dimension: 'Mutu Pembelajaran',
      title: `Program Akselerasi Capaian ${usedProblems[0]?.indicatorName || 'Numerasi & Literasi'} (${usedProblems.map((p) => p.indicatorCode).join(', ') || 'A.1 & A.2'})`,
      goals: `Mengangkat indikator prioritas Rapor Pendidikan (Literasi ${litScore.toFixed(1)}, Numerasi ${numScore.toFixed(1)}) menuju kategori Baik/Cakap (>= 70).`,
      pic: `${stageMeta.teacherCoordinator} & Tim Literasi-Numerasi`,
      schedule: `Sepanjang TP ${schoolProfile.academicYear}`,
      indicators: `${actionPlans.length} kegiatan rencana aksi PBD terlaksana tepat waktu.`,
      budget: pbdActionBudgetTotal > 0 ? pbdActionBudgetTotal : 12000000,
      status: 'Sedang berjalan',
    },
    {
      id: 'pbd-gen-pkepsek-4',
      dimension: 'Budaya & Karakter',
      title: `Penguatan Iklim Sekolah Aman, Inklusif, Satgas PPKSP & 7 Pembiasaan Positif`,
      goals: `Mempertahankan dan meningkatkan skor Karakter (${charScore.toFixed(1)}) dan Iklim Keamanan (${safeScore.toFixed(1)}) bagi ${studentsCount} siswa.`,
      pic: 'Tim Kesiswaan, Guru BK & Satgas PPKSP',
      schedule: 'Rutin Setiap Hari Sekolah',
      indicators: 'Zero kasus perundungan dan minimal 95% keterlaksanaan pembiasaan harian.',
      budget: 2500000,
      status: 'Sedang berjalan',
    },
    {
      id: 'pbd-gen-pkepsek-5',
      dimension: 'Sarana & Prasarana',
      title: `Revitalisasi Sarana Belajar & Pojok Baca pada ${rombelCount} Rombongan Belajar`,
      goals: `Memastikan pengadaan media manipulatif dan buku bacaan non-teks terealisasi 100% sesuai RKAS.`,
      pic: 'Tim Sarpras, Kepala Perpustakaan & Bendahara BOSP',
      schedule: `Triwulan II - III (${schoolProfile.academicYear})`,
      indicators: `${rombelCount} ruang kelas memiliki sudut baca aktif dan akses kit pembelajaran.`,
      budget: recommendations.filter((r) => r.type.includes('Benahi 2')).reduce((s, r) => s + r.estimatedCost, 0) || 8500000,
      status: 'Belum dimulai',
    },
    {
      id: 'pbd-gen-pkepsek-6',
      dimension: 'Kemitraan Masyarakat',
      title: `Kolaborasi Orang Tua & Komite ${schoolProfile.name} dalam Pendampingan Belajar Murid`,
      goals: 'Menghubungkan dukungan keluarga untuk memperkuat kebiasaan membaca dan karakter positif di rumah.',
      pic: `Humas & Komite ${schoolProfile.name}`,
      schedule: 'Triwulanan',
      indicators: 'Minimal 85% orang tua hadir dalam forum parenting dan evaluasi mutu sekolah.',
      budget: 1500000,
      status: 'Sedang berjalan',
    },
  ];
  const finalPrincipalPrograms = [...manualPrincipal, ...generatedPrincipal];

  // 6. Precision Section 5 (Mutu Pembelajaran)
  const focusIssueLabel = usedProblems[0]?.indicatorName || 'Literasi & Numerasi';
  const focusRootCause = rootCauses[0]?.rootCause || 'penguatan pembelajaran aktif berdiferensiasi dan asesmen diagnostik';

  // 5.1 Program Supervisi Akademik & Manajerial Berbasis Data (Rapor Pendidikan)
  const intermediateForSup: SchoolDatabase = {
    ...prevDb,
    problems,
    rootCauses,
    recommendations,
    actionPlans,
  };
  const finalSupervision = buildDataDrivenSupervisionRecords(intermediateForSup, preserveManual);

  // 5.2 Program Literasi (A.1)
  const manualLiteracy = preserveManual
    ? prevDb.literacyPrograms.filter((l) => !isGeneratedId(l.id))
    : [];
  const generatedLiteracy: LiteracyProgramItem[] = [
    {
      id: 'pbd-gen-lit-1',
      title: `Gerakan 15 Menit Membaca Terpandu & Jurnal Literasi (${indLit?.code || 'A.1'}: Skor ${litScore.toFixed(1)})`,
      type: 'Pembiasaan 15 Menit',
      description: `Membiasakan ${studentsCount} peserta didik (${stageMeta.gradesLabel}) membaca buku non-teks pilihan selama 15 menit sebelum pembelajaran dan mencatat intisari bacaan.`,
      pic: 'Wali Kelas & Tim GLS Sekolah',
      targetParticipation: `100% Siswa (${studentsCount} Anak)`,
      frequency: '3 kali seminggu (Selasa, Rabu, Kamis)',
      progress: litScore >= 70 ? 85 : 60,
    },
    {
      id: 'pbd-gen-lit-2',
      title: `Revitalisasi Sudut Baca Aktif & Buku Pengayaan pada ${rombelCount} Rombongan Belajar`,
      type: 'Pojok Baca Kelas',
      description: `Menyediakan minimal 25 judul buku pengayaan fiksi & non-fiksi bermutu per ruang kelas (${rombelCount} rombel) yang didukung anggaran BOSP.`,
      pic: 'Kepala Perpustakaan & Tim Sarpras',
      targetParticipation: `${rombelCount} Rombongan Belajar`,
      frequency: 'Sepanjang Tahun Pelajaran',
      progress: 65,
    },
    {
      id: 'pbd-gen-lit-3',
      title: 'Klinik Pemahaman Teks Informasi & Literasi Digital Lintas Mata Pelajaran',
      type: 'Literasi Digital',
      description: `Melatih kemampuan siswa membandingkan, menyimpulkan, dan merefleksikan isi teks informasi sebagai tindak lanjut skor Rapor Pendidikan ${indLit?.code || 'A.1'}.`,
      pic: `${stageMeta.teacherCoordinator} & Guru Bahasa Indonesia`,
      targetParticipation: `Seluruh Siswa (${stageMeta.gradesLabel})`,
      frequency: 'Setiap Modul Ajar / Mingguan',
      progress: 55,
    },
  ];
  const finalLiteracy = [...manualLiteracy, ...generatedLiteracy];

  // 5.3 Program Numerasi (A.2)
  const manualNumeracy = preserveManual
    ? prevDb.numeracyPrograms.filter((n) => !isGeneratedId(n.id))
    : [];
  const generatedNumeracy: NumeracyProgramItem[] = [
    {
      id: 'pbd-gen-num-1',
      title: `Akselerasi Numerasi Kontekstual Lintas Mapel (${indNum?.code || 'A.2'}: Skor ${numScore.toFixed(1)})`,
      type: 'Numerasi Lintas Mapel',
      description: `Mengintegrasikan pembacaan data, grafik, pengukuran, dan penalaran matematis ke dalam mata pelajaran di ${schoolProfile.name} (${stageMeta.gradesLabel}).`,
      pic: `${stageMeta.teacherCoordinator} & Guru Matematika`,
      targetParticipation: `${teachersCount} Pendidik & ${studentsCount} Siswa`,
      frequency: 'Setiap Pekan di Semua Rombel',
      progress: numScore >= 70 ? 80 : 50,
    },
    {
      id: 'pbd-gen-num-2',
      title: 'Eksplorasi Kit Alat Peraga Matematika Manipulatif & Math Corner',
      type: 'Alat Peraga Manipulatif',
      description: `Pemanfaatan paket alat peraga konkret (pecahan, geometri, aljabar/pengukuran) hasil pengadaan BOSP untuk menjembatani konsep abstrak siswa.`,
      pic: 'Tim Matematika & Pengelola Lab/Kelas',
      targetParticipation: `${rombelCount} Rombel (${stageMeta.gradesLabel})`,
      frequency: '2 kali seminggu / Praktik Kelas',
      progress: 60,
    },
    {
      id: 'pbd-gen-num-3',
      title: 'Asesmen Diagnostik Numerasi & Klinik Bimbingan Terdiferensiasi',
      type: 'Asesmen Diagnostik Numerasi',
      description: `Pemetaan awal tingkat penguasaan domain bilangan, aljabar, geometri, dan data untuk pendampingan terfokus siswa kategori Perlu Intervensi Khusus.`,
      pic: 'Guru Matematika & Wali Kelas',
      targetParticipation: `100% Peserta Didik (${studentsCount} Siswa)`,
      frequency: 'Awal Semester & Tiap Bab Pokok',
      progress: 75,
    },
  ];
  const finalNumeracy = [...manualNumeracy, ...generatedNumeracy];

  // 5.4 Program Karakter (A.3, D.4, D.8)
  const manualCharacter = preserveManual
    ? prevDb.characterPrograms.filter((c) => !isGeneratedId(c.id))
    : [];
  const generatedCharacter: CharacterProgramItem[] = [
    {
      id: 'pbd-gen-kar-1',
      title: `Gerakan 7 Pembiasaan Positif & Budaya Sekolah Ramah Anak (Karakter: ${charScore.toFixed(1)})`,
      focusArea: '7 Pembiasaan Positif',
      description: `Pembiasaan penyambutan pagi, kedisiplinan, kesantunan, kebersihan, dan refleksi karakter harian seluruh siswa ${schoolProfile.name}.`,
      pic: 'Tim Kesiswaan, Wali Kelas & Guru Piket',
      implementationSchedule: 'Setiap Hari Masuk Sekolah',
      progress: charScore >= 75 ? 90 : 75,
    },
    {
      id: 'pbd-gen-kar-2',
      title: `Satgas PPKSP & Posko Sekolah Bebas Kekerasan (Iklim Keamanan: ${safeScore.toFixed(1)})`,
      focusArea: 'Pencegahan Kekerasan (PPKSP)',
      description: `Implementasi Permendikbudristek No. 46 Tahun 2023 melalui edukasi anti-perundungan, kanal pengaduan aman, dan pendampingan konseling siswa.`,
      pic: 'Satgas PPKSP & Guru BK / Wali Kelas',
      implementationSchedule: 'Berkelanjutan Sepanjang Tahun',
      progress: safeScore >= 75 ? 90 : 70,
    },
    {
      id: 'pbd-gen-kar-3',
      title: `Jumat Gotong Royong, Toleransi & Peduli Lingkungan (${indDiv?.code || 'D.8'}: ${(indDiv?.score ?? 75).toFixed(1)})`,
      focusArea: 'Gotong Royong & Peduli Lingkungan',
      description: `Kegiatan kolaboratif kebersihan kelas, penghijauan sekolah, dan penguatan sikap saling menghargai keberagaman antarwarga ${schoolProfile.name}.`,
      pic: 'Pembina OSIS / Ekstrakurikuler & Guru PPKn/Agama',
      implementationSchedule: 'Setiap Hari Jumat',
      progress: 85,
    },
  ];
  const finalCharacter = [...manualCharacter, ...generatedCharacter];

  // 7. Build Intermediate DB to generate full RKJM & RKT Markdowns & OfficialDocument Archive (6.3)
  const intermediateDb: SchoolDatabase = {
    ...prevDb,
    problems,
    rootCauses,
    recommendations,
    actionPlans,
    snpData: finalSnpData,
    accreditationData: finalAccreditation,
    rkasItems: finalRkasItems,
    principalPrograms: finalPrincipalPrograms,
    supervisionRecords: finalSupervision,
    literacyPrograms: finalLiteracy,
    numeracyPrograms: finalNumeracy,
    characterPrograms: finalCharacter,
  };

  const rkjmMarkdown = buildDetailedRKJMMarkdown(intermediateDb);
  const rktMarkdown = buildDetailedRKTMarkdown(intermediateDb);
  const rkasMarkdown = buildDetailedRKASMarkdown(intermediateDb, budgetCap);
  const principalMarkdown = buildDetailedPrincipalProgramMarkdown(intermediateDb);
  const supervisionMarkdown = buildDetailedSupervisionProgramMarkdown(intermediateDb);
  const literacyMarkdown = buildDetailedLiteracyProgramMarkdown(intermediateDb);
  const numeracyMarkdown = buildDetailedNumeracyProgramMarkdown(intermediateDb);
  const characterMarkdown = buildDetailedCharacterProgramMarkdown(intermediateDb);

  const manualDocs = preserveManual
    ? (prevDb.documents || []).filter((d) => !isGeneratedId(d.id))
    : [];

  const generatedDocs: OfficialDocument[] = [
    {
      id: 'pbd-gen-doc-rkjm',
      title: `Rencana Kerja Jangka Menengah (RKJM) ${schoolProfile.name} (${schoolProfile.planningPeriod})`,
      category: 'RKJM',
      academicYear: schoolProfile.planningPeriod,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: `${schoolProfile.principalName} & Pengawas Pembina`,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: rkjmMarkdown,
    },
    {
      id: 'pbd-gen-doc-rkt',
      title: `Rencana Kerja Tahunan (RKT) Berbasis PBD ${schoolProfile.name} TP ${schoolProfile.academicYear}`,
      category: 'RKT',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: schoolProfile.principalName,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: rktMarkdown,
    },
    {
      id: 'pbd-gen-doc-rkas',
      title: `RKAS BOSP Terintegrasi PBD ${schoolProfile.name} TP ${schoolProfile.academicYear}`,
      category: 'RKAS',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: `${schoolProfile.principalName} & Tim BOSP`,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: rkasMarkdown,
    },
    {
      id: 'pbd-gen-doc-kepsek',
      title: `Program Kerja Kepala Sekolah Terpadu ${schoolProfile.name} TP ${schoolProfile.academicYear}`,
      category: 'Kepala Sekolah',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: schoolProfile.principalName,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: principalMarkdown,
    },
    {
      id: 'pbd-gen-doc-supervisi',
      title: `Program Supervisi Akademik & Manajerial Berbasis Data (Rapor Pendidikan) ${schoolProfile.name}`,
      category: 'Supervisi',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: `${schoolProfile.principalName} & Pengawas Pembina`,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: supervisionMarkdown,
    },
    {
      id: 'pbd-gen-doc-literasi',
      title: `Program Gerakan Literasi Sekolah (GLS) ${schoolProfile.name} TP ${schoolProfile.academicYear}`,
      category: 'Literasi Numerasi',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: `${schoolProfile.principalName} & Tim GLS`,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: literacyMarkdown,
    },
    {
      id: 'pbd-gen-doc-numerasi',
      title: `Program Akselerasi Numerasi Kontekstual ${schoolProfile.name} TP ${schoolProfile.academicYear}`,
      category: 'Literasi Numerasi',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: `${schoolProfile.principalName} & Tim Numerasi`,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: numeracyMarkdown,
    },
    {
      id: 'pbd-gen-doc-karakter',
      title: `Program Pembiasaan & Penguatan Karakter (PPKSP) ${schoolProfile.name} TP ${schoolProfile.academicYear}`,
      category: 'Karakter',
      academicYear: schoolProfile.academicYear,
      createdAt: todayIso,
      updatedAt: todayIso,
      status: 'Disahkan',
      approvedBy: `${schoolProfile.principalName} & Satgas PPKSP`,
      approvalDate: todayIso,
      fileFormat: 'DOCX',
      contentMarkdown: characterMarkdown,
    },
  ];

  const updatedDb: SchoolDatabase = {
    ...intermediateDb,
    documents: [...manualDocs, ...generatedDocs],
  };

  return {
    updatedDb,
    summary: {
      problemsUsed: usedProblems.length,
      rootCausesReady: rootCauses.length,
      recommendationsReady: recommendations.length,
      actionPlansReady: actionPlans.length,
      snpCount: finalSnpData.length,
      accreditationCount: finalAccreditation.length,
      rkasCount: finalRkasItems.length,
      totalRkasBudget,
      principalProgramsCount: finalPrincipalPrograms.length,
      supervisionCount: finalSupervision.length,
      literacyCount: finalLiteracy.length,
      numeracyCount: finalNumeracy.length,
      characterCount: finalCharacter.length,
      documentsCount: updatedDb.documents.length,
    },
  };
}
