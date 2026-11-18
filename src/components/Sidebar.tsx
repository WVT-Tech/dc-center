import React from 'react';
import {
  Archive,
  Building2,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { Language, NavSection, UserProfile } from '../types/dcc';
import { t } from '../i18n/translations';
import { Avatar } from './Avatar';

interface SidebarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  lang: Language;
  onToggleLang: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  currentUser: UserProfile;
  users: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  counts: {
    activeDocs: number;
    pendingDars: number;
    obsoleteDocs: number;
  };
  canViewRestrictedMenus?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onSelectNav,
  lang,
  onToggleLang,
  darkMode,
  onToggleDark,
  currentUser,
  users,
  onSwitchUser,
  onLogout,
  counts,
  canViewRestrictedMenus = true,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', label: t(lang, 'navOverview'), icon: LayoutDashboard },
    { id: 'kpi', label: t(lang, 'navKpi'), icon: Gauge },
    { id: 'master-list', label: t(lang, 'navMasterList'), icon: FileSpreadsheet, count: counts.activeDocs },
    { id: 'dar-workflow', label: t(lang, 'navDarWorkflow'), icon: FileCheck2, count: counts.pendingDars },
    { id: 'archive', label: t(lang, 'navArchive'), icon: Archive, count: counts.obsoleteDocs },
    ...(canViewRestrictedMenus
      ? [
          { id: 'audit-trail' as NavSection, label: t(lang, 'navAuditTrail'), icon: History },
          { id: 'settings' as NavSection, label: t(lang, 'navSettings'), icon: Building2 },
        ]
      : []),
  ];

  const handleNavClick = (id: NavSection) => {
    onSelectNav(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/Jasmin_2882c892.png"
            alt="Jasmin Tech Logo"
            className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
          />
          <span className="font-semibold text-[15px] tracking-tight text-slate-900 dark:text-white truncate">
            {t(lang, 'brandName')}
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors text-left ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`font-mono text-xs tabular-nums shrink-0 ${
                    isActive
                      ? 'text-slate-200 dark:text-blue-100'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Controls & Active Role Switcher */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        {/* Language & Theme Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => lang !== 'th' && onToggleLang()}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                lang === 'th'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              TH
            </button>
            <button
              type="button"
              onClick={() => lang !== 'en' && onToggleLang()}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? t(lang, 'themeLight') : t(lang, 'themeDark')}</span>
          </button>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar
              src={currentUser.avatarUrl}
              name={lang === 'th' ? currentUser.nameTh : currentUser.nameEn}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                {lang === 'th' ? currentUser.nameTh : currentUser.nameEn}
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                @{currentUser.username} · {currentUser.department}
              </div>
            </div>
          </div>

          {currentUser.isAdmin && (
            <label className="block">
              <span className="sr-only">{t(lang, 'activeRoleLabel')}</span>
              <select
                value={currentUser.id}
                onChange={(e) => onSwitchUser(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role} — {lang === 'th' ? u.nameTh : u.nameEn}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t(lang, 'logoutButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative w-[272px] max-w-[85vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
