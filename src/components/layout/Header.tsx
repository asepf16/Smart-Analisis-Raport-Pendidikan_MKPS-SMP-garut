import React from 'react';
import {
  ChevronDown,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Calendar,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { SchoolProfile, UserProfile, UserRole } from '../../types';

interface HeaderProps {
  currentModuleTitle: string;
  moduleGroup: string;
  activeSchool: SchoolProfile;
  currentUser: UserProfile;
  onChangeUserRole: (role: UserRole) => void;
  onOpenSchoolIdentity: () => void;
  onOpenUserProfile: () => void;
  onResetRegistration: () => void;
  onOpenQuickImport: () => void;
  onPrintPage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModuleTitle,
  moduleGroup,
  activeSchool,
  currentUser,
  onChangeUserRole,
  onOpenSchoolIdentity,
  onOpenUserProfile,
  onResetRegistration,
  onOpenQuickImport,
  onPrintPage,
}) => {
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);

  const roleLabels: Record<UserRole, { label: string; badge: string }> = {
    super_admin: { label: 'Super Admin / Pengawas', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    admin_sekolah: { label: 'Admin Sekolah / Operator', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    kepala_sekolah: { label: 'Kepala Sekolah', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    guru_tpmps: { label: 'Guru / Tim TPMPS', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    bendahara: { label: 'Bendahara BOSP', badge: 'bg-teal-50 text-teal-800 border-teal-200' },
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-6 py-3.5 bg-white border-b border-slate-200 shadow-xs no-print">
      {/* Zone 1: Breadcrumb & Context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 whitespace-nowrap">
          <span>{moduleGroup}</span>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold truncate">{currentModuleTitle}</span>
        </div>

        {/* Status Mode Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200/60 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>PBD Permendikdasmen Active</span>
        </div>
      </div>

      {/* Zone 2: Registered School Identity & Academic Period */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSchoolIdentity}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 bg-slate-50/70 hover:bg-emerald-50/50 transition-colors text-left"
          title="Lihat & Edit Identitas Satuan Pendidikan"
        >
          <div className="w-6 h-6 rounded bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {activeSchool.stage || 'S'}
          </div>
          <div className="max-w-[200px] md:max-w-[260px]">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {activeSchool.name}
            </div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
              <span className="font-mono">NPSN: {activeSchool.npsn}</span>
              <span>·</span>
              <span className="font-medium text-emerald-700">{activeSchool.city}</span>
            </div>
          </div>
        </button>

        {/* Academic Year Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg bg-white whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>TP {activeSchool.academicYear}</span>
        </div>
      </div>

      {/* Zone 3: Actions & Active User Menu */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenQuickImport}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          <span>Impor Rapor</span>
        </button>

        <button
          onClick={onPrintPage}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          title="Cetak Laporan Resmi / Simpan PDF"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Cetak</span>
        </button>

        {/* User Profile & Role Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left"
            title="Profil Pengguna & Pengaturan Peran"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden md:block text-left text-xs">
              <div className="font-semibold text-slate-900 leading-tight truncate max-w-[150px]">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                {roleLabels[currentUser.role]?.label || currentUser.role}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
              </div>

              <div className="py-1 border-b border-slate-100">
                <button
                  onClick={() => {
                    onOpenUserProfile();
                    setShowRoleMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Edit Profil & Identitas Pengguna</span>
                </button>
              </div>

              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Ganti Peran Kerja (RBAC)
              </div>
              <div className="py-1 space-y-0.5">
                {(Object.keys(roleLabels) as UserRole[]).map((roleKey) => (
                  <button
                    key={roleKey}
                    onClick={() => {
                      onChangeUserRole(roleKey);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentUser.role === roleKey ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{roleLabels[roleKey].label}</span>
                    {currentUser.role === roleKey && (
                      <span className="text-[10px] font-bold text-emerald-700">Aktif</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-1 mt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    onResetRegistration();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Ganti Pengguna / Daftar Baru</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
