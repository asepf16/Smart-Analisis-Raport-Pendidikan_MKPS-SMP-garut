import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini API initialization
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Endpoint: AI Analisis Rapor Pendidikan
app.post('/api/gemini/analyze-rapor', async (req, res) => {
  try {
    const { indicators, schoolProfile, year } = req.body;

    if (!indicators || !Array.isArray(indicators) || indicators.length === 0) {
      return res.status(400).json({ error: 'Data indikator tidak valid atau kosong.' });
    }

    if (!aiClient) {
      // Smart Rule-based Indonesian PBD analysis fallback if no API key configured
      const lowScores = indicators.filter((i: any) => i.score < 60 || i.category?.toLowerCase().includes('kurang') || i.category?.toLowerCase().includes('intervensi'));
      const goodScores = indicators.filter((i: any) => i.score >= 70 || i.category?.toLowerCase().includes('baik') || i.category?.toLowerCase().includes('mahir'));
      
      return res.json({
        analysis: {
          executiveSummary: `Berdasarkan analisis ${indicators.length} indikator Rapor Pendidikan tahun ${year || '2025/2026'} untuk ${schoolProfile?.name || 'satuan pendidikan'}, ditemukan ${lowScores.length} indikator yang memerlukan perhatian prioritas serta ${goodScores.length} indikator dengan capaian membanggakan.`,
          strengths: goodScores.slice(0, 4).map((i: any) => `${i.name} (Skor: ${i.score}) - Menunjukkan capaian yang kokoh dalam layanan pembelajaran.`),
          weaknesses: lowScores.slice(0, 4).map((i: any) => `${i.name} (Skor: ${i.score}) - Perlu intervensi terstruktur dan pembenahan pada strategi pembelajaran.`),
          achievementGaps: `Kesenjangan terbesar terdapat pada dimensi kualitas proses belajar mengajar dan kompetensi literasi/numerasi peserta didik yang masih berfluktuasi antarkelas.`,
          crucialFactors: [
            'Optimalisasi pemanfaatan platform Merdeka Mengajar (PMM) dan komunitas belajar guru.',
            'Ketersediaan sarana penunjang literasi dan media pembelajaran numerasi kontekstual.',
            'Refleksi dan tindak lanjut supervisi akademik secara berkelanjutan.'
          ],
          impactOnQuality: 'Jika indikator prioritas ini tidak segera ditindaklanjuti dalam RKT dan RKAS, dikhawatirkan kesenjangan capaian kompetensi dasar siswa akan semakin melebar saat asesmen nasional mendatang.'
        }
      });
    }

    const prompt = `Anda adalah Tim Ahli Perencanaan Berbasis Data (PBD) Kemendikdasmen Indonesia.
Analisis data Rapor Pendidikan berikut untuk sekolah:
Nama: ${schoolProfile?.name || 'Satuan Pendidikan'}
Jenjang: ${schoolProfile?.stage || 'SD/SMP'}
Tahun: ${year || '2025/2026'}

Data Indikator Rapor Pendidikan:
${JSON.stringify(indicators.slice(0, 25), null, 2)}

Buat analisis mendalam dengan format JSON terstruktur persis seperti ini:
{
  "executiveSummary": "ringkasan eksekutif 2-3 kalimat",
  "strengths": ["kekuatan 1", "kekuatan 2", "kekuatan 3"],
  "weaknesses": ["kelemahan/kesenjangan 1", "kelemahan/kesenjangan 2", "kelemahan/kesenjangan 3"],
  "achievementGaps": "penjelasan kesenjangan capaian",
  "crucialFactors": ["faktor penting 1", "faktor penting 2", "faktor penting 3"],
  "impactOnQuality": "dampak langsung dan jangka menengah terhadap mutu layanan pendidikan"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ analysis: parsed });
  } catch (error: any) {
    console.error('Error analyzing rapor:', error);
    return res.status(500).json({ error: error.message || 'Gagal menganalisis Rapor Pendidikan' });
  }
});

// 1b. Endpoint: AI Rekomendasi Identifikasi Masalah Otomatis
app.post('/api/gemini/identify-problems', async (req, res) => {
  try {
    const { indicators, schoolProfile } = req.body;

    if (!indicators || !Array.isArray(indicators) || indicators.length === 0) {
      return res.status(400).json({ error: 'Data indikator Rapor Pendidikan masih kosong.' });
    }

    if (!aiClient) {
      // Deterministic Indonesian PBD fallback ranking
      const sorted = [...indicators].sort((a: any, b: any) => (a.score || 0) - (b.score || 0));
      const picked = sorted.slice(0, Math.min(5, sorted.length)).map((ind: any, idx: number) => ({
        indicatorId: ind.id,
        indicatorCode: ind.code,
        indicatorName: ind.name,
        actualCondition: `Capaian ${Number(ind.score || 0).toFixed(1)} (${ind.category || 'Sedang'}), tren ${ind.changeFromLastYear || 0}.`,
        mainProblem:
          ind.kemendikbudRootCause ||
          `Capaian indikator ${ind.name} (${ind.code}) belum mencapai target optimal dan memerlukan penguatan strategi pembelajaran serta tata kelola program.`,
        dataProof: `Rapor Pendidikan ${ind.year || new Date().getFullYear()} kode ${ind.code} (Skor ${ind.score})`,
        priority:
          idx === 0 || ind.score < 60
            ? 'Prioritas 1 (Mendesak)'
            : ind.score < 70
            ? 'Prioritas 2 (Tinggi)'
            : 'Prioritas 3 (Sedang)',
      }));
      return res.json({ recommendedProblems: picked });
    }

    const prompt = `Anda adalah Konsultan Ahli Perencanaan Berbasis Data (PBD) Kemendikdasmen Indonesia.
Dari daftar indikator Rapor Pendidikan berikut untuk ${schoolProfile?.name || 'Satuan Pendidikan'} (jenjang ${schoolProfile?.stage || 'SMP'}):
${JSON.stringify(indicators.slice(0, 25), null, 2)}

Pilih maksimal 5 indikator dengan urgensi pembenahan tertinggi (skor terendah, kategori Perlu Intervensi Khusus/Kurang/Dasar, atau tren penurunan).
Kembalikan JSON array persis dengan format berikut:
{
  "recommendedProblems": [
    {
      "indicatorId": "id indikator persis dari input",
      "indicatorCode": "kode indikator persis dari input",
      "indicatorName": "nama indikator persis dari input",
      "actualCondition": "ringkasan kondisi aktual beserta skor & kategori",
      "mainProblem": "rumusan masalah utama yang spesifik, operasional, dan sesuai PBD (1-2 kalimat)",
      "dataProof": "bukti data Rapor Pendidikan beserta skor/perbandingan",
      "priority": "Prioritas 1 (Mendesak) | Prioritas 2 (Tinggi) | Prioritas 3 (Sedang)"
    }
  ]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ recommendedProblems: parsed.recommendedProblems || [] });
  } catch (error: any) {
    console.error('Error identifying problems:', error);
    return res.status(500).json({ error: error.message || 'Gagal merekomendasikan masalah otomatis' });
  }
});

