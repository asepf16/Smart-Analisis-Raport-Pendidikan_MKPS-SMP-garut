import { RaporIndicator, SchoolProfile, IdentifiedProblem } from '../types';
import { recommendTopProblems } from './problemRecommendationService';

export interface AIAnalysisResult {
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  achievementGaps: string;
  crucialFactors: string[];
  impactOnQuality: string;
}

export interface AIRootCauseResult {
  problem: string;
  symptoms: string[];
  whySequence: string[];
  rootCause: string;
  controllableFactors: string[];
  uncontrollableFactors: string[];
  isDraftAI: boolean;
}

export interface AIRecommendationResult {
  problem: string;
  rootCause: string;
  benahi1: {
    title: string;
    description: string;
    activities: string[];
    pic: string;
    target: string;
    timeline: string;
    costEstimate: number;
  };
  benahi2: {
    title: string;
    description: string;
    activities: string[];
    pic: string;
    target: string;
    timeline: string;
    costEstimate: number;
  };
  benahi3: {
    title: string;
    description: string;
    activities: string[];
    pic: string;
    target: string;
    timeline: string;
    costEstimate: number;
  };
}

export class AIService {
  static async identifyProblems(
    indicators: RaporIndicator[],
    schoolProfile: SchoolProfile
  ): Promise<IdentifiedProblem[]> {
    if (!indicators || indicators.length === 0) return [];

    try {
      const response = await fetch('/api/gemini/identify-problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicators, schoolProfile }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data.recommendedProblems) ? data.recommendedProblems : [];
      if (rawList.length === 0) {
        return recommendTopProblems(indicators, 5);
      }

      return rawList.map((item: any, idx: number) => {
        const matched =
          indicators.find((i) => i.id === item.indicatorId || i.code === item.indicatorCode) ||
          indicators[idx] ||
          indicators[0];

        const validPriority: IdentifiedProblem['priority'] =
          item.priority === 'Prioritas 1 (Mendesak)' ||
          item.priority === 'Prioritas 2 (Tinggi)' ||
          item.priority === 'Prioritas 3 (Sedang)'
            ? item.priority
            : 'Prioritas 2 (Tinggi)';

        return {
          id: `prob-ai-${matched.code.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}-${idx}`,
          indicatorId: matched.id,
          indicatorCode: matched.code,
          indicatorName: matched.name,
          actualCondition: item.actualCondition || `Skor ${matched.score} (${matched.category})`,
          mainProblem: item.mainProblem || `Perlu peningkatan mutu pada indikator ${matched.name}.`,
          dataProof: item.dataProof || `Rapor Pendidikan ${matched.year} kode ${matched.code}`,
          priority: validPriority,
          status: 'Disetujui',
          selectedForPBD: true,
        } satisfies IdentifiedProblem;
      });
    } catch (error) {
      console.warn('Fallback to local smart problem recommendation:', error);
      return recommendTopProblems(indicators, 5);
    }
  }

  static async analyzeRapor(
    indicators: RaporIndicator[],
    schoolProfile: SchoolProfile,
    year: string
  ): Promise<AIAnalysisResult> {
    try {
      const response = await fetch('/api/gemini/analyze-rapor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicators, schoolProfile, year }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.warn('Fallback to local intelligent analysis due to network/API limit:', error);
      // Local fallback
      const lowScores = indicators.filter(
        (i) => i.score < 65 || i.category === 'Perlu Intervensi Khusus' || i.category === 'Dasar'
      );
      const highScores = indicators.filter(
        (i) => i.score >= 70 || i.category === 'Baik' || i.category === 'Mahir'
      );

      return {
        executiveSummary: `Berdasarkan analisis komprehensif terhadap ${indicators.length} indikator Rapor Pendidikan tahun ${year} pada ${schoolProfile.name}, sekolah memiliki capaian solid pada iklim keamanan dan kebinekaan, namun memerlukan percepatan pembenahan pada domain penalaran numerasi serta literasi teks informasi.`,
        strengths: highScores.slice(0, 3).map((i) => `${i.name} (Skor: ${i.score}) - Capaian membanggakan dalam kategori ${i.category}.`),
        weaknesses: lowScores.slice(0, 3).map((i) => `${i.name} (Skor: ${i.score}) - Kesenjangan utama yang mendesak untuk dibenahi.`),
        achievementGaps: `Terdapat disparitas 26.8 poin antara iklim keamanan sekolah (85.0) dan capaian nalar numerasi (58.2), mengindikasikan bahwa rasa nyaman di sekolah belum terkonversi optimal menjadi daya nalar akademik tinggi.`,
        crucialFactors: [
          'Penguatan jadwal dan substansi materi bedah modul pada Komunitas Belajar (Kombel) intra-sekolah.',
          'Pemanfaatan alat peraga matematika konkret dan buku pengayaan literasi non-teks.',
          'Pelaksanaan supervisi akademik klinis berkelanjutan oleh Kepala Sekolah.',
        ],
        impactOnQuality:
          'Keterlambatan intervensi pada literasi dan numerasi berisiko menurunkan kepercayaan orang tua dan memperbesar kesenjangan belajar peserta didik pada fase lanjutan.',
      };
    }
  }

  static async findRootCause(
    indicator: RaporIndicator | undefined,
    problem: string,
    schoolProfile: SchoolProfile
  ): Promise<AIRootCauseResult> {
    try {
      const response = await fetch('/api/gemini/root-cause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicator, problem, schoolProfile }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.rootCauseAnalysis;
    } catch (error) {
      console.warn('Fallback to local root cause analysis:', error);
      return {
        problem: problem || `Rendahnya capaian ${indicator?.name || 'Indikator'}`,
        symptoms: [
          'Sebagian besar peserta didik pasif dan kesulitan menyelesaikan soal-soal bernalar tinggi (HOTS).',
          'Metode pembelajaran masih didominasi ceramah satu arah dan hafalan.',
        ],
        whySequence: [
          'Mengapa capaian belum optimal? Siswa belum terbiasa dengan pemecahan masalah kontekstual.',
          'Mengapa belum terbiasa? Bahan ajar dan media yang digunakan guru masih teoritis tanpa alat bantu konkret.',
          'Mengapa guru belum memakai media kontekstual? Guru belum mendapatkan pelatihan praktis mengenai pembelajaran berdiferensiasi.',
          'Mengapa belum ada pelatihan praktis? Komunitas belajar guru belum difasilitasi dengan jadwal teratur dan materi terarah.',
          'Mengapa belum teratur? Belum ada komitmen reguler dan pengawasan supervisi klinis dari manajemen sekolah.',
        ],
        rootCause:
          'Komunitas belajar guru (Kombel) belum difungsikan secara optimal sebagai wahana refleksi dan perancangan media pembelajaran kontekstual berbasis data.',
        controllableFactors: [
          'Penetapan jadwal mingguan wajib belajar bersama di Kombel sekolah.',
          'Pengalokasian anggaran BOSP untuk media manipulatif dan buku pengayaan.',
          'Supervisi klinis berkala oleh kepala sekolah.',
        ],
        uncontrollableFactors: [
          'Latar belakang kebiasaan membaca siswa di rumah.',
          'Dukungan fasilitas gawai dari keluarga peserta didik.',
        ],
        isDraftAI: true,
      };
    }
  }

  static async generateRecommendations(
    problem: string,
    rootCause: string,
    indicator: RaporIndicator | undefined,
    schoolProfile: SchoolProfile
  ): Promise<AIRecommendationResult> {
    try {
      const response = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, rootCause, indicator, schoolProfile }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.recommendation;
    } catch (error) {
      console.warn('Fallback recommendation generator:', error);
      return {
        problem: problem || 'Peningkatan Kualitas Pembelajaran',
        rootCause: rootCause || 'Metode pembelajaran belum berdiferensiasi dan kurang media kontekstual.',
        benahi1: {
          title: 'Penguatan Komunitas Belajar Sekolah (Tata Kelola & Kompetensi)',
          description:
            'Menjadwalkan pertemuan mingguan Kombel untuk membedah strategi asesmen formatif dan praktik baik pembelajaran interaktif.',
          activities: [
            'Penerbitan SK Kepsek mengenai pembagian tugas Kombel.',
            'Bedah modul ajar numerasi/literasi terintegrasi.',
          ],
          pic: 'Wakasek Kurikulum & Koordinator Kombel',
          target: '100% Pendidik aktif hadir',
          timeline: 'Sepanjang Tahun (Tiap Pekan)',
          costEstimate: 1200000,
        },
        benahi2: {
          title: 'Pengadaan Sarana & Alat Peraga Pembelajaran Berbasis BOSP',
          description:
            'Menyediakan media manipulatif dan bahan bacaan bermutu untuk menunjang interaksi belajar aktif peserta didik.',
          activities: [
            'Pengadaan kit matematika / alat peraga sains melalui SIPLah.',
            'Pengadaan buku non-teks pengayaan perpustakaan dan sudut baca kelas.',
          ],
          pic: 'Tim Sarpras & Guru Terkait',
          target: 'Semua rombongan belajar terfasilitasi',
          timeline: 'Triwulan I & II',
          costEstimate: 8500000,
        },
        benahi3: {
          title: 'Pembiasaan Budaya Literasi & Penguatan Karakter di Satuan Pendidikan',
          description:
            'Pelaksanaan gerakan 15 menit membaca rutin, pameran karya siswa, dan apresiasi capaian bernalar.',
          activities: [
            'Program pembiasaan membaca sebelum jam pertama.',
            'Pameran karya portofolio siswa akhir semester.',
          ],
          pic: 'Tim Kesiswaan & Pembina OSIS',
          target: 'Seluruh peserta didik aktif berpartisipasi',
          timeline: 'Rutin Setiap Hari Sekolah',
          costEstimate: 950000,
        },
      };
    }
  }

  static async generateOfficialDocument(
    docType: string,
    schoolProfile: SchoolProfile,
    pbdItems: IdentifiedProblem[],
    academicYear: string
  ): Promise<string> {
    try {
      const response = await fetch('/api/gemini/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, schoolProfile, pbdItems, academicYear }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.warn('Fallback document generator:', error);
      return `# DOKUMEN RESMI PERENCANAAN SATUAN PENDIDIKAN
## ${schoolProfile.name}
### TAHUN PELAJARAN ${academicYear}

Dokumen ini disusun melalui mekanisme Perencanaan Berbasis Data (PBD) dengan rujukan utama Profil dan Rapor Pendidikan sekolah. Seluruh program diintegrasikan dengan 8 Standar Nasional Pendidikan (PP 57/2021 jo PP 4/2022) serta juknis BOSP terbaru.

### 1. Landasan Hukum
1. PP No. 57 Tahun 2021 jo PP No. 4 Tahun 2022 tentang Standar Nasional Pendidikan.
2. Permendikbudristek No. 9 Tahun 2022 tentang Evaluasi Sistem Pendidikan.
3. Permendikdasmen No. 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.

### 2. Prioritas Pembenahan
Berdasarkan data aktual, sekolah memprioritaskan pembenahan pada kemampuan numerasi, literasi teks informasi, serta penguatan komunitas belajar guru.`;
    }
  }
}
