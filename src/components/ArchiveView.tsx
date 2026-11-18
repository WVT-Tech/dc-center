import React from 'react';
import { Archive } from 'lucide-react';
import { ControlledDocument, Language } from '../types/dcc';
import { t } from '../i18n/translations';

interface ArchiveViewProps {
  lang: Language;
  documents: ControlledDocument[];
  canPrint?: boolean;
  onOpenDocument: (docId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  lang,
  documents,
  canPrint = true,
  onOpenDocument,
}) => {
  const obsoleteDocs = documents.filter((d) => d.status === 'Obsolete');

  return (
    <>
      {!canPrint && (
        <div className="hidden print-blocked-notice p-8 text-center text-sm text-slate-700 border border-slate-300 rounded-xl">
          {lang === 'th'
            ? 'ไม่อนุญาตให้สั่งพิมพ์เอกสารในเมนูคลังเอกสารยกเลิก (สำหรับผู้ใช้งานที่มี Role แบบ All เท่านั้น)'
            : 'Printing from Obsolete Archive is restricted to users with an All-department role.'}
        </div>
      )}
      <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ${!canPrint ? 'print-blocked' : ''}`}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t(lang, 'navArchive')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'th'
              ? 'คลังจัดเก็บเอกสารที่ยกเลิกการใช้งานและประทับตรา OBSOLETE เพื่อการตรวจสอบย้อนหลังตามอายุการจัดเก็บ'
              : 'Read-only repository of obsoleted and superseded controlled documents retained for audit compliance.'}
          </p>
        </div>
        <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
          {obsoleteDocs.length} {t(lang, 'kpiUnitDocs')}
        </span>
      </div>

      {obsoleteDocs.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">
          {lang === 'th' ? 'ไม่มีเอกสารยกเลิกในคลังเก็บ' : 'No obsolete documents archived.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {obsoleteDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onOpenDocument(doc.id)}
              className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-rose-700 dark:text-rose-400">
                    {doc.docNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">Rev.{doc.revision}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{doc.department}</span>
                  {doc.obsoleteDate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {lang === 'th' ? 'ยกเลิกเมื่อ' : 'Obsoleted'} {doc.obsoleteDate}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {lang === 'th' ? doc.titleTh : doc.titleEn}
                </div>
                {doc.obsoleteReason && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t(lang, 'archiveReason')}: {doc.obsoleteReason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {t(lang, 'archiveRetention')}: {doc.retentionYears} {t(lang, 'yearsUnit')}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-400">
                  <Archive className="w-3.5 h-3.5" />
                  <span>OBSOLETE</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
};
