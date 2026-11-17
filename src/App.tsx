/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus2, Menu } from 'lucide-react';
import {
  AuditActionType,
  AuditEvent,
  ControlledDocument,
  DarType,
  DbConnectionInfo,
  DepartmentInfo,
  DepartmentKpiFishbone,
  DocumentActionRequest,
  KpiTargets,
  Language,
  NavSection,
  RoleDefinition,
  UserProfile,
} from './types/dcc';
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
  roles?: RoleDefinition[];
  kpiTargets?: KpiTargets;
  authenticatedUserId: string | null;
  lang: Language;
  darkMode: boolean;
}

const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr-dcc',
  username: 'dcc',
  password: 'dcl0gin',
  isAdmin: true,
  roleId: 'role-dcc-admin',
  nameTh: 'Admin DCC',
  nameEn: 'Admin DCC',
  role: 'Document Controller',
  department: 'QA',
  titleTh: 'ผู้ดูแลระบบและควบคุมเอกสารกลาง (Admin / DCC)',
  titleEn: 'System Admin & Lead Document Controller',
  email: 'dcc.admin@enterprise-dcc.co.th',
  avatarUrl: '/src/assets/images/avatar_doc_controller_1794897226157.jpg',
};

const DEFAULT_DEPARTMENTS: DepartmentInfo[] = [
  { code: 'QA', nameTh: 'ประกันคุณภาพ', nameEn: 'Quality Assurance', headName: 'Admin DCC' },
  { code: 'PD', nameTh: 'ฝ่ายผลิต', nameEn: 'Production', headName: 'หัวหน้าฝ่ายผลิต' },
  { code: 'EN', nameTh: 'วิศวกรรมและซ่อมบำรุง', nameEn: 'Engineering & Maintenance', headName: 'หัวหน้าฝ่ายวิศวกรรม' },
  { code: 'WH', nameTh: 'คลังสินค้าและจัดส่ง', nameEn: 'Warehouse & Logistics', headName: 'หัวหน้าฝ่ายคลังสินค้า' },
  { code: 'HR', nameTh: 'ทรัพยากรบุคคล', nameEn: 'Human Resources', headName: 'หัวหน้าฝ่ายบุคคล' },
  { code: 'IT', nameTh: 'เทคโนโลยีสารสนเทศ', nameEn: 'Information Technology', headName: 'หัวหน้าฝ่ายไอที' },
  { code: 'PU', nameTh: 'จัดซื้อ', nameEn: 'Purchasing', headName: 'หัวหน้าฝ่ายจัดซื้อ' },
];

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-dcc-admin',
    name: 'Document Controller',
    department: 'ALL',
    darPermission: 'publish',
    isSystem: true,
  },
  {
    id: 'role-qmr-all',
    name: 'QMR / Approver',
    department: 'ALL',
    darPermission: 'qmr',
  },
  ...DEFAULT_DEPARTMENTS.map((d) => ({
    id: `role-${d.code.toLowerCase()}-reviewer`,
    name: `ผู้รับผิดชอบ KPI แผนก ${d.code}`,
    department: d.code,
    darPermission: 'review' as const,
  })),
];

function getInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.documents && parsed.dars && parsed.departments && parsed.auditEvents) {
        return {
          documents: parsed.documents,
          dars: parsed.dars,
          departments: parsed.departments.length > 0 ? parsed.departments : DEFAULT_DEPARTMENTS,
          auditEvents: parsed.auditEvents,
          fishbones: parsed.fishbones ?? [],
          users: parsed.users && parsed.users.length > 0 ? parsed.users : [DEFAULT_ADMIN_USER],
          roles: parsed.roles && parsed.roles.length > 0 ? parsed.roles : DEFAULT_ROLES,
          kpiTargets: parsed.kpiTargets ?? DEFAULT_KPI_TARGETS,
          authenticatedUserId:
            parsed.authenticatedUserId !== undefined ? parsed.authenticatedUserId : null,
          lang: parsed.lang ?? 'th',
          darkMode: parsed.darkMode ?? false,
        };
      }
    }
  } catch {
    // Fallback to clean initial state if storage is unavailable or corrupted
  }
  return {
    documents: [],
    dars: [],
    departments: DEFAULT_DEPARTMENTS,
    auditEvents: [],
    fishbones: [],
    users: [DEFAULT_ADMIN_USER],
    roles: DEFAULT_ROLES,
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
  const [roles, setRoles] = useState<RoleDefinition[]>(initial.roles ?? DEFAULT_ROLES);
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
  const [dbInfo, setDbInfo] = useState<DbConnectionInfo | null>(null);
  const [dbBusy, setDbBusy] = useState(false);
  const dbHydratedRef = useRef(false);
  const skipNextSyncRef = useRef(false);

  const currentUser: UserProfile = useMemo(
    () => users.find((u) => u.id === authenticatedUserId) ?? users[0],
    [users, authenticatedUserId]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Initial load from Cloudflare D1 / SQLite backend
  useEffect(() => {
    let cancelled = false;
    async function hydrateFromD1() {
      try {
        const res = await fetch('/api/dcc/state');
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          empty: boolean;
          state: {
            documents: ControlledDocument[];
            dars: DocumentActionRequest[];
            departments: DepartmentInfo[];
            auditEvents: AuditEvent[];
            fishbones: DepartmentKpiFishbone[];
            users: UserProfile[];
            roles?: RoleDefinition[];
            kpiTargets: KpiTargets;
          } | null;
          dbInfo?: DbConnectionInfo;
        };
        if (cancelled) return;
        if (data.dbInfo) setDbInfo(data.dbInfo);

        if (!data.empty && data.state) {
          skipNextSyncRef.current = true;
          setDocuments(data.state.documents);
          setDars(data.state.dars);
          setDepartments(data.state.departments);
          setAuditEvents(data.state.auditEvents);
          setFishbones(data.state.fishbones);
          setUsers(data.state.users);
          if (data.state.roles && data.state.roles.length > 0) {
            setRoles(data.state.roles);
          }
          setKpiTargets(data.state.kpiTargets);
        } else {
          // Database is empty: seed it immediately with current initial state
          const syncRes = await fetch('/api/dcc/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              state: {
                documents,
                dars,
                departments,
                auditEvents,
                fishbones,
                users,
                roles,
                kpiTargets,
              },
              replaceAll: false,
            }),
          });
          if (syncRes.ok) {
            const syncJson = (await syncRes.json()) as { dbInfo?: DbConnectionInfo };
            if (!cancelled && syncJson.dbInfo) setDbInfo(syncJson.dbInfo);
          }
        }
      } catch {
        // Keep localStorage cache working if server is momentarily unavailable
      } finally {
        if (!cancelled) dbHydratedRef.current = true;
      }
    }
    hydrateFromD1();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist locally + sync mutations to Cloudflare D1 / SQLite backend
  useEffect(() => {
    try {
      const payload: PersistedState = {
        documents,
        dars,
        departments,
        auditEvents,
        fishbones,
        users,
        roles,
        kpiTargets,
        authenticatedUserId,
        lang,
        darkMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota overflow gracefully
    }

    if (!dbHydratedRef.current) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/dcc/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: {
              documents,
              dars,
              departments,
              auditEvents,
              fishbones,
              users,
              roles,
              kpiTargets,
            },
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { dbInfo?: DbConnectionInfo };
          if (json.dbInfo) setDbInfo(json.dbInfo);
        }
      } catch {
        // Silent retry on next mutation or manual sync
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    documents,
    dars,
    departments,
    auditEvents,
    fishbones,
    users,
    roles,
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

  const handleAddRole = (role: RoleDefinition) => {
    setRoles((prev) => [...prev, role]);
    appendAudit(
      'ROLE_ADDED',
      role.department,
      `เพิ่ม Role ใหม่ "${role.name}" สำหรับแผนก ${role.department}`,
      `Created Role "${role.name}" for department ${role.department}`
    );
    showToast(
      lang === 'th'
        ? `เพิ่ม Role "${role.name}" (${role.department}) เรียบร้อยแล้ว`
        : `Created role "${role.name}"`
    );
  };

  const handleUpdateRole = (updatedRole: RoleDefinition) => {
    setRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)));
    // Keep assigned users aligned with updated Role name and Department
    setUsers((prev) =>
      prev.map((u) => {
        if (u.roleId === updatedRole.id) {
          const nextDept =
            updatedRole.department !== 'ALL' ? updatedRole.department : u.department;
          return {
            ...u,
            role: updatedRole.name,
            department: nextDept,
            titleTh: `${updatedRole.name} (${nextDept})`,
            titleEn: `${updatedRole.name} (${nextDept})`,
          };
        }
        return u;
      })
    );
    appendAudit(
      'ROLE_UPDATED',
      updatedRole.department,
      `แก้ไข Role "${updatedRole.name}" (แผนก ${updatedRole.department})`,
      `Updated Role "${updatedRole.name}" (${updatedRole.department})`
    );
    showToast(
      lang === 'th'
        ? `อัปเดต Role "${updatedRole.name}" เรียบร้อยแล้ว`
        : `Updated role "${updatedRole.name}"`
    );
  };

  const handleDeleteRole = (roleId: string) => {
    const target = roles.find((r) => r.id === roleId);
    if (!target || target.isSystem) return;
    const inUse = users.some(
      (u) =>
        u.roleId === roleId ||
        (u.role === target.name &&
          (target.department === 'ALL' || u.department === target.department))
    );
    if (inUse) {
      showToast(
        lang === 'th'
          ? `ไม่สามารถลบ Role "${target.name}" ได้ เนื่องจากยังมีผู้ใช้งาน Role นี้อยู่`
          : `Cannot delete role "${target.name}" while assigned to users`
      );
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    appendAudit(
      'ROLE_DELETED',
      target.department,
      `ลบ Role "${target.name}" (แผนก ${target.department})`,
      `Deleted Role "${target.name}" (${target.department})`
    );
    showToast(
      lang === 'th'
        ? `ลบ Role "${target.name}" เรียบร้อยแล้ว`
        : `Deleted role "${target.name}"`
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

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    appendAudit(
      'USER_UPDATED',
      updatedUser.username,
      `แก้ไขบัญชีผู้ใช้ @${updatedUser.username} (${updatedUser.department} · ${updatedUser.role})`,
      `Updated user account @${updatedUser.username} (${updatedUser.department} · ${updatedUser.role})`
    );
    showToast(
      lang === 'th'
        ? `บันทึกการแก้ไขบัญชี @${updatedUser.username} แล้ว`
        : `Updated account @${updatedUser.username}`
    );
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.id === 'usr-dcc' || target.username.toLowerCase() === 'dcc') {
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (authenticatedUserId === userId) {
      setAuthenticatedUserId('usr-dcc');
    }
    appendAudit(
      'USER_DELETED',
      target.username,
      `ลบบัญชีผู้ใช้ @${target.username} (${target.department} · ${target.role})`,
      `Deleted user account @${target.username} (${target.department} · ${target.role})`
    );
    showToast(
      lang === 'th'
        ? `ลบบัญชีผู้ใช้ @${target.username} เรียบร้อยแล้ว`
        : `Deleted account @${target.username}`
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

  const handleResetDemoData = async () => {
    skipNextSyncRef.current = true;
    setDocuments([]);
    setDars([]);
    setDepartments(DEFAULT_DEPARTMENTS);
    setAuditEvents([]);
    setFishbones([]);
    setUsers([DEFAULT_ADMIN_USER]);
    setRoles(DEFAULT_ROLES);
    setKpiTargets(DEFAULT_KPI_TARGETS);
    localStorage.removeItem(STORAGE_KEY);
    setDbBusy(true);
    try {
      const res = await fetch('/api/dcc/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: {
            documents: [],
            dars: [],
            departments: DEFAULT_DEPARTMENTS,
            auditEvents: [],
            fishbones: [],
            users: [DEFAULT_ADMIN_USER],
            roles: DEFAULT_ROLES,
            kpiTargets: DEFAULT_KPI_TARGETS,
          },
          replaceAll: true,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { dbInfo?: DbConnectionInfo };
        if (json.dbInfo) setDbInfo(json.dbInfo);
      }
    } finally {
      setDbBusy(false);
    }
    showToast(
      lang === 'th' ? 'ล้างข้อมูลและรีเซ็ตกลับสู่ค่าเริ่มต้นเรียบร้อยแล้ว' : 'Workspace reset to defaults'
    );
  };

  const handleSyncDatabase = async () => {
    setDbBusy(true);
    try {
      const res = await fetch('/api/d1/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: {
            documents,
            dars,
            departments,
            auditEvents,
            fishbones,
            users,
            roles,
            kpiTargets,
          },
        }),
      });
      const json = (await res.json()) as { ok: boolean; dbInfo?: DbConnectionInfo; error?: string };
      if (json.dbInfo) setDbInfo(json.dbInfo);
      if (!res.ok || !json.ok) {
        showToast(json.error || (lang === 'th' ? 'ไม่สามารถซิงค์ฐานข้อมูล D1 ได้' : 'D1 sync failed'));
        return;
      }
      showToast(
        lang === 'th'
          ? 'สร้างตารางและซิงค์ข้อมูลเข้าสู่ฐานข้อมูล D1 เรียบร้อยแล้ว'
          : 'Initialized schema & synced data to D1'
      );
    } catch {
      showToast(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ D1' : 'D1 connection error');
    } finally {
      setDbBusy(false);
    }
  };

  const handlePullDatabase = async () => {
    setDbBusy(true);
    try {
      const res = await fetch('/api/dcc/state');
      const json = (await res.json()) as {
        ok: boolean;
        empty: boolean;
        state: {
          documents: ControlledDocument[];
          dars: DocumentActionRequest[];
          departments: DepartmentInfo[];
          auditEvents: AuditEvent[];
          fishbones: DepartmentKpiFishbone[];
          users: UserProfile[];
          roles?: RoleDefinition[];
          kpiTargets: KpiTargets;
        } | null;
        dbInfo?: DbConnectionInfo;
        error?: string;
      };
      if (json.dbInfo) setDbInfo(json.dbInfo);
      if (!res.ok || !json.ok) {
        showToast(json.error || (lang === 'th' ? 'โหลดข้อมูลจาก D1 ไม่สำเร็จ' : 'Failed to pull from D1'));
        return;
      }
      if (!json.empty && json.state) {
        skipNextSyncRef.current = true;
        setDocuments(json.state.documents);
        setDars(json.state.dars);
        setDepartments(json.state.departments);
        setAuditEvents(json.state.auditEvents);
        setFishbones(json.state.fishbones);
        setUsers(json.state.users);
        if (json.state.roles && json.state.roles.length > 0) {
          setRoles(json.state.roles);
        }
        setKpiTargets(json.state.kpiTargets);
        showToast(
          lang === 'th' ? 'โหลดข้อมูลล่าสุดจากฐานข้อมูล D1 แล้ว' : 'Pulled latest state from D1'
        );
      } else {
        showToast(
          lang === 'th' ? 'ฐานข้อมูล D1 ยังว่างอยู่ กรุณากดซิงค์ข้อมูลก่อน' : 'D1 database is empty'
        );
      }
    } catch {
      showToast(lang === 'th' ? 'เกิดข้อผิดพลาดในการโหลดข้อมูลจาก D1' : 'D1 pull error');
    } finally {
      setDbBusy(false);
    }
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
              roles={roles}
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
              roles={roles}
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
              roles={roles}
              users={users}
              currentUser={currentUser}
              dbInfo={dbInfo}
              dbBusy={dbBusy}
              onAddDepartment={handleAddDepartment}
              onAddRole={handleAddRole}
              onUpdateRole={handleUpdateRole}
              onDeleteRole={handleDeleteRole}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onSwitchUser={setAuthenticatedUserId}
              onResetDemoData={handleResetDemoData}
              onSyncDatabase={handleSyncDatabase}
              onPullDatabase={handlePullDatabase}
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
