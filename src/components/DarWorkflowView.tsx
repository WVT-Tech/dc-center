import React, { useMemo, useState } from 'react';
import { Check, FilePlus2, Send, X } from 'lucide-react';
import {
  DarStage,
  DocumentActionRequest,
  Language,
  UserProfile,
} from '../types/dcc';
import { t } from '../i18n/translations';
import { DarStageLabel } from './StatusLabel';

interface DarWorkflowViewProps {
  lang: Language;
  dars: DocumentActionRequest[];
  currentUser: UserProfile;
  onAdvanceDar: (darId: string, comment: string) => void;
  onRejectDar: (darId: string, comment: string) => void;
  onCreateNewDar: () => void;
  onOpenDocumentByNumber: (docNumber: string) => void;
}

type DarFilter = 'all' | 'action' | 'progress' | 'done' | 'rejected';

const PIPELINE_STAGES: { key: DarStage; th: string; en: string }[] = [
  { key: 'Pending Reviewer', th: '1. หัวหน้าทบทวน', en: '1. Dept Review' },
  { key: 'Pending QMR', th: '2. QMR อนุมัติ', en: '2. QMR Approval' },
  { key: 'Pending DCC Publish', th: '3. DCC ประกาศใช้', en: '3. DCC Publish' },
  { key: 'Published', th: '4. เผยแพร่แล้ว', en: '4. Published' },
];

export const DarWorkflowView: React.FC<DarWorkflowViewProps> = ({
  lang,
  dars,
  currentUser,
  onAdvanceDar,
  onRejectDar,
  onCreateNewDar,
  onOpenDocumentByNumber,
}) => {
  const [filter, setFilter] = useState<DarFilter>('all');
  const [comments, setComments] = useState<Record<string, string>>({});

  const canActOnStage = (stage: DarStage): boolean => {
    if (stage === 'Pending Reviewer') {
      return currentUser.role === 'Dept Reviewer' || currentUser.role === 'Document Controller';
    }
    if (stage === 'Pending QMR') {
      return currentUser.role === 'QMR / Approver';
    }
    if (stage === 'Pending DCC Publish') {
      return currentUser.role === 'Document Controller';
    }
    return false;
  };

  const filteredDars = useMemo(() => {
    return dars.filter((dar) => {
      if (filter === 'action') return canActOnStage(dar.stage);
      if (filter === 'progress') {
        return (
          dar.stage === 'Pending Reviewer' ||
          dar.stage === 'Pending QMR' ||
          dar.stage === 'Pending DCC Publish'
        );
      }
      if (filter === 'done') return dar.stage === 'Published';
      if (filter === 'rejected') return dar.stage === 'Rejected';
      return true;
    });
  }, [dars, filter, currentUser.role]);

  const getStageIndex = (stage: DarStage): number => {
    if (stage === 'Pending Reviewer') return 0;
    if (stage === 'Pending QMR') return 1;
    if (stage === 'Pending DCC Publish') return 2;
    if (stage === 'Published') return 3;
    return -1;
  };

  const darTypeLabel = (type: DocumentActionRequest['darType']) => {
    if (type === 'New Issue') return t(lang, 'darTypeNew');
    if (type === 'Revision') return t(lang, 'darTypeRevision');
    return t(lang, 'darTypeObsolete');
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(
            [
              ['all', t(lang, 'darFilterAll')],
              ['action', t(lang, 'darFilterAction')],
              ['progress', t(lang, 'darFilterProgress')],
              ['done', t(lang, 'darFilterDone')],
              ['rejected', t(lang, 'darFilterRejected')],
            ] as [DarFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === key
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCreateNewDar}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>{t(lang, 'newDarButton')}</span>
        </button>
      </div>

      {/* DAR List */}
      <div className="space-y-4">
        {filteredDars.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-14 px-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {lang === 'th' ? 'ไม่พบคำขอ DAR ในหมวดหมู่นี้' : 'No DAR items in this filter'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'th'
                ? 'คุณสามารถสลับบทบาทผู้ใช้งานในแถบด้านซ้ายเพื่อทดสอบการอนุมัติในแต่ละขั้นตอนได้'
                : 'Switch your active role in the sidebar to test approvals across workflow stages.'}
            </p>
          </div>
        ) : (
          filteredDars.map((dar) => {
            const actionable = canActOnStage(dar.stage);
            const activeStageIdx = getStageIndex(dar.stage);
            const commentVal = comments[dar.id] ?? '';

            return (
              <article
                key={dar.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
              >
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {dar.darNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {darTypeLabel(dar.darType)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => onOpenDocumentByNumber(dar.proposedDocNumber)}
                        className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {dar.proposedDocNumber}
                      </button>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        Rev.{dar.currentRevision} → Rev.{dar.proposedRevision}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>ISO {dar.isoClause}</span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {lang === 'th' ? dar.proposedTitleTh : dar.proposedTitleEn}
                    </h3>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {lang === 'th' ? dar.reasonTh : dar.reasonEn}
                    </p>

                    <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                      {dar.requesterName} ({dar.requesterDept}) ·{' '}
                      <span className="font-mono tabular-nums">{dar.requestedAt}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <DarStageLabel stage={dar.stage} lang={lang} />
                  </div>
                </div>

                {/* 4-Step Approval Pipeline Bar */}
                {dar.stage !== 'Rejected' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {PIPELINE_STAGES.map((st, idx) => {
                      const completed = activeStageIdx > idx || dar.stage === 'Published';
                      const current = activeStageIdx === idx && dar.stage !== 'Published';
                      return (
                        <div key={st.key} className="space-y-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-colors ${
                              completed
                                ? 'bg-emerald-600 dark:bg-emerald-500'
                                : current
                                  ? 'bg-blue-600 dark:bg-blue-500'
                                  : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <div
                            className={`text-[11px] font-medium ${
                              completed
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : current
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {lang === 'th' ? st.th : st.en}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Approval Log History */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {dar.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs"
                    >
                      <div className="text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {log.actorName}
                        </span>{' '}
                        <span className="text-slate-400">({log.stage})</span> —{' '}
                        <span
                          className={
                            log.action === 'Rejected'
                              ? 'text-rose-600 dark:text-rose-400 font-medium'
                              : 'text-slate-600 dark:text-slate-300'
                          }
                        >
                          {log.comment}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Role-Gated Action Bar */}
                {actionable && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="text"
                      value={commentVal}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [dar.id]: e.target.value }))
                      }
                      placeholder={t(lang, 'commentPlaceholder')}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onRejectDar(dar.id, commentVal);
                          setComments((prev) => ({ ...prev, [dar.id]: '' }));
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t(lang, 'rejectBtn')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onAdvanceDar(dar.id, commentVal);
                          setComments((prev) => ({ ...prev, [dar.id]: '' }));
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
                      >
                        {dar.stage === 'Pending DCC Publish' ? (
                          <Send className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {dar.stage === 'Pending DCC Publish'
                            ? t(lang, 'publishBtn')
                            : t(lang, 'approveBtn')}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
