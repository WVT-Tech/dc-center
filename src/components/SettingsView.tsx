import React, { useEffect, useState } from 'react';
import {
  Database,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Tag,
  Trash2,
  UploadCloud,
  UserPlus,
  X,
} from 'lucide-react';
import {
  DarPermission,
  DbConnectionInfo,
  DepartmentInfo,
  Language,
  RoleDefinition,
  UserProfile,
} from '../types/dcc';
import { t } from '../i18n/translations';
import { Avatar } from './Avatar';

interface SettingsViewProps {
  lang: Language;
  departments: DepartmentInfo[];
  roles: RoleDefinition[];
  users: UserProfile[];
  currentUser: UserProfile;
  dbInfo: DbConnectionInfo | null;
  dbBusy: boolean;
  onAddDepartment: (dept: DepartmentInfo) => void;
  onAddRole: (role: RoleDefinition) => void;
  onUpdateRole: (role: RoleDefinition) => void;
  onDeleteRole: (roleId: string) => void;
  onAddUser: (user: UserProfile) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser: (userId: string) => void;
  onResetDemoData: () => void;
  onSyncDatabase: () => void;
  onPullDatabase: () => void;
}

const DAR_PERMISSION_LABELS: Record<DarPermission, { th: string; en: string }> = {
  none: { th: 'อ่านและยื่นคำขอเท่านั้น', en: 'Read & Submit DAR Only' },
  review: { th: 'ทบทวนคำขอ DAR ประจำแผนก', en: 'Dept Reviewer (Stage 1)' },
  qmr: { th: 'อนุมัติระดับ QMR (Stage 2)', en: 'QMR Approver (Stage 2)' },
  publish: { th: 'ประกาศใช้เอกสารกลาง (DCC)', en: 'DCC Publisher (Stage 3)' },
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  departments,
  roles,
  users,
  currentUser,
  dbInfo,
  dbBusy,
  onAddDepartment,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
  onResetDemoData,
  onSyncDatabase,
  onPullDatabase,
}) => {
  const isAdmin =
    Boolean(currentUser.isAdmin) || currentUser.username.toLowerCase() === 'dcc';

  // Department form
  const [code, setCode] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [headName, setHeadName] = useState('');

  // Role Create/Edit form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDept, setNewRoleDept] = useState(departments[0]?.code ?? 'QA');
  const [newRoleDarPerm, setNewRoleDarPerm] = useState<DarPermission>('review');
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDept, setEditRoleDept] = useState('QA');
  const [editRoleDarPerm, setEditRoleDarPerm] = useState<DarPermission>('review');

  // Create User form
  const firstDeptRole = roles.find((r) => r.department !== 'ALL') ?? roles[0];
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNameTh, setNewNameTh] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState<string>(firstDeptRole?.id ?? '');
  const [newDept, setNewDept] = useState<string>(
    firstDeptRole && firstDeptRole.department !== 'ALL'
      ? firstDeptRole.department
      : departments[0]?.code ?? 'QA'
  );

  // Edit User modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editNameTh, setEditNameTh] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editDept, setEditDept] = useState('QA');

  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);

  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === newRoleId)) {
      const fallback = roles.find((r) => r.department !== 'ALL') ?? roles[0];
      setNewRoleId(fallback.id);
      if (fallback.department !== 'ALL') setNewDept(fallback.department);
    }
  }, [roles, newRoleId]);

  const handleSelectNewRole = (roleId: string) => {
    setNewRoleId(roleId);
    const matched = roles.find((r) => r.id === roleId);
    if (matched && matched.department !== 'ALL') {
      setNewDept(matched.department);
    }
  };

  const handleSelectEditRole = (roleId: string) => {
    setEditRoleId(roleId);
    const matched = roles.find((r) => r.id === roleId);
    if (matched && matched.department !== 'ALL') {
      setEditDept(matched.department);
    }
  };

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

  const handleSubmitRole = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newRoleName.trim();
    if (!cleanName) return;
    if (
      roles.some(
        (r) =>
          r.name.toLowerCase() === cleanName.toLowerCase() &&
          r.department === newRoleDept
      )
    ) {
      setRoleFormError(
        lang === 'th'
          ? 'มีชื่อ Role นี้อยู่แล้วในแผนกที่เลือก'
          : 'This Role already exists in the selected department'
      );
      return;
    }
    setRoleFormError(null);
    onAddRole({
      id: `role-${newRoleDept.toLowerCase()}-${Date.now()}`,
      name: cleanName,
      department: newRoleDept,
      darPermission: newRoleDarPerm,
      isSystem: false,
    });
    setNewRoleName('');
  };

  const openEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDept(role.department);
    setEditRoleDarPerm(role.darPermission);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) return;
    onUpdateRole({
      ...editingRole,
      name: editRoleName.trim(),
      department: editingRole.isSystem ? editingRole.department : editRoleDept,
      darPermission: editingRole.isSystem ? editingRole.darPermission : editRoleDarPerm,
    });
    setEditingRole(null);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername || !newPassword.trim() || !newNameTh.trim()) return;
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      setUserFormError(
        lang === 'th'
          ? `ชื่อผู้ใช้ @${cleanUsername} มีอยู่ในระบบแล้ว`
          : `Username @${cleanUsername} already exists`
      );
      return;
    }
    const chosenRole = roles.find((r) => r.id === newRoleId) ?? roles[0];
    if (!chosenRole) return;
    const assignedDept =
      chosenRole.department !== 'ALL' ? chosenRole.department : newDept;

    setUserFormError(null);
    onAddUser({
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password: newPassword.trim(),
      nameTh: newNameTh.trim(),
      nameEn: newNameTh.trim(),
      role: chosenRole.name,
      roleId: chosenRole.id,
      department: assignedDept,
      titleTh: `${chosenRole.name} (${assignedDept})`,
      titleEn: `${chosenRole.name} (${assignedDept})`,
      email: newEmail.trim() || `${cleanUsername}@enterprise-dcc.co.th`,
      isAdmin: chosenRole.id === 'role-dcc-admin',
    });
    setNewUsername('');
    setNewPassword('');
    setNewNameTh('');
    setNewEmail('');
  };

  const openEditUser = (user: UserProfile) => {
    const matchedRole =
      roles.find(
        (r) =>
          (user.roleId && r.id === user.roleId) ||
          (r.name === user.role &&
            (r.department === user.department || r.department === 'ALL'))
      ) ?? roles[0];
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword(user.password);
    setEditNameTh(user.nameTh);
    setEditEmail(user.email);
    setEditRoleId(matchedRole?.id ?? '');
    setEditDept(user.department);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUsername.trim() || !editPassword.trim() || !editNameTh.trim()) {
      return;
    }
    const cleanUsername = editUsername.trim().toLowerCase();
    if (
      users.some(
        (u) => u.id !== editingUser.id && u.username.toLowerCase() === cleanUsername
      )
    ) {
      return;
    }
    const chosenRole = roles.find((r) => r.id === editRoleId);
    const finalRoleName = chosenRole ? chosenRole.name : editingUser.role;
    const finalDept =
      chosenRole && chosenRole.department !== 'ALL' ? chosenRole.department : editDept;
    const isCoreDcc = editingUser.id === 'usr-dcc' || editingUser.username === 'dcc';

    onUpdateUser({
      ...editingUser,
      username: isCoreDcc ? editingUser.username : cleanUsername,
      password: editPassword.trim(),
      nameTh: editNameTh.trim(),
      nameEn: editNameTh.trim(),
      email: editEmail.trim() || editingUser.email,
      role: finalRoleName,
      roleId: chosenRole?.id ?? editingUser.roleId,
      department: finalDept,
      titleTh: `${finalRoleName} (${finalDept})`,
      titleEn: `${finalRoleName} (${finalDept})`,
      isAdmin: isCoreDcc ? true : chosenRole?.id === 'role-dcc-admin',
    });
    setEditingUser(null);
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

      {/* Admin Only: Role Management Grouped by Department */}
      {isAdmin && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {lang === 'th'
                    ? 'จัดการ Role และสิทธิ์การเข้าถึง KPI แยกตามแผนก'
                    : 'Department-Scoped Role Management'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'th'
                    ? 'Role ที่ผูกกับแผนกจะมองเห็นหน้าตัวชี้วัดคุณภาพ (KPI) ของแผนกตนเองเท่านั้น'
                    : 'Department-scoped roles can only view and manage KPIs for their assigned department'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
            <form
              onSubmit={handleSubmitRole}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
            >
              <div className="lg:col-span-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อ Role ใหม่ *' : 'New Role Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (roleFormError) setRoleFormError(null);
                  }}
                  placeholder={lang === 'th' ? 'เช่น ผู้ดูแล KPI ฝ่ายผลิต' : 'e.g. PD KPI Lead'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'แผนกที่สังกัด' : 'Assigned Department'}
                </label>
                <select
                  value={newRoleDept}
                  onChange={(e) => setNewRoleDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {lang === 'th' ? d.nameTh : d.nameEn}
                    </option>
                  ))}
                  <option value="ALL">
                    {lang === 'th' ? 'ALL — ทุกแผนก (ส่วนกลาง)' : 'ALL — Cross-Department'}
                  </option>
                </select>
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'สิทธิ์การอนุมัติเอกสาร (DAR)' : 'DAR Approval Permission'}
                </label>
                <select
                  value={newRoleDarPerm}
                  onChange={(e) => setNewRoleDarPerm(e.target.value as DarPermission)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {(Object.keys(DAR_PERMISSION_LABELS) as DarPermission[]).map((perm) => (
                    <option key={perm} value={perm}>
                      {lang === 'th'
                        ? DAR_PERMISSION_LABELS[perm].th
                        : DAR_PERMISSION_LABELS[perm].en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'เพิ่ม Role' : 'Add Role'}</span>
                </button>
              </div>
            </form>
            {roleFormError && (
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{roleFormError}</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-5">{lang === 'th' ? 'แผนก' : 'Department'}</th>
                  <th className="py-2.5 px-4">{lang === 'th' ? 'ชื่อ Role' : 'Role Name'}</th>
                  <th className="py-2.5 px-4">{lang === 'th' ? 'ขอบเขตหน้า KPI' : 'KPI Visibility'}</th>
                  <th className="py-2.5 px-4">{lang === 'th' ? 'สิทธิ์อนุมัติ DAR' : 'DAR Permission'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'th' ? 'ผู้ใช้' : 'Users'}</th>
                  <th className="py-2.5 px-5 text-right">{t(lang, 'colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roles.map((role) => {
                  const assignedCount = users.filter(
                    (u) =>
                      u.roleId === role.id ||
                      (u.role === role.name &&
                        (role.department === 'ALL' || u.department === role.department))
                  ).length;
                  return (
                    <tr key={role.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-5 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {role.department}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {role.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {role.department === 'ALL'
                          ? lang === 'th'
                            ? 'ทุกแผนก'
                            : 'All Departments'
                          : lang === 'th'
                            ? `เฉพาะแผนก ${role.department}`
                            : `${role.department} Only`}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {lang === 'th'
                          ? DAR_PERMISSION_LABELS[role.darPermission].th
                          : DAR_PERMISSION_LABELS[role.darPermission].en}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {assignedCount}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditRole(role)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={lang === 'th' ? 'แก้ไข Role' : 'Edit Role'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!role.isSystem && (
                            <button
                              type="button"
                              onClick={() => onDeleteRole(role.id)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title={lang === 'th' ? 'ลบ Role' : 'Delete Role'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Admin: Create Department User Account */}
      {isAdmin && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'สร้างบัญชีผู้ใช้งานแผนกและกำหนด Role (สำหรับผู้ดูแลระบบ dcc)'
                : 'Create User Account & Assign Department Role (Admin Only)'}
            </h3>
          </div>

          <form
            onSubmit={handleSubmitUser}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (userFormError) setUserFormError(null);
                }}
                placeholder="pd_mgr"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Password *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="pd2026"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={newNameTh}
                onChange={(e) => setNewNameTh(e.target.value)}
                placeholder="สมชาย ใจดี"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'th' ? 'กำหนด Role (แบ่งตามแผนก)' : 'Role (by Department)'}
              </label>
              <select
                value={newRoleId}
                onChange={(e) => handleSelectNewRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.department}] {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t(lang, 'colDept')}
              </label>
              <select
                value={newDept}
                disabled={
                  roles.find((r) => r.id === newRoleId)?.department !== 'ALL'
                }
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-70"
              >
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-1">
              <button
                type="submit"
                className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
              >
                {lang === 'th' ? 'สร้าง' : 'Add'}
              </button>
            </div>
          </form>
          {userFormError && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{userFormError}</p>
          )}
        </section>
      )}

      {/* Role Directory & Permissions (with Edit / Delete for Admin dcc) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'ผู้ใช้งานและบทบาทการควบคุมเอกสาร (RBAC)'
                : 'Document Control Users & Role Assignments'}
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
            const isCoreDcc = user.id === 'usr-dcc' || user.username.toLowerCase() === 'dcc';
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
                      {user.role} · {user.department} ·{' '}
                      <span className="font-mono">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300 mr-1">
                    [{user.department}] {user.role}
                  </span>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditUser(user)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        title={lang === 'th' ? 'แก้ไขผู้ใช้' : 'Edit User'}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                      </button>

                      {!isCoreDcc && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(user.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title={lang === 'th' ? 'ลบผู้ใช้' : 'Delete User'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'ลบ' : 'Delete'}</span>
                        </button>
                      )}

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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cloudflare D1 SQLite Database Integration */}
      {isAdmin && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {lang === 'th'
                    ? 'การเชื่อมต่อฐานข้อมูล Cloudflare D1 SQLite'
                    : 'Cloudflare D1 SQLite Database Integration'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'th'
                    ? 'บันทึกข้อมูลเอกสาร DAR, ผังก้างปลา KPI, บัญชีผู้ใช้ และ Role แบบ Relational SQLite ผ่าน Server API'
                    : 'Relational SQLite persistence for Documents, DARs, Fishbone KPIs, Users, and Roles via server proxy'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={dbBusy}
                onClick={onPullDatabase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dbBusy ? 'animate-spin' : ''}`} />
                <span>{lang === 'th' ? 'ดึงข้อมูลจาก D1' : 'Pull from D1'}</span>
              </button>

              <button
                type="button"
                disabled={dbBusy}
                onClick={onSyncDatabase}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {lang === 'th' ? 'สร้างตารางและซิงค์เข้า D1' : 'Init Schema & Sync D1'}
                </span>
              </button>

              <a
                href="/api/d1/schema"
                download="d1-schema.sql"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ดาวน์โหลด Schema (.sql)' : 'Download Schema (.sql)'}</span>
              </a>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {lang === 'th' ? 'โหมดฐานข้อมูลที่ใช้งาน' : 'Active SQLite Driver'}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {dbInfo?.driver === 'cloudflare-d1'
                    ? 'Cloudflare D1 Remote (HTTP API)'
                    : 'Local SQLite (D1-Compatible)'}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {lang === 'th' ? 'ชื่อฐานข้อมูล / Database ID' : 'Database Name / ID'}
                </div>
                <div className="mt-1 text-sm font-mono font-semibold text-slate-900 dark:text-white truncate">
                  {dbInfo?.databaseName ?? 'dcc-sqlite-db'}{' '}
                  {dbInfo?.databaseIdMasked ? `(${dbInfo.databaseIdMasked})` : ''}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {lang === 'th' ? 'ซิงค์ล่าสุด' : 'Last Synced'}
                </div>
                <div className="mt-1 text-sm font-mono text-slate-900 dark:text-white">
                  {dbInfo?.lastSyncedAt
                    ? dbInfo.lastSyncedAt.replace('T', ' ').slice(0, 19)
                    : lang === 'th'
                      ? 'ซิงค์อัตโนมัติพร้อมใช้งาน'
                      : 'Auto-sync ready'}
                </div>
              </div>
            </div>

            {dbInfo?.lastError && (
              <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 font-mono">
                {dbInfo.lastError}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4 font-semibold">SQLite Table</th>
                    <th className="py-2.5 px-4 font-semibold">
                      {lang === 'th' ? 'คำอธิบายข้อมูล' : 'Entity Description'}
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      {lang === 'th' ? 'จำนวนรายการในฐานข้อมูล' : 'Stored Rows'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_documents</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'ทะเบียนเอกสารควบคุมและคลังเอกสารยกเลิก' : 'Master Controlled & Obsolete Documents'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.documents ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_dars</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'คำขอดำเนินการด้านเอกสาร (DAR)' : 'Document Action Requests (DAR)'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.dars ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_fishbones</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'ตัวชี้วัด KPI แบบผังก้างปลา 6M รายแผนก' : 'Department 6M Fishbone KPIs'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.fishbones ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_departments</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'รหัสหน่วยงานและผู้รับผิดชอบ' : 'Department Codes & Owners'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.departments ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_roles</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'Role และการกำหนดสิทธิ์แยกตามแผนก' : 'Department-Scoped Roles'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.roles ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_users</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'บัญชีผู้ใช้งานและสิทธิ์ RBAC' : 'Users & RBAC Profiles'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.users ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400">dcc_audit_events</td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'บันทึกประวัติการตรวจสอบ (Audit Trail)' : 'Immutable Audit Trail Log'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {dbInfo?.counts.auditEvents ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {lang === 'th'
                  ? `แก้ไขบัญชีผู้ใช้ @${editingUser.username}`
                  : `Edit User @${editingUser.username}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={
                      editingUser.id === 'usr-dcc' ||
                      editingUser.username.toLowerCase() === 'dcc'
                    }
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editNameTh}
                  onChange={(e) => setEditNameTh(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Role
                  </label>
                  <select
                    disabled={
                      editingUser.id === 'usr-dcc' ||
                      editingUser.username.toLowerCase() === 'dcc'
                    }
                    value={editRoleId}
                    onChange={(e) => handleSelectEditRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.department}] {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'colDept')}
                  </label>
                  <select
                    disabled={
                      roles.find((r) => r.id === editRoleId)?.department !== 'ALL'
                    }
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึกการแก้ไข' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Role */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setEditingRole(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {lang === 'th' ? 'แก้ไข Role' : 'Edit Role'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อ Role *' : 'Role Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'แผนกที่สังกัด' : 'Department'}
                </label>
                <select
                  disabled={Boolean(editingRole.isSystem)}
                  value={editRoleDept}
                  onChange={(e) => setEditRoleDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} — {lang === 'th' ? d.nameTh : d.nameEn}
                    </option>
                  ))}
                  <option value="ALL">
                    {lang === 'th' ? 'ALL — ทุกแผนก (ส่วนกลาง)' : 'ALL — Cross-Department'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'สิทธิ์การอนุมัติเอกสาร (DAR)' : 'DAR Approval Permission'}
                </label>
                <select
                  disabled={Boolean(editingRole.isSystem)}
                  value={editRoleDarPerm}
                  onChange={(e) => setEditRoleDarPerm(e.target.value as DarPermission)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-60"
                >
                  {(Object.keys(DAR_PERMISSION_LABELS) as DarPermission[]).map((perm) => (
                    <option key={perm} value={perm}>
                      {lang === 'th'
                        ? DAR_PERMISSION_LABELS[perm].th
                        : DAR_PERMISSION_LABELS[perm].en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึก Role' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
