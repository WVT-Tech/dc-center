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
  KaizenImmediateAction,
  KaizenPreventiveAction,
  KpiTargets,
  Language,
  NavSection,
  RoleDefinition,
  UserProfile,
} from '../types/dcc';
import { t } from '../i18n/translations';
import { computeDccKpis } from '../utils/kpiMetrics';
import {
  getCategoryLabel,
  isFactorMet,
  isHeadMet,
} from './FishboneDiagram';
import {
  EN_MONTH_ABBR,
  KaizenKpiReport,
  THAI_MONTH_ABBR,
} from './KaizenKpiReport';

interface KpiViewProps {
  lang: Language;
  documents: ControlledDocument[];
  dars: DocumentActionRequest[];
  departments: DepartmentInfo[];
  fishbones: DepartmentKpiFishbone[];
  roles: RoleDefinition[];
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
  roles,
  todayStr,
  targets,
  currentUser,
  onUpdateTargets,
  onUpsertFishbone,
  onNavigate,
  onOpenDocumentByNumber,
}) => {
  const userRoleDef = useMemo(
    () =>
      roles.find(
        (r) =>
          (currentUser.roleId && r.id === currentUser.roleId) ||
          (r.name === currentUser.role &&
            (r.department === currentUser.department || r.department === 'ALL'))
      ),
    [roles, currentUser]
  );

  const hasAllDeptKpiAccess =
    Boolean(currentUser.isAdmin) ||
    currentUser.username.toLowerCase() === 'dcc' ||
    userRoleDef?.department === 'ALL';

  const effectiveDept =
    userRoleDef && userRoleDef.department !== 'ALL'
      ? userRoleDef.department
      : currentUser.department;

  const visibleDepartments = useMemo(
    () =>
      hasAllDeptKpiAccess
        ? departments
        : departments.filter((d) => d.code === effectiveDept),
    [departments, hasAllDeptKpiAccess, effectiveDept]
  );

  const [activeTab, setActiveTab] = useState<'fishbone' | 'summary'>('fishbone');
  const [selectedDept, setSelectedDept] = useState<string>(
    hasAllDeptKpiAccess ? departments[0]?.code ?? effectiveDept : effectiveDept
  );

  useEffect(() => {
    if (!hasAllDeptKpiAccess) {
      setSelectedDept(effectiveDept);
    } else if (!departments.some((d) => d.code === selectedDept) && departments[0]) {
      setSelectedDept(departments[0].code);
    }
  }, [hasAllDeptKpiAccess, effectiveDept, departments, selectedDept]);

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

  // Permissions: Admin ('dcc') / global role can edit any dept; department-scoped roles can edit their own dept
  const canEditDept = hasAllDeptKpiAccess || effectiveDept === selectedDept;

  // Head form state (with Kaizen Header fields)
  const [headPeriod, setHeadPeriod] = useState('Q4 / 2026');
  const [headKpiCode, setHeadKpiCode] = useState('');
  const [headMonthLabel, setHeadMonthLabel] = useState('พฤศจิกายน');
  const [headYearLabel, setHeadYearLabel] = useState('2569');
  const [headPrevYearAvg, setHeadPrevYearAvg] = useState('0');
  const [headTitleTh, setHeadTitleTh] = useState('');
  const [headTitleEn, setHeadTitleEn] = useState('');
  const [headTarget, setHeadTarget] = useState('0');
  const [headActual, setHeadActual] = useState('0');
  const [headUnit, setHeadUnit] = useState('ครั้ง');
  const [headDirection, setHeadDirection] = useState<'higher-better' | 'lower-better'>(
    'lower-better'
  );
  const [headOwner, setHeadOwner] = useState('');

  // Monthly 12-month statistics modal
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [monthlyDraft, setMonthlyDraft] = useState<string[]>(Array(12).fill(''));

  // Part 1 Immediate Action modal
  const [immediateModal, setImmediateModal] = useState<{
    open: boolean;
    editing?: KaizenImmediateAction;
  }>({ open: false });
  const [immProblem, setImmProblem] = useState('');
  const [immResp, setImmResp] = useState('');
  const [immAction, setImmAction] = useState('');
  const [immDue, setImmDue] = useState('');

  // Part 2 Preventive Action modal
  const [preventiveModal, setPreventiveModal] = useState<{
    open: boolean;
    editing?: KaizenPreventiveAction;
  }>({ open: false });
  const [prevPlan, setPrevPlan] = useState('');
  const [prevResp, setPrevResp] = useState('');
  const [prevDue, setPrevDue] = useState('');
  const [prevRemark, setPrevRemark] = useState('');

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
    setHeadPeriod('2569');
    setHeadKpiCode(`KPI-${selectedDept}-${String(deptSheets.length + 1).padStart(2, '0')}`);
    setHeadMonthLabel('พฤศจิกายน');
    setHeadYearLabel('2569');
    setHeadPrevYearAvg('0');
    setHeadTitleTh('');
    setHeadTitleEn('');
    setHeadTarget('0');
    setHeadActual('0');
    setHeadUnit('ครั้ง');
    setHeadDirection('lower-better');
    setHeadOwner(deptObj?.headName ?? currentUser.nameTh);
    setHeadModalOpen(true);
  };

  const openEditHeadModal = () => {
    if (!currentFishbone) return;
    setIsCreatingNewSheet(false);
    setHeadPeriod(currentFishbone.period);
    setHeadKpiCode(currentFishbone.kpiCode ?? `KPI-${currentFishbone.department}-01`);
    setHeadMonthLabel(currentFishbone.monthLabel ?? 'พฤศจิกายน');
    setHeadYearLabel(currentFishbone.yearLabel ?? '2569');
    setHeadPrevYearAvg(String(currentFishbone.prevYearAvg ?? 0));
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
          period: headPeriod.trim() || headYearLabel.trim() || '2569',
          mainKpiTitleTh: headTitleTh.trim(),
          mainKpiTitleEn: headTitleEn.trim() || headTitleTh.trim(),
          targetValue: Number(headTarget) || 0,
          actualValue: Number(headActual) || 0,
          unit: headUnit.trim() || '%',
          direction: headDirection,
          ownerName: headOwner.trim() || currentUser.nameTh,
          updatedAt: todayStr,
          factors: [],
          kpiCode: headKpiCode.trim() || `KPI-${selectedDept}-01`,
          monthLabel: headMonthLabel.trim() || 'พฤศจิกายน',
          yearLabel: headYearLabel.trim() || '2569',
          prevYearAvg: Number(headPrevYearAvg) || 0,
          monthlyActuals: Array(12).fill(null),
          immediateActions: [],
          preventiveActions: [],
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
          kpiCode: headKpiCode.trim() || currentFishbone.kpiCode,
          monthLabel: headMonthLabel.trim() || currentFishbone.monthLabel,
          yearLabel: headYearLabel.trim() || currentFishbone.yearLabel,
          prevYearAvg: Number(headPrevYearAvg) || 0,
          updatedAt: todayStr,
        };

    onUpsertFishbone(nextFb);
    setSelectedSheetId(nextFb.id);
    setHeadModalOpen(false);
  };

  const openMonthlyModal = () => {
    if (!currentFishbone) return;
    const draft = Array.from({ length: 12 }, (_, idx) => {
      const v = currentFishbone.monthlyActuals?.[idx];
      return typeof v === 'number' && !Number.isNaN(v) ? String(v) : '';
    });
    setMonthlyDraft(draft);
    setMonthlyModalOpen(true);
  };

  const handleSaveMonthlyStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFishbone) return;
    const parsed: (number | null)[] = monthlyDraft.map((s) => {
      const trimmed = s.trim();
      if (trimmed === '') return null;
      const num = Number(trimmed);
      return Number.isNaN(num) ? null : num;
    });
    const filled = parsed.filter((v): v is number => v !== null);
    const latestActual =
      filled.length > 0 ? filled[filled.length - 1] : currentFishbone.actualValue;

    onUpsertFishbone({
      ...currentFishbone,
      actualValue: latestActual,
      monthlyActuals: parsed,
      updatedAt: todayStr,
    });
    setMonthlyModalOpen(false);
  };

  const openAddImmediateModal = () => {
    const deptObj = departments.find((d) => d.code === selectedDept);
    setImmProblem('');
    setImmResp(deptObj?.headName ?? currentUser.nameTh);
    setImmAction('');
    setImmDue(todayStr);
    setImmediateModal({ open: true });
  };

  const openEditImmediateModal = (item: KaizenImmediateAction) => {
    setImmProblem(item.problemFound);
    setImmResp(item.responsible);
    setImmAction(item.immediateAction);
    setImmDue(item.dueDate);
    setImmediateModal({ open: true, editing: item });
  };

  const handleSaveImmediate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFishbone || !immProblem.trim()) return;
    const entry: KaizenImmediateAction = {
      id: immediateModal.editing?.id ?? `imm-${Date.now()}`,
      problemFound: immProblem.trim(),
      responsible: immResp.trim() || currentUser.nameTh,
      immediateAction: immAction.trim(),
      dueDate: immDue.trim() || todayStr,
    };
    const existing = currentFishbone.immediateActions ?? [];
    const nextList = immediateModal.editing
      ? existing.map((x) => (x.id === entry.id ? entry : x))
      : [...existing, entry];

    onUpsertFishbone({
      ...currentFishbone,
      immediateActions: nextList,
      updatedAt: todayStr,
    });
    setImmediateModal({ open: false });
  };

  const handleDeleteImmediate = (id: string) => {
    if (!currentFishbone) return;
    onUpsertFishbone({
      ...currentFishbone,
      immediateActions: (currentFishbone.immediateActions ?? []).filter((x) => x.id !== id),
      updatedAt: todayStr,
    });
  };

  const openAddPreventiveModal = () => {
    const deptObj = departments.find((d) => d.code === selectedDept);
    setPrevPlan('');
    setPrevResp(deptObj?.headName ?? currentUser.nameTh);
    setPrevDue(todayStr);
    setPrevRemark('');
    setPreventiveModal({ open: true });
  };

  const openEditPreventiveModal = (item: KaizenPreventiveAction) => {
    setPrevPlan(item.longTermPlan);
    setPrevResp(item.responsible);
    setPrevDue(item.dueDate);
    setPrevRemark(item.remark);
    setPreventiveModal({ open: true, editing: item });
  };

  const handleSavePreventive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFishbone || !prevPlan.trim()) return;
    const entry: KaizenPreventiveAction = {
      id: preventiveModal.editing?.id ?? `prev-${Date.now()}`,
      longTermPlan: prevPlan.trim(),
      responsible: prevResp.trim() || currentUser.nameTh,
      dueDate: prevDue.trim() || todayStr,
      remark: prevRemark.trim(),
    };
    const existing = currentFishbone.preventiveActions ?? [];
    const nextList = preventiveModal.editing
      ? existing.map((x) => (x.id === entry.id ? entry : x))
      : [...existing, entry];

    onUpsertFishbone({
      ...currentFishbone,
      preventiveActions: nextList,
      updatedAt: todayStr,
    });
    setPreventiveModal({ open: false });
  };

  const handleDeletePreventive = (id: string) => {
    if (!currentFishbone) return;
    onUpsertFishbone({
      ...currentFishbone,
      preventiveActions: (currentFishbone.preventiveActions ?? []).filter((x) => x.id !== id),
      updatedAt: todayStr,
    });
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

  // Summary metrics for ISO Summary tab (scoped to user's department unless global role)
  const scopedDocuments = useMemo(
    () =>
      hasAllDeptKpiAccess
        ? documents
        : documents.filter((d) => d.department === effectiveDept),
    [documents, hasAllDeptKpiAccess, effectiveDept]
  );
  const scopedDars = useMemo(
    () =>
      hasAllDeptKpiAccess
        ? dars
        : dars.filter((d) => d.department === effectiveDept),
    [dars, hasAllDeptKpiAccess, effectiveDept]
  );

  const summary = computeDccKpis(
    scopedDocuments,
    scopedDars,
    visibleDepartments,
    todayStr,
    targets
  );
  const canEditTargets =
    Boolean(currentUser.isAdmin) ||
    currentUser.username.toLowerCase() === 'dcc' ||
    userRoleDef?.department === 'ALL';

  const activeDocsList = scopedDocuments.filter((d) => d.status === 'Active');

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
              <span>{lang === 'th' ? 'พิมพ์รายงาน KPI' : 'Print KPI Report'}</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'fishbone' ? (
        <div className="space-y-6">
          {/* Department Selector Strip */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 no-print">
            {!hasAllDeptKpiAccess && (
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {lang === 'th'
                  ? `สิทธิ์การเข้าถึง: แสดงเฉพาะตัวชี้วัดคุณภาพของแผนก ${effectiveDept} (${currentUser.role})`
                  : `Access Scope: Showing KPI data strictly for department ${effectiveDept} (${currentUser.role})`}
              </div>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {visibleDepartments.map((dept) => {
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
              {/* Kaizen KPI Report Form Sheet (Header + Monthly Line Chart + 5M1E Fishbone + Part 1/2 Actions) */}
              <KaizenKpiReport
                lang={lang}
                fishbone={currentFishbone}
                departmentInfo={departments.find((d) => d.code === currentFishbone.department)}
                canEdit={canEditDept}
                onEditHead={openEditHeadModal}
                onEditMonthlyStats={openMonthlyModal}
                onAddFactor={openAddFactorModal}
                onEditFactor={openEditFactorModal}
                onAddImmediate={openAddImmediateModal}
                onEditImmediate={openEditImmediateModal}
                onDeleteImmediate={handleDeleteImmediate}
                onAddPreventive={openAddPreventiveModal}
                onEditPreventive={openEditPreventiveModal}
                onDeletePreventive={handleDeletePreventive}
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

      {/* Modal: Edit / Create Kaizen KPI Header & Main Goal */}
      {headModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setHeadModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
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
            <form onSubmit={handleSaveHead} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    KPI Code
                  </label>
                  <input
                    type="text"
                    value={headKpiCode}
                    onChange={(e) => setHeadKpiCode(e.target.value)}
                    placeholder={`KPI-${selectedDept}-01`}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'เดือนที่รายงาน' : 'Month'}
                  </label>
                  <input
                    type="text"
                    value={headMonthLabel}
                    onChange={(e) => setHeadMonthLabel(e.target.value)}
                    placeholder="พฤศจิกายน"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'พ.ศ. / ปี' : 'Year'}
                  </label>
                  <input
                    type="text"
                    value={headYearLabel}
                    onChange={(e) => setHeadYearLabel(e.target.value)}
                    placeholder="2569"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'รอบ (Period)' : 'Period'}
                  </label>
                  <input
                    type="text"
                    required
                    value={headPeriod}
                    onChange={(e) => setHeadPeriod(e.target.value)}
                    placeholder="2569"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th'
                    ? 'หัวข้อการปรับปรุง / KPI หลัก (ภาษาไทย) *'
                    : 'Kaizen Topic / Main KPI (TH) *'}
                </label>
                <input
                  type="text"
                  required
                  value={headTitleTh}
                  onChange={(e) => setHeadTitleTh(e.target.value)}
                  placeholder="เช่น จำนวนการรับคืนสินค้าที่เกิดความเสียหายจากการจัดส่ง"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'หัวข้อ KPI (ภาษาอังกฤษ)' : 'Main KPI Goal (EN)'}
                  </label>
                  <input
                    type="text"
                    value={headTitleEn}
                    onChange={(e) => setHeadTitleEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
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
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'เฉลี่ยปีก่อน' : 'Prev Avg'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={headPrevYearAvg}
                    onChange={(e) => setHeadPrevYearAvg(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
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
                    className="w-full px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
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
                  {lang === 'th' ? 'บันทึกข้อมูล' : 'Save KPI Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit 12-Month Trend Statistics */}
      {monthlyModalOpen && currentFishbone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMonthlyModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {lang === 'th'
                  ? `บันทึกสถิติรายเดือน (${currentFishbone.unit})`
                  : `Monthly Trend Data (${currentFishbone.unit})`}
              </h3>
              <button
                type="button"
                onClick={() => setMonthlyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMonthlyStats} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'th'
                  ? 'กรอกผลลัพธ์จริงของแต่ละเดือน (ปล่อยว่างสำหรับเดือนที่ยังไม่ถึง) ระบบจะอัปเดตกราฟเส้นและค่าล่าสุดอัตโนมัติ'
                  : 'Enter actual values for each month (leave future months blank).'}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {(lang === 'th' ? THAI_MONTH_ABBR : EN_MONTH_ABBR).map((mLabel, idx) => (
                  <div key={mLabel}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {mLabel}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={monthlyDraft[idx] ?? ''}
                      onChange={(e) => {
                        const next = [...monthlyDraft];
                        next[idx] = e.target.value;
                        setMonthlyDraft(next);
                      }}
                      placeholder="—"
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMonthlyModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึกสถิติรายเดือน' : 'Save Monthly Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Part 1 Immediate Containment Action */}
      {immediateModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setImmediateModal({ open: false })}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {lang === 'th'
                  ? 'ส่วนที่ 1 : การดำเนินการแก้ไขเบื้องต้น'
                  : 'Part 1 : Immediate Containment Action'}
              </h3>
              <button
                type="button"
                onClick={() => setImmediateModal({ open: false })}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveImmediate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'ปัญหาที่พบ (สาเหตุสุดท้าย) *' : 'Problem / Root Cause Found *'}
                </label>
                <input
                  type="text"
                  required
                  value={immProblem}
                  onChange={(e) => setImmProblem(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'การดำเนินการเบื้องต้น *' : 'Immediate Action *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={immAction}
                  onChange={(e) => setImmAction(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'ผู้รับผิดชอบ' : 'Responsible'}
                  </label>
                  <input
                    type="text"
                    value={immResp}
                    onChange={(e) => setImmResp(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'กำหนดเสร็จ' : 'Due Date'}
                  </label>
                  <input
                    type="text"
                    value={immDue}
                    onChange={(e) => setImmDue(e.target.value)}
                    placeholder="2026-11-30"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImmediateModal({ open: false })}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึกรายการ' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Part 2 Preventive Action */}
      {preventiveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setPreventiveModal({ open: false })}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {lang === 'th'
                  ? 'ส่วนที่ 2 : การปฏิบัติป้องกันปัญหาซ้ำ'
                  : 'Part 2 : Long-Term Preventive Action'}
              </h3>
              <button
                type="button"
                onClick={() => setPreventiveModal({ open: false })}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePreventive} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th'
                    ? 'แนวทางแก้ไขป้องกันปัญหาระยะยาว *'
                    : 'Long-Term Preventive Plan *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={prevPlan}
                  onChange={(e) => setPrevPlan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'ผู้รับผิดชอบ' : 'Responsible'}
                  </label>
                  <input
                    type="text"
                    value={prevResp}
                    onChange={(e) => setPrevResp(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {lang === 'th' ? 'กำหนดเสร็จ' : 'Due Date'}
                  </label>
                  <input
                    type="text"
                    value={prevDue}
                    onChange={(e) => setPrevDue(e.target.value)}
                    placeholder="2026-12-15"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {lang === 'th' ? 'หมายเหตุ' : 'Remark'}
                </label>
                <input
                  type="text"
                  value={prevRemark}
                  onChange={(e) => setPrevRemark(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreventiveModal({ open: false })}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {t(lang, 'cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  {lang === 'th' ? 'บันทึกรายการ' : 'Save Item'}
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
