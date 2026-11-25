import React from 'react';
import {
  LayoutDashboard,
  Building,
  Database,
  Upload,
  BarChart3,
  AlertTriangle,
  GitBranch,
  Lightbulb,
  CheckSquare,
  Award,
  Layers,
  FileText,
  CalendarDays,
  Calculator,
  UserCheck,
  GraduationCap,
  BookOpen,
  Binary,
  HeartHandshake,
  Activity,
  Scale,
  FolderArchive,
  School as SchoolIcon,
  Users,
  Shield,
  ChevronRight,
  BookMarked,
} from 'lucide-react';

export type NavMenuId =
  // 1. Ikhtisar
  | 'dashboard'
  // 2. Data & Sumber
  | 'identitas-sekolah'
  | 'data-pendukung'
  | 'impor-rapor'
  // 3. PBD
  | 'analisis-rapor'
  | 'identifikasi-masalah'
  | 'refleksi-akar-masalah'
  | 'rekomendasi-pembenahan'
  | 'implementasi-aksi'
  // 4. Dokumen Induk & Anggaran
  | 'integrasi-snp'
  | 'integrasi-akreditasi'
  | 'generator-rkjm'
  | 'generator-rkt'
  | 'generator-rkas'
  | 'program-kepsek'
  // 5. Mutu Pembelajaran
  | 'supervisi-akademik'
  | 'program-literasi'
  | 'program-numerasi'
  | 'program-karakter'
  // 6. Pengawasan & Arsip
  | 'monitoring-evaluasi'
  | 'regulasi-referensi'
  | 'dokumen-saya'
  // 7. Tata Kelola
  | 'profil-pengguna'
  | 'hak-akses'
  | 'keamanan-backup';

interface SidebarProps {
  activeMenu: NavMenuId;
  onSelectMenu: (menuId: NavMenuId) => void;
  schoolName: string;
}

interface MenuGroup {
  groupName: string;
  items: {
    id: NavMenuId;
    label: string;
    icon: React.ElementType;
    badgeCount?: number;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  schoolName,
}) => {
  const menuGroups: MenuGroup[] = [
    {
      groupName: '1. IKHTISAR UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard Mutu & PBD', icon: LayoutDashboard },
      ],
    },
    {
      groupName: '2. DATA DAN SUMBER',
      items: [
        { id: 'identitas-sekolah', label: 'Identitas Sekolah', icon: Building },
        { id: 'data-pendukung', label: 'Data Pendukung Sekolah', icon: Database },
        { id: 'impor-rapor', label: 'Fasilitas Impor Rapor', icon: Upload },
      ],
    },
    {
      groupName: '3. PERENCANAAN BERBASIS DATA (PBD)',
      items: [
        { id: 'analisis-rapor', label: 'Analisis Rapor Pendidikan', icon: BarChart3 },
        { id: 'identifikasi-masalah', label: 'Identifikasi Masalah', icon: AlertTriangle },
        { id: 'refleksi-akar-masalah', label: 'Refleksi Akar Masalah (5-Why)', icon: GitBranch },
        { id: 'rekomendasi-pembenahan', label: 'Rekomendasi Pembenahan', icon: Lightbulb },
        { id: 'implementasi-aksi', label: 'Implementasi Rencana Aksi', icon: CheckSquare },
      ],
    },
    {
      groupName: '4. DOKUMEN INDUK & ANGGARAN',
      items: [
        { id: 'integrasi-snp', label: 'Integrasi 8 SNP', icon: Layers },
        { id: 'integrasi-akreditasi', label: 'Kesiapan Akreditasi BAN-PDM', icon: Award },
        { id: 'generator-rkjm', label: 'Generator RKJM (4 Tahun)', icon: BookMarked },
        { id: 'generator-rkt', label: 'Generator RKT (1 Tahun)', icon: CalendarDays },
        { id: 'generator-rkas', label: 'Generator RKAS / ARKAS', icon: Calculator },
        { id: 'program-kepsek', label: 'Program Kerja Kepala Sekolah', icon: UserCheck },
      ],
    },
    {
      groupName: '5. MUTU PEMBELAJARAN',
      items: [
        { id: 'supervisi-akademik', label: 'Supervisi Akademik & Manajerial', icon: GraduationCap },
        { id: 'program-literasi', label: 'Program Literasi (GLS)', icon: BookOpen },
        { id: 'program-numerasi', label: 'Program Numerasi Kontekstual', icon: Binary },
        { id: 'program-karakter', label: 'Program Penguatan Karakter', icon: HeartHandshake },
      ],
    },
    {
      groupName: '6. PENGAWASAN DAN ARSIP',
      items: [
        { id: 'monitoring-evaluasi', label: 'Monitoring & Evaluasi (Monev)', icon: Activity },
        { id: 'regulasi-referensi', label: 'Pusat Regulasi Resmi', icon: Scale },
        { id: 'dokumen-saya', label: 'Arsip Dokumen Saya', icon: FolderArchive },
      ],
    },
    {
      groupName: '7. TATA KELOLA SISTEM',
      items: [
        { id: 'profil-pengguna', label: 'Identitas & Profil Pengguna', icon: UserCheck },
        { id: 'hak-akses', label: 'Hak Akses Pengguna (RBAC)', icon: Users },
        { id: 'keamanan-backup', label: 'Keamanan, Audit & Backup', icon: Shield },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0 select-none no-print">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
          SP
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white tracking-tight uppercase leading-tight truncate">
            SMART RAPOR PENDIDIKAN
          </div>
          <div className="text-[10px] text-emerald-400 font-medium truncate">
            Sistem Terintegrasi PBD & Mutu
          </div>
          <div className="text-[10px] text-amber-300 font-semibold tracking-wide truncate mt-0.5">
            MKPS SMP Kab. Garut
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
        {menuGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {group.groupName}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectMenu(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all group ${
                      isActive
                        ? 'bg-emerald-700/80 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* School Footer Pin */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="text-[11px] text-slate-400 truncate">Satuan Pendidikan:</div>
        <div className="text-xs font-semibold text-slate-200 truncate">{schoolName}</div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Versi 2.6 Terpadu</span>
          <span className="text-emerald-400 font-medium">BOSP 2026 Ready</span>
        </div>
      </div>
    </aside>
  );
};
