import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Moon, Sun, User } from 'lucide-react';
import { Language, UserProfile } from '../types/dcc';
import { t } from '../i18n/translations';

interface LoginScreenProps {
  lang: Language;
  onToggleLang: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  lang,
  onToggleLang,
  darkMode,
  onToggleDark,
  users,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const matched = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === password
    );
    if (!matched) {
      setErrorMsg(t(lang, 'loginError'));
      return;
    }
    setErrorMsg(null);
    onLoginSuccess(matched);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Minimal Top Bar */}
      <header className="h-16 px-6 sm:px-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-mono text-xs font-semibold">
            DC
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            {t(lang, 'brandName')}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => lang !== 'th' && onToggleLang()}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                lang === 'th'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
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
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? t(lang, 'themeLight') : t(lang, 'themeDark')}</span>
          </button>
        </div>
      </header>

      {/* Main Auth Panel */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {t(lang, 'loginTitle')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t(lang, 'loginSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {t(lang, 'loginUsername')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="dcc"
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {t(lang, 'loginPassword')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              {t(lang, 'loginButton')}
            </button>
          </form>

          {/* Department Accounts Quick Reference */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {lang === 'th'
                ? 'บัญชีผู้ใช้งานในระบบ (คลิกเพื่อกรอกอัตโนมัติ)'
                : 'Available System Accounts (click to autofill)'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {users.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUsername(u.username);
                    setPassword(u.password);
                    setErrorMsg(null);
                  }}
                  className="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate">
                    {u.username}
                    {u.isAdmin ? ' (Admin)' : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {u.department} · {u.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
