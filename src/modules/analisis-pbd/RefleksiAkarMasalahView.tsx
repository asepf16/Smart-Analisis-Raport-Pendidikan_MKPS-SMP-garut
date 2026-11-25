import React, { useState, useEffect } from 'react';
import { RootCauseReflection, IdentifiedProblem, RaporIndicator, SchoolProfile } from '../../types';
import {
  GitBranch,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Edit3,
} from 'lucide-react';
import { AIService } from '../../services/aiService';

interface RefleksiAkarMasalahViewProps {
  rootCauses: RootCauseReflection[];
  problems: IdentifiedProblem[];
  indicators: RaporIndicator[];
  schoolProfile: SchoolProfile;
  onUpdateRootCauses: (updated: RootCauseReflection[]) => void;
  onNavigateToRekomendasi: () => void;
}

export const RefleksiAkarMasalahView: React.FC<RefleksiAkarMasalahViewProps> = ({
  rootCauses,
  problems,
  indicators,
  schoolProfile,
  onUpdateRootCauses,
  onNavigateToRekomendasi,
}) => {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(problems[0]?.id || '');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (problems.length > 0 && !problems.some((p) => p.id === selectedProblemId)) {
      setSelectedProblemId(problems[0].id);
    }
  }, [problems, selectedProblemId]);

  const selectedProblem = problems.find((p) => p.id === selectedProblemId);
  const matchingIndicator = indicators.find((i) => i.id === selectedProblem?.indicatorId);
  const currentRootCause = rootCauses.find((rc) => rc.problemId === selectedProblemId);

  const handleRun5WhyAI = async () => {
    if (!selectedProblem) return;
    setIsAiLoading(true);
    try {
      const res = await AIService.findRootCause(
        matchingIndicator,
        selectedProblem.mainProblem,
        schoolProfile
      );

      const newOrUpdated: RootCauseReflection = {
        id: currentRootCause?.id || `rc-${Date.now()}`,
        problemId: selectedProblem.id,
        mainProblem: res.problem,
        symptoms: res.symptoms,
        whyChain: res.whySequence,
        rootCause: res.rootCause,
        controllableFactors: res.controllableFactors,
        uncontrollableFactors: res.uncontrollableFactors,
        isVerifiedBySchool: false, // Label Draf AI - Perlu Verifikasi
      };

      const others = rootCauses.filter((rc) => rc.problemId !== selectedProblem.id);
      onUpdateRootCauses([...others, newOrUpdated]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleVerifyRootCause = () => {
    if (!currentRootCause) return;
    const updated = rootCauses.map((rc) =>
      rc.id === currentRootCause.id ? { ...rc, isVerifiedBySchool: true } : rc
    );
    onUpdateRootCauses(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-700" />
            <span>3.3 Refleksi dan Analisis Akar Masalah (Pendekatan 5-Why)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Menemukan akar masalah paling mendasar, bukan sekadar mengulang gejala di permukaan. Memilah faktor yang dapat dikendalikan sekolah vs faktor pendukung eksternal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun5WhyAI}
            disabled={isAiLoading || !selectedProblem}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isAiLoading ? 'AI Menganalisis 5-Why...' : 'Refleksi Akar Masalah AI'}</span>
          </button>

          <button
            onClick={onNavigateToRekomendasi}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Lanjut ke Rekomendasi Benahi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Problem Selector Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-bold text-slate-700 shrink-0">
          Pilih Masalah untuk Ditelusuri:
        </label>
        <select
          value={selectedProblemId}
          onChange={(e) => setSelectedProblemId(e.target.value)}
          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        >
          {problems.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.indicatorCode}] {p.mainProblem} ({p.priority})
            </option>
          ))}
        </select>
      </div>

      {/* Main 5-Why Reflection Workspace */}
      {currentRootCause ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          {/* Header of Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedProblem?.indicatorCode}
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  {currentRootCause.mainProblem}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kondisi Aktual: {selectedProblem?.actualCondition} · Bukti: {selectedProblem?.dataProof}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {currentRootCause.isVerifiedBySchool ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Diverifikasi Tim TPMPS</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                    Draf AI - Perlu Verifikasi Tim
                  </span>
                  <button
                    onClick={handleVerifyRootCause}
                    className="px-3 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
                  >
                    Verifikasi Sebagai Fakta Sekolah
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Symptoms vs Evidence */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Gejala yang Tampak di Permukaan (Symptoms):
            </span>
            <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
              {currentRootCause.symptoms.map((s, idx) => (
                <li key={idx} className="leading-relaxed">{s}</li>
              ))}
            </ul>
          </div>

          {/* 5-Why Interactive Chain */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-700" />
                <span>Rangkaian Penelusuran Sebab-Akibat (Metode 5-Why)</span>
              </span>
              <span className="text-[11px] text-slate-400">Tahapan Eksplorasi Penyebab</span>
            </div>

            <div className="space-y-2 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
              {currentRootCause.whyChain.map((why, idx) => (
                <div key={idx} className="relative flex items-start gap-3 pl-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 shadow-xs">
                    {idx + 1}
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 leading-relaxed shadow-xs">
                    {why}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The Root Cause Core Box */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Akar Masalah Paling Hakiki (Root Cause):</span>
            </div>
            <p className="text-xs font-semibold text-emerald-900 leading-relaxed">
              "{currentRootCause.rootCause}"
            </p>
          </div>

          {/* Two-Column Factor Analysis: Controllable vs Outside Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Faktor yang Dapat Dikendalikan Satuan Pendidikan:</span>
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                {currentRootCause.controllableFactors.map((f, idx) => (
                  <li key={idx} className="leading-relaxed">{f}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-2">
              <span className="font-bold text-amber-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Faktor yang Membutuhkan Dukungan Pihak Luar (Dinas/Komite):</span>
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                {currentRootCause.uncontrollableFactors.map((f, idx) => (
                  <li key={idx} className="leading-relaxed">{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">
            Akar Masalah Belum Ditelusuri untuk Masalah Ini
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Gunakan tombol "Refleksi Akar Masalah AI" di atas untuk menganalisis penyebab 5-Why, atau lakukan diskusi bersama Tim Pengembang Sekolah.
          </p>
        </div>
      )}
    </div>
  );
};
