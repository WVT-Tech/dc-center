/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Menu } from 'lucide-react';
import {
  AuditActionType,
  AuditEvent,
  ControlledDocument,
  DarType,
  DepartmentInfo,
  DepartmentKpiFishbone,
  DocumentActionRequest,
  KpiTargets,
  Language,
  NavSection,
  UserProfile,
} from './types/dcc';
import {
  SEED_AUDIT_EVENTS,
  SEED_DARS,
  SEED_DEPARTMENTS,
  SEED_DOCUMENTS,
  SEED_FISHBONES,
  SEED_USERS,
} from './data/seedData';
import { t } from './i18n/translations';
import { DEFAULT_KPI_TARGETS } from './utils/kpiMetrics';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { KpiView } from './components/KpiView';
import { MasterListView } from './components/MasterListView';
import { DarWorkflowView } from './components/DarWorkflowView';
import { ArchiveView } from './components/ArchiveView';
import { AuditTrailView } from './components/AuditTrailView';
import { SettingsView } from './components/SettingsView';
import { DocumentDossierDrawer } from './components/DocumentDossierDrawer';
import { CreateDarModal } from './components/CreateDarModal';

const STORAGE_KEY = 'dcc_portal_state_v2';
const TODAY_STR = '2026-11-16';

interface PersistedState {
  documents: ControlledDocument[];
  dars: DocumentActionRequest[];
  departments: DepartmentInfo[];
  auditEvents: AuditEvent[];
  fishbones: DepartmentKpiFishbone[];
  users: UserProfile[];
  kpiTargets?: KpiTargets;
  authenticatedUserId: string | null;
  lang: Language;
  darkMode: boolean;
}

function getInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.documents && parsed.dars && parsed.departments && parsed.auditEvents) {
        return {
          documents: parsed.documents,
          dars: parsed.dars,
          departments: parsed.departments,
          auditEvents: parsed.auditEvents,
          fishbones: parsed.fishbones ?? SEED_FISHBONES,
          users: parsed.users ?? SEED_USERS,
          kpiTargets: parsed.kpiTargets ?? DEFAULT_KPI_TARGETS,
          authenticatedUserId:
            parsed.authenticatedUserId !== undefined ? parsed.authenticatedUserId : null,
          lang: parsed.lang ?? 'th',
          darkMode: parsed.darkMode ?? false,
        };
      }
    }
  } catch {
    // Fallback to seed state if storage is unavailable or corrupted
  }
  return {
    documents: SEED_DOCUMENTS,
    dars: SEED_DARS,
    departments: SEED_DEPARTMENTS,
    auditEvents: SEED_AUDIT_EVENTS,
    fishbones: SEED_FISHBONES,
    users: SEED_USERS,
    kpiTargets: DEFAULT_KPI_TARGETS,
    authenticatedUserId: null,
    lang: 'th',
    darkMode: false,
  };
}

function formatNowTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function addOneYear(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '2027-11-16';
  return `${parts[0] + 1}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
}

export default function App() {
  const initial = useMemo(() => getInitialState(), []);

  const [documents, setDocuments] = useState<ControlledDocument[]>(initial.documents);
  const [dars, setDars] = useState<DocumentActionRequest[]>(initial.dars);
  const [departments, setDepartments] = useState<DepartmentInfo[]>(initial.departments);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initial.auditEvents);
  const [fishbones, setFishbones] = useState<DepartmentKpiFishbone[]>(initial.fishbones);
  const [users, setUsers] = useState<UserProfile[]>(initial.users);
  const [kpiTargets, setKpiTargets] = useState<KpiTargets>(
    initial.kpiTargets ?? DEFAULT_KPI_TARGETS
  );
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(
    initial.authenticatedUserId
  );
  const [lang, setLang] = useState<Language>(initial.lang);
  const [darkMode, setDarkMode] = useState<boolean>(initial.darkMode);

  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [darModalState, setDarModalState] = useState<{
    isOpen: boolean;
    darType: DarType;
    targetDoc?: ControlledDocument;
  }>({ isOpen: false, darType: 'New Issue' });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentUser: UserProfile = useMemo(
    () => users.find((u) => u.id === authenticatedUserId) ?? users[0],
    [users, authenticatedUserId]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        documents,
        dars,
        departments,
        auditEvents,
        fishbones,
        users,
        kpiTargets,
        authenticatedUserId,
        lang,
        darkMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota overflow gracefully
    }
  }, [
    documents,
    dars,
    departments,
    auditEvents,
    fishbones,
    users,
    kpiTargets,
    authenticatedUserId,
    lang,
    darkMode,
  ]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  const appendAudit = (
    action: AuditActionType,
    targetCode: string,
    detailTh: string,
    detailEn: string
  ) => {
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatNowTimestamp(),
      actorName: lang === 'th' ? currentUser.nameTh : currentUser.nameEn,
      actorRole: currentUser.role,
      action,
      targetCode,
      detailTh,
      detailEn,
    };
    setAuditEvents((prev) => [newEvent, ...prev]);
  };

  const counts = useMemo(() => {
    const activeDocs = documents.filter((d) => d.status === 'Active');
    const pendingDars = dars.filter(
      (d) => d.stage !== 'Published' && d.stage !== 'Rejected'
    ).length;
    const obsoleteDocs = documents.filter((d) => d.status === 'Obsolete').length;
    return {
      activeDocs: activeDocs.length,
      pendingDars,
      obsoleteDocs,
    };
  }, [documents, dars]);

  const handleSubmitDar = (
    darData: Omit<
      DocumentActionRequest,
      'id' | 'darNumber' | 'requestedAt' | 'stage' | 'logs'
    >
  ) => {
    const nextSeq = dars.length + 43;
    const darNumber = `DAR-2026-${String(nextSeq).padStart(3, '0')}`;
    const timestamp = formatNowTimestamp();

    const newDar: DocumentActionRequest = {
      ...darData,
      id: `dar-${Date.now()}`,
      darNumber,
      requestedAt: timestamp,
      stage: 'Pending Reviewer',
      logs: [
        {
          stage: 'Request Submitted',
          actorName: darData.requesterName,
          actorRole: currentUser.role,
          action: 'Submitted',
          comment: darData.reasonTh,
          timestamp,
        },
      ],
    };

    setDars((prev) => [newDar, ...prev]);
    appendAudit(
      'DAR_SUBMITTED',
      darNumber,
      `ยื่นคำขอ ${darData.darType} สำหรับเอกสาร ${darData.proposedDocNumber}`,
      `Submitted ${darData.darType} DAR for ${darData.proposedDocNumber}`
    );
    showToast(
      lang === 'th'
        ? `ส่งคำขอ ${darNumber} เข้าสู่ระบบอนุมัติแล้ว`
        : `Submitted ${darNumber} for approval`
    );
    setActiveNav('dar-workflow');
  };

  const handleAdvanceDar = (darId: string, comment: string) => {
    const dar = dars.find((d) => d.id === darId);
    if (!dar) return;
    const timestamp = formatNowTimestamp();
    const todayDate = TODAY_STR;
    const actorName = lang === 'th' ? currentUser.nameTh : currentUser.nameEn;

    if (dar.stage === 'Pending Reviewer') {
      setDars((prev) =>
        prev.map((item) =>
          item.id === darId
            ? {
                ...item,
                stage: 'Pending QMR',
                logs: [
                  ...item.logs,
                  {
                    stage: 'Dept Reviewer',
                    actorName,
                    actorRole: currentUser.role,
                    action: 'Approved',
                    comment: comment.trim() || 'ตรวจสอบความถูกต้องทางเทคนิคเรียบร้อย',
                    timestamp,
                  },
                ],
              }
            : item
        )
      );
      appendAudit(
        'DAR_APPROVED',
        dar.darNumber,
        `ผ่านการทบทวนระดับหน่วยงานสำหรับ ${dar.proposedDocNumber}`,
        `Dept Reviewer approved ${dar.darNumber} for ${dar.proposedDocNumber}`
      );
      showToast(
        lang === 'th'
          ? `อนุมัติขั้น Reviewer แล้ว ส่งต่อให้ QMR`
          : `${dar.darNumber} routed to QMR`
      );
      return;
    }

    if (dar.stage === 'Pending QMR') {
      setDars((prev) =>
        prev.map((item) =>
          item.id === darId
            ? {
                ...item,
                stage: 'Pending DCC Publish',
                logs: [
                  ...item.logs,
                  {
                    stage: 'QMR Approval',
                    actorName,
                    actorRole: currentUser.role,
                    action: 'Approved',
                    comment: comment.trim() || 'QMR อนุมัติให้ดำเนินการขึ้นทะเบียน',
                    timestamp,
                  },
                ],
              }
            : item
        )
      );
      appendAudit(
        'DAR_APPROVED',
        dar.darNumber,
        `QMR อนุมัติ ${dar.darNumber} ส่งต่อ DCC ประกาศใช้`,
        `QMR approved ${dar.darNumber}; pending DCC publication`
      );
      showToast(
        lang === 'th'
          ? `QMR อนุมัติแล้ว ส่งต่อ DCC ขึ้นทะเบียน`
          : `QMR approved ${dar.darNumber}`
      );
      return;
    }

    if (dar.stage === 'Pending DCC Publish') {
      // Update DAR to Published
      setDars((prev) =>
        prev.map((item) =>
          item.id === darId
            ? {
                ...item,
                stage: 'Published',
                logs: [
                  ...item.logs,
                  {
                    stage: 'DCC Publish',
                    actorName,
                    actorRole: currentUser.role,
                    action: 'Published',
                    comment:
                      comment.trim() ||
                      `ขึ้นทะเบียนประกาศใช้ใน Master Document List (Rev.${dar.proposedRevision})`,
                    timestamp,
                  },
                ],
              }
            : item
        )
      );

      // Update or Create ControlledDocument in Master List
      if (dar.darType === 'New Issue') {
        const deptInfo = departments.find((d) => d.code === dar.department);
        const newDoc: ControlledDocument = {
          id: `doc-${Date.now()}`,
          docNumber: dar.proposedDocNumber,
          titleTh: dar.proposedTitleTh,
          titleEn: dar.proposedTitleEn,
          type: dar.docType,
          department: dar.department,
          revision: dar.proposedRevision,
          status: 'Active',
          effectiveDate: todayDate,
          nextReviewDate: addOneYear(todayDate),
          ownerName: dar.requesterName,
          confidentiality: 'Internal',
          isoClause: dar.isoClause,
          retentionYears: 5,
          content: dar.proposedContent ?? {
            objectiveTh: dar.reasonTh,
            objectiveEn: dar.reasonEn,
            scopeTh: `หน่วยงาน ${dar.department}`,
            scopeEn: `${dar.department} Department`,
            responsibilitiesTh: deptInfo?.headName ?? dar.requesterName,
            responsibilitiesEn: deptInfo?.headName ?? dar.requesterName,
            procedureStepsTh: ['4.1 ปฏิบัติตามข้อกำหนดที่ได้รับอนุมัติ'],
            procedureStepsEn: ['4.1 Execute approved documented steps.'],
            references: [`ISO 9001:2015 Clause ${dar.isoClause}`],
          },
          revisionHistory: [
            {
              revision: dar.proposedRevision,
              date: todayDate,
              darNumber: dar.darNumber,
              summaryTh: dar.reasonTh,
              summaryEn: dar.reasonEn,
              authorName: dar.requesterName,
              approverName: 'สุรศักดิ์ วงศ์สุวรรณ',
            },
          ],
          distribution: [
            {
              department: dar.department,
              recipientName: deptInfo?.headName ?? dar.requesterName,
              roleTitle: 'Department Head',
              acknowledged: false,
            },
            {
              department: 'QA',
              recipientName: 'นลินี ศิริวัฒน์',
              roleTitle: 'DCC',
              acknowledged: true,
              acknowledgedAt: timestamp,
            },
          ],
        };
        setDocuments((prev) => [newDoc, ...prev]);
        appendAudit(
          'DOC_PUBLISHED',
          dar.proposedDocNumber,
          `ขึ้นทะเบียนเอกสารใหม่ ${dar.proposedDocNumber} Rev.${dar.proposedRevision}`,
          `Published new document ${dar.proposedDocNumber} Rev.${dar.proposedRevision}`
        );
      } else if (dar.darType === 'Revision' && dar.targetDocId) {
        setDocuments((prev) =>
          prev.map((doc) => {
            if (doc.id !== dar.targetDocId) return doc;
            return {
              ...doc,
              titleTh: dar.proposedTitleTh,
              titleEn: dar.proposedTitleEn,
              revision: dar.proposedRevision,
              effectiveDate: todayDate,
              nextReviewDate: addOneYear(todayDate),
              content: dar.proposedContent ?? doc.content,
              revisionHistory: [
                {
                  revision: dar.proposedRevision,
                  date: todayDate,
                  darNumber: dar.darNumber,
                  summaryTh: dar.reasonTh,
                  summaryEn: dar.reasonEn,
                  authorName: dar.requesterName,
                  approverName: 'สุรศักดิ์ วงศ์สุวรรณ',
                },
                ...doc.revisionHistory,
              ],
              distribution: doc.distribution.map((r) => ({
                ...r,
                acknowledged: false,
                acknowledgedAt: undefined,
              })),
            };
          })
        );
        appendAudit(
          'DOC_PUBLISHED',
          dar.proposedDocNumber,
          `ประกาศใช้ฉบับแก้ไข ${dar.proposedDocNumber} Rev.${dar.proposedRevision}`,
          `Published revision ${dar.proposedDocNumber} Rev.${dar.proposedRevision}`
        );
      } else if (dar.darType === 'Obsolete' && dar.targetDocId) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === dar.targetDocId
              ? {
                  ...doc,
                  status: 'Obsolete',
                  obsoleteDate: todayDate,
                  obsoleteReason: dar.reasonTh,
                }
              : doc
          )
        );
        appendAudit(
          'DOC_OBSOLETED',
          dar.proposedDocNumber,
          `ประกาศยกเลิกเอกสาร ${dar.proposedDocNumber} และย้ายเข้าคลังเก็บ`,
          `Obsoleted ${dar.proposedDocNumber} and moved to archive`
        );
      }

      showToast(
        lang === 'th'
          ? `ขึ้นทะเบียนและประกาศใช้ ${dar.proposedDocNumber} เรียบร้อยแล้ว`
          : `Published ${dar.proposedDocNumber} to Master Document List`
      );
    }
  };

  const handleRejectDar = (darId: string, comment: string) => {
    const dar = dars.find((d) => d.id === darId);
    if (!dar) return;
    const timestamp = formatNowTimestamp();
    const actorName = lang === 'th' ? currentUser.nameTh : currentUser.nameEn;

    setDars((prev) =>
      prev.map((item) =>
        item.id === darId
          ? {
              ...item,
              stage: 'Rejected',
              logs: [
                ...item.logs,
                {
                  stage: dar.stage,
                  actorName,
                  actorRole: currentUser.role,
                  action: 'Rejected',
                  comment: comment.trim() || 'ส่งกลับเพื่อปรับปรุงรายละเอียดเพิ่มเติม',
                  timestamp,
                },
              ],
            }
          : item
      )
    );
    appendAudit(
      'DAR_REJECTED',
      dar.darNumber,
      `ไม่อนุมัติคำขอ ${dar.darNumber} (${dar.proposedDocNumber})`,
      `Rejected ${dar.darNumber} (${dar.proposedDocNumber})`
    );
    showToast(
      lang === 'th' ? `ส่งกลับคำขอ ${dar.darNumber} แล้ว` : `Rejected ${dar.darNumber}`
    );
  };

  const handleAcknowledgeDoc = (docId: string, recipientName: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const timestamp = formatNowTimestamp();
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              distribution: d.distribution.map((r) =>
                r.recipientName === recipientName
                  ? { ...r, acknowledged: true, acknowledgedAt: timestamp }
                  : r
              ),
            }
          : d
      )
    );
    appendAudit(
      'DOC_ACKNOWLEDGED',
      doc.docNumber,
      `ลงนามรับทราบเอกสาร ${doc.docNumber} Rev.${doc.revision} (${recipientName})`,
      `Acknowledged ${doc.docNumber} Rev.${doc.revision} (${recipientName})`
    );
    showToast(
      lang === 'th'
        ? `บันทึกการรับทราบเอกสาร ${doc.docNumber} แล้ว`
        : `Acknowledged ${doc.docNumber}`
    );
  };

  const handleAddDepartment = (dept: DepartmentInfo) => {
    setDepartments((prev) => [...prev, dept]);
    appendAudit(
      'DEPT_ADDED',
      dept.code,
      `เพิ่มรหัสหน่วยงาน ${dept.code} — ${dept.nameTh}`,
      `Registered department ${dept.code} — ${dept.nameEn}`
    );
    showToast(
      lang === 'th' ? `เพิ่มรหัสหน่วยงาน ${dept.code} แล้ว` : `Added department ${dept.code}`
    );
  };

  const handleUpsertFishbone = (fb: DepartmentKpiFishbone) => {
    setFishbones((prev) => {
      const exists = prev.some((item) => item.id === fb.id);
      return exists ? prev.map((item) => (item.id === fb.id ? fb : item)) : [fb, ...prev];
    });
    appendAudit(
      'KPI_FISHBONE_UPDATED',
      `${fb.department}-KPI`,
      `บันทึก/อัปเดตข้อมูล KPI ก้างปลาแผนก ${fb.department} (${fb.period})`,
      `Updated ${fb.department} Fishbone KPI (${fb.period})`
    );
    showToast(
      lang === 'th'
        ? `บันทึกข้อมูล KPI ก้างปลาแผนก ${fb.department} เรียบร้อยแล้ว`
        : `Saved ${fb.department} Fishbone KPI`
    );
  };

  const handleAddUser = (user: UserProfile) => {
    setUsers((prev) => [...prev, user]);
    appendAudit(
      'USER_ADDED',
      user.username,
      `สร้างบัญชีผู้ใช้ใหม่ @${user.username} (${user.department} · ${user.role})`,
      `Created user account @${user.username} (${user.department} · ${user.role})`
    );
    showToast(
      lang === 'th'
        ? `สร้างบัญชีผู้ใช้ @${user.username} เรียบร้อยแล้ว`
        : `Created account @${user.username}`
    );
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setAuthenticatedUserId(user.id);
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}`,
      timestamp: formatNowTimestamp(),
      actorName: lang === 'th' ? user.nameTh : user.nameEn,
      actorRole: user.role,
      action: 'USER_LOGIN',
      targetCode: user.username,
      detailTh: `เข้าสู่ระบบสำเร็จ (@${user.username})`,
      detailEn: `Signed in (@${user.username})`,
    };
    setAuditEvents((prev) => [newEvent, ...prev]);
  };

  const handleLogout = () => {
    appendAudit(
      'USER_LOGOUT',
      currentUser.username,
      `ออกจากระบบ (@${currentUser.username})`,
      `Signed out (@${currentUser.username})`
    );
    setAuthenticatedUserId(null);
  };

  const handleResetDemoData = () => {
    setDocuments(SEED_DOCUMENTS);
    setDars(SEED_DARS);
    setDepartments(SEED_DEPARTMENTS);
    setAuditEvents(SEED_AUDIT_EVENTS);
    setFishbones(SEED_FISHBONES);
    setUsers(SEED_USERS);
    setKpiTargets(DEFAULT_KPI_TARGETS);
    localStorage.removeItem(STORAGE_KEY);
    showToast(
      lang === 'th' ? 'รีเซ็ตข้อมูลเริ่มต้นทั้งหมดเรียบร้อยแล้ว' : 'Demo data restored'
    );
  };

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) ?? null,
    [documents, selectedDocId]
  );

  const sectionTitle = useMemo(() => {
    const map: Record<NavSection, string> = {
      overview: t(lang, 'navOverview'),
      kpi: t(lang, 'navKpi'),
      'master-list': t(lang, 'navMasterList'),
      'dar-workflow': t(lang, 'navDarWorkflow'),
      archive: t(lang, 'navArchive'),
      'audit-trail': t(lang, 'navAuditTrail'),
      settings: t(lang, 'navSettings'),
    };
    return map[activeNav];
  }, [activeNav, lang]);

  if (!authenticatedUserId) {
    return (
      <LoginScreen
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'th' ? 'en' : 'th'))}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((prev) => !prev)}
        users={users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'th' ? 'en' : 'th'))}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((prev) => !prev)}
        currentUser={currentUser}
        users={users}
        onSwitchUser={setAuthenticatedUserId}
        onLogout={handleLogout}
        counts={counts}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 Primary CTA on right */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-6 sticky top-0 z-30 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {t(lang, 'brandName')}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
              <h1 className="font-semibold text-slate-900 dark:text-white truncate">
                {sectionTitle}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDarModalState({ isOpen: true, darType: 'New Issue' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>{t(lang, 'newDarButton')}</span>
          </button>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeNav === 'overview' && (
            <OverviewView
              lang={lang}
              documents={documents}
              dars={dars}
              departments={departments}
              auditEvents={auditEvents}
              todayStr={TODAY_STR}
              kpiTargets={kpiTargets}
              onNavigate={setActiveNav}
              onOpenDocument={(id) => setSelectedDocId(id)}
              onOpenDarQueue={() => setActiveNav('dar-workflow')}
            />
          )}

          {activeNav === 'kpi' && (
            <KpiView
              lang={lang}
              documents={documents}
              dars={dars}
              departments={departments}
              fishbones={fishbones}
              todayStr={TODAY_STR}
              targets={kpiTargets}
              currentUser={currentUser}
              onUpdateTargets={setKpiTargets}
              onUpsertFishbone={handleUpsertFishbone}
              onNavigate={setActiveNav}
              onOpenDocumentByNumber={(docNumber) => {
                const found = documents.find((d) => d.docNumber === docNumber);
                if (found) setSelectedDocId(found.id);
              }}
            />
          )}

          {activeNav === 'master-list' && (
            <MasterListView
              lang={lang}
              documents={documents}
              departments={departments}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              onOpenDocument={(id) => setSelectedDocId(id)}
              onCreateNewDar={() =>
                setDarModalState({ isOpen: true, darType: 'New Issue' })
              }
            />
          )}

          {activeNav === 'dar-workflow' && (
            <DarWorkflowView
              lang={lang}
              dars={dars}
              currentUser={currentUser}
              onAdvanceDar={handleAdvanceDar}
              onRejectDar={handleRejectDar}
              onCreateNewDar={() =>
                setDarModalState({ isOpen: true, darType: 'New Issue' })
              }
              onOpenDocumentByNumber={(docNumber) => {
                const found = documents.find((d) => d.docNumber === docNumber);
                if (found) setSelectedDocId(found.id);
              }}
            />
          )}

          {activeNav === 'archive' && (
            <ArchiveView
              lang={lang}
              documents={documents}
              onOpenDocument={(id) => setSelectedDocId(id)}
            />
          )}

          {activeNav === 'audit-trail' && (
            <AuditTrailView lang={lang} events={auditEvents} />
          )}

          {activeNav === 'settings' && (
            <SettingsView
              lang={lang}
              departments={departments}
              users={users}
              currentUser={currentUser}
              onAddDepartment={handleAddDepartment}
              onAddUser={handleAddUser}
              onSwitchUser={setAuthenticatedUserId}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>

      {/* Document Control Dossier Slide-Over */}
      <DocumentDossierDrawer
        lang={lang}
        doc={selectedDoc}
        currentUser={currentUser}
        onClose={() => setSelectedDocId(null)}
        onRequestRevision={(doc) => {
          setSelectedDocId(null);
          setDarModalState({ isOpen: true, darType: 'Revision', targetDoc: doc });
        }}
        onRequestObsolete={(doc) => {
          setSelectedDocId(null);
          setDarModalState({ isOpen: true, darType: 'Obsolete', targetDoc: doc });
        }}
        onAcknowledgeDoc={handleAcknowledgeDoc}
      />

      {/* Create DAR Modal */}
      <CreateDarModal
        lang={lang}
        isOpen={darModalState.isOpen}
        initialMode={{
          darType: darModalState.darType,
          targetDoc: darModalState.targetDoc,
        }}
        documents={documents}
        departments={departments}
        currentUser={currentUser}
        onClose={() => setDarModalState({ isOpen: false, darType: 'New Issue' })}
        onSubmitDar={handleSubmitDar}
      />

      {/* Unobtrusive Action Confirmation Toast */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium shadow-lg border border-slate-700 max-w-md no-print"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