// 2. Endpoint: AI Refleksi Akar Masalah (5-Why & Faktor Kendali)
app.post('/api/gemini/root-cause', async (req, res) => {
  try {
    const { indicator, problem, schoolProfile } = req.body;

    if (!aiClient) {
      return res.json({
        rootCauseAnalysis: {
          problem: problem || `Rendahnya capaian indikator ${indicator?.name || 'Kompetensi Siswa'}`,
          symptoms: [
            `Hasil Asesmen Nasional menunjukkan siswa kesulitan dalam soal penalaran tingkat tinggi (HOTS).`,
            `Minat baca peserta didik dan keterlibatan aktif dalam pembelajaran masih perlu ditingkatkan.`
          ],
          whySequence: [
            `Mengapa capaian belum optimal? Sebagian besar siswa belum terbiasa dengan teks bacaan panjang dan soal numerasi kontekstual.`,
            `Mengapa belum terbiasa? Metode pembelajaran di kelas masih didominasi ceramah dan hafalan teoritis.`,
            `Mengapa guru masih dominan metode konvensional? Belum semua guru menguasai model pembelajaran berbasis masalah (PBL) dan diferensiasi.`,
            `Mengapa belum menguasai? Kegiatan komunitas belajar (Kombel) sekolah belum fokus membedah praktik baik dan asesmen diagnostik.`,
            `Mengapa Kombel belum efektif? Belum ada alokasi jadwal terstruktur dan pendampingan supervisi akademik klinis oleh Kepala Sekolah.`
          ],
          rootCause: `Komunitas belajar (Kombel) intra-sekolah belum dioptimalkan sebagai wadah kolaboratif perbaikan pembelajaran diferensiasi dan telaah asesmen diagnostik.`,
          controllableFactors: [
            'Penataan jadwal kombel mingguan guru.',
            'Pemanfaatan modul PMM secara terarah.',
            'Pelaksanaan supervisi akademik berkala oleh kepala sekolah.'
          ],
          uncontrollableFactors: [
            'Latar belakang sosial-ekonomi keluarga peserta didik.',
            'Ketersediaan anggaran terbatas dari dinas.'
          ],
          isDraftAI: true
        }
      });
    }

    const prompt = `Sebagai Ahli PBD Kemendikdasmen, lakukan refleksi akar masalah mendalam (Pendekatan 5-Why) untuk masalah pendidikan berikut:
Sekolah: ${schoolProfile?.name || 'Sekolah'} (${schoolProfile?.stage || 'SD/SMP'})
Indikator Rapor: ${indicator?.name || 'Indikator'} (Skor: ${indicator?.score || '-'}, Kategori: ${indicator?.category || '-'})
Masalah Utama: ${problem}

Output JSON WAJIB dengan skema:
{
  "problem": "rumusan masalah",
  "symptoms": ["gejala 1", "gejala 2"],
  "whySequence": [
    "Why 1: penjelasan...",
    "Why 2: penjelasan...",
    "Why 3: penjelasan...",
    "Why 4: penjelasan...",
    "Why 5: penjelasan..."
  ],
  "rootCause": "akar masalah paling mendasar",
  "controllableFactors": ["faktor yang dapat dikendalikan sekolah 1", "faktor 2"],
  "uncontrollableFactors": ["faktor luar yang butuh kolaborasi/dukungan 1", "faktor 2"],
  "isDraftAI": true
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ rootCauseAnalysis: parsed });
  } catch (error: any) {
    console.error('Error finding root cause:', error);
    return res.status(500).json({ error: error.message || 'Gagal memproses akar masalah' });
  }
});

// 3. Endpoint: AI Rekomendasi Pembenahan & Action Plan
app.post('/api/gemini/recommendations', async (req, res) => {
  try {
    const { problem, rootCause, indicator, schoolProfile } = req.body;

    if (!aiClient) {
      return res.json({
        recommendation: {
          problem: problem || 'Peningkatan Kualitas Pembelajaran dan Literasi-Numerasi',
          rootCause: rootCause || 'Kurangnya variasi metode belajar aktif dan asesmen diagnostik di kelas.',
          benahi1: {
            title: 'Peningkatan Kompetensi Guru melalui Komunitas Belajar (Non-Anggaran / Rendah Anggaran)',
            description: 'Optimalisasi Kombel sekolah dengan jadwal berkala setiap pekan untuk membedah strategi literasi dan numerasi lintas mata pelajaran.',
            activities: [
              'Workshop berbagi praktik baik strategi membaca intensif dan kontekstualisasi numerasi di Kombel.',
              'Refleksi mingguan dan telaah hasil karya siswa.'
            ],
            pic: 'Wakasek Kurikulum / Koordinator Kombel',
            target: '100% Guru aktif berpartisipasi',
            timeline: 'Semester 1 & 2 (Sepanjang Tahun)',
            costEstimate: 0
          },
          benahi2: {
            title: 'Pengadaan & Optimalisasi Bahan Ajar serta Alat Peraga Kontekstual (Didukung Dana BOSP)',
            description: 'Penyediaan buku bacaan non-teks berkualitas untuk sudut baca kelas dan alat peraga matematika/sains manipulatif.',
            activities: [
              'Pengadaan buku pengayaan literasi ramah anak.',
              'Revitalisasi perpustakaan dan pojok baca ruang kelas.',
              'Penyusunan modul ajar terdiferensiasi.'
            ],
            pic: 'Pengelola Perpustakaan & Tim Sarpras',
            target: 'Tersedianya 15 judul buku baru per ruang kelas',
            timeline: 'Bulan 1 - 3 (Triwulan I)',
            costEstimate: 4500000
          },
          benahi3: {
            title: 'Pembiasaan Budaya Literasi & Penguatan Karakter di Lingkungan Sekolah',
            description: 'Penerapan 15 menit membaca sebelum pembelajaran, pojok baca kelas, dan festival literasi karya siswa.',
            activities: [
              'Gerakan 15 Menit Membaca sebelum jam pertama.',
              'Pameran karya portofolio dan majalah dinding kelas.',
              'Pendampingan khusus siswa berkebutuhan intervensi.'
            ],
            pic: 'Tim Gerakan Literasi Sekolah (GLS)',
            target: 'Rutin dilaksanakan setiap hari sekolah',
            timeline: 'Sepanjang Tahun',
            costEstimate: 750000
          }
        }
      });
    }

    const prompt = `Sebagai konsultan manajemen mutu sekolah Kemendikdasmen, buatkan rekomendasi pembenahan (Benahi 1, Benahi 2, Benahi 3) berdasarkan:
Sekolah: ${schoolProfile?.name || 'Satuan Pendidikan'}
Indikator: ${indicator?.name || 'Indikator'}
Masalah: ${problem}
Akar Masalah: ${rootCause}

Kriteria:
- Benahi 1: Peningkatan kompetensi pendidik & perbaikan tata kelola (kebijakan sekolah, Kombel, non-anggaran / low-budget).
- Benahi 2: Kegiatan yang memerlukan sarana/media dengan estimasi dana BOSP yang rasional.
- Benahi 3: Pembiasaan budaya mutu, pembelajaran aktif, atau pelibatan orang tua.

Format JSON WAJIB:
{
  "problem": "string",
  "rootCause": "string",
  "benahi1": {
    "title": "string",
    "description": "string",
    "activities": ["string", "string"],
    "pic": "string",
    "target": "string",
    "timeline": "string",
    "costEstimate": 0
  },
  "benahi2": {
    "title": "string",
    "description": "string",
    "activities": ["string", "string"],
    "pic": "string",
    "target": "string",
    "timeline": "string",
    "costEstimate": 5000000
  },
  "benahi3": {
    "title": "string",
    "description": "string",
    "activities": ["string", "string"],
    "pic": "string",
    "target": "string",
    "timeline": "string",
    "costEstimate": 1000000
  }
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ recommendation: parsed });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({ error: error.message || 'Gagal membuat rekomendasi' });
  }
});

