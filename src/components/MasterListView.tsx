import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Download,
  FilePlus2,
  Printer,
  Search,
} from 'lucide-react';
import {
  ControlledDocument,
  DepartmentInfo,
  DocStatus,
  DocType,
  Language,
} from '../types/dcc';
import { t } from '../i18n/translations';
import { DocStatusLabel } from './StatusLabel';

interface MasterListViewProps {
  lang: Language;
  documents: ControlledDocument[];
  departments: DepartmentInfo[];
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onOpenDocument: (docId: string) => void;
  onCreateNewDar: () => void;
}

type SortKey = 'docNumber' | 'title' | 'revision' | 'effectiveDate' | 'nextReviewDate';

const DOC_TYPES: ('ALL' | DocType)[] = ['ALL', 'QM', 'QP', 'WI', 'FM', 'SD', 'EXT'];

export const MasterListView: React.FC<MasterListViewProps> = ({
  lang,
  documents,
  departments,
  globalSearch,
  onGlobalSearchChange,
  onOpenDocument,
  onCreateNewDar,
}) => {
  const [selectedType, setSelectedType] = useState<'ALL' | DocType>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | DocStatus>('Active');
  const [sortKey, setSortKey] = useState<SortKey>('docNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filteredDocs = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return documents
      .filter((doc) => {
        if (selectedType !== 'ALL' && doc.type !== selectedType) return false;
        if (selectedDept !== 'ALL' && doc.department !== selectedDept) return false;
        if (selectedStatus !== 'ALL' && doc.status !== selectedStatus) return false;
        if (q) {
          const hay = `${doc.docNumber} ${doc.titleTh} ${doc.titleEn} ${doc.department} ${doc.ownerName} ${doc.isoClause}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const valA =
          sortKey === 'title'
            ? lang === 'th'
              ? a.titleTh
              : a.titleEn
            : a[sortKey];
        const valB =
          sortKey === 'title'
            ? lang === 'th'
              ? b.titleTh
              : b.titleEn
            : b[sortKey];
        const cmp = String(valA).localeCompare(String(valB));
        return sortAsc ? cmp : -cmp;
      });
  }, [documents, selectedType, selectedDept, selectedStatus, globalSearch, sortKey, sortAsc, lang]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Doc Number',
      'Title (TH)',
      'Title (EN)',
      'Type',
      'Department',
      'Revision',
      'Status',
      'Effective Date',
      'Next Review Date',
      'ISO Clause',
      'Owner',
    ];
    const rows = filteredDocs.map((d) => [
      d.docNumber,
      `"${d.titleTh.replace(/"/g, '""')}"`,
      `"${d.titleEn.replace(/"/g, '""')}"`,
      d.type,
      d.department,
      `Rev.${d.revision}`,
      d.status,
      d.effectiveDate,
      d.nextReviewDate,
      d.isoClause,
      `"${d.ownerName.replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master-document-list-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar: Search, Filters & Exports */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder={t(lang, 'searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Right Controls: Dept, Status, Export, Print */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">{t(lang, 'allDepartments')}</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {lang === 'th' ? d.nameTh : d.nameEn}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | DocStatus)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">{t(lang, 'allStatuses')}</option>
              <option value="Active">{t(lang, 'statusActive')}</option>
              <option value="Pending Review">{t(lang, 'statusPendingReview')}</option>
              <option value="Obsolete">{t(lang, 'statusObsolete')}</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t(lang, 'exportCsv')}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t(lang, 'printMdl')}</span>
            </button>
          </div>
        </div>

        {/* Segmented Document Type Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {DOC_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type === 'ALL' ? t(lang, 'allTypes') : type}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {filteredDocs.length} / {documents.length} {t(lang, 'kpiUnitDocs')}
          </div>
        </div>
      </div>

      {/* High-Density Controlled Data Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(lang, 'emptyMasterTitle')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t(lang, 'emptyMasterDesc')}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onCreateNewDar}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>{t(lang, 'newDarButton')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort('docNumber')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{t(lang, 'colDocNo')}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort('title')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{t(lang, 'colTitle')}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">{t(lang, 'colType')}</th>
                  <th className="py-3 px-3 whitespace-nowrap">{t(lang, 'colDept')}</th>
                  <th className="py-3 px-3 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('revision')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{t(lang, 'colRev')}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort('effectiveDate')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{t(lang, 'colEffective')}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort('nextReviewDate')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{t(lang, 'colNextReview')}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">{t(lang, 'colStatus')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t(lang, 'colOwner')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px]">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => onOpenDocument(doc.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {doc.docNumber}
                    </td>
                    <td className="py-3 px-4 max-w-[340px]">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {lang === 'th' ? doc.titleTh : doc.titleEn}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        ISO {doc.isoClause} · {doc.confidentiality}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {doc.type}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {doc.department}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-xs font-medium text-slate-800 dark:text-slate-200 text-right whitespace-nowrap">
                      Rev.{doc.revision}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {doc.effectiveDate}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {doc.nextReviewDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <DocStatusLabel status={doc.status} lang={lang} />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {doc.ownerName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
