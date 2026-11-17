import React from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { DarStage, DocStatus, Language } from '../types/dcc';
import { t } from '../i18n/translations';

interface DocStatusLabelProps {
  status: DocStatus;
  lang: Language;
}

export const DocStatusLabel: React.FC<DocStatusLabelProps> = ({ status, lang }) => {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{t(lang, 'statusActive')}</span>
      </span>
    );
  }
  if (status === 'Pending Review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{t(lang, 'statusPendingReview')}</span>
      </span>
    );
  }
  if (status === 'Draft') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
        <FileEdit className="w-3.5 h-3.5 shrink-0" />
        <span>{t(lang, 'statusDraft')}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 whitespace-nowrap">
      <Archive className="w-3.5 h-3.5 shrink-0" />
      <span>{t(lang, 'statusObsolete')}</span>
    </span>
  );
};

interface DarStageLabelProps {
  stage: DarStage;
  lang: Language;
}

export const DarStageLabel: React.FC<DarStageLabelProps> = ({ stage, lang }) => {
  switch (stage) {
    case 'Pending Reviewer':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{t(lang, 'stageReviewer')}</span>
        </span>
      );
    case 'Pending QMR':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{t(lang, 'stageQmr')}</span>
        </span>
      );
    case 'Pending DCC Publish':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{t(lang, 'stageDcc')}</span>
        </span>
      );
    case 'Published':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{t(lang, 'stagePublished')}</span>
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t(lang, 'stageRejected')}</span>
        </span>
      );
  }
};
