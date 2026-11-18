import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  FileEdit,
  Lock,
  Paperclip,
  Printer,
  X,
} from 'lucide-react';
import { ControlledDocument, Language, UserProfile } from '../types/dcc';
import { t } from '../i18n/translations';
import { DocStatusLabel } from './StatusLabel';
import { PdfReadOnlyViewer } from './PdfReadOnlyViewer';

interface DocumentDossierDrawerProps {
  lang: Language;
  doc: ControlledDocument | null;
  currentUser: UserProfile;
  canPrint?: boolean;
  onClose: () => void;
  onRequestRevision: (doc: ControlledDocument) => void;
  onRequestObsolete: (doc: ControlledDocument) => void;
  onAcknowledgeDoc: (docId: string, recipientName: string) => void;
}

type DossierTab = 'content' | 'history' | 'distribution';

export const DocumentDossierDrawer: React.FC<DocumentDossierDrawerProps> = ({
  lang,
  doc,
  currentUser,
  canPrint = true,
  onClose,
  onRequestRevision,
  onRequestObsolete,
  onAcknowledgeDoc,
}) => {
  const [tab, setTab] = useState<DossierTab>('content');

  if (!doc) return null;

  const isObsolete = doc.status === 'Obsolete';
  const myPendingReceipt = doc.distribution.find(
    (r) =>
      !r.acknowledged &&
      (r.recipientName === currentUser.nameTh || r.recipientName === currentUser.nameEn)
  );

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${!canPrint ? 'print-blocked' : ''}`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        onContextMenu={(e) => {
          if (!canPrint) e.preventDefault();
        }}
        className={`relative z-10 w-full max-w-3xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col ${
          !canPrint ? 'select-none' : ''
        }`}
      >
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {doc.docNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Rev.{doc.revision}</span>
              <span aria-hidden="true">·</span>
              <DocStatusLabel status={doc.status} lang={lang} />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-1 truncate">
              {lang === 'th' ? doc.titleTh : doc.titleEn}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label={t(lang, 'closeBtn')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setTab('content')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'content'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'tabContent')}
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'tabHistory')} ({doc.revisionHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('distribution')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'distribution'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(lang, 'tabDistribution')} ({doc.distribution.length})
            </button>
          </div>

          {myPendingReceipt && !isObsolete && (
            <button
              type="button"
              onClick={() => onAcknowledgeDoc(doc.id, myPendingReceipt.recipientName)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t(lang, 'ackReadBtn')}</span>
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'content' && (
            <>
              {/* Official Controlled Copy Header Sheet */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  className={`px-4 py-2 text-[11px] font-mono font-semibold tracking-wider text-center border-b border-slate-200 dark:border-slate-800 ${
                    isObsolete
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isObsolete ? t(lang, 'obsoleteStamp') : t(lang, 'controlledStamp')}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
                  <div className="p-3">
                    <div className="text-slate-400 text-[11px]">{t(lang, 'colDocNo')}</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                      {doc.docNumber}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-slate-400 text-[11px]">{t(lang, 'colRev')}</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                      Rev.{doc.revision}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-slate-400 text-[11px]">{t(lang, 'colEffective')}</div>
                    <div className="font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {doc.effectiveDate}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-slate-400 text-[11px]">{t(lang, 'colNextReview')}</div>
                    <div className="font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {doc.nextReviewDate}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-slate-200 dark:border-slate-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
                  <div className="p-3">
                    <span className="text-slate-400 mr-1.5">{t(lang, 'colOwner')}:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {doc.ownerName}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-slate-400 mr-1.5">ISO Clause:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {doc.isoClause}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-slate-400 mr-1.5">
                      {t(lang, 'archiveRetention')}:
                    </span>
                    <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {doc.retentionYears} {t(lang, 'yearsUnit')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Obsolescence Notice if Obsolete */}
              {isObsolete && doc.obsoleteReason && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <div className="font-semibold">
                    {t(lang, 'archiveReason')} ({doc.obsoleteDate})
                  </div>
                  <p>{doc.obsoleteReason}</p>
                </div>
              )}

              {/* Structured ISO Document Body */}
              <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                    {t(lang, 'objectiveLabel')}
                  </h3>
                  <p>{lang === 'th' ? doc.content.objectiveTh : doc.content.objectiveEn}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                    {t(lang, 'scopeLabel')}
                  </h3>
                  <p>{lang === 'th' ? doc.content.scopeTh : doc.content.scopeEn}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                    {t(lang, 'respLabel')}
                  </h3>
                  <p>
                    {lang === 'th'
                      ? doc.content.responsibilitiesTh
                      : doc.content.responsibilitiesEn}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                    {t(lang, 'procLabel')}
                  </h3>
                  <div className="space-y-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                    {(lang === 'th'
                      ? doc.content.procedureStepsTh
                      : doc.content.procedureStepsEn
                    ).map((step, i) => (
                      <p key={i}>{step}</p>
                    ))}
                  </div>
                </div>

                {doc.content.references.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                      {t(lang, 'refLabel')}
                    </h3>
                    <ul className="list-disc pl-5 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                      {doc.content.references.map((ref, i) => (
                        <li key={i} className="font-mono">
                          {ref}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Uploaded Attachment Preview (if any) */}
                {doc.content.attachmentName && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>
                          {t(lang, 'attachmentLabel')}: {doc.content.attachmentName}
                        </span>
                      </span>
                      {canPrint && doc.content.attachmentDataUrl && (
                        <a
                          href={doc.content.attachmentDataUrl}
                          download={doc.content.attachmentName}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Download
                        </a>
                      )}
                    </div>

                    {doc.content.attachmentType?.startsWith('image/') &&
                      doc.content.attachmentDataUrl && (
                        <img
                          src={doc.content.attachmentDataUrl}
                          alt={doc.content.attachmentName}
                          draggable={canPrint}
                          onContextMenu={(e) => {
                            if (!canPrint) e.preventDefault();
                          }}
                          className={`max-h-72 rounded-lg border border-slate-200 dark:border-slate-700 object-contain ${
                            !canPrint ? 'select-none' : ''
                          }`}
                        />
                      )}

                    {doc.content.attachmentType === 'application/pdf' &&
                      doc.content.attachmentDataUrl &&
                      (canPrint ? (
                        <iframe
                          src={doc.content.attachmentDataUrl}
                          title={doc.content.attachmentName}
                          className="w-full h-80 rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <PdfReadOnlyViewer
                          dataUrl={doc.content.attachmentDataUrl}
                          title={doc.content.attachmentName}
                          lang={lang}
                        />
                      ))}

                    {doc.content.attachmentTextPreview && (
                      <pre
                        className={`p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono overflow-x-auto whitespace-pre-wrap ${
                          !canPrint ? 'select-none' : ''
                        }`}
                      >
                        {doc.content.attachmentTextPreview}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'history' && (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {doc.revisionHistory.map((rev, idx) => (
                <div key={idx} className="p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        Rev.{rev.revision}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {rev.darNumber}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {rev.date}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {lang === 'th' ? rev.summaryTh : rev.summaryEn}
                  </p>
                  <div className="text-slate-500 dark:text-slate-400">
                    {lang === 'th' ? 'จัดทำโดย' : 'Author'}: {rev.authorName} ·{' '}
                    {lang === 'th' ? 'อนุมัติโดย' : 'Approved by'}: {rev.approverName}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'distribution' && (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {doc.distribution.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'th'
                    ? 'ไม่มีรายการแจกจ่ายสำหรับเอกสารฉบับนี้'
                    : 'No active distribution recipients for this document.'}
                </div>
              ) : (
                doc.distribution.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {rec.recipientName}{' '}
                        <span className="font-mono text-slate-400 ml-1">
                          ({rec.department})
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {rec.roleTitle}
                      </div>
                    </div>
                    {rec.acknowledged ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t(lang, 'acknowledgedLabel')}</span>
                        {rec.acknowledgedAt && (
                          <span className="font-mono tabular-nums text-slate-400 ml-1">
                            {rec.acknowledgedAt}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t(lang, 'pendingAckLabel')}</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          {canPrint ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t(lang, 'printControlledCopy')}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {lang === 'th'
                  ? 'อ่านอย่างเดียว (Role เฉพาะแผนกไม่สามารถสั่งพิมพ์ได้)'
                  : 'Read-only (Printing requires an All-department role)'}
              </span>
            </span>
          )}

          {!isObsolete && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRequestObsolete(doc)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{t(lang, 'requestObsoleteBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => onRequestRevision(doc)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>{t(lang, 'requestRevisionBtn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
