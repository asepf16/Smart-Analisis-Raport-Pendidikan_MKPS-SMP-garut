import { IdentifiedProblem, RaporIndicator } from '../types';

export interface ProblemFormulationAlternative {
  label: string;
  mainProblem: string;
  actualCondition: string;
  dataProof: string;
  priority: IdentifiedProblem['priority'];
}

export function computeIndicatorUrgencyScore(ind: RaporIndicator): number {
  let urgency = Math.max(0, 100 - (ind.score || 0));

  const cat = (ind.category || '').toLowerCase();
  if (cat.includes('intervensi') || cat.includes('kurang')) {
    urgency += 30;
  } else if (cat.includes('dasar') || cat.includes('sedang')) {
    urgency += 15;
  }

  if (ind.priorityLevel === 'Tinggi') {
    urgency += 25;
  } else if (ind.priorityLevel === 'Sedang') {
    urgency += 10;
  }

  if (ind.changeFromLastYear < 0) {
    urgency += Math.min(25, Math.abs(ind.changeFromLastYear) * 4);
  }

  return urgency;
}

export function sortIndicatorsByUrgency(indicators: RaporIndicator[]): RaporIndicator[] {
  return [...indicators].sort(
    (a, b) => computeIndicatorUrgencyScore(b) - computeIndicatorUrgencyScore(a)
  );
}

export function inferPriorityFromIndicator(ind: RaporIndicator): IdentifiedProblem['priority'] {
  const cat = (ind.category || '').toLowerCase();
  if (
    ind.priorityLevel === 'Tinggi' ||
    ind.score < 60 ||
    cat.includes('intervensi') ||
    cat.includes('kurang')
  ) {
    return 'Prioritas 1 (Mendesak)';
  }
  if (ind.priorityLevel === 'Sedang' || ind.score < 70 || ind.changeFromLastYear < 0) {
    return 'Prioritas 2 (Tinggi)';
  }
  return 'Prioritas 3 (Sedang)';
}

