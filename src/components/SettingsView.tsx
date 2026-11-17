import React, { useState } from 'react';
import { Plus, RotateCcw, ShieldCheck, UserPlus } from 'lucide-react';
import { DepartmentInfo, Language, UserProfile, UserRole } from '../types/dcc';
import { t } from '../i18n/translations';
import { Avatar } from './Avatar';

interface SettingsViewProps {
  lang: Language;
  departments: DepartmentInfo[];
  users: UserProfile[];
  currentUser: UserProfile;
  onAddDepartment: (dept: DepartmentInfo) => void;
  onAddUser: (user: UserProfile) => void;
  onSwitchUser: (userId: string) => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  departments,
  users,
  currentUser,
  onAddDepartment,
  onAddUser,
  onSwitchUser,
  onResetDemoData,
}) => {
  const [code, setCode] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [headName, setHeadName] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNameTh, setNewNameTh] = useState('');
  const [newDept, setNewDept] = useState(departments[0]?.code ?? 'QA');
  const [newRole, setNewRole] = useState<UserRole>('Dept Reviewer');

  const isAdmin = Boolean(currentUser.isAdmin);

  const handleSubmitDept = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !nameTh.trim() || !nameEn.trim()) return;
    if (departments.some((d) => d.code === cleanCode)) return;
    onAddDepartment({
      code: cleanCode,
      nameTh: nameTh.trim(),
      nameEn: nameEn.trim(),
      headName: headName.trim() || currentUser.nameTh,
    });
    setCode('');
    setNameTh('');
    setNameEn('');
    setHeadName('');
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername || !newPassword.trim() || !newNameTh.trim()) return;
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) return;

    onAddUser({
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password: newPassword.trim(),
      nameTh: newNameTh.trim(),
      nameEn: newNameTh.trim(),
      role: newRole,
      department: newDept,
      titleTh: `${newRole} (${newDept})`,
      titleEn: `${newRole} (${newDept})`,
      email: `${cleanUsername}@enterprise-dcc.co.th`,
    });
    setNewUsername('');
    setNewPassword('');
    setNewNameTh('');
  };

  return (
    <div className="space-y-6">
      {/* Department Prefix Directory & Add Form */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'รหัสหน่วยงานและโครงสร้างรหัสเอกสาร ({TYPE}-{DEPT}-{SEQ})'
                : 'Department Codes & Document Numbering Schema ({TYPE}-{DEPT}-{SEQ})'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-5">Code</th>
                  <th className="py-2.5 px-4">
                    {lang === 'th' ? 'ชื่อหน่วยงาน' : 'Department Name'}
                  </th>
                  <th className="py-2.5 px-5">
                    {lang === 'th' ? 'ผู้จัดการฝ่าย' : 'Department Head'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {departments.map((dept) => (
                  <tr key={dept.code}>
                    <td className="py-3 px-5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {dept.code}
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">
                      {lang === 'th' ? dept.nameTh : dept.nameEn}
                    </td>
                    <td className="py-3 px-5 text-slate-600 dark:text-slate-300">
                      {dept.headName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {lang === 'th' ? 'เพิ่มรหัสหน่วยงานใหม่' : 'Register New Department Code'}
          </h3>
          <form onSubmit={handleSubmitDept} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'รหัสย่อ (2-3 ตัวอักษร เช่น RD)' : 'Code (2-3 letters, e.g. RD)'}
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RD"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'ชื่อหน่วยงาน (ภาษาไทย)' : 'Department Name (TH)'}
              </label>
              <input
                type="text"
                required
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
                placeholder="วิจัยและพัฒนา"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'ชื่อหน่วยงาน (ภาษาอังกฤษ)' : 'Department Name (EN)'}
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Research & Development"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'หัวหน้าหน่วยงาน' : 'Department Head'}
              </label>
              <input
                type="text"
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                placeholder="ดร.นภัสสร อรุณ"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'เพิ่มหน่วยงาน' : 'Add Department'}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Admin: Create Department User Account */}
      {isAdmin && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'สร้างบัญชีผู้ใช้งานแผนก (สำหรับผู้ดูแลระบบ dcc)'
                : 'Create Departmental User Account (Admin Only)'}
            </h3>
          </div>

          <form
            onSubmit={handleSubmitUser}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="wh_mgr"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Password *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="wh2026"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={newNameTh}
                onChange={(e) => setNewNameTh(e.target.value)}
                placeholder="กิตติพงษ์ รุ่งเรือง"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t(lang, 'colDept')}
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="Dept Reviewer">Dept Reviewer</option>
                <option value="Reader">Reader</option>
                <option value="QMR / Approver">QMR / Approver</option>
                <option value="Document Controller">Document Controller</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              {lang === 'th' ? 'สร้างบัญชี' : 'Create User'}
            </button>
          </form>
        </section>
      )}

      {/* Role Directory & Permissions */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'ผู้ใช้งานและบทบาทการควบคุมเอกสาร (RBAC)'
                : 'Document Control Roles & Access Matrix'}
            </h2>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t(lang, 'resetDemoData')}</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((user) => {
            const isActive = user.id === currentUser.id;
            return (
              <div
                key={user.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={user.avatarUrl}
                    name={lang === 'th' ? user.nameTh : user.nameEn}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lang === 'th' ? user.nameTh : user.nameEn}{' '}
                      <span className="font-mono text-xs font-normal text-slate-400 ml-1">
                        @{user.username}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? user.titleTh : user.titleEn} · {user.department} ·{' '}
                      <span className="font-mono">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                    {user.role}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onSwitchUser(user.id)}
                      disabled={isActive}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isActive
                        ? lang === 'th'
                          ? 'กำลังใช้งาน'
                          : 'Active'
                        : lang === 'th'
                          ? 'สลับเป็นผู้ใช้นี้'
                          : 'Switch Role'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