// 4. Endpoint: AI Generator Dokumen Resmi (RKJM, RKT, Program Kepsek, Supervisi)
app.post('/api/gemini/generate-document', async (req, res) => {
  try {
    const { docType, schoolProfile, pbdItems, rkasItems, academicYear } = req.body;

    if (!aiClient) {
      return res.json({
        content: `DOKUMEN RESMI PERENCANAAN SEKOLAH\n${schoolProfile?.name || 'SEKOLAH'}\nTAHUN PELAJARAN ${academicYear || '2025/2026'}\n\nDokumen telah disusun berbasis data Rapor Pendidikan dan terintegrasi dengan 8 Standar Nasional Pendidikan.`
      });
    }

    const prompt = `Anda adalah Ahli Regulasi dan Perencanaan Sekolah Kemendikdasmen Indonesia.
Buatkan narasi resmi dokumen perencanaan sekolah berformat profesional untuk jenis: "${docType?.toUpperCase() || 'RKT'}".

Identitas Sekolah:
- Nama: ${schoolProfile?.name || 'SMP Negeri 1 Harapan'}
- NPSN: ${schoolProfile?.npsn || '20100000'}
- Kepala Sekolah: ${schoolProfile?.principalName || 'Nama Kepala Sekolah'}
- Visi: ${schoolProfile?.vision || 'Terwujudnya Generasi Unggul Berkarakter'}
- Misi: ${schoolProfile?.mission || 'Meningkatkan mutu pembelajaran dan pembiasaan positif'}
- Tahun: ${academicYear || '2025/2026'}

Data Ringkasan Program PBD Prioritas:
${JSON.stringify((pbdItems || []).slice(0, 10), null, 2)}

Buat narasi dokumen yang formal, runut sesuai struktur ketentuan resmi Permendikbudristek/Permendikdasmen yang berlaku, memuat:
1. Latar Belakang & Landasan Hukum (PP 57/2021 jo PP 4/2022, Permendikbudristek 9/2022, Permendikdasmen 8/2026).
2. Kondisi Nyata Berdasarkan Rapor Pendidikan.
3. Rencana Program dan Sasaran Strategis.
4. Strategi Pengawasan, Evaluasi, dan Penutup.
Berikan dalam teks markdown profesional yang siap dicetak.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ content: response.text });
  } catch (error: any) {
    console.error('Error generating document:', error);
    return res.status(500).json({ error: error.message || 'Gagal menghasilkan dokumen' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`SMART ANALISIS RAPOR PENDIDIKAN server running on http://localhost:${port}`);
  });
}

startServer();