export function getProblemAlternativesForIndicator(
  ind: RaporIndicator
): ProblemFormulationAlternative[] {
  const deltaText =
    ind.changeFromLastYear < 0
      ? `turun ${Math.abs(ind.changeFromLastYear)} poin dari tahun lalu`
      : ind.changeFromLastYear > 0
      ? `naik ${ind.changeFromLastYear} poin namun masih perlu penguatan`
      : 'stagnan dibanding tahun sebelumnya';

  const actualCondition = `Capaian ${ind.score.toFixed(1)} (${ind.category}), ${deltaText}.`;
  const dataProof = `Rapor Pendidikan ${ind.year} kode ${ind.code} (Skor ${ind.score.toFixed(1)}${
    ind.nationalAverage ? `, rata-rata nasional ${ind.nationalAverage}` : ''
  }).`;
  const priority = inferPriorityFromIndicator(ind);
  const lowerName = ind.name.toLowerCase();
  const rootHint = ind.kemendikbudRootCause || ind.aiAnalysis;

  const alternatives: ProblemFormulationAlternative[] = [];

  if (rootHint) {
    alternatives.push({
      label: 'Rekomendasi Utama (Berbasis Akar Data Rapor)',
      mainProblem: rootHint,
      actualCondition,
      dataProof,
      priority,
    });
  }

  if (lowerName.includes('literasi')) {
    alternatives.push(
      {
        label: 'Fokus Pembelajaran & Strategi Membaca',
        mainProblem: `Kemampuan peserta didik memahami, menginterpretasi, dan merefleksikan isi teks informasi serta sastra pada indikator ${ind.name} belum optimal.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Sarana & Budaya Baca Sekolah',
        mainProblem: `Pemanfaatan buku bacaan bermutu non-teks, pojok baca kelas, dan pembiasaan literasi harian belum merata untuk mendukung capaian ${ind.name}.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Kompetensi Guru & Asesmen Literasi',
        mainProblem: `Strategi pembelajaran literasi lintas mata pelajaran dan asesmen diagnostik kemampuan membaca siswa di kelas belum berjalan terstruktur.`,
        actualCondition,
        dataProof,
        priority,
      }
    );
  } else if (lowerName.includes('numerasi')) {
    alternatives.push(
      {
        label: 'Fokus Penalaran & Konteks Nyata',
        mainProblem: `Kemampuan bernalar dan memecahkan masalah kontekstual (aljabar, geometri, data & ketidakpastian) pada indikator ${ind.name} masih rendah.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Media & Alat Peraga Konkret',
        mainProblem: `Pembelajaran matematika belum didukung penggunaan alat peraga manipulatif dan soal pemecahan masalah berbasis kehidupan sehari-hari.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Penguatan Numerasi Lintas Mapel',
        mainProblem: `Integrasi keterampilan numerasi dasar dan penguatan di Komunitas Belajar guru masih belum terpola secara konsisten.`,
        actualCondition,
        dataProof,
        priority,
      }
    );
  } else if (lowerName.includes('karakter')) {
    alternatives.push(
      {
        label: 'Fokus Pembiasaan & Keteladanan',
        mainProblem: `Internalisasi nilai kemandirian, nalar kritis, dan pembiasaan karakter positif dalam keseharian belajar pada indikator ${ind.name} perlu diperkuat.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Proyek & Pelibatan Siswa',
        mainProblem: `Kegiatan kokurikuler dan pembiasaan karakter belum terintegrasi penuh dengan refleksi perilaku peserta didik di kelas maupun lingkungan sekolah.`,
        actualCondition,
        dataProof,
        priority,
      }
    );
  } else if (
    lowerName.includes('pembelajaran') ||
    lowerName.includes('kualitas') ||
    lowerName.includes('metode') ||
    lowerName.includes('refleksi')
  ) {
    alternatives.push(
      {
        label: 'Fokus Diferensiasi & Manajemen Kelas',
        mainProblem: `Praktik pembelajaran di kelas belum sepenuhnya adaptif terhadap kebutuhan belajar individu siswa dan masih didominasi metode satu arah pada indikator ${ind.name}.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Komunitas Belajar & Supervisi',
        mainProblem: `Refleksi perbaikan pembelajaran di Komunitas Belajar (Kombel) dan tindak lanjut hasil supervisi akademik guru belum berdampak optimal pada ${ind.name}.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Asesmen Formatif & Umpan Balik',
        mainProblem: `Pemanfaatan asesmen diagnostik awal dan pemberian umpan balik konstruktif selama proses belajar mengajar belum dilakukan secara merata.`,
        actualCondition,
        dataProof,
        priority,
      }
    );
  } else if (
    lowerName.includes('iklim') ||
    lowerName.includes('keamanan') ||
    lowerName.includes('kebinekaan') ||
    lowerName.includes('inklusivitas') ||
    lowerName.includes('perundungan')
  ) {
    alternatives.push(
      {
        label: 'Fokus Pencegahan & Tata Kelola PPKSP',
        mainProblem: `Penguatan pencegahan perundungan, kekerasan, serta pemahaman regulasi ruang aman sekolah pada indikator ${ind.name} perlu dioptimalkan.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Budaya Toleransi & Inklusivitas',
        mainProblem: `Edukasi sikap toleransi, kesetaraan, dan layanan pembelajaran ramah anak berkebutuhan khusus belum terimplementasi konsisten di seluruh kelas.`,
        actualCondition,
        dataProof,
        priority,
      }
    );
  } else {
    alternatives.push(
      {
        label: 'Fokus Peningkatan Capaian & Tata Kelola',
        mainProblem: `Capaian indikator ${ind.name} (${ind.code}) masih belum memenuhi target ketuntasan sekolah sehingga memerlukan intervensi terstruktur pada aspek pelaksanaan program dan tata kelola.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Kompetensi Pendidik & Kombel',
        mainProblem: `Diperlukan penguatan kapasitas pendidik dan tenaga kependidikan melalui Komunitas Belajar untuk memperbaiki mutu layanan terkait ${ind.name}.`,
        actualCondition,
        dataProof,
        priority,
      },
      {
        label: 'Fokus Sarana Pendukung & Pembiasaan',
        mainProblem: `Ketersediaan sarana pendukung, bahan ajar, dan konsistensi pelaksanaan program pada aspek ${ind.name} masih perlu ditingkatkan.`,
        actualCondition,
        dataProof,
        priority,
      }
    );
  }

  return alternatives.slice(0, 4);
}

export function buildProblemFromIndicator(
  ind: RaporIndicator,
  variantIndex = 0,
  existingId?: string
): IdentifiedProblem {
  const alternatives = getProblemAlternativesForIndicator(ind);
  const chosen = alternatives[variantIndex] || alternatives[0];

  return {
    id: existingId || `prob-auto-${ind.id}-${Date.now()}`,
    indicatorId: ind.id,
    indicatorCode: ind.code,
    indicatorName: ind.name,
    actualCondition: chosen.actualCondition,
    mainProblem: chosen.mainProblem,
    dataProof: chosen.dataProof,
    priority: chosen.priority,
    status: 'Disetujui',
    selectedForPBD: true,
  };
}

export function recommendTopProblems(
  indicators: RaporIndicator[],
  maxCount = 5
): IdentifiedProblem[] {
  if (!indicators || indicators.length === 0) return [];

  const ranked = sortIndicatorsByUrgency(indicators);
  // Prefer high/medium priority or score < 70; if all are good, still pick lowest-scoring top 3 so school can continuously improve
  const priorityCandidates = ranked.filter(
    (ind) =>
      ind.priorityLevel !== 'Rendah' ||
      ind.score < 70 ||
      ind.changeFromLastYear < 0
  );

  const selected =
    priorityCandidates.length > 0
      ? priorityCandidates.slice(0, maxCount)
      : ranked.slice(0, Math.min(3, ranked.length));

  return selected.map((ind, idx) =>
    buildProblemFromIndicator(ind, 0, `prob-auto-${ind.code.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}-${idx}`)
  );
}
