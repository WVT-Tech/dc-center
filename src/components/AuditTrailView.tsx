import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { AuditActionType, AuditEvent, Language } from '../types/dcc';
import { t } from '../i18n/translations';

interface AuditTrailViewProps {
  lang: Language;
  events: AuditEvent[];
}

const ACTION_OPTIONS: ('ALL' | AuditActionType)[] = [
  'ALL',
  'DAR_SUBMITTED',
  'DAR_APPROVED',
  'DAR_REJECTED',
  'DOC_PUBLISHED',
  'DOC_REVIEWED',
  'DOC_ACKNOWLEDGED',
  'DOC_OBSOLETED',
  'DEPT_ADDED',
  'KPI_FISHBONE_UPDATED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_ADDED',
];

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ lang, events }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | AuditActionType>('ALL');

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (actionFilter !== 'ALL' && ev.action !== actionFilter) return false;
      if (q) {
        const hay = `${ev.targetCode} ${ev.actorName} ${ev.detailTh} ${ev.detailEn} ${ev.action}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, actionFilter]);

  const handleExportAuditCsv = () => {
    const headers = ['Timestamp', 'Action', 'Target Code', 'Actor', 'Role', 'Detail'];
    const rows = filteredEvents.map((e) => [
      e.timestamp,
      e.action,
      e.targetCode,
      `"${e.actorName}"`,
      e.actorRole,
      `"${(lang === 'th' ? e.detailTh : e.detailEn).replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dcc-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'th'
                ? 'ค้นหาตามรหัสเอกสาร ผู้ดำเนินการ หรือรายละเอียด...'
                : 'Filter by doc code, actor, or activity...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as 'ALL' | AuditActionType)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {ACTION_OPTIONS.map((act) => (
              <option key={act} value={act}>
                {act === 'ALL' ? (lang === 'th' ? 'ทุกกิจกรรม' : 'All Events') : act}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportAuditCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t(lang, 'exportCsv')}</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-5 whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-4 whitespace-nowrap">Event Type</th>
                <th className="py-3 px-4 whitespace-nowrap">Target Code</th>
                <th className="py-3 px-4 whitespace-nowrap">Actor / Role</th>
                <th className="py-3 px-5 whitespace-nowrap">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredEvents.map((ev) => (
                <tr
                  key={ev.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-5 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {ev.timestamp}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {ev.action}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {ev.targetCode}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {ev.actorName}{' '}
                    <span className="text-slate-400 dark:text-slate-500">
                      · {ev.actorRole}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-slate-600 dark:text-slate-300">
                    {lang === 'th' ? ev.detailTh : ev.detailEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
