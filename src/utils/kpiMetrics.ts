import {
  ControlledDocument,
  DepartmentInfo,
  DocumentActionRequest,
  KpiTargets,
} from '../types/dcc';

export const DEFAULT_KPI_TARGETS: KpiTargets = {
  onTimeReviewPct: 95,
  ackRatePct: 90,
  firstPassPct: 85,
  darSlaDays: 5,
};

export interface DccKpiSummary {
  activeCount: number;
  obsoleteCount: number;
  pendingDarsCount: number;
  dueIn30Count: number;
  overdueCount: number;
  onTimeReviewRate: number;
  ackRate: number;
  ackedRecipients: number;
  totalRecipients: number;
  firstPassRate: number;
  publishedDarsCount: number;
  rejectedDarsCount: number;
  avgDarTurnaroundDays: number;
  departmentRows: {
    code: string;
    nameTh: string;
    nameEn: string;
    activeDocs: number;
    overdueDocs: number;
    pendingDars: number;
    ackRate: number;
    ackedCount: number;
    totalRecipients: number;
    onTarget: boolean;
  }[];
  darByType: {
    newIssue: number;
    revision: number;
    obsolete: number;
  };
}

export function computeDccKpis(
  documents: ControlledDocument[],
  dars: DocumentActionRequest[],
  departments: DepartmentInfo[],
  todayStr: string,
  targets: KpiTargets
): DccKpiSummary {
  const activeDocs = documents.filter((d) => d.status === 'Active');
  const obsoleteDocs = documents.filter((d) => d.status === 'Obsolete');
  const pendingDars = dars.filter(
    (d) => d.stage !== 'Published' && d.stage !== 'Rejected'
  );
  const publishedDars = dars.filter((d) => d.stage === 'Published');
  const rejectedDars = dars.filter((d) => d.stage === 'Rejected');

  const todayTime = new Date(todayStr).getTime();

  const dueIn30Count = activeDocs.filter((doc) => {
    const diffDays = (new Date(doc.nextReviewDate).getTime() - todayTime) / 86400000;
    return diffDays <= 30;
  }).length;

  const overdueCount = activeDocs.filter((doc) => {
    const diffDays = (new Date(doc.nextReviewDate).getTime() - todayTime) / 86400000;
    return diffDays < 0;
  }).length;

  const onTimeReviewRate =
    activeDocs.length > 0
      ? Math.round(((activeDocs.length - overdueCount) / activeDocs.length) * 100)
      : 100;

  const allRecipients = activeDocs.flatMap((d) => d.distribution);
  const ackedRecipients = allRecipients.filter((r) => r.acknowledged).length;
  const ackRate =
    allRecipients.length > 0
      ? Math.round((ackedRecipients / allRecipients.length) * 100)
      : 100;

  const decidedCount = publishedDars.length + rejectedDars.length;
  const firstPassRate =
    decidedCount > 0
      ? Math.round((publishedDars.length / decidedCount) * 100)
      : 100;

  // Average DAR turnaround time across published DARs (or in-flight elapsed if none published)
  const turnaroundSamples: number[] = publishedDars
    .map((dar) => {
      const start = new Date(dar.requestedAt.replace(' ', 'T')).getTime();
      const publishLog = [...dar.logs].reverse().find((l) => l.action === 'Published');
      const end = publishLog
        ? new Date(publishLog.timestamp.replace(' ', 'T')).getTime()
        : todayTime;
      const days = Math.max(0.5, (end - start) / 86400000);
      return isNaN(days) ? 0 : days;
    })
    .filter((v) => v > 0);

  const avgDarTurnaroundDays =
    turnaroundSamples.length > 0
      ? Number(
          (
            turnaroundSamples.reduce((a, b) => a + b, 0) / turnaroundSamples.length
          ).toFixed(1)
        )
      : 0;

  const departmentRows = departments.map((dept) => {
    const deptDocs = activeDocs.filter((d) => d.department === dept.code);
    const deptOverdue = deptDocs.filter(
      (d) => (new Date(d.nextReviewDate).getTime() - todayTime) / 86400000 < 0
    ).length;
    const deptPendingDars = pendingDars.filter(
      (dar) => dar.department === dept.code
    ).length;

    const deptRecipients = activeDocs.flatMap((doc) =>
      doc.distribution.filter((r) => r.department === dept.code)
    );
    const deptAcked = deptRecipients.filter((r) => r.acknowledged).length;
    const deptAckRate =
      deptRecipients.length > 0
        ? Math.round((deptAcked / deptRecipients.length) * 100)
        : 100;

    const deptOnTimeRate =
      deptDocs.length > 0
        ? Math.round(((deptDocs.length - deptOverdue) / deptDocs.length) * 100)
        : 100;

    const onTarget =
      deptOnTimeRate >= targets.onTimeReviewPct &&
      deptAckRate >= targets.ackRatePct;

    return {
      code: dept.code,
      nameTh: dept.nameTh,
      nameEn: dept.nameEn,
      activeDocs: deptDocs.length,
      overdueDocs: deptOverdue,
      pendingDars: deptPendingDars,
      ackRate: deptAckRate,
      ackedCount: deptAcked,
      totalRecipients: deptRecipients.length,
      onTarget,
    };
  });

  const darByType = {
    newIssue: dars.filter((d) => d.darType === 'New Issue').length,
    revision: dars.filter((d) => d.darType === 'Revision').length,
    obsolete: dars.filter((d) => d.darType === 'Obsolete').length,
  };

  return {
    activeCount: activeDocs.length,
    obsoleteCount: obsoleteDocs.length,
    pendingDarsCount: pendingDars.length,
    dueIn30Count,
    overdueCount,
    onTimeReviewRate,
    ackRate,
    ackedRecipients,
    totalRecipients: allRecipients.length,
    firstPassRate,
    publishedDarsCount: publishedDars.length,
    rejectedDarsCount: rejectedDars.length,
    avgDarTurnaroundDays,
    departmentRows,
    darByType,
  };
}
