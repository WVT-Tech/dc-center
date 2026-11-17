import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Gauge,
  Pencil,
  Plus,
  Printer,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  ControlledDocument,
  DepartmentInfo,
  DepartmentKpiFishbone,
  DocumentActionRequest,
  FishboneCategory,
  FishboneFactor,
  KpiTargets,
  Language,
  NavSection,
  UserProfile,
} from '../types/dcc';
import { t } from '../i18n/translations';
import { computeDccKpis } from '../utils/kpiMetrics';
import {
  FishboneDiagram,
  getCategoryLabel,
  isFactorMet,
  isHeadMet,
} from './FishboneDiagram';

interface KpiViewProps {
  lang: Language;
  documents: ControlledDocument[];
  dars: DocumentActionRequest[];
  departments: DepartmentInfo[];
  fishbones: DepartmentKpiFishbone[];
  todayStr: string;
  targets: KpiTargets;
  currentUser: UserProfile;
  onUpdateTargets: (next: KpiTargets) => void;
  onUpsertFishbone: (fb: DepartmentKpiFishbone) => void;
  onNavigate: (nav: NavSection) => void;
  onOpenDocumentByNumber: (docNumber: string) => void;
}

const ALL_CATEGORIES: FishboneCategory[] = [
  'Man',
  'Machine',
  'Method',
  'Material',
  'Measurement',
  'Environment',
];

