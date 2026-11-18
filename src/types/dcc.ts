export type Language = 'th' | 'en';

export type DocType = string;

export interface DocTypeDefinition {
  code: string;
  nameTh: string;
  nameEn: string;
}

export interface DocCodeConfig {
  pattern: string;
  prefix: string;
  seqDigits: number;
  docTypes: DocTypeDefinition[];
}

export type DocStatus = 'Active' | 'Pending Review' | 'Draft' | 'Obsolete';

export type DarType = 'New Issue' | 'Revision' | 'Obsolete';

export type DarStage =
  | 'Pending Reviewer'
  | 'Pending QMR'
  | 'Pending DCC Publish'
  | 'Published'
  | 'Rejected';

export type UserRole = string;

export type DarPermission = 'none' | 'review' | 'qmr' | 'publish';

export interface RoleDefinition {
  id: string;
  name: string;
  department: string; // 'ALL' for cross-department Admin/QMR, or department code e.g. 'QA'
  darPermission: DarPermission;
  isSystem?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  password: string;
  isAdmin?: boolean;
  roleId?: string;
  nameTh: string;
  nameEn: string;
  role: UserRole;
  department: string;
  titleTh: string;
  titleEn: string;
  email: string;
  avatarUrl?: string;
}

export type FishboneCategory =
  | 'Man'
  | 'Machine'
  | 'Method'
  | 'Material'
  | 'Measurement'
  | 'Environment';

export interface FishboneFactor {
  id: string;
  category: FishboneCategory;
  titleTh: string;
  titleEn: string;
  metricLabel: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  direction: 'higher-better' | 'lower-better';
  ownerName: string;
  linkedDocNumber?: string;
  actionPlan?: string;
}

export interface KaizenImmediateAction {
  id: string;
  problemFound: string;
  responsible: string;
  immediateAction: string;
  dueDate: string;
}

export interface KaizenPreventiveAction {
  id: string;
  longTermPlan: string;
  responsible: string;
  dueDate: string;
  remark: string;
}

export interface DepartmentKpiFishbone {
  id: string;
  department: string;
  period: string;
  mainKpiTitleTh: string;
  mainKpiTitleEn: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  direction: 'higher-better' | 'lower-better';
  ownerName: string;
  updatedAt: string;
  factors: FishboneFactor[];
  kpiCode?: string;
  monthLabel?: string;
  yearLabel?: string;
  prevYearAvg?: number;
  monthlyActuals?: (number | null)[];
  immediateActions?: KaizenImmediateAction[];
  preventiveActions?: KaizenPreventiveAction[];
}

export interface DepartmentInfo {
  code: string;
  nameTh: string;
  nameEn: string;
  headName: string;
}

export interface RevisionEntry {
  revision: string;
  date: string;
  darNumber: string;
  summaryTh: string;
  summaryEn: string;
  authorName: string;
  approverName: string;
}

export interface DistributionRecipient {
  department: string;
  recipientName: string;
  roleTitle: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface DocumentContent {
  objectiveTh: string;
  objectiveEn: string;
  scopeTh: string;
  scopeEn: string;
  responsibilitiesTh: string;
  responsibilitiesEn: string;
  procedureStepsTh: string[];
  procedureStepsEn: string[];
  references: string[];
  attachmentName?: string;
  attachmentType?: string;
  attachmentDataUrl?: string;
  attachmentTextPreview?: string;
}

export interface ControlledDocument {
  id: string;
  docNumber: string;
  titleTh: string;
  titleEn: string;
  type: DocType;
  department: string;
  revision: string;
  status: DocStatus;
  effectiveDate: string;
  nextReviewDate: string;
  ownerName: string;
  confidentiality: 'Internal' | 'Restricted' | 'Public';
  isoClause: string;
  retentionYears: number;
  obsoleteReason?: string;
  obsoleteDate?: string;
  content: DocumentContent;
  revisionHistory: RevisionEntry[];
  distribution: DistributionRecipient[];
}

export interface DarStepLog {
  stage: string;
  actorName: string;
  actorRole: string;
  action: 'Submitted' | 'Approved' | 'Rejected' | 'Published';
  comment: string;
  timestamp: string;
}

export interface DocumentActionRequest {
  id: string;
  darNumber: string;
  darType: DarType;
  targetDocId?: string;
  proposedDocNumber: string;
  proposedTitleTh: string;
  proposedTitleEn: string;
  docType: DocType;
  department: string;
  currentRevision: string;
  proposedRevision: string;
  reasonTh: string;
  reasonEn: string;
  requesterName: string;
  requesterDept: string;
  requestedAt: string;
  stage: DarStage;
  isoClause: string;
  proposedContent?: DocumentContent;
  logs: DarStepLog[];
}

export type AuditActionType =
  | 'DAR_SUBMITTED'
  | 'DAR_APPROVED'
  | 'DAR_REJECTED'
  | 'DOC_PUBLISHED'
  | 'DOC_REVIEWED'
  | 'DOC_ACKNOWLEDGED'
  | 'DOC_OBSOLETED'
  | 'DEPT_ADDED'
  | 'DEPT_UPDATED'
  | 'DEPT_DELETED'
  | 'DOC_SCHEMA_UPDATED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_ADDED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ROLE_ADDED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'KPI_FISHBONE_UPDATED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditActionType;
  targetCode: string;
  detailTh: string;
  detailEn: string;
}

export interface KpiTargets {
  onTimeReviewPct: number;
  ackRatePct: number;
  firstPassPct: number;
  darSlaDays: number;
}

export type NavSection =
  | 'overview'
  | 'kpi'
  | 'master-list'
  | 'dar-workflow'
  | 'archive'
  | 'audit-trail'
  | 'settings';

export interface DbConnectionInfo {
  driver: 'cloudflare-d1' | 'local-sqlite';
  connected: boolean;
  databaseName: string;
  databaseIdMasked: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  counts: {
    departments: number;
    roles: number;
    users: number;
    documents: number;
    dars: number;
    fishbones: number;
    auditEvents: number;
  };
}

