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

interface D1PreparedResult<T = Record<string, unknown>> {
  results?: T[];
  success?: boolean;
  meta?: Record<string, unknown>;
}

interface D1PreparedStatementLike {
  bind(...values: Array<string | number | null>): D1PreparedStatementLike;
  all<T = Record<string, unknown>>(): Promise<D1PreparedResult<T>>;
  run(): Promise<D1PreparedResult>;
}

interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

interface WorkerEnv {
  ASSETS: AssetsFetcher;
  DB?: D1DatabaseLike;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_D1_DATABASE_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_D1_DATABASE_NAME?: string;
}

interface DccPersistedPayload {
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

const SCHEMA_SQL = SCHEMA_STATEMENTS.join(';\n\n') + ';\n';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function maskId(id: string | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 10) return `${trimmed.slice(0, 3)}***`;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function hasD1HttpConfig(env: WorkerEnv): boolean {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
      env.CLOUDFLARE_D1_DATABASE_ID?.trim() &&
      env.CLOUDFLARE_API_TOKEN?.trim()
  );
}

async function runQuery<T = Record<string, unknown>>(
  env: WorkerEnv,
  sql: string,
  params: SqlParam[] = []
): Promise<T[]> {
  if (env.DB) {
    const stmt = params.length > 0 ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA')) {
      const res = await stmt.all<T>();
      return res.results ?? [];
    }
    await stmt.run();
    return [];
  }

  if (hasD1HttpConfig(env)) {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID!.trim();
    const databaseId = env.CLOUDFLARE_D1_DATABASE_ID!.trim();
    const apiToken = env.CLOUDFLARE_API_TOKEN!.trim();
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      accountId
    )}/d1/database/${encodeURIComponent(databaseId)}/query`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const body = (await res.json()) as {
      success: boolean;
      errors?: Array<{ message?: string }>;
      result?: Array<{ results?: T[] }>;
    };

    if (!res.ok || !body.success) {
      const msg =
        body.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
        `Cloudflare D1 HTTP ${res.status}`;
      throw new Error(msg);
    }

    return body.result?.[0]?.results ?? [];
  }

  throw new Error(
    'Cloudflare D1 is not bound or configured. Bind D1 as "DB" or set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN.'
  );
}

async function ensureSchema(env: WorkerEnv): Promise<void> {
  for (const stmt of SCHEMA_STATEMENTS) {
    await runQuery(env, stmt);
  }
  try {
    const cols = await runQuery<{ name: string }>(env, 'PRAGMA table_info(dcc_users)');
    if (!cols.some((c) => c.name === 'role_id')) {
      await runQuery(env, 'ALTER TABLE dcc_users ADD COLUMN role_id TEXT');
    }
  } catch {
    // Ignore if already exists
  }
}

async function getStatus(env: WorkerEnv): Promise<DbConnectionInfo> {
  const dbName = env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || 'dcc-database';
  const masked = env.DB ? 'd1-binding-DB' : maskId(env.CLOUDFLARE_D1_DATABASE_ID);
  try {
    await ensureSchema(env);
    await runQuery(env, 'SELECT 1 AS ok');

    const [cDept, cRole, cUser, cDoc, cDar, cFb, cAud] = await Promise.all([
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_departments'),
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_roles'),
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_users'),
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_documents'),
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_dars'),
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_fishbones'),
      runQuery<{ cnt: number }>(env, 'SELECT COUNT(*) AS cnt FROM dcc_audit_events'),
    ]);

    return {
      driver: 'cloudflare-d1',
      connected: true,
      databaseName: dbName,
      databaseIdMasked: masked,
      lastSyncedAt: new Date().toISOString(),
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
    return {
      driver: 'cloudflare-d1',
      connected: false,
      databaseName: dbName,
      databaseIdMasked: masked,
      lastSyncedAt: null,
      lastError: err instanceof Error ? err.message : 'D1 connection error',
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

async function readState(env: WorkerEnv): Promise<DccPersistedPayload | null> {
  await ensureSchema(env);

  const [deptRows, roleRows, userRows, docRows, darRows, fishboneRows, auditRows, settingRows] =
    await Promise.all([
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_departments ORDER BY code ASC'),
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_roles ORDER BY department ASC, name ASC'),
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_users ORDER BY id ASC'),
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_documents ORDER BY doc_number ASC'),
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_dars ORDER BY requested_at DESC'),
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_fishbones ORDER BY department ASC'),
      runQuery<Record<string, unknown>>(env, 'SELECT * FROM dcc_audit_events ORDER BY timestamp DESC'),
      runQuery<Record<string, unknown>>(
        env,
        'SELECT key, value_json FROM dcc_settings WHERE key = ?',
        ['kpi_targets']
      ),
    ]);

  if (deptRows.length === 0 && userRows.length === 0 && docRows.length === 0) {
    return null;
  }

  return {
    departments: deptRows.map((r) => ({
      code: String(r.code),
      nameTh: String(r.name_th),
      nameEn: String(r.name_en),
      headName: String(r.head_name),
    })),
    roles: roleRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      department: String(r.department),
      darPermission: String(r.dar_permission) as RoleDefinition['darPermission'],
      isSystem: Number(r.is_system) === 1,
    })),
    users: userRows.map((r) => ({
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
    })),
    documents: docRows.map((r) => ({
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
    })),
    dars: darRows.map((r) => ({
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
    })),
    fishbones: fishboneRows.map((r) => ({
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
    })),
    auditEvents: auditRows.map((r) => ({
      id: String(r.id),
      timestamp: String(r.timestamp),
      actorName: String(r.actor_name),
      actorRole: String(r.actor_role),
      action: String(r.action) as AuditEvent['action'],
      targetCode: String(r.target_code),
      detailTh: String(r.detail_th),
      detailEn: String(r.detail_en),
    })),
    kpiTargets:
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
          },
  };
}

async function syncState(
  env: WorkerEnv,
  payload: DccPersistedPayload,
  replaceAll = false
): Promise<void> {
  await ensureSchema(env);
  const nowIso = new Date().toISOString();

  if (replaceAll) {
    await Promise.all([
      runQuery(env, 'DELETE FROM dcc_departments'),
      runQuery(env, 'DELETE FROM dcc_roles'),
      runQuery(env, 'DELETE FROM dcc_users'),
      runQuery(env, 'DELETE FROM dcc_documents'),
      runQuery(env, 'DELETE FROM dcc_dars'),
      runQuery(env, 'DELETE FROM dcc_fishbones'),
      runQuery(env, 'DELETE FROM dcc_audit_events'),
      runQuery(env, 'DELETE FROM dcc_settings'),
    ]);
  } else {
    // Reconcile deletions for users, roles, departments, fishbones
    const [dbUsers, dbRoles, dbDepts, dbFishbones] = await Promise.all([
      runQuery<{ id: string }>(env, 'SELECT id FROM dcc_users'),
      runQuery<{ id: string }>(env, 'SELECT id FROM dcc_roles'),
      runQuery<{ code: string }>(env, 'SELECT code FROM dcc_departments'),
      runQuery<{ id: string }>(env, 'SELECT id FROM dcc_fishbones'),
    ]);

    const userIds = new Set(payload.users.map((u) => u.id));
    for (const row of dbUsers) {
      if (!userIds.has(row.id)) {
        await runQuery(env, 'DELETE FROM dcc_users WHERE id = ?', [row.id]);
      }
    }

    const roleIds = new Set((payload.roles ?? []).map((r) => r.id));
    for (const row of dbRoles) {
      if (!roleIds.has(row.id)) {
        await runQuery(env, 'DELETE FROM dcc_roles WHERE id = ?', [row.id]);
      }
    }

    const deptCodes = new Set(payload.departments.map((d) => d.code));
    for (const row of dbDepts) {
      if (!deptCodes.has(row.code)) {
        await runQuery(env, 'DELETE FROM dcc_departments WHERE code = ?', [row.code]);
      }
    }

    const fbIds = new Set(payload.fishbones.map((f) => f.id));
    for (const row of dbFishbones) {
      if (!fbIds.has(row.id)) {
        await runQuery(env, 'DELETE FROM dcc_fishbones WHERE id = ?', [row.id]);
      }
    }
  }

  for (const dept of payload.departments) {
    await runQuery(
      env,
      `INSERT OR REPLACE INTO dcc_departments (code, name_th, name_en, head_name, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [dept.code, dept.nameTh, dept.nameEn, dept.headName, nowIso]
    );
  }

  for (const role of payload.roles ?? []) {
    await runQuery(
      env,
      `INSERT OR REPLACE INTO dcc_roles (id, name, department, dar_permission, is_system, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [role.id, role.name, role.department, role.darPermission, role.isSystem ? 1 : 0, nowIso]
    );
  }

  for (const user of payload.users) {
    await runQuery(
      env,
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
  }

  for (const doc of payload.documents) {
    await runQuery(
      env,
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
  }

  for (const dar of payload.dars) {
    await runQuery(
      env,
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
  }

  for (const fb of payload.fishbones) {
    await runQuery(
      env,
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
  }

  for (const evt of payload.auditEvents) {
    await runQuery(
      env,
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
  }

  await runQuery(
    env,
    `INSERT OR REPLACE INTO dcc_settings (key, value_json, updated_at)
     VALUES (?, ?, ?)`,
    ['kpi_targets', JSON.stringify(payload.kpiTargets), nowIso]
  );
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/d1/status' && request.method === 'GET') {
      try {
        const dbInfo = await getStatus(env);
        return jsonResponse({ ok: dbInfo.connected, dbInfo });
      } catch (err) {
        return jsonResponse(
          { ok: false, error: err instanceof Error ? err.message : 'Status check failed' },
          500
        );
      }
    }

    if (pathname === '/api/d1/schema' && request.method === 'GET') {
      return new Response(SCHEMA_SQL, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (pathname === '/api/dcc/state' && request.method === 'GET') {
      try {
        const state = await readState(env);
        const dbInfo = await getStatus(env);
        if (!state) {
          return jsonResponse({ ok: true, empty: true, state: null, dbInfo });
        }
        return jsonResponse({ ok: true, empty: false, state, dbInfo });
      } catch (err) {
        return jsonResponse(
          { ok: false, error: err instanceof Error ? err.message : 'Failed to load state from D1' },
          500
        );
      }
    }

    if (pathname === '/api/dcc/sync' && request.method === 'POST') {
      try {
        const body = (await request.json()) as {
          state?: DccPersistedPayload;
          replaceAll?: boolean;
        };
        if (!body || !body.state) {
          return jsonResponse({ ok: false, error: 'Missing state payload' }, 400);
        }
        await syncState(env, body.state, Boolean(body.replaceAll));
        const dbInfo = await getStatus(env);
        return jsonResponse({ ok: true, dbInfo });
      } catch (err) {
        return jsonResponse(
          { ok: false, error: err instanceof Error ? err.message : 'Failed to sync state to D1' },
          500
        );
      }
    }

    if (pathname === '/api/d1/init' && request.method === 'POST') {
      try {
        await ensureSchema(env);
        const body = (await request.json().catch(() => ({}))) as {
          state?: DccPersistedPayload;
        };
        if (body?.state) {
          await syncState(env, body.state, false);
        }
        const dbInfo = await getStatus(env);
        return jsonResponse({ ok: dbInfo.connected, dbInfo });
      } catch (err) {
        return jsonResponse(
          { ok: false, error: err instanceof Error ? err.message : 'Failed to initialize D1 schema' },
          500
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
