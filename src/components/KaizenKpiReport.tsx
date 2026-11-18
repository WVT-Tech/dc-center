import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  DepartmentInfo,
  DepartmentKpiFishbone,
  FishboneCategory,
  FishboneFactor,
  KaizenImmediateAction,
  KaizenPreventiveAction,
  Language,
} from '../types/dcc';
import { isFactorMet, isHeadMet } from './FishboneDiagram';

export const THAI_MONTH_ABBR = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const EN_MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const TOP_5M1E: Array<{ key: FishboneCategory; label: string }> = [
  { key: 'Man', label: 'Man' },
  { key: 'Machine', label: 'Machine' },
  { key: 'Material', label: 'Materials' },
];

const BOTTOM_5M1E: Array<{ key: FishboneCategory; label: string }> = [
  { key: 'Method', label: 'Method' },
  { key: 'Measurement', label: 'Measurement' },
  { key: 'Environment', label: 'Environment (Mother Nature)' },
];

interface KaizenKpiReportProps {
  lang: Language;
  fishbone: DepartmentKpiFishbone;
  departmentInfo?: DepartmentInfo;
  canEdit: boolean;
  onEditHead: () => void;
  onEditMonthlyStats: () => void;
  onAddFactor: (category: FishboneCategory) => void;
  onEditFactor: (factor: FishboneFactor) => void;
  onAddImmediate: () => void;
  onEditImmediate: (item: KaizenImmediateAction) => void;
  onDeleteImmediate: (id: string) => void;
  onAddPreventive: () => void;
  onEditPreventive: (item: KaizenPreventiveAction) => void;
  onDeletePreventive: (id: string) => void;
}

