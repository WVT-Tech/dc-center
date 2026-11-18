import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileText,
  Gauge,
} from 'lucide-react';
import {
  AuditEvent,
  ControlledDocument,
  DepartmentInfo,
  DocTypeDefinition,
  DocumentActionRequest,
  KpiTargets,
  Language,
  NavSection,
} from '../types/dcc';
import { t } from '../i18n/translations';
import { computeDccKpis } from '../utils/kpiMetrics';
import { DEFAULT_DOC_TYPES } from '../utils/docCode';
import { DarStageLabel } from './StatusLabel';

interface OverviewViewProps {
  lang: Language;
  documents: ControlledDocument[];
  dars: DocumentActionRequest[];
  departments: DepartmentInfo[];
  docTypes?: DocTypeDefinition[];
  auditEvents: AuditEvent[];
  todayStr: string;
  kpiTargets: KpiTargets;
  onNavigate: (nav: NavSection) => void;
  onOpenDocument: (docId: string) => void;
  onOpenDarQueue: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  lang,
  documents,
  dars,
  departments,
  docTypes = DEFAULT_DOC_TYPES,
  auditEvents,
  todayStr,
  kpiTargets,
  onNavigate,
  onOpenDocument,
  onOpenDarQueue,
}) => {
  const activeDocs = documents.filter((d) => d.status === 'Active');
  const pendingDars = dars.filter(
    (d) => d.stage !== 'Published' && d.stage !== 'Rejected'
  );
  const kpi = computeDccKpis(documents, dars, departments, todayStr, kpiTargets);
  const dueIn30Count = kpi.dueIn30Count;
  const ackedRecipients = kpi.ackedRecipients;
  const allRecipientsLength = kpi.totalRecipients;
  const ackRate = kpi.ackRate;

  const typeCounts: Record<string, number> = {};
  docTypes.forEach((dt) => {
    typeCounts[dt.code] = 0;
  });
  activeDocs.forEach((doc) => {
    typeCounts[doc.type] = (typeCounts[doc.type] ?? 0) + 1;
  });

  const deptCounts = departments
    .map((dept) => ({
      ...dept,
      count: activeDocs.filter((d) => d.department === dept.code).length,
    }))
    .sort((a, b) => b.count - a.count);

  const maxDeptCount = Math.max(1, ...deptCounts.map((d) => d.count));

  return (
    <div className="space-y-8">
      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('master-list')}
          className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'kpiTotalActive')}</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white">
              {activeDocs.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'kpiUnitDocs')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('dar-workflow')}
          className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'kpiPendingDar')}</span>
            <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {pendingDars.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'kpiUnitRequests')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('master-list')}
          className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'kpiDueReview')}</span>
            <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-semibold tracking-tight font-mono tabular-nums ${
                dueIn30Count > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {dueIn30Count}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t(lang, 'kpiUnitDocs')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('kpi')}
          className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t(lang, 'kpiAckRate')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {ackRate}%
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {ackedRecipients}/{allRecipientsLength}
            </span>
          </div>
        </button>
      </div>

      {/* ISO Quality KPI Compliance Strip */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'navKpi')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('kpi')}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
          >
            <span>{t(lang, 'viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t(lang, 'kpiOnTimeReview')}</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                {kpi.onTimeReviewRate}%
              </span>
              <span
                className={`text-xs font-medium ${
                  kpi.onTimeReviewRate >= kpiTargets.onTimeReviewPct
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {t(lang, 'kpiTargetPrefix')} ≥{kpiTargets.onTimeReviewPct}%
              </span>
            </div>
          </div>

          <div className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t(lang, 'kpiAvgDarDays')}</span>
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                {kpi.avgDarTurnaroundDays}{' '}
                <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">
                  {t(lang, 'kpiDaysUnit')}
                </span>
              </span>
              <span
                className={`text-xs font-medium ${
                  kpi.avgDarTurnaroundDays <= kpiTargets.darSlaDays
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {t(lang, 'kpiTargetPrefix')} ≤{kpiTargets.darSlaDays}d
              </span>
            </div>
          </div>

          <div className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t(lang, 'kpiFirstPass')}</span>
              <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                {kpi.firstPassRate}%
              </span>
              <span
                className={`text-xs font-medium ${
                  kpi.firstPassRate >= kpiTargets.firstPassPct
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {t(lang, 'kpiTargetPrefix')} ≥{kpiTargets.firstPassPct}%
              </span>
            </div>
          </div>

          <div className="p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t(lang, 'kpiOverdueDocs')}</span>
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-2xl font-semibold font-mono tabular-nums ${
                  kpi.overdueCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {kpi.overdueCount}{' '}
                <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">
                  {t(lang, 'kpiUnitDocs')}
                </span>
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(lang, 'kpiTargetPrefix')} 0
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Split: Active DAR Queue + Document Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Active DAR Approval Queue */}
        <section className="xl:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t(lang, 'overviewQueueTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t(lang, 'overviewQueueSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenDarQueue}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              <span>{t(lang, 'viewAll')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingDars.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                {lang === 'th'
                  ? 'ไม่มีคำขอ DAR ที่รอดำเนินการในขณะนี้'
                  : 'All Document Action Requests are resolved.'}
              </div>
            ) : (
              pendingDars.slice(0, 5).map((dar) => (
                <div
                  key={dar.id}
                  onClick={onOpenDarQueue}
                  className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {dar.darNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{dar.proposedDocNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Rev.{dar.currentRevision} → Rev.{dar.proposedRevision}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {lang === 'th' ? dar.proposedTitleTh : dar.proposedTitleEn}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {dar.requesterName} · {dar.department} ·{' '}
                      <span className="font-mono">{dar.requestedAt}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <DarStageLabel stage={dar.stage} lang={lang} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right: Document Type Breakdown & Department Coverage */}
        <section className="xl:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'overviewBreakdownTitle')}
            </h2>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {docTypes.map((dt) => (
                <div
                  key={dt.code}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {lang === 'th' ? dt.nameTh : dt.nameEn} ({dt.code})
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {typeCounts[dt.code] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'overviewDeptTitle')}
            </h3>
            <div className="mt-4 space-y-3">
              {deptCounts.slice(0, 6).map((dept) => {
                const widthPct = Math.round((dept.count / maxDeptCount) * 100);
                return (
                  <div key={dept.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 mr-1.5">
                          {dept.code}
                        </span>
                        {lang === 'th' ? dept.nameTh : dept.nameEn}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {dept.count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-slate-900 dark:bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${dept.count === 0 ? 0 : Math.max(8, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Row: Recent Audit Activity */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t(lang, 'overviewAuditTitle')}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('audit-trail')}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <span>{t(lang, 'viewAll')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-6 whitespace-nowrap">Timestamp</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Target</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Actor</th>
                <th className="py-2.5 px-6 whitespace-nowrap">Activity Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {auditEvents.slice(0, 5).map((ev) => {
                const matchedDoc = documents.find(
                  (d) => d.docNumber === ev.targetCode
                );
                return (
                  <tr
                    key={ev.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-6 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {ev.timestamp}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                      {matchedDoc ? (
                        <button
                          type="button"
                          onClick={() => onOpenDocument(matchedDoc.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {ev.targetCode}
                        </button>
                      ) : (
                        <span className="text-slate-800 dark:text-slate-200">
                          {ev.targetCode}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {ev.actorName} ·{' '}
                      <span className="text-slate-400 dark:text-slate-500">
                        {ev.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-600 dark:text-slate-300">
                      {lang === 'th' ? ev.detailTh : ev.detailEn}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
