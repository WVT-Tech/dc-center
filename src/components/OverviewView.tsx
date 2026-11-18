import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gauge,
} from 'lucide-react';
import {
  ControlledDocument,
  DepartmentInfo,
  DepartmentKpiFishbone,
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
import { EN_MONTH_ABBR, THAI_MONTH_ABBR } from './KaizenKpiReport';
import { isHeadMet } from './FishboneDiagram';

const THAI_MONTH_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const DEPT_LINE_COLORS = [
  '#2563eb', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // rose/red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
];

function resolveMonthIndex(label?: string): number | null {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  const fullIdx = THAI_MONTH_FULL.findIndex((m) => normalized.includes(m));
  if (fullIdx >= 0) return fullIdx;
  const thAbbrIdx = THAI_MONTH_ABBR.findIndex((m) => normalized.includes(m));
  if (thAbbrIdx >= 0) return thAbbrIdx;
  const enIdx = EN_MONTH_ABBR.findIndex((m) => normalized.includes(m.toLowerCase()));
  return enIdx >= 0 ? enIdx : null;
}

interface OverviewViewProps {
  lang: Language;
  documents: ControlledDocument[];
  dars: DocumentActionRequest[];
  departments: DepartmentInfo[];
  fishbones?: DepartmentKpiFishbone[];
  docTypes?: DocTypeDefinition[];
  todayStr: string;
  kpiTargets: KpiTargets;
  onNavigate: (nav: NavSection) => void;
  onOpenDarQueue: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  lang,
  documents,
  dars,
  departments,
  fishbones = [],
  docTypes = DEFAULT_DOC_TYPES,
  todayStr,
  kpiTargets,
  onNavigate,
  onOpenDarQueue,
}) => {
  const activeDocs = documents.filter((d) => d.status === 'Active');
  const pendingDars = dars.filter(
    (d) => d.stage !== 'Published' && d.stage !== 'Rejected'
  );
  const kpiDepartments = useMemo(() => {
    const filtered = departments.filter(
      (d) => !['DCC', 'QMR'].includes(d.code.trim().toUpperCase())
    );
    return filtered.length > 0 ? filtered : departments;
  }, [departments]);

  const kpi = computeDccKpis(documents, dars, kpiDepartments, todayStr, kpiTargets);
  const dueIn30Count = kpi.dueIn30Count;
  const ackedRecipients = kpi.ackedRecipients;
  const allRecipientsLength = kpi.totalRecipients;
  const ackRate = kpi.ackRate;

  const deptSeries = useMemo(() => {
    return kpiDepartments.map((dept, idx) => {
      const fb = fishbones.find((f) => f.department === dept.code) ?? null;
      const color = DEPT_LINE_COLORS[idx % DEPT_LINE_COLORS.length];
      let monthly: (number | null)[] = Array(12).fill(null);

      if (fb) {
        const raw = Array.from({ length: 12 }, (_, m) => {
          const val = fb.monthlyActuals?.[m];
          return typeof val === 'number' && !Number.isNaN(val) ? val : null;
        });
        const hasAnyMonthly = raw.some((v) => v !== null);
        if (hasAnyMonthly) {
          monthly = raw;
        } else {
          const mIdx = resolveMonthIndex(fb.monthLabel);
          if (mIdx !== null) {
            monthly[mIdx] = fb.actualValue;
          } else {
            monthly[0] = fb.actualValue;
          }
        }
      }

      const filledVals = monthly.filter((v): v is number => v !== null);
      const latestVal = fb
        ? filledVals.length > 0
          ? filledVals[filledVals.length - 1]
          : fb.actualValue
        : null;
      const complianceRow = kpi.departmentRows.find((r) => r.code === dept.code);
      const onTimeRate =
        complianceRow && complianceRow.activeDocs > 0
          ? Math.round(
              ((complianceRow.activeDocs - complianceRow.overdueDocs) /
                complianceRow.activeDocs) *
                100
            )
          : 100;

      return {
        dept,
        fb,
        color,
        monthly,
        latestVal,
        met: fb ? isHeadMet(fb) : complianceRow?.onTarget ?? true,
        ackRate: complianceRow?.ackRate ?? 100,
        onTimeRate,
      };
    });
  }, [kpiDepartments, fishbones, kpi.departmentRows]);

  const hasAnyFishboneSeries = useMemo(
    () => deptSeries.some((s) => s.fb !== null),
    [deptSeries]
  );

  const [chartModeOverride, setChartModeOverride] = useState<'monthly' | 'compare' | null>(null);
  const chartMode = chartModeOverride ?? (hasAnyFishboneSeries ? 'monthly' : 'compare');
  const [focusedDept, setFocusedDept] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

      {/* Quality KPIs: All-Department Line Chart */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'navKpi')}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              ·{' '}
              {chartMode === 'monthly'
                ? lang === 'th'
                  ? 'กราฟเส้นแนวโน้ม KPI รายเดือนทุกแผนก'
                  : 'Monthly KPI Trend Across All Departments'
                : lang === 'th'
                  ? 'กราฟเส้นเปรียบเทียบตัวชี้วัดทุกแผนก (%)'
                  : 'Cross-Department Compliance Line Chart (%)'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-medium">
              <button
                type="button"
                onClick={() => {
                  setChartModeOverride('monthly');
                  setHoveredIdx(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  chartMode === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'th' ? 'รายเดือนทุกแผนก' : 'Monthly Trend'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartModeOverride('compare');
                  setHoveredIdx(null);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  chartMode === 'compare'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'th' ? 'เปรียบเทียบทุกแผนก (%)' : 'Compare Depts (%)'}
              </button>
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
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {(() => {
            const svgW = 900;
            const svgH = 260;
            const padL = 48;
            const padR = 24;
            const padT = 20;
            const padB = 34;
            const plotW = svgW - padL - padR;
            const plotH = svgH - padT - padB;

            if (chartMode === 'monthly') {
              const months = lang === 'th' ? THAI_MONTH_ABBR : EN_MONTH_ABBR;
              const allValues = deptSeries.flatMap((s) =>
                s.monthly.filter((v): v is number => v !== null)
              );
              const rawMax = Math.max(1, ...allValues);
              const yMax =
                rawMax <= 100 && rawMax >= 60
                  ? 100
                  : Math.ceil(rawMax * 1.2 * 10) / 10;
              const yMin = 0;

              const getX = (idx: number) => padL + (idx * plotW) / 11;
              const getY = (val: number) => {
                const ratio = yMax === yMin ? 0 : (val - yMin) / (yMax - yMin);
                return padT + plotH - Math.min(1, Math.max(0, ratio)) * plotH;
              };

              const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
                const val = Math.round((yMin + (yMax - yMin) * r) * 10) / 10;
                return { val, y: getY(val) };
              });

              const activeHoverMonth = hoveredIdx;

              return (
                <>
                  <div className="relative w-full">
                    <svg
                      viewBox={`0 0 ${svgW} ${svgH}`}
                      className="w-full h-56 sm:h-64 overflow-visible select-none"
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Horizontal grid lines */}
                      {yTicks.map((tick) => (
                        <g key={tick.val}>
                          <line
                            x1={padL}
                            y1={tick.y}
                            x2={svgW - padR}
                            y2={tick.y}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 8}
                            y={tick.y + 4}
                            textAnchor="end"
                            className="fill-slate-400 dark:fill-slate-500 text-[11px] font-mono tabular-nums"
                          >
                            {tick.val}
                          </text>
                        </g>
                      ))}

                      {/* X-axis month labels */}
                      {months.map((label, idx) => (
                        <text
                          key={label}
                          x={getX(idx)}
                          y={svgH - 10}
                          textAnchor="middle"
                          className={`text-[11px] font-medium ${
                            activeHoverMonth === idx
                              ? 'fill-blue-600 dark:fill-blue-400 font-semibold'
                              : 'fill-slate-500 dark:fill-slate-400'
                          }`}
                        >
                          {label}
                        </text>
                      ))}

                      {/* Hover crosshair line */}
                      {activeHoverMonth !== null && (
                        <line
                          x1={getX(activeHoverMonth)}
                          y1={padT}
                          x2={getX(activeHoverMonth)}
                          y2={padT + plotH}
                          stroke="currentColor"
                          className="text-slate-300 dark:text-slate-700"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                      )}

                      {/* Department lines */}
                      {deptSeries.map((series) => {
                        const isDimmed =
                          focusedDept !== null && focusedDept !== series.dept.code;
                        const pts = series.monthly
                          .map((val, mIdx) =>
                            val !== null
                              ? { mIdx, val, x: getX(mIdx), y: getY(val) }
                              : null
                          )
                          .filter(
                            (
                              p
                            ): p is { mIdx: number; val: number; x: number; y: number } =>
                              p !== null
                          );
                        if (pts.length === 0) return null;
                        const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
                        return (
                          <g
                            key={series.dept.code}
                            style={{ opacity: isDimmed ? 0.18 : 1 }}
                            className="transition-opacity duration-200"
                          >
                            {pts.length > 1 && (
                              <polyline
                                fill="none"
                                stroke={series.color}
                                strokeWidth={focusedDept === series.dept.code ? 3 : 2.25}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={polyline}
                              />
                            )}
                            {pts.map((p) => (
                              <circle
                                key={`${series.dept.code}-${p.mIdx}`}
                                cx={p.x}
                                cy={p.y}
                                r={activeHoverMonth === p.mIdx ? 5 : 3.5}
                                fill={series.color}
                                stroke="white"
                                strokeWidth="1.5"
                              />
                            ))}
                          </g>
                        );
                      })}

                      {/* Interactive hover columns for all 12 months */}
                      {months.map((_, idx) => {
                        const colW = plotW / 11;
                        return (
                          <rect
                            key={`hover-m-${idx}`}
                            x={getX(idx) - colW / 2}
                            y={padT}
                            width={colW}
                            height={plotH}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(idx)}
                          />
                        );
                      })}
                    </svg>

                    {!hasAnyFishboneSeries && (
                      <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        {lang === 'th'
                          ? 'ยังไม่มีข้อมูล KPI รายเดือนในแผนกใด — สามารถบันทึกข้อมูลรายเดือนได้ในเมนู ตัวชี้วัดคุณภาพ (KPI) หรือสลับดู "เปรียบเทียบทุกแผนก (%)"'
                          : 'No monthly Fishbone KPI entries yet. Record monthly values in Quality KPIs or switch to Compare Depts (%).'}
                      </div>
                    )}

                    {/* Floating tooltip for hovered month */}
                    {activeHoverMonth !== null && (
                      <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {months[activeHoverMonth]}:
                        </span>
                        {deptSeries.map((s) => {
                          const val = s.monthly[activeHoverMonth];
                          return (
                            <span
                              key={s.dept.code}
                              className="inline-flex items-center gap-1.5 font-mono tabular-nums"
                            >
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: s.color }}
                              />
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {s.dept.code}:
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                {val !== null
                                  ? `${val}${s.fb?.unit ? ` ${s.fb.unit}` : ''}`
                                  : '—'}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Interactive Department Legend */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    {deptSeries.map((s) => {
                      const isFocused = focusedDept === s.dept.code;
                      return (
                        <button
                          key={s.dept.code}
                          type="button"
                          onClick={() =>
                            setFocusedDept((prev) =>
                              prev === s.dept.code ? null : s.dept.code
                            )
                          }
                          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
                            isFocused
                              ? 'border-slate-900 dark:border-blue-500 bg-slate-900/5 dark:bg-blue-500/10 text-slate-900 dark:text-white'
                              : focusedDept !== null
                                ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="font-mono font-semibold">{s.dept.code}</span>
                          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
                            {lang === 'th' ? s.dept.nameTh : s.dept.nameEn}
                          </span>
                          <span
                            className={`font-mono tabular-nums font-medium ${
                              s.latestVal === null
                                ? 'text-slate-400 dark:text-slate-500'
                                : s.met
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {s.latestVal !== null
                              ? `${s.latestVal}${s.fb?.unit ? ` ${s.fb.unit}` : ''}`
                              : lang === 'th'
                                ? 'ยังไม่กรอก'
                                : 'No data'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            }

            // Compare All Departments Mode (X = every department, Y = 0..100%)
            const count = Math.max(1, deptSeries.length);
            const getX = (idx: number) =>
              count === 1 ? padL + plotW / 2 : padL + (idx * plotW) / (count - 1);
            const getY = (val: number) => {
              const clamped = Math.min(100, Math.max(0, val));
              return padT + plotH - (clamped / 100) * plotH;
            };

            const onTimePts = deptSeries.map((s, idx) => ({
              idx,
              val: s.onTimeRate,
              x: getX(idx),
              y: getY(s.onTimeRate),
              code: s.dept.code,
            }));
            const ackPts = deptSeries.map((s, idx) => ({
              idx,
              val: s.ackRate,
              x: getX(idx),
              y: getY(s.ackRate),
              code: s.dept.code,
            }));

            const onTimePolyline = onTimePts.map((p) => `${p.x},${p.y}`).join(' ');
            const ackPolyline = ackPts.map((p) => `${p.x},${p.y}`).join(' ');
            const targetY = getY(kpiTargets.onTimeReviewPct);
            const yTicks = [0, 25, 50, 75, 100];

            return (
              <>
                <div className="relative w-full">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-56 sm:h-64 overflow-visible select-none"
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {yTicks.map((val) => {
                      const y = getY(val);
                      return (
                        <g key={val}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={svgW - padR}
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="fill-slate-400 dark:fill-slate-500 text-[11px] font-mono tabular-nums"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Target threshold dashed line */}
                    <line
                      x1={padL}
                      y1={targetY}
                      x2={svgW - padR}
                      y2={targetY}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    <text
                      x={svgW - padR}
                      y={targetY - 6}
                      textAnchor="end"
                      className="fill-amber-600 dark:fill-amber-400 text-[10px] font-mono font-semibold"
                    >
                      Target ≥{kpiTargets.onTimeReviewPct}%
                    </text>

                    {/* Hover crosshair */}
                    {hoveredIdx !== null && hoveredIdx < deptSeries.length && (
                      <line
                        x1={getX(hoveredIdx)}
                        y1={padT}
                        x2={getX(hoveredIdx)}
                        y2={padT + plotH}
                        stroke="currentColor"
                        className="text-slate-300 dark:text-slate-700"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Line 1: On-Time Review Rate */}
                    {onTimePts.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={onTimePolyline}
                      />
                    )}

                    {/* Line 2: Document Ack Rate */}
                    {ackPts.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={ackPolyline}
                      />
                    )}

                    {/* Data nodes + X-axis department codes */}
                    {deptSeries.map((s, idx) => {
                      const x = getX(idx);
                      const isHover = hoveredIdx === idx;
                      return (
                        <g key={s.dept.code}>
                          <circle
                            cx={x}
                            cy={getY(s.onTimeRate)}
                            r={isHover ? 5.5 : 4}
                            fill="#2563eb"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx={x}
                            cy={getY(s.ackRate)}
                            r={isHover ? 5.5 : 4}
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <text
                            x={x}
                            y={svgH - 10}
                            textAnchor="middle"
                            className={`text-[11px] font-mono ${
                              isHover
                                ? 'fill-blue-600 dark:fill-blue-400 font-semibold'
                                : 'fill-slate-600 dark:fill-slate-400'
                            }`}
                          >
                            {s.dept.code}
                          </text>
                          <rect
                            x={x - (count > 1 ? plotW / (count - 1) / 2 : 40)}
                            y={padT}
                            width={count > 1 ? plotW / (count - 1) : 80}
                            height={plotH}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(idx)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {hoveredIdx !== null && deptSeries[hoveredIdx] && (
                    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {deptSeries[hoveredIdx].dept.code} ·{' '}
                        <span className="font-sans">
                          {lang === 'th'
                            ? deptSeries[hoveredIdx].dept.nameTh
                            : deptSeries[hoveredIdx].dept.nameEn}
                        </span>
                      </span>
                      <span className="text-blue-700 dark:text-blue-400 font-mono tabular-nums">
                        {t(lang, 'kpiOnTimeReview')}: {deptSeries[hoveredIdx].onTimeRate}%
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                        {t(lang, 'kpiAckRate')}: {deptSeries[hoveredIdx].ackRate}%
                      </span>
                      {deptSeries[hoveredIdx].fb && (
                        <span className="text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                          Fishbone KPI: {deptSeries[hoveredIdx].latestVal}{' '}
                          {deptSeries[hoveredIdx].fb?.unit}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-600 inline-block" />
                    <span>{t(lang, 'kpiOnTimeReview')} (%)</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                    <span>{t(lang, 'kpiAckRate')} (%)</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-0 border-t-2 border-dashed border-amber-500 inline-block" />
                    <span>
                      {t(lang, 'kpiTargetPrefix')} ≥{kpiTargets.onTimeReviewPct}%
                    </span>
                  </span>
                </div>
              </>
            );
          })()}
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
    </div>
  );
};