export const KaizenKpiReport: React.FC<KaizenKpiReportProps> = ({
  lang,
  fishbone,
  departmentInfo,
  canEdit,
  onEditHead,
  onEditMonthlyStats,
  onAddFactor,
  onEditFactor,
  onAddImmediate,
  onEditImmediate,
  onDeleteImmediate,
  onAddPreventive,
  onEditPreventive,
  onDeletePreventive,
}) => {
  const title = lang === 'th' ? fishbone.mainKpiTitleTh : fishbone.mainKpiTitleEn;
  const deptName = departmentInfo
    ? lang === 'th'
      ? departmentInfo.nameTh
      : departmentInfo.nameEn
    : fishbone.department;
  const headMet = isHeadMet(fishbone);

  // Prepare 12-month line chart series
  const months = lang === 'th' ? THAI_MONTH_ABBR : EN_MONTH_ABBR;
  const rawMonthly: (number | null)[] = Array.from({ length: 12 }, (_, idx) => {
    const v = fishbone.monthlyActuals?.[idx];
    return typeof v === 'number' && !Number.isNaN(v) ? v : null;
  });

  const plottedValues = rawMonthly.filter((v): v is number => v !== null);
  const maxValCandidate = Math.max(
    fishbone.targetValue,
    fishbone.actualValue,
    ...plottedValues,
    1
  );
  const yMax = Math.ceil(maxValCandidate * 1.2 * 10) / 10;
  const yMin = 0;

  // SVG chart coordinate system
  const svgW = 360;
  const svgH = 220;
  const padL = 36;
  const padR = 14;
  const padT = 20;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const getX = (idx: number) => padL + (idx * plotW) / 11;
  const getY = (val: number) => {
    const ratio = yMax === yMin ? 0 : (val - yMin) / (yMax - yMin);
    return padT + plotH - Math.min(1, Math.max(0, ratio)) * plotH;
  };

  const targetY = getY(fishbone.targetValue);
  const actualPoints = rawMonthly
    .map((val, idx) => (val !== null ? { idx, val, x: getX(idx), y: getY(val) } : null))
    .filter((p): p is { idx: number; val: number; x: number; y: number } => p !== null);

  const actualPolyline = actualPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const val = Math.round((yMin + (yMax - yMin) * r) * 10) / 10;
    return { val, y: getY(val) };
  });

  const immediateRows = fishbone.immediateActions ?? [];
  const preventiveRows = fishbone.preventiveActions ?? [];

  const renderBranch = (cat: FishboneCategory, label: string, position: 'top' | 'bottom') => {
    const items = fishbone.factors.filter((f) => f.category === cat);
    const guideSlots = Math.max(0, 3 - items.length);

    return (
      <div
        key={cat}
        className={`relative flex flex-col ${
          position === 'top' ? 'justify-between pb-3' : 'justify-between pt-3'
        }`}
      >
        {/* Diagonal fishbone rib connecting branch header toward left-pointing spine */}
        <div
          aria-hidden="true"
          className={`hidden md:block absolute left-7 w-[2px] bg-slate-700 dark:bg-slate-400 pointer-events-none ${
            position === 'top'
              ? 'top-9 bottom-0 origin-bottom rotate-[24deg]'
              : 'top-0 bottom-9 origin-top -rotate-[24deg]'
          }`}
        />

        {/* Branch Header Box (e.g. Man, Machine, Materials...) */}
        <div
          className={`relative z-10 flex items-center justify-between gap-1.5 border border-slate-700 dark:border-slate-500 bg-white dark:bg-slate-900 px-2.5 py-1.5 shadow-2xs ${
            position === 'bottom' ? 'order-2 mt-2' : 'mb-2'
          }`}
        >
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {label}
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => onAddFactor(cat)}
              className="p-0.5 rounded text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 no-print"
              title={lang === 'th' ? `เพิ่มสาเหตุใน ${label}` : `Add cause to ${label}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dashed cause lines inside the rib */}
        <div
          className={`relative z-10 pl-8 pr-1 space-y-1.5 ${
            position === 'bottom' ? 'order-1' : ''
          }`}
        >
          {items.map((factor) => {
            const met = isFactorMet(factor);
            return (
              <button
                key={factor.id}
                type="button"
                onClick={() => canEdit && onEditFactor(factor)}
                className={`w-full text-left border-b border-dashed border-slate-400 dark:border-slate-600 pb-0.5 flex items-center justify-between gap-1.5 text-[11px] group ${
                  canEdit
                    ? 'hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
                    : 'cursor-default'
                }`}
              >
                <span className="truncate font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {lang === 'th' ? factor.titleTh : factor.titleEn}
                </span>
                <span
                  className={`font-mono text-[10px] shrink-0 ${
                    met
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {factor.actualValue}/{factor.targetValue}
                  {factor.unit}
                </span>
              </button>
            );
          })}

          {/* Empty dashed guide lines to preserve the classic Kaizen fishbone worksheet look */}
          {Array.from({ length: guideSlots }).map((_, idx) => (
            <button
              key={`guide-${cat}-${idx}`}
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && onAddFactor(cat)}
              className={`w-full h-4 border-b border-dashed border-slate-300 dark:border-slate-700 block ${
                canEdit ? 'hover:border-blue-400 cursor-pointer' : 'cursor-default'
              }`}
              title={
                canEdit
                  ? lang === 'th'
                    ? `คลิกเพื่อเพิ่มสาเหตุใน ${label}`
                    : `Click to add cause to ${label}`
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border-2 border-slate-800 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* BAND 1: Kaizen Report Header Table */}
      <div className="border-b-2 border-slate-800 dark:border-slate-600">
        {/* Top Row: Company Logo | Report Title | Month */}
        <div className="grid grid-cols-12 border-b border-slate-400 dark:border-slate-700">
          <div className="col-span-12 sm:col-span-3 px-3 py-2.5 flex items-center gap-2.5 sm:border-r border-slate-400 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
            <img
              src="/assets/aistudio/Jasmin_2882c892.png"
              alt="Jasmin Tech"
              className="h-9 w-auto object-contain rounded bg-white p-0.5 border border-slate-200"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-white truncate">
                JASMIN TECH
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Document Control & KPI
              </div>
            </div>
          </div>

          <div className="col-span-12 sm:col-span-6 px-4 py-2.5 flex items-center justify-center sm:border-r border-slate-400 dark:border-slate-700 text-center">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Key Performance Indicator ( KPI ) Report for Kaizen
            </h2>
          </div>

          <div className="col-span-12 sm:col-span-3 grid grid-cols-2 text-xs">
            <div className="px-3 py-2.5 flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
              {lang === 'th' ? 'เดือน' : 'Month'}
            </div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={onEditHead}
              className={`px-3 py-2.5 flex items-center justify-center font-semibold text-slate-900 dark:text-white ${
                canEdit ? 'hover:bg-blue-50/60 dark:hover:bg-blue-950/30 cursor-pointer' : ''
              }`}
              title={canEdit ? (lang === 'th' ? 'คลิกเพื่อแก้ไขข้อมูลหัวรายงาน' : 'Edit header') : undefined}
            >
              {fishbone.monthLabel?.trim() || fishbone.period}
            </button>
          </div>
        </div>

        {/* Row 2: Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-12 text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-400 dark:divide-slate-700">
          <div className="col-span-1 sm:col-span-2 px-3 py-2 flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
              {lang === 'th' ? 'แผนก :' : 'Dept :'}
            </span>
            <span className="font-medium text-slate-900 dark:text-white truncate">
              {deptName}
            </span>
          </div>

          <div className="col-span-1 sm:col-span-2 px-3 py-2 flex items-center gap-1.5">
            <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
              KPI Code :
            </span>
            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 truncate">
              {fishbone.kpiCode?.trim() || `KPI-${fishbone.department}-01`}
            </span>
          </div>

          <div
            onClick={() => canEdit && onEditHead()}
            className={`col-span-2 sm:col-span-4 px-3 py-2 flex items-center justify-between gap-2 ${
              canEdit ? 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer' : ''
            }`}
          >
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                {lang === 'th' ? 'หัวข้อ :' : 'Topic :'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {title}
              </span>
            </div>
            {canEdit && <Pencil className="w-3 h-3 text-slate-400 shrink-0 no-print" />}
          </div>

          <div className="col-span-1 sm:col-span-1 px-2.5 py-2 flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'th' ? 'เป้า' : 'Target'}
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {fishbone.targetValue}
            </span>
          </div>

          <div className="col-span-1 sm:col-span-2 px-2.5 py-2 flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {lang === 'th' ? 'เฉลี่ยปีก่อน' : 'Prev Avg'}
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {fishbone.prevYearAvg ?? 0}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 px-2.5 py-2 flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'th' ? 'พ.ศ.' : 'Yr'}
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {fishbone.yearLabel?.trim() || '2569'}
            </span>
          </div>
        </div>
      </div>

      {/* BAND 2: Middle Section (Left Line Chart + Right Left-Pointing 5M1E Fishbone) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b-2 border-slate-800 dark:border-slate-600">
        {/* Left: สถิติที่ผ่านมา (กราฟเส้น) */}
        <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-slate-300 dark:border-slate-700 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {lang === 'th' ? 'สถิติที่ผ่านมา (กราฟเส้น)' : 'Historical Trend (Line Chart)'}
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={onEditMonthlyStats}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors no-print"
              >
                <Pencil className="w-3 h-3" />
                <span>{lang === 'th' ? 'กรอกรายเดือน' : 'Edit Monthly'}</span>
              </button>
            )}
          </div>

          <div className="border border-slate-700 dark:border-slate-600 rounded bg-white dark:bg-slate-950 p-3 space-y-2">
            <div className="text-[11px] font-medium text-center text-slate-800 dark:text-slate-200 underline underline-offset-2 line-clamp-1">
              {lang === 'th' ? `กราฟแสดง ${title}` : `${title} Trend`}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-2">
              {fishbone.unit}
            </div>

            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-auto select-none overflow-visible"
              role="img"
              aria-label="Monthly KPI Trend Chart"
            >
              {/* Y-axis ticks & subtle horizontal gridlines */}
              {yTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={tick.y}
                    x2={svgW - padR}
                    y2={tick.y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={padL - 5}
                    y={tick.y + 3}
                    textAnchor="end"
                    className="fill-slate-500 dark:fill-slate-400 text-[9px] font-mono"
                  >
                    {tick.val}
                  </text>
                </g>
              ))}

              {/* Y Axis & X Axis */}
              <line
                x1={padL}
                y1={padT}
                x2={padL}
                y2={svgH - padB}
                stroke="currentColor"
                className="text-slate-700 dark:text-slate-400"
                strokeWidth="1.2"
              />
              <line
                x1={padL}
                y1={svgH - padB}
                x2={svgW - padR}
                y2={svgH - padB}
                stroke="currentColor"
                className="text-slate-700 dark:text-slate-400"
                strokeWidth="1.2"
              />

              {/* X-axis Month Labels */}
              {months.map((m, idx) => (
                <g key={m}>
                  <line
                    x1={getX(idx)}
                    y1={svgH - padB}
                    x2={getX(idx)}
                    y2={svgH - padB + 4}
                    stroke="currentColor"
                    className="text-slate-500 dark:text-slate-500"
                  />
                  <text
                    x={getX(idx)}
                    y={svgH - padB + 15}
                    textAnchor="middle"
                    className="fill-slate-600 dark:fill-slate-300 text-[9px]"
                  >
                    {m}
                  </text>
                </g>
              ))}

              {/* Red Target Reference Line */}
              <line
                x1={padL}
                y1={targetY}
                x2={svgW - padR}
                y2={targetY}
                stroke="#ef4444"
                strokeWidth="2"
              />

              {/* Magenta Actual Line & Square Markers + Data Labels */}
              {actualPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#d946ef"
                  strokeWidth="2"
                  points={actualPolyline}
                />
              )}
              {actualPoints.map((pt) => (
                <g key={pt.idx}>
                  <rect
                    x={pt.x - 3}
                    y={pt.y - 3}
                    width="6"
                    height="6"
                    fill="#d946ef"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 7}
                    textAnchor="middle"
                    className="fill-slate-900 dark:fill-white text-[9px] font-mono font-semibold"
                  >
                    {pt.val}
                  </text>
                </g>
              ))}
            </svg>

            {/* Legend */}
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-6 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="inline-flex items-center">
                  <span className="w-3 h-0.5 bg-fuchsia-500" />
                  <span className="w-2 h-2 bg-fuchsia-500 -mx-1" />
                  <span className="w-3 h-0.5 bg-fuchsia-500" />
                </span>
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="w-5 h-0.5 bg-red-500 inline-block" />
                <span>Target ({fishbone.targetValue})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Left-Pointing 5M 1E Fishbone Diagram */}
        <div className="lg:col-span-8 p-4 overflow-x-auto flex flex-col justify-between">
          <div className="min-w-[640px] flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-12 gap-3 items-stretch flex-1">
              {/* Left Box: ปัญหาสูงสุด / Main KPI */}
              <div className="col-span-3 flex items-center">
                <div
                  onClick={() => canEdit && onEditHead()}
                  className={`w-full border-2 p-3.5 space-y-2 transition-colors ${
                    headMet
                      ? 'border-emerald-700 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-800 dark:border-slate-400 bg-amber-50/30 dark:bg-amber-950/20'
                  } ${canEdit ? 'cursor-pointer hover:opacity-90' : ''}`}
                >
                  <div className="text-[11px] font-semibold text-center border-b border-slate-300 dark:border-slate-700 pb-1 text-slate-700 dark:text-slate-200">
                    {lang === 'th' ? 'ปัญหาสูงสุด / เป้าหมาย KPI' : 'Top Problem / KPI Goal'}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-snug text-center">
                    {title}
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[11px] font-mono tabular-nums space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Actual:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {fishbone.actualValue} {fishbone.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Target:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {fishbone.direction === 'higher-better' ? '≥' : '≤'} {fishbone.targetValue}{' '}
                        {fishbone.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 9 cols: Top 3 ribs + Left-pointing central arrow spine + Bottom 3 ribs */}
              <div className="col-span-9 flex flex-col justify-between">
                {/* Upper 3 Ribs */}
                <div className="grid grid-cols-3 gap-3 min-h-[148px]">
                  {TOP_5M1E.map((b) => renderBranch(b.key, b.label, 'top'))}
                </div>

                {/* Central Horizontal Spine pointing LEFT into ปัญหาสูงสุด */}
                <div className="relative h-5 flex items-center my-1">
                  <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[11px] border-r-slate-900 dark:border-r-slate-200 shrink-0" />
                  <div className="flex-1 h-[3px] bg-slate-900 dark:bg-slate-200" />
                </div>

                {/* Lower 3 Ribs */}
                <div className="grid grid-cols-3 gap-3 min-h-[148px]">
                  {BOTTOM_5M1E.map((b) => renderBranch(b.key, b.label, 'bottom'))}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-1.5 text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ** Analyse By ( 5M 1E ) : Man , Machine , Materials , Method , Measurement , Environment
            </div>
          </div>
        </div>
      </div>

      {/* BAND 3: Bottom Side-by-Side Tables (ส่วนที่ 1 & ส่วนที่ 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* ส่วนที่ 1 (การดำเนินการแก้ไขเบื้องต้น) */}
        <div className="lg:col-span-6 border-b-2 lg:border-b-0 lg:border-r-2 border-slate-800 dark:border-slate-600 flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-400 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'ส่วนที่ 1 (การดำเนินการแก้ไขเบื้องต้น)'
                : 'Part 1 (Immediate Containment Action)'}
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={onAddImmediate}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors no-print"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'th' ? 'เพิ่มรายการ' : 'Add'}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-400 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700">
                    {lang === 'th' ? 'ปัญหาที่พบ (สาเหตุสุดท้าย)' : 'Root Cause Found'}
                  </th>
                  <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {lang === 'th' ? 'ผู้รับผิดชอบ' : 'Owner'}
                  </th>
                  <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700">
                    {lang === 'th' ? 'การดำเนินการเบื้องต้น' : 'Immediate Action'}
                  </th>
                  <th className="py-2 px-3 whitespace-nowrap">
                    {lang === 'th' ? 'กำหนดเสร็จ' : 'Due Date'}
                  </th>
                  {canEdit && <th className="py-2 px-2 text-right no-print" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {immediateRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 5 : 4}
                      className="py-6 px-3 text-center text-slate-400 dark:text-slate-500"
                    >
                      {lang === 'th'
                        ? 'ยังไม่มีรายการแก้ไขเบื้องต้น'
                        : 'No immediate containment actions recorded'}
                    </td>
                  </tr>
                ) : (
                  immediateRows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        {row.problemFound}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.responsible}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                        {row.immediateAction}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.dueDate}
                      </td>
                      {canEdit && (
                        <td className="py-2.5 px-2 text-right whitespace-nowrap no-print">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEditImmediate(row)}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteImmediate(row.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ส่วนที่ 2 (การปฏิบัติป้องกันปัญหาซ้ำ) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-400 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              {lang === 'th'
                ? 'ส่วนที่ 2 (การปฏิบัติป้องกันปัญหาซ้ำ)'
                : 'Part 2 (Long-Term Preventive Action)'}
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={onAddPreventive}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors no-print"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'th' ? 'เพิ่มรายการ' : 'Add'}</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-400 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700">
                    {lang === 'th'
                      ? 'แนวทางแก้ไขป้องกันปัญหาระยะยาว'
                      : 'Long-Term Preventive Plan'}
                  </th>
                  <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {lang === 'th' ? 'ผู้รับผิดชอบ' : 'Owner'}
                  </th>
                  <th className="py-2 px-3 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                    {lang === 'th' ? 'กำหนดเสร็จ' : 'Due Date'}
                  </th>
                  <th className="py-2 px-3">
                    {lang === 'th' ? 'หมายเหตุ' : 'Remark'}
                  </th>
                  {canEdit && <th className="py-2 px-2 text-right no-print" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {preventiveRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? 5 : 4}
                      className="py-6 px-3 text-center text-slate-400 dark:text-slate-500"
                    >
                      {lang === 'th'
                        ? 'ยังไม่มีแนวทางป้องกันปัญหาระยะยาว'
                        : 'No preventive actions recorded'}
                    </td>
                  </tr>
                ) : (
                  preventiveRows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        {row.longTermPlan}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.responsible}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.dueDate}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {row.remark || '—'}
                      </td>
                      {canEdit && (
                        <td className="py-2.5 px-2 text-right whitespace-nowrap no-print">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEditPreventive(row)}
                              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePreventive(row.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