export const KpiView: React.FC<KpiViewProps> = ({
  lang,
  documents,
  dars,
  departments,
  fishbones,
  todayStr,
  targets,
  currentUser,
  onUpdateTargets,
  onUpsertFishbone,
  onNavigate,
  onOpenDocumentByNumber,
}) => {
  const [activeTab, setActiveTab] = useState<'fishbone' | 'summary'>('fishbone');
  const [selectedDept, setSelectedDept] = useState<string>(
    currentUser.isAdmin ? departments[0]?.code ?? 'QA' : currentUser.department
  );

  // Modals for Fishbone Head & Sub-Factor Entry
  const [headModalOpen, setHeadModalOpen] = useState(false);
  const [isCreatingNewSheet, setIsCreatingNewSheet] = useState(false);
  const [factorModal, setFactorModal] = useState<{
    open: boolean;
    category: FishboneCategory;
    editingFactor?: FishboneFactor;
  }>({ open: false, category: 'Man' });

  // Department fishbone sheets
  const deptSheets = useMemo(
    () => fishbones.filter((f) => f.department === selectedDept),
    [fishbones, selectedDept]
  );

  const [selectedSheetId, setSelectedSheetId] = useState<string>('');

  useEffect(() => {
    if (deptSheets.length > 0 && !deptSheets.some((s) => s.id === selectedSheetId)) {
      setSelectedSheetId(deptSheets[0].id);
    } else if (deptSheets.length === 0) {
      setSelectedSheetId('');
    }
  }, [deptSheets, selectedSheetId]);

  const currentFishbone = useMemo(
    () => deptSheets.find((s) => s.id === selectedSheetId) ?? deptSheets[0] ?? null,
    [deptSheets, selectedSheetId]
  );

  // Permissions: Admin ('dcc') or QMR can edit any dept; Dept Reviewer/staff can edit their own dept
  const canEditDept =
    Boolean(currentUser.isAdmin) ||
    currentUser.role === 'Document Controller' ||
    currentUser.role === 'QMR / Approver' ||
    currentUser.department === selectedDept;

  // Head form state
  const [headPeriod, setHeadPeriod] = useState('Q4 / 2026');
  const [headTitleTh, setHeadTitleTh] = useState('');
  const [headTitleEn, setHeadTitleEn] = useState('');
  const [headTarget, setHeadTarget] = useState('95');
  const [headActual, setHeadActual] = useState('90');
  const [headUnit, setHeadUnit] = useState('%');
  const [headDirection, setHeadDirection] = useState<'higher-better' | 'lower-better'>(
    'higher-better'
  );
  const [headOwner, setHeadOwner] = useState('');

  // Factor form state
  const [facCategory, setFacCategory] = useState<FishboneCategory>('Man');
  const [facTitleTh, setFacTitleTh] = useState('');
  const [facTitleEn, setFacTitleEn] = useState('');
  const [facTarget, setFacTarget] = useState('100');
  const [facActual, setFacActual] = useState('95');
  const [facUnit, setFacUnit] = useState('%');
  const [facDirection, setFacDirection] = useState<'higher-better' | 'lower-better'>(
    'higher-better'
  );
  const [facOwner, setFacOwner] = useState('');
  const [facDocNo, setFacDocNo] = useState('');
  const [facActionPlan, setFacActionPlan] = useState('');

  const openCreateHeadModal = () => {
    const deptObj = departments.find((d) => d.code === selectedDept);
    setIsCreatingNewSheet(true);
    setHeadPeriod('Q4 / 2026');
    setHeadTitleTh('');
    setHeadTitleEn('');
    setHeadTarget('95');
    setHeadActual('0');
    setHeadUnit('%');
    setHeadDirection('higher-better');
    setHeadOwner(deptObj?.headName ?? currentUser.nameTh);
    setHeadModalOpen(true);
  };

  const openEditHeadModal = () => {
    if (!currentFishbone) return;
    setIsCreatingNewSheet(false);
    setHeadPeriod(currentFishbone.period);
    setHeadTitleTh(currentFishbone.mainKpiTitleTh);
    setHeadTitleEn(currentFishbone.mainKpiTitleEn);
    setHeadTarget(String(currentFishbone.targetValue));
    setHeadActual(String(currentFishbone.actualValue));
    setHeadUnit(currentFishbone.unit);
    setHeadDirection(currentFishbone.direction);
    setHeadOwner(currentFishbone.ownerName);
    setHeadModalOpen(true);
  };

  const handleSaveHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headTitleTh.trim()) return;
    const nextFb: DepartmentKpiFishbone = isCreatingNewSheet || !currentFishbone
      ? {
          id: `fb-${selectedDept.toLowerCase()}-${Date.now()}`,
          department: selectedDept,
          period: headPeriod.trim() || 'Q4 / 2026',
          mainKpiTitleTh: headTitleTh.trim(),
          mainKpiTitleEn: headTitleEn.trim() || headTitleTh.trim(),
          targetValue: Number(headTarget) || 0,
          actualValue: Number(headActual) || 0,
          unit: headUnit.trim() || '%',
          direction: headDirection,
          ownerName: headOwner.trim() || currentUser.nameTh,
          updatedAt: todayStr,
          factors: [],
        }
      : {
          ...currentFishbone,
          period: headPeriod.trim() || currentFishbone.period,
          mainKpiTitleTh: headTitleTh.trim(),
          mainKpiTitleEn: headTitleEn.trim() || headTitleTh.trim(),
          targetValue: Number(headTarget) || 0,
          actualValue: Number(headActual) || 0,
          unit: headUnit.trim() || '%',
          direction: headDirection,
          ownerName: headOwner.trim() || currentFishbone.ownerName,
          updatedAt: todayStr,
        };

    onUpsertFishbone(nextFb);
    setSelectedSheetId(nextFb.id);
    setHeadModalOpen(false);
  };

  const openAddFactorModal = (category: FishboneCategory) => {
    const deptObj = departments.find((d) => d.code === selectedDept);
    setFacCategory(category);
    setFacTitleTh('');
    setFacTitleEn('');
    setFacTarget('100');
    setFacActual('95');
    setFacUnit('%');
    setFacDirection('higher-better');
    setFacOwner(deptObj?.headName ?? currentUser.nameTh);
    setFacDocNo('');
    setFacActionPlan('');
    setFactorModal({ open: true, category });
  };

  const openEditFactorModal = (factor: FishboneFactor) => {
    setFacCategory(factor.category);
    setFacTitleTh(factor.titleTh);
    setFacTitleEn(factor.titleEn);
    setFacTarget(String(factor.targetValue));
    setFacActual(String(factor.actualValue));
    setFacUnit(factor.unit);
    setFacDirection(factor.direction);
    setFacOwner(factor.ownerName);
    setFacDocNo(factor.linkedDocNumber ?? '');
    setFacActionPlan(factor.actionPlan ?? '');
    setFactorModal({ open: true, category: factor.category, editingFactor: factor });
  };

  const handleSaveFactor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFishbone || !facTitleTh.trim()) return;

    const entry: FishboneFactor = {
      id: factorModal.editingFactor?.id ?? `fbf-${Date.now()}`,
      category: facCategory,
      titleTh: facTitleTh.trim(),
      titleEn: facTitleEn.trim() || facTitleTh.trim(),
      metricLabel: facTitleTh.trim(),
      targetValue: Number(facTarget) || 0,
      actualValue: Number(facActual) || 0,
      unit: facUnit.trim() || '%',
      direction: facDirection,
      ownerName: facOwner.trim() || currentUser.nameTh,
      linkedDocNumber: facDocNo.trim() || undefined,
      actionPlan: facActionPlan.trim() || undefined,
    };

    const nextFactors = factorModal.editingFactor
      ? currentFishbone.factors.map((f) => (f.id === entry.id ? entry : f))
      : [...currentFishbone.factors, entry];

    onUpsertFishbone({
      ...currentFishbone,
      updatedAt: todayStr,
      factors: nextFactors,
    });
    setFactorModal({ open: false, category: 'Man' });
  };

  const handleDeleteFactor = (factorId: string) => {
    if (!currentFishbone) return;
    onUpsertFishbone({
      ...currentFishbone,
      updatedAt: todayStr,
      factors: currentFishbone.factors.filter((f) => f.id !== factorId),
    });
  };

  const handleExportFishboneCsv = () => {
    if (!currentFishbone) return;
    const headers = [
      'Department',
      'Period',
      'Main KPI',
      'Category (6M)',
      'Sub-KPI Factor (TH)',
      'Sub-KPI Factor (EN)',
      'Actual',
      'Target',
      'Unit',
      'Status',
      'Linked Doc',
      'Owner',
      'Action Plan',
    ];
    const rows = currentFishbone.factors.map((f) => [
      currentFishbone.department,
      currentFishbone.period,
      `"${currentFishbone.mainKpiTitleTh.replace(/"/g, '""')}"`,
      f.category,
      `"${f.titleTh.replace(/"/g, '""')}"`,
      `"${f.titleEn.replace(/"/g, '""')}"`,
      f.actualValue,
      f.targetValue,
      f.unit,
      isFactorMet(f) ? 'On Target' : 'Below Target',
      f.linkedDocNumber ?? '',
      `"${f.ownerName}"`,
      `"${(f.actionPlan ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fishbone-kpi-${currentFishbone.department}-${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Summary metrics for ISO Summary tab
  const summary = computeDccKpis(documents, dars, departments, todayStr, targets);
  const canEditTargets =
    Boolean(currentUser.isAdmin) ||
    currentUser.role === 'Document Controller' ||
    currentUser.role === 'QMR / Approver';

  const activeDocsList = documents.filter((d) => d.status === 'Active');

  return (
    <div className="space-y-6">
      {/* Top Mode Switcher: Departmental Fishbone KPI vs ISO System KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('fishbone')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'fishbone'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t(lang, 'fishboneTab')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'summary'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t(lang, 'isoSummaryTab')}
          </button>
        </div>

        {activeTab === 'fishbone' && currentFishbone && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportFishboneCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(lang, 'exportCsv')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'พิมพ์ผังก้างปลา' : 'Print Fishbone'}</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'fishbone' ? (
        <div className="space-y-6">
          {/* Department Selector Strip */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {departments.map((dept) => {
                  const deptFb = fishbones.find((f) => f.department === dept.code);
                  const isSelected = selectedDept === dept.code;
                  const met = deptFb ? isHeadMet(deptFb) : true;
                  return (
                    <button
                      key={dept.code}
                      type="button"
                      onClick={() => setSelectedDept(dept.code)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap flex items-center gap-2 ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="font-mono font-semibold">{dept.code}</span>
                      <span>{lang === 'th' ? dept.nameTh : dept.nameEn}</span>
                      {deptFb && (
                        <span
                          className={`font-mono tabular-nums text-[11px] ${
                            isSelected
                              ? 'text-slate-200'
                              : met
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {deptFb.actualValue}
                          {deptFb.unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {canEditDept && (
                <div className="flex items-center gap-2 shrink-0">
                  {deptSheets.length > 1 && (
                    <select
                      value={selectedSheetId}
                      onChange={(e) => setSelectedSheetId(e.target.value)}
                      className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {deptSheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.period} — {lang === 'th' ? s.mainKpiTitleTh : s.mainKpiTitleEn}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={openCreateHeadModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t(lang, 'fishboneAddSheet')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {!currentFishbone ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 px-6 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {lang === 'th'
                  ? `ยังไม่มีข้อมูล KPI แบบก้างปลาสำหรับแผนก ${selectedDept}`
                  : `No Fishbone KPI configured for ${selectedDept} yet`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'th'
                  ? 'กดปุ่มด้านล่างเพื่อกำหนดเป้าหมายหลัก (หัวปลา) และเพิ่มก้างย่อย 6M ของแผนก'
                  : 'Create the main department KPI goal (Fish Head) and add 6M sub-KPIs.'}
              </p>
              {canEditDept && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={openCreateHeadModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t(lang, 'fishboneAddSheet')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Interactive Ishikawa Fishbone Diagram */}
              <FishboneDiagram
                lang={lang}
                fishbone={currentFishbone}
                canEdit={canEditDept}
                onAddFactor={openAddFactorModal}
                onEditFactor={openEditFactorModal}
                onEditHead={openEditHeadModal}
              />

              {/* Structured 6M Fishbone Entry Table */}
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lang === 'th'
                        ? `ตารางลงข้อมูล KPI ก้างปลา แผนก ${currentFishbone.department} (${currentFishbone.period})`
                        : `Department ${currentFishbone.department} 6M Fishbone KPI Entries (${currentFishbone.period})`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'th'
                        ? 'คลิกที่ก้างย่อยในแผนผังหรือใช้ปุ่มด้านขวาเพื่อเพิ่ม/แก้ไขตัวชี้วัดตามโครงสร้าง 6M'
                        : 'Add or update sub-KPIs across Man, Machine, Method, Material, Measurement, and Environment.'}
                    </p>
                  </div>
                  {canEditDept && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openEditHeadModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{t(lang, 'fishboneEditHead')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddFactorModal('Man')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t(lang, 'fishboneAddFactor')}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-5 whitespace-nowrap">
                          {lang === 'th' ? 'หมวดหมู่ (6M)' : 'Category (6M)'}
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          {lang === 'th' ? 'ปัจจัย / ตัวชี้วัดย่อย' : 'Factor / Sub-KPI'}
                        </th>
                        <th className="py-3 px-3 whitespace-nowrap text-right">
                          {lang === 'th' ? 'ผลลัพธ์จริง' : 'Actual'}
                        </th>
                        <th className="py-3 px-3 whitespace-nowrap text-right">
                          {t(lang, 'kpiTargetPrefix')}
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          {t(lang, 'colStatus')}
                        </th>
                        <th className="py-3 px-3 whitespace-nowrap">
                          {lang === 'th' ? 'เอกสารอ้างอิง' : 'Linked Doc'}
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          {t(lang, 'colOwner')}
                        </th>
                        {canEditDept && (
                          <th className="py-3 px-5 whitespace-nowrap text-right no-print">
                            {t(lang, 'colActions')}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {currentFishbone.factors.length === 0 ? (
                        <tr>
                          <td
                            colSpan={canEditDept ? 8 : 7}
                            className="py-10 text-center text-slate-500 dark:text-slate-400"
                          >
                            {lang === 'th'
                              ? 'ยังไม่มีรายการก้างย่อย กด "+ เพิ่มข้อมูล KPI ก้างย่อย" เพื่อเริ่มต้นบันทึก'
                              : 'No 6M entries yet. Click Add Sub-KPI Factor to begin.'}
                          </td>
                        </tr>
                      ) : (
                        currentFishbone.factors.map((factor) => {
                          const met = isFactorMet(factor);
                          return (
                            <tr
                              key={factor.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3 px-5 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {factor.category}
                              </td>
                              <td className="py-3 px-4 max-w-sm">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {lang === 'th' ? factor.titleTh : factor.titleEn}
                                </div>
                                {factor.actionPlan && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {factor.actionPlan}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {factor.actualValue} {factor.unit}
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {factor.direction === 'higher-better' ? '≥' : '≤'}{' '}
                                {factor.targetValue} {factor.unit}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {met ? (
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
                              </td>
                              <td className="py-3 px-3 font-mono whitespace-nowrap">
                                {factor.linkedDocNumber ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenDocumentByNumber(factor.linkedDocNumber!)
                                    }
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {factor.linkedDocNumber}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {factor.ownerName}
                              </td>
                              {canEditDept && (
                                <td className="py-3 px-5 text-right whitespace-nowrap no-print">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditFactorModal(factor)}
                                      className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFactor(factor.id)}
                                      className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      ) : (
        /* ISO Document Control System Summary Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: t(lang, 'kpiOnTimeReview'),
                value: `${summary.onTimeReviewRate}%`,
                sub: `${summary.activeCount - summary.overdueCount}/${summary.activeCount} ${t(lang, 'kpiUnitDocs')}`,
                target: `≥ ${targets.onTimeReviewPct}%`,
                met: summary.onTimeReviewRate >= targets.onTimeReviewPct,
                icon: Clock,
                nav: 'master-list' as NavSection,
              },
              {
                label: t(lang, 'kpiAckRate'),
                value: `${summary.ackRate}%`,
                sub: `${summary.ackedRecipients}/${summary.totalRecipients}`,
                target: `≥ ${targets.ackRatePct}%`,
                met: summary.ackRate >= targets.ackRatePct,
                icon: CheckCircle2,
                nav: 'master-list' as NavSection,
              },
              {
                label: t(lang, 'kpiAvgDarDays'),
                value: `${summary.avgDarTurnaroundDays}`,
                sub: t(lang, 'kpiDaysUnit'),
                target: `≤ ${targets.darSlaDays} ${t(lang, 'kpiDaysUnit')}`,
                met: summary.avgDarTurnaroundDays <= targets.darSlaDays,
                icon: Gauge,
                nav: 'dar-workflow' as NavSection,
              },
              {
                label: t(lang, 'kpiFirstPass'),
                value: `${summary.firstPassRate}%`,
                sub: `${summary.publishedDarsCount}/${summary.publishedDarsCount + summary.rejectedDarsCount} DAR`,
                target: `≥ ${targets.firstPassPct}%`,
                met: summary.firstPassRate >= targets.firstPassPct,
                icon: FileCheck2,
                nav: 'dar-workflow' as NavSection,
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onNavigate(card.nav)}
                  className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>{card.label}</span>
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white">
                      {card.value}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {card.sub}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {t(lang, 'kpiTargetPrefix')} {card.target}
                    </span>
                    {card.met ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t(lang, 'kpiOnTarget')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{t(lang, 'kpiBelowTarget')}</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t(lang, 'kpiDeptComplianceTitle')}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-5">{t(lang, 'colDept')}</th>
                    <th className="py-3 px-4 text-right">{t(lang, 'kpiTotalActive')}</th>
                    <th className="py-3 px-4 text-right">{t(lang, 'kpiOverdueDocs')}</th>
                    <th className="py-3 px-4 text-right">{t(lang, 'kpiPendingDar')}</th>
                    <th className="py-3 px-4 text-right">{t(lang, 'kpiAckRate')}</th>
                    <th className="py-3 px-5">{t(lang, 'colStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {summary.departmentRows.map((row) => (
                    <tr key={row.code}>
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-semibold mr-2">{row.code}</span>
                        <span>{lang === 'th' ? row.nameTh : row.nameEn}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {row.activeDocs}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {row.overdueDocs}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {row.pendingDars}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {row.ackRate}%
                      </td>
                      <td className="py-3.5 px-5">
                        {row.onTarget ? (
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t(lang, 'kpiTargetSettingsTitle')}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t(lang, 'kpiOnTimeReview')} (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  disabled={!canEditTargets}
                  value={targets.onTimeReviewPct}
                  onChange={(e) =>
                    onUpdateTargets({
                      ...targets,
                      onTimeReviewPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t(lang, 'kpiAckRate')} (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  disabled={!canEditTargets}
                  value={targets.ackRatePct}
                  onChange={(e) =>
                    onUpdateTargets({
                      ...targets,
                      ackRatePct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t(lang, 'kpiAvgDarDays')} (SLA)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  disabled={!canEditTargets}
                  value={targets.darSlaDays}
                  onChange={(e) =>
                    onUpdateTargets({
                      ...targets,
                      darSlaDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t(lang, 'kpiFirstPass')} (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  disabled={!canEditTargets}
                  value={targets.firstPassPct}
                  onChange={(e) =>
                    onUpdateTargets({
                      ...targets,
                      firstPassPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modal: Edit / Create Fishbone Head KPI */}
      {headModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setHeadModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isCreatingNewSheet
                  ? `${t(lang, 'fishboneAddSheet')} (${selectedDept})`
                  : `${t(lang, 'fishboneEditHead')} (${selectedDept})`}
              </h3>
              <button
                type="button"
                onClick={() => setHeadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveHead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'รอบติดตามผล (Period)' : 'Period'}
                  </label>
                  <input
                    type="text"
                    required
                    value={headPeriod}
                    onChange={(e) => setHeadPeriod(e.target.value)}
                    placeholder="Q4 / 2026"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'colOwner')}
                  </label>
                  <input
                    type="text"
                    value={headOwner}
                    onChange={(e) => setHeadOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อเป้าหมาย KPI หลัก (ภาษาไทย) *' : 'Main KPI Goal (TH) *'}
                </label>
                <input
                  type="text"
                  required
                  value={headTitleTh}
                  onChange={(e) => setHeadTitleTh(e.target.value)}
                  placeholder="เช่น ลดอัตราของเสียในสายการผลิต..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อเป้าหมาย KPI หลัก (ภาษาอังกฤษ)' : 'Main KPI Goal (EN)'}
                </label>
                <input
                  type="text"
                  value={headTitleEn}
                  onChange={(e) => setHeadTitleEn(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'ผลจริง' : 'Actual'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={headActual}
                    onChange={(e) => setHeadActual(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'kpiTargetPrefix')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={headTarget}
                    onChange={(e) => setHeadTarget(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'หน่วย' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    required
                    value={headUnit}
                    onChange={(e) => setHeadUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'เกณฑ์' : 'Rule'}
                  </label>
                  <select
                    value={headDirection}
                    onChange={(e) =>
                      setHeadDirection(
                        e.target.value as 'higher-better' | 'lower-better'
                      )
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="higher-better">≥ (สูงดี)</option>
                    <option value="lower-better">≤ (ต่ำดี)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHeadModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึกข้อมูล' : 'Save KPI Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit 6M Sub-KPI Factor */}
      {factorModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setFactorModal({ open: false, category: 'Man' })}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {factorModal.editingFactor
                  ? lang === 'th'
                    ? 'แก้ไขข้อมูล KPI ก้างย่อย'
                    : 'Edit Sub-KPI Factor'
                  : t(lang, 'fishboneAddFactor')}
              </h3>
              <button
                type="button"
                onClick={() => setFactorModal({ open: false, category: 'Man' })}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveFactor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'หมวดหมู่ก้างปลา (6M)' : 'Fishbone Branch (6M)'}
                </label>
                <select
                  value={facCategory}
                  onChange={(e) => setFacCategory(e.target.value as FishboneCategory)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อปัจจัย / ตัวชี้วัดย่อย (ภาษาไทย) *' : 'Factor / Sub-KPI (TH) *'}
                </label>
                <input
                  type="text"
                  required
                  value={facTitleTh}
                  onChange={(e) => setFacTitleTh(e.target.value)}
                  placeholder="เช่น อัตราการผ่านการฝึกอบรมหน้างาน (OJT)..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ชื่อปัจจัย / ตัวชี้วัดย่อย (ภาษาอังกฤษ)' : 'Factor / Sub-KPI (EN)'}
                </label>
                <input
                  type="text"
                  value={facTitleEn}
                  onChange={(e) => setFacTitleEn(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'ผลจริง' : 'Actual'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={facActual}
                    onChange={(e) => setFacActual(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'kpiTargetPrefix')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={facTarget}
                    onChange={(e) => setFacTarget(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'หน่วย' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    required
                    value={facUnit}
                    onChange={(e) => setFacUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'เกณฑ์' : 'Rule'}
                  </label>
                  <select
                    value={facDirection}
                    onChange={(e) =>
                      setFacDirection(
                        e.target.value as 'higher-better' | 'lower-better'
                      )
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="higher-better">≥ (สูงดี)</option>
                    <option value="lower-better">≤ (ต่ำดี)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'เอกสารควบคุมที่อ้างอิง' : 'Linked Controlled Doc'}
                  </label>
                  <select
                    value={facDocNo}
                    onChange={(e) => setFacDocNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">
                      {lang === 'th' ? '— ไม่ระบุเอกสาร —' : '— None —'}
                    </option>
                    {activeDocsList.map((d) => (
                      <option key={d.id} value={d.docNumber}>
                        {d.docNumber} ({d.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t(lang, 'colOwner')}
                  </label>
                  <input
                    type="text"
                    value={facOwner}
                    onChange={(e) => setFacOwner(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'แผนแก้ไข / มาตรการติดตาม (ถ้ามี)' : 'Action Plan (optional)'}
                </label>
                <input
                  type="text"
                  value={facActionPlan}
                  onChange={(e) => setFacActionPlan(e.target.value)}
                  placeholder={lang === 'th' ? 'ระบุแนวทางแก้ไขหรือติดตามผล...' : 'Optional corrective action...'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFactorModal({ open: false, category: 'Man' })}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึกข้อมูล' : 'Save Factor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
