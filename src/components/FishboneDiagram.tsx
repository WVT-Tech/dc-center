import React from 'react';
import { CheckCircle2, AlertTriangle, Plus, Pencil } from 'lucide-react';
import {
  DepartmentKpiFishbone,
  FishboneCategory,
  FishboneFactor,
  Language,
} from '../types/dcc';
import { t } from '../i18n/translations';

interface FishboneDiagramProps {
  lang: Language;
  fishbone: DepartmentKpiFishbone;
  canEdit: boolean;
  onAddFactor: (category: FishboneCategory) => void;
  onEditFactor: (factor: FishboneFactor) => void;
  onEditHead: () => void;
}

const TOP_CATEGORIES: FishboneCategory[] = ['Man', 'Machine', 'Method'];
const BOTTOM_CATEGORIES: FishboneCategory[] = ['Material', 'Measurement', 'Environment'];

export const getCategoryLabel = (cat: FishboneCategory, lang: Language): string => {
  switch (cat) {
    case 'Man':
      return t(lang, 'fishboneCatMan');
    case 'Machine':
      return t(lang, 'fishboneCatMachine');
    case 'Method':
      return t(lang, 'fishboneCatMethod');
    case 'Material':
      return t(lang, 'fishboneCatMaterial');
    case 'Measurement':
      return t(lang, 'fishboneCatMeasurement');
    case 'Environment':
      return t(lang, 'fishboneCatEnvironment');
  }
};

export const isFactorMet = (f: FishboneFactor): boolean =>
  f.direction === 'higher-better'
    ? f.actualValue >= f.targetValue
    : f.actualValue <= f.targetValue;

export const isHeadMet = (fb: DepartmentKpiFishbone): boolean =>
  fb.direction === 'higher-better'
    ? fb.actualValue >= fb.targetValue
    : fb.actualValue <= fb.targetValue;

export const FishboneDiagram: React.FC<FishboneDiagramProps> = ({
  lang,
  fishbone,
  canEdit,
  onAddFactor,
  onEditFactor,
  onEditHead,
}) => {
  const headMet = isHeadMet(fishbone);

  const renderBranch = (cat: FishboneCategory, position: 'top' | 'bottom') => {
    const items = fishbone.factors.filter((f) => f.category === cat);
    const metCount = items.filter(isFactorMet).length;

    return (
      <div
        key={cat}
        className={`flex flex-col ${
          position === 'top' ? 'justify-between pb-4' : 'justify-between pt-4'
        } relative`}
      >
        {/* Diagonal Rib Connector Visual */}
        <div
          aria-hidden="true"
          className={`hidden md:block absolute right-6 w-0.5 bg-slate-300 dark:bg-slate-700 pointer-events-none ${
            position === 'top'
              ? 'top-10 bottom-0 origin-bottom -rotate-[22deg]'
              : 'top-0 bottom-10 origin-top rotate-[22deg]'
          }`}
        />

        {/* Category Box */}
        <div
          className={`relative z-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80 p-3 space-y-2.5 ${
            position === 'bottom' ? 'order-2 mt-2' : 'mb-2'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {getCategoryLabel(cat, lang)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {metCount}/{items.length}{' '}
                {lang === 'th' ? 'ผ่านเกณฑ์' : 'met'}
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => onAddFactor(cat)}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors shrink-0"
                title={t(lang, 'fishboneAddFactor')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sub-bone KPI Nodes */}
          <div className="space-y-1.5">
            {items.length === 0 ? (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 py-1">
                {lang === 'th' ? 'ยังไม่มีข้อมูลก้างย่อย' : 'No sub-KPI entries'}
              </div>
            ) : (
              items.map((factor) => {
                const met = isFactorMet(factor);
                return (
                  <button
                    key={factor.id}
                    type="button"
                    onClick={() => canEdit && onEditFactor(factor)}
                    className={`w-full text-left px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-colors ${
                      canEdit
                        ? 'hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug">
                        {lang === 'th' ? factor.titleTh : factor.titleEn}
                      </span>
                      {met ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span>
                        {factor.actualValue} / {factor.targetValue} {factor.unit}
                      </span>
                      {factor.linkedDocNumber && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {factor.linkedDocNumber}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 overflow-x-auto">
      <div className="min-w-[880px]">
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Left 9 Columns: 3 Top Bones -> Central Spine -> 3 Bottom Bones */}
          <div className="col-span-9 flex flex-col">
            {/* Upper Ribs (Man, Machine, Method) */}
            <div className="grid grid-cols-3 gap-4 min-h-[210px]">
              {TOP_CATEGORIES.map((cat) => renderBranch(cat, 'top'))}
            </div>

            {/* Central Horizontal Fishbone Spine */}
            <div className="relative h-6 flex items-center">
              {/* Tail Fin */}
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[14px] border-r-slate-800 dark:border-r-slate-300 shrink-0" />
              {/* Spine Line */}
              <div className="flex-1 h-[3px] bg-slate-800 dark:bg-slate-300" />
              {/* Arrow Head pointing into Fish Head */}
              <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-slate-800 dark:border-l-slate-300 shrink-0" />
            </div>

            {/* Lower Ribs (Material, Measurement, Environment) */}
            <div className="grid grid-cols-3 gap-4 min-h-[210px]">
              {BOTTOM_CATEGORIES.map((cat) => renderBranch(cat, 'bottom'))}
            </div>
          </div>

          {/* Right 3 Columns: Fish Head (Main Department KPI Goal) */}
          <div className="col-span-3 flex items-center">
            <div
              onClick={() => canEdit && onEditHead()}
              className={`w-full rounded-xl border-2 p-5 space-y-3 transition-colors ${
                headMet
                  ? 'border-emerald-600/70 dark:border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-amber-500/80 dark:border-amber-500/70 bg-amber-50/40 dark:bg-amber-950/20'
              } ${canEdit ? 'cursor-pointer hover:opacity-95' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {fishbone.department} · {fishbone.period}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditHead();
                    }}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    title={t(lang, 'fishboneEditHead')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t(lang, 'fishboneHeadLabel')}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 leading-snug">
                  {lang === 'th' ? fishbone.mainKpiTitleTh : fishbone.mainKpiTitleEn}
                </h3>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'th' ? 'ผลลัพธ์จริง' : 'Actual'}
                  </span>
                  <span className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                    {fishbone.actualValue}{' '}
                    <span className="text-xs font-sans font-normal text-slate-500">
                      {fishbone.unit}
                    </span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t(lang, 'kpiTargetPrefix')}
                  </span>
                  <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                    {fishbone.direction === 'higher-better' ? '≥' : '≤'}{' '}
                    {fishbone.targetValue} {fishbone.unit}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                {headMet ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t(lang, 'kpiOnTarget')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t(lang, 'kpiBelowTarget')}</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {fishbone.ownerName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
