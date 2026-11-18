import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type {
  AuditEvent,
  ControlledDocument,
  DbConnectionInfo,
  DepartmentInfo,
  DepartmentKpiFishbone,
  DocumentActionRequest,
  KpiTargets,
  RoleDefinition,
  UserProfile,
} from '../src/types/dcc.ts';

export interface DccPersistedPayload {
  documents: ControlledDocument[];
  dars: DocumentActionRequest[];
  departments: DepartmentInfo[];
  auditEvents: AuditEvent[];
  fishbones: DepartmentKpiFishbone[];
  users: UserProfile[];
  roles?: RoleDefinition[];
  kpiTargets: KpiTargets;
}

type SqlParam = string | number | null;

interface D1RestResult<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  meta?: Record<string, unknown>;
}

interface D1RestResponse<T = Record<string, unknown>> {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
  result?: D1RestResult<T>[];
}

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS dcc_departments (
    code TEXT PRIMARY KEY,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    head_name TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    dar_permission TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name_th TEXT NOT NULL,
    name_en TEXT NOT NULL,
    role TEXT NOT NULL,
    role_id TEXT,
    department TEXT NOT NULL,
    title_th TEXT NOT NULL,
    title_en TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_documents (
    id TEXT PRIMARY KEY,
    doc_number TEXT NOT NULL UNIQUE,
    title_th TEXT NOT NULL,
    title_en TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    department TEXT NOT NULL,
    revision TEXT NOT NULL,
    status TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    next_review_date TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    confidentiality TEXT NOT NULL,
    iso_clause TEXT NOT NULL,
    retention_years INTEGER NOT NULL,
    obsolete_reason TEXT,
    obsolete_date TEXT,
    content_json TEXT NOT NULL,
    revision_history_json TEXT NOT NULL,
    distribution_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_dars (
    id TEXT PRIMARY KEY,
    dar_number TEXT NOT NULL UNIQUE,
    dar_type TEXT NOT NULL,
    target_doc_id TEXT,
    proposed_doc_number TEXT NOT NULL,
    proposed_title_th TEXT NOT NULL,
    proposed_title_en TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    department TEXT NOT NULL,
    current_revision TEXT NOT NULL,
    proposed_revision TEXT NOT NULL,
    reason_th TEXT NOT NULL,
    reason_en TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_dept TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    stage TEXT NOT NULL,
    iso_clause TEXT NOT NULL,
    proposed_content_json TEXT,
    logs_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_fishbones (
    id TEXT PRIMARY KEY,
    department TEXT NOT NULL,
    period TEXT NOT NULL,
    main_kpi_title_th TEXT NOT NULL,
    main_kpi_title_en TEXT NOT NULL,
    target_value REAL NOT NULL,
    actual_value REAL NOT NULL,
    unit TEXT NOT NULL,
    direction TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    factors_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_audit_events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_code TEXT NOT NULL,
    detail_th TEXT NOT NULL,
    detail_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dcc_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dcc_documents_dept ON dcc_documents(department)`,
  `CREATE INDEX IF NOT EXISTS idx_dcc_documents_status ON dcc_documents(status)`,
  `CREATE INDEX IF NOT EXISTS idx_dcc_dars_stage ON dcc_dars(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_dcc_fishbones_dept ON dcc_fishbones(department)`,
  `CREATE INDEX IF NOT EXISTS idx_dcc_audit_timestamp ON dcc_audit_events(timestamp)`,
];

function maskId(id: string | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (trimmed.length <= 10) return `${trimmed.slice(0, 3)}***`;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function hashValue(val: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(val)).digest('hex');
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class D1DatabaseClient {
  private localDb: DatabaseSync | null = null;
  private schemaReady = false;
  private lastError: string | null = null;
  private lastSyncedAt: string | null = null;
  private rowHashCache = new Map<string, Map<string, string>>();

  private get accountId(): string {
    return (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  }

  private get databaseId(): string {
    return (process.env.CLOUDFLARE_D1_DATABASE_ID || '').trim();
  }

  private get apiToken(): string {
    return (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  }

  private get databaseName(): string {
    return (process.env.CLOUDFLARE_D1_DATABASE_NAME || 'dcc-sqlite-db').trim();
  }

  public isCloudflareConfigured(): boolean {
    return Boolean(this.accountId && this.databaseId && this.apiToken);
  }

  private async getLocalDb(): Promise<DatabaseSync> {
    if (!this.localDb) {
      const { DatabaseSync: SqliteDatabaseSync } = await import('node:sqlite');
      const dataDir = process.env.VERCEL
        ? path.resolve('/tmp', 'dcc-data')
        : path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'dcc.sqlite');
      this.localDb = new SqliteDatabaseSync(dbPath);
      this.localDb.exec('PRAGMA journal_mode = WAL;');
    }
    return this.localDb;
  }

  public async query<T = Record<string, unknown>>(
    sql: string,
    params: SqlParam[] = []
  ): Promise<T[]> {
    if (this.isCloudflareConfigured()) {
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
        this.accountId
      )}/d1/database/${encodeURIComponent(this.databaseId)}/query`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
      });

      const body = (await res.json()) as D1RestResponse<T>;
      if (!res.ok || !body.success) {
        const msg =
          body.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
          `Cloudflare D1 HTTP ${res.status}`;
        this.lastError = msg;
        throw new Error(msg);
      }

      this.lastError = null;
      const firstResult = body.result?.[0];
      return firstResult?.results ?? [];
    }

    const db = await this.getLocalDb();
    const stmt = db.prepare(sql);
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA')) {
      return stmt.all(...params) as T[];
    }
    stmt.run(...params);
    this.lastError = null;
    return [];
  }

  private async runChunked<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 6) {
    for (let i = 0; i < items.length; i += concurrency) {
      const slice = items.slice(i, i + concurrency);
      await Promise.all(slice.map(worker));
    }
  }

  public async ensureSchema(force = false): Promise<void> {
    if (this.schemaReady && !force) return;
    for (const stmt of SCHEMA_STATEMENTS) {
      await this.query(stmt);
    }
    // Safe migration for pre-existing dcc_users tables missing role_id
    try {
      const cols = await this.query<{ name: string }>('PRAGMA table_info(dcc_users)');
      if (!cols.some((c) => c.name === 'role_id')) {
        await this.query('ALTER TABLE dcc_users ADD COLUMN role_id TEXT');
      }
    } catch {
      // Ignore if already migrated
    }
    this.schemaReady = true;
  }

  public async readState(): Promise<DccPersistedPayload | null> {
    await this.ensureSchema();

    const [deptRows, roleRows, userRows, docRows, darRows, fishboneRows, auditRows, settingRows] =
      await Promise.all([
        this.query<Record<string, unknown>>('SELECT * FROM dcc_departments ORDER BY code ASC'),
        this.query<Record<string, unknown>>('SELECT * FROM dcc_roles ORDER BY department ASC, name ASC'),
        this.query<Record<string, unknown>>('SELECT * FROM dcc_users ORDER BY id ASC'),
        this.query<Record<string, unknown>>('SELECT * FROM dcc_documents ORDER BY doc_number ASC'),
        this.query<Record<string, unknown>>('SELECT * FROM dcc_dars ORDER BY requested_at DESC'),
        this.query<Record<string, unknown>>('SELECT * FROM dcc_fishbones ORDER BY department ASC'),
        this.query<Record<string, unknown>>('SELECT * FROM dcc_audit_events ORDER BY timestamp DESC'),
        this.query<Record<string, unknown>>(
          'SELECT key, value_json FROM dcc_settings WHERE key = ?',
          ['kpi_targets']
        ),
      ]);

    if (deptRows.length === 0 && userRows.length === 0 && docRows.length === 0) {
      return null;
    }

    const departments: DepartmentInfo[] = deptRows.map((r) => ({
      code: String(r.code),
      nameTh: String(r.name_th),
      nameEn: String(r.name_en),
      headName: String(r.head_name),
    }));

    const roles: RoleDefinition[] = roleRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      department: String(r.department),
      darPermission: String(r.dar_permission) as RoleDefinition['darPermission'],
      isSystem: Number(r.is_system) === 1,
    }));

    const users: UserProfile[] = userRows.map((r) => ({
      id: String(r.id),
      username: String(r.username),
      password: String(r.password),
      nameTh: String(r.name_th),
      nameEn: String(r.name_en),
      role: String(r.role),
      roleId: r.role_id ? String(r.role_id) : undefined,
      department: String(r.department),
      titleTh: String(r.title_th),
      titleEn: String(r.title_en),
      email: String(r.email),
      avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
      isAdmin: Number(r.is_admin) === 1,
    }));

    const documents: ControlledDocument[] = docRows.map((r) => ({
      id: String(r.id),
      docNumber: String(r.doc_number),
      titleTh: String(r.title_th),
      titleEn: String(r.title_en),
      type: String(r.doc_type) as ControlledDocument['type'],
      department: String(r.department),
      revision: String(r.revision),
      status: String(r.status) as ControlledDocument['status'],
      effectiveDate: String(r.effective_date),
      nextReviewDate: String(r.next_review_date),
      ownerName: String(r.owner_name),
      confidentiality: String(r.confidentiality) as ControlledDocument['confidentiality'],
      isoClause: String(r.iso_clause),
      retentionYears: Number(r.retention_years ?? 5),
      obsoleteReason: r.obsolete_reason ? String(r.obsolete_reason) : undefined,
      obsoleteDate: r.obsolete_date ? String(r.obsolete_date) : undefined,
      content: safeJsonParse(r.content_json, {
        objectiveTh: '',
        objectiveEn: '',
        scopeTh: '',
        scopeEn: '',
        responsibilitiesTh: '',
        responsibilitiesEn: '',
        procedureStepsTh: [],
        procedureStepsEn: [],
        references: [],
      }),
      revisionHistory: safeJsonParse(r.revision_history_json, []),
      distribution: safeJsonParse(r.distribution_json, []),
    }));

    const dars: DocumentActionRequest[] = darRows.map((r) => ({
      id: String(r.id),
      darNumber: String(r.dar_number),
      darType: String(r.dar_type) as DocumentActionRequest['darType'],
      targetDocId: r.target_doc_id ? String(r.target_doc_id) : undefined,
      proposedDocNumber: String(r.proposed_doc_number),
      proposedTitleTh: String(r.proposed_title_th),
      proposedTitleEn: String(r.proposed_title_en),
      docType: String(r.doc_type) as DocumentActionRequest['docType'],
      department: String(r.department),
      currentRevision: String(r.current_revision),
      proposedRevision: String(r.proposed_revision),
      reasonTh: String(r.reason_th),
      reasonEn: String(r.reason_en),
      requesterName: String(r.requester_name),
      requesterDept: String(r.requester_dept),
      requestedAt: String(r.requested_at),
      stage: String(r.stage) as DocumentActionRequest['stage'],
      isoClause: String(r.iso_clause),
      proposedContent: r.proposed_content_json
        ? safeJsonParse(r.proposed_content_json, undefined)
        : undefined,
      logs: safeJsonParse(r.logs_json, []),
    }));

    const fishbones: DepartmentKpiFishbone[] = fishboneRows.map((r) => ({
      id: String(r.id),
      department: String(r.department),
      period: String(r.period),
      mainKpiTitleTh: String(r.main_kpi_title_th),
      mainKpiTitleEn: String(r.main_kpi_title_en),
      targetValue: Number(r.target_value),
      actualValue: Number(r.actual_value),
      unit: String(r.unit),
      direction: String(r.direction) as DepartmentKpiFishbone['direction'],
      ownerName: String(r.owner_name),
      updatedAt: String(r.updated_at),
      factors: safeJsonParse(r.factors_json, []),
    }));

    const auditEvents: AuditEvent[] = auditRows.map((r) => ({
      id: String(r.id),
      timestamp: String(r.timestamp),
      actorName: String(r.actor_name),
      actorRole: String(r.actor_role),
      action: String(r.action) as AuditEvent['action'],
      targetCode: String(r.target_code),
      detailTh: String(r.detail_th),
      detailEn: String(r.detail_en),
    }));

    const kpiTargets: KpiTargets =
      settingRows.length > 0
        ? safeJsonParse(settingRows[0].value_json, {
            onTimeReviewPct: 95,
            ackRatePct: 90,
            firstPassPct: 85,
            darSlaDays: 5,
          })
        : {
            onTimeReviewPct: 95,
            ackRatePct: 90,
            firstPassPct: 85,
            darSlaDays: 5,
          };

    const payload: DccPersistedPayload = {
      documents,
      dars,
      departments,
      auditEvents,
      fishbones,
      users,
      roles,
      kpiTargets,
    };

    this.primeCache(payload);
    return payload;
  }

  private primeCache(payload: DccPersistedPayload) {
    const cacheTable = <T>(table: string, items: T[], getId: (i: T) => string) => {
      const m = new Map<string, string>();
      for (const item of items) {
        m.set(getId(item), hashValue(item));
      }
      this.rowHashCache.set(table, m);
    };
    cacheTable('dcc_departments', payload.departments, (d) => d.code);
    cacheTable('dcc_roles', payload.roles ?? [], (r) => r.id);
    cacheTable('dcc_users', payload.users, (u) => u.id);
    cacheTable('dcc_documents', payload.documents, (d) => d.id);
    cacheTable('dcc_dars', payload.dars, (d) => d.id);
    cacheTable('dcc_fishbones', payload.fishbones, (f) => f.id);
    cacheTable('dcc_audit_events', payload.auditEvents, (a) => a.id);
    const settingsMap = new Map<string, string>();
    settingsMap.set('kpi_targets', hashValue(payload.kpiTargets));
    this.rowHashCache.set('dcc_settings', settingsMap);
  }

  public async syncState(
    payload: DccPersistedPayload,
    options: { replaceAll?: boolean } = {}
  ): Promise<void> {
    await this.ensureSchema();
    const nowIso = new Date().toISOString();
    const replaceAll = Boolean(options.replaceAll);

    if (replaceAll) {
      this.rowHashCache.clear();
      await Promise.all([
        this.query('DELETE FROM dcc_departments'),
        this.query('DELETE FROM dcc_roles'),
        this.query('DELETE FROM dcc_users'),
        this.query('DELETE FROM dcc_documents'),
        this.query('DELETE FROM dcc_dars'),
        this.query('DELETE FROM dcc_fishbones'),
        this.query('DELETE FROM dcc_audit_events'),
        this.query('DELETE FROM dcc_settings'),
      ]);
    }

    const getChanged = <T>(table: string, items: T[], getId: (item: T) => string): T[] => {
      const prevMap = this.rowHashCache.get(table) ?? new Map<string, string>();
      return items.filter((item) => prevMap.get(getId(item)) !== hashValue(item));
    };

    const getRemovedIds = <T>(table: string, items: T[], getId: (item: T) => string): string[] => {
      const prevMap = this.rowHashCache.get(table);
      if (!prevMap) return [];
      const currentIds = new Set(items.map(getId));
      return Array.from(prevMap.keys()).filter((id) => !currentIds.has(id));
    };

    // Remove deleted records from SQLite/D1
    if (!replaceAll) {
      const removedUsers = getRemovedIds('dcc_users', payload.users, (u) => u.id);
      await this.runChunked(removedUsers, async (id) => {
        await this.query('DELETE FROM dcc_users WHERE id = ?', [id]);
      });

      const removedRoles = getRemovedIds('dcc_roles', payload.roles ?? [], (r) => r.id);
      await this.runChunked(removedRoles, async (id) => {
        await this.query('DELETE FROM dcc_roles WHERE id = ?', [id]);
      });

      const removedDepts = getRemovedIds('dcc_departments', payload.departments, (d) => d.code);
      await this.runChunked(removedDepts, async (code) => {
        await this.query('DELETE FROM dcc_departments WHERE code = ?', [code]);
      });

      const removedFishbones = getRemovedIds('dcc_fishbones', payload.fishbones, (f) => f.id);
      await this.runChunked(removedFishbones, async (id) => {
        await this.query('DELETE FROM dcc_fishbones WHERE id = ?', [id]);
      });
    }

    const deptsToSync = getChanged('dcc_departments', payload.departments, (d) => d.code);
    await this.runChunked(deptsToSync, async (dept) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_departments (code, name_th, name_en, head_name, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [dept.code, dept.nameTh, dept.nameEn, dept.headName, nowIso]
      );
    });

    const rolesToSync = getChanged('dcc_roles', payload.roles ?? [], (r) => r.id);
    await this.runChunked(rolesToSync, async (role) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_roles (id, name, department, dar_permission, is_system, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [role.id, role.name, role.department, role.darPermission, role.isSystem ? 1 : 0, nowIso]
      );
    });

    const usersToSync = getChanged('dcc_users', payload.users, (u) => u.id);
    await this.runChunked(usersToSync, async (user) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_users
         (id, username, password, name_th, name_en, role, role_id, department, title_th, title_en, email, avatar_url, is_admin, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username,
          user.password,
          user.nameTh,
          user.nameEn,
          user.role,
          user.roleId ?? null,
          user.department,
          user.titleTh,
          user.titleEn,
          user.email,
          user.avatarUrl ?? null,
          user.isAdmin ? 1 : 0,
          nowIso,
        ]
      );
    });

    const docsToSync = getChanged('dcc_documents', payload.documents, (d) => d.id);
    await this.runChunked(docsToSync, async (doc) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_documents
         (id, doc_number, title_th, title_en, doc_type, department, revision, status, effective_date, next_review_date, owner_name, confidentiality, iso_clause, retention_years, obsolete_reason, obsolete_date, content_json, revision_history_json, distribution_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          doc.docNumber,
          doc.titleTh,
          doc.titleEn,
          doc.type,
          doc.department,
          doc.revision,
          doc.status,
          doc.effectiveDate,
          doc.nextReviewDate,
          doc.ownerName,
          doc.confidentiality,
          doc.isoClause,
          doc.retentionYears,
          doc.obsoleteReason ?? null,
          doc.obsoleteDate ?? null,
          JSON.stringify(doc.content),
          JSON.stringify(doc.revisionHistory),
          JSON.stringify(doc.distribution),
          nowIso,
        ]
      );
    });

    const darsToSync = getChanged('dcc_dars', payload.dars, (d) => d.id);
    await this.runChunked(darsToSync, async (dar) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_dars
         (id, dar_number, dar_type, target_doc_id, proposed_doc_number, proposed_title_th, proposed_title_en, doc_type, department, current_revision, proposed_revision, reason_th, reason_en, requester_name, requester_dept, requested_at, stage, iso_clause, proposed_content_json, logs_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dar.id,
          dar.darNumber,
          dar.darType,
          dar.targetDocId ?? null,
          dar.proposedDocNumber,
          dar.proposedTitleTh,
          dar.proposedTitleEn,
          dar.docType,
          dar.department,
          dar.currentRevision,
          dar.proposedRevision,
          dar.reasonTh,
          dar.reasonEn,
          dar.requesterName,
          dar.requesterDept,
          dar.requestedAt,
          dar.stage,
          dar.isoClause,
          dar.proposedContent ? JSON.stringify(dar.proposedContent) : null,
          JSON.stringify(dar.logs),
          nowIso,
        ]
      );
    });

    const fishbonesToSync = getChanged('dcc_fishbones', payload.fishbones, (f) => f.id);
    await this.runChunked(fishbonesToSync, async (fb) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_fishbones
         (id, department, period, main_kpi_title_th, main_kpi_title_en, target_value, actual_value, unit, direction, owner_name, updated_at, factors_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fb.id,
          fb.department,
          fb.period,
          fb.mainKpiTitleTh,
          fb.mainKpiTitleEn,
          fb.targetValue,
          fb.actualValue,
          fb.unit,
          fb.direction,
          fb.ownerName,
          fb.updatedAt,
          JSON.stringify(fb.factors),
        ]
      );
    });

    const auditsToSync = getChanged('dcc_audit_events', payload.auditEvents, (a) => a.id);
    await this.runChunked(auditsToSync, async (evt) => {
      await this.query(
        `INSERT OR REPLACE INTO dcc_audit_events
         (id, timestamp, actor_name, actor_role, action, target_code, detail_th, detail_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          evt.id,
          evt.timestamp,
          evt.actorName,
          evt.actorRole,
          evt.action,
          evt.targetCode,
          evt.detailTh,
          evt.detailEn,
        ]
      );
    });

    const prevKpiHash = this.rowHashCache.get('dcc_settings')?.get('kpi_targets');
    if (prevKpiHash !== hashValue(payload.kpiTargets)) {
      await this.query(
        `INSERT OR REPLACE INTO dcc_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)`,
        ['kpi_targets', JSON.stringify(payload.kpiTargets), nowIso]
      );
    }

    this.primeCache(payload);
    this.lastSyncedAt = nowIso;
  }

  public async getStatus(): Promise<DbConnectionInfo> {
    const mode = this.isCloudflareConfigured() ? 'cloudflare-d1' : 'local-sqlite';
    try {
      await this.ensureSchema();
      await this.query('SELECT 1 AS ok');

      const [cDept, cRole, cUser, cDoc, cDar, cFb, cAud] = await Promise.all([
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_departments'),
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_roles'),
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_users'),
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_documents'),
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_dars'),
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_fishbones'),
        this.query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dcc_audit_events'),
      ]);

      return {
        driver: mode,
        connected: true,
        databaseName: mode === 'cloudflare-d1' ? this.databaseName : 'dcc.sqlite (Local D1)',
        databaseIdMasked: mode === 'cloudflare-d1' ? maskId(this.databaseId) : 'local-node-sqlite',
        lastSyncedAt: this.lastSyncedAt,
        lastError: null,
        counts: {
          departments: Number(cDept[0]?.cnt ?? 0),
          roles: Number(cRole[0]?.cnt ?? 0),
          users: Number(cUser[0]?.cnt ?? 0),
          documents: Number(cDoc[0]?.cnt ?? 0),
          dars: Number(cDar[0]?.cnt ?? 0),
          fishbones: Number(cFb[0]?.cnt ?? 0),
          auditEvents: Number(cAud[0]?.cnt ?? 0),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Database connection error';
      this.lastError = msg;
      return {
        driver: mode,
        connected: false,
        databaseName: mode === 'cloudflare-d1' ? this.databaseName : 'dcc.sqlite (Local D1)',
        databaseIdMasked: mode === 'cloudflare-d1' ? maskId(this.databaseId) : 'local-node-sqlite',
        lastSyncedAt: this.lastSyncedAt,
        lastError: msg,
        counts: {
          departments: 0,
          roles: 0,
          users: 0,
          documents: 0,
          dars: 0,
          fishbones: 0,
          auditEvents: 0,
        },
      };
    }
  }
}

export const SCHEMA_SQL = SCHEMA_STATEMENTS.join(';\n\n') + ';\n';

export const d1Client = new D1DatabaseClient();

