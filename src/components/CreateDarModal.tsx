import React, { useEffect, useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import {
  ControlledDocument,
  DarType,
  DepartmentInfo,
  DocType,
  DocumentActionRequest,
  DocumentContent,
  Language,
  UserProfile,
} from '../types/dcc';
import { t } from '../i18n/translations';

interface CreateDarModalProps {
  lang: Language;
  isOpen: boolean;
  initialMode: {
    darType: DarType;
    targetDoc?: ControlledDocument;
  };
  documents: ControlledDocument[];
  departments: DepartmentInfo[];
  currentUser: UserProfile;
  onClose: () => void;
  onSubmitDar: (
    darData: Omit<
      DocumentActionRequest,
      'id' | 'darNumber' | 'requestedAt' | 'stage' | 'logs'
    >
  ) => void;
}

const DOC_TYPES: DocType[] = ['QM', 'QP', 'WI', 'FM', 'SD', 'EXT'];

export const CreateDarModal: React.FC<CreateDarModalProps> = ({
  lang,
  isOpen,
  initialMode,
  documents,
  departments,
  currentUser,
  onClose,
  onSubmitDar,
}) => {
  const [darType, setDarType] = useState<DarType>(initialMode.darType);
  const [targetDocId, setTargetDocId] = useState<string>(
    initialMode.targetDoc?.id ?? ''
  );
  const [docType, setDocType] = useState<DocType>(
    initialMode.targetDoc?.type ?? 'WI'
  );
  const [department, setDepartment] = useState<string>(
    initialMode.targetDoc?.department ?? currentUser.department
  );
  const [titleTh, setTitleTh] = useState<string>('');
  const [titleEn, setTitleEn] = useState<string>('');
  const [isoClause, setIsoClause] = useState<string>('7.5');
  const [reason, setReason] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [scope, setScope] = useState<string>('');
  const [stepsText, setStepsText] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [attachmentType, setAttachmentType] = useState<string | undefined>();
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | undefined>();
  const [attachmentTextPreview, setAttachmentTextPreview] = useState<string | undefined>();

  const activeDocs = useMemo(
    () => documents.filter((d) => d.status === 'Active'),
    [documents]
  );

  useEffect(() => {
    if (!isOpen) return;
    setDarType(initialMode.darType);
    if (initialMode.targetDoc) {
      const doc = initialMode.targetDoc;
      setTargetDocId(doc.id);
      setDocType(doc.type);
      setDepartment(doc.department);
      setTitleTh(doc.titleTh);
      setTitleEn(doc.titleEn);
      setIsoClause(doc.isoClause);
      setObjective(lang === 'th' ? doc.content.objectiveTh : doc.content.objectiveEn);
      setScope(lang === 'th' ? doc.content.scopeTh : doc.content.scopeEn);
      setStepsText(
        (lang === 'th'
          ? doc.content.procedureStepsTh
          : doc.content.procedureStepsEn
        ).join('\n')
      );
    } else {
      setTargetDocId(activeDocs[0]?.id ?? '');
      setDocType('WI');
      setDepartment(currentUser.department || 'QA');
      setTitleTh('');
      setTitleEn('');
      setIsoClause('7.5');
      setObjective('');
      setScope('');
      setStepsText('');
    }
    setReason('');
    setAttachmentName(undefined);
    setAttachmentType(undefined);
    setAttachmentDataUrl(undefined);
    setAttachmentTextPreview(undefined);
  }, [isOpen, initialMode, activeDocs, currentUser.department, lang]);

  // Sync fields when user selects a different target doc for Revision/Obsolete
  const handleSelectTargetDoc = (id: string) => {
    setTargetDocId(id);
    const found = documents.find((d) => d.id === id);
    if (found) {
      setDocType(found.type);
      setDepartment(found.department);
      setTitleTh(found.titleTh);
      setTitleEn(found.titleEn);
      setIsoClause(found.isoClause);
      setObjective(lang === 'th' ? found.content.objectiveTh : found.content.objectiveEn);
      setScope(lang === 'th' ? found.content.scopeTh : found.content.scopeEn);
      setStepsText(
        (lang === 'th'
          ? found.content.procedureStepsTh
          : found.content.procedureStepsEn
        ).join('\n')
      );
    }
  };

  // Auto-generate next sequential document code for New Issue
  const nextDocNumber = useMemo(() => {
    if (darType !== 'New Issue') {
      const target = documents.find((d) => d.id === targetDocId);
      return target?.docNumber ?? `${docType}-${department}-001`;
    }
    const prefix = `${docType}-${department}-`;
    const existingNums = documents
      .filter((d) => d.docNumber.startsWith(prefix))
      .map((d) => {
        const tail = d.docNumber.slice(prefix.length);
        return parseInt(tail, 10) || 0;
      });
    const nextSeq = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }, [darType, targetDocId, docType, department, documents]);

  const currentRev = useMemo(() => {
    if (darType === 'New Issue') return '00';
    return documents.find((d) => d.id === targetDocId)?.revision ?? '01';
  }, [darType, targetDocId, documents]);

  const proposedRev = useMemo(() => {
    if (darType === 'Obsolete') return currentRev;
    const num = parseInt(currentRev, 10) || 0;
    return String(num + 1).padStart(2, '0');
  }, [darType, currentRev]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentName(file.name);
    setAttachmentType(file.type || 'application/octet-stream');

    if (file.size <= 1_500_000) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachmentDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentDataUrl(undefined);
    }

    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv')
    ) {
      const textReader = new FileReader();
      textReader.onload = () => {
        if (typeof textReader.result === 'string') {
          setAttachmentTextPreview(textReader.result.slice(0, 4000));
        }
      };
      textReader.readAsText(file);
    } else {
      setAttachmentTextPreview(undefined);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitleTh = titleTh.trim() || titleEn.trim();
    const cleanTitleEn = titleEn.trim() || titleTh.trim();
    if (!cleanTitleTh || !reason.trim()) return;

    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const proposedContent: DocumentContent | undefined =
      darType === 'Obsolete'
        ? undefined
        : {
            objectiveTh:
              objective.trim() ||
              'กำหนดขั้นตอนมาตรฐานการปฏิบัติงานให้สอดคล้องกับระบบคุณภาพ ISO 9001:2015',
            objectiveEn:
              objective.trim() ||
              'Define standardized operating procedures aligned with ISO 9001:2015.',
            scopeTh: scope.trim() || `ครอบคลุมการปฏิบัติงานในหน่วยงาน ${department}`,
            scopeEn: scope.trim() || `Applies to operations within ${department}.`,
            responsibilitiesTh: `หัวหน้าหน่วยงาน ${department} และผู้ปฏิบัติงานที่เกี่ยวข้อง`,
            responsibilitiesEn: `${department} Department Head and assigned personnel.`,
            procedureStepsTh:
              steps.length > 0
                ? steps
                : ['4.1 ดำเนินการตามขั้นตอนมาตรฐานที่ได้รับอนุมัติและบันทึกหลักฐานการปฏิบัติงาน'],
            procedureStepsEn:
              steps.length > 0
                ? steps
                : ['4.1 Execute approved standard workflow and retain operational records.'],
            references: [`ISO 9001:2015 Clause ${isoClause}`],
            attachmentName,
            attachmentType,
            attachmentDataUrl,
            attachmentTextPreview,
          };

    onSubmitDar({
      darType,
      targetDocId: darType === 'New Issue' ? undefined : targetDocId,
      proposedDocNumber: nextDocNumber,
      proposedTitleTh: cleanTitleTh,
      proposedTitleEn: cleanTitleEn,
      docType,
      department,
      currentRevision: currentRev,
      proposedRevision: proposedRev,
      reasonTh: reason.trim(),
      reasonEn: reason.trim(),
      requesterName: lang === 'th' ? currentUser.nameTh : currentUser.nameEn,
      requesterDept: currentUser.department,
      isoClause: isoClause.trim() || '7.5',
      proposedContent,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t(lang, 'newDarButton')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'th'
                ? 'ยื่นคำขอออกเอกสารใหม่ ขอแก้ไข หรือขอยกเลิกเอกสารเข้าสู่สายงานอนุมัติ'
                : 'Submit a Document Action Request into the ISO approval pipeline.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Request Type Segmented Control */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {lang === 'th' ? 'ประเภทคำขอ (Request Type)' : 'Request Type'}
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['New Issue', 'Revision', 'Obsolete'] as DarType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setDarType(type);
                    if (type !== 'New Issue' && !targetDocId && activeDocs[0]) {
                      handleSelectTargetDoc(activeDocs[0].id);
                    }
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                    darType === type
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'New Issue'
                    ? t(lang, 'darTypeNew')
                    : type === 'Revision'
                      ? t(lang, 'darTypeRevision')
                      : t(lang, 'darTypeObsolete')}
                </button>
              ))}
            </div>
          </div>

          {/* Existing Doc Selector OR New Doc Classification */}
          {darType !== 'New Issue' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'th' ? 'เลือกเอกสารที่ต้องการดำเนินการ' : 'Target Controlled Document'}
              </label>
              <select
                value={targetDocId}
                onChange={(e) => handleSelectTargetDoc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {activeDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.docNumber} (Rev.{d.revision}) — {lang === 'th' ? d.titleTh : d.titleEn}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t(lang, 'colType')}
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocType)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t(lang, 'colDept')}
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {departments.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.code} — {lang === 'th' ? dept.nameTh : dept.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ISO Clause
                </label>
                <input
                  type="text"
                  value={isoClause}
                  onChange={(e) => setIsoClause(e.target.value)}
                  placeholder="7.5"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Auto-Assigned Document Code Preview */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 mr-2">
                {lang === 'th' ? 'รหัสเอกสารที่กำหนด:' : 'Assigned Document Code:'}
              </span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {nextDocNumber}
              </span>
            </div>
            <div className="font-mono text-slate-700 dark:text-slate-300">
              Rev.{currentRev} → Rev.{proposedRev}
            </div>
          </div>

          {/* Document Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'th' ? 'ชื่อเอกสาร (ภาษาไทย) *' : 'Document Title (TH) *'}
              </label>
              <input
                type="text"
                required
                value={titleTh}
                onChange={(e) => setTitleTh(e.target.value)}
                placeholder="วิธีปฏิบัติงานการตรวจสอบคุณภาพ..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'th' ? 'ชื่อเอกสาร (ภาษาอังกฤษ)' : 'Document Title (EN)'}
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Quality Inspection Work Instruction..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Reason for Request */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {lang === 'th'
                ? 'เหตุผลและความจำเป็นในการเปลี่ยนแปลง *'
                : 'Reason / Summary of Change *'}
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                lang === 'th'
                  ? 'ระบุรายละเอียดการเปลี่ยนแปลงหรือเหตุผลการออก/ยกเลิกเอกสาร...'
                  : 'Describe what changed and why this DAR is required...'
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Controlled Content Draft + File Attachment */}
          {darType !== 'Obsolete' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t(lang, 'objectiveLabel')}
                  </label>
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t(lang, 'scopeLabel')}
                  </label>
                  <input
                    type="text"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'th'
                    ? 'ขั้นตอนการปฏิบัติงาน (บรรทัดละ 1 ข้อ)'
                    : 'Procedure Steps (one per line)'}
                </label>
                <textarea
                  rows={3}
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  placeholder="4.1 ตรวจสอบความพร้อมก่อนเริ่มงาน..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'th'
                    ? 'แนบไฟล์เอกสารต้นฉบับ (PDF, รูปภาพ, ข้อความ — ไม่บังคับ)'
                    : 'Attach Source File (PDF, Image, Text — optional)'}
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs text-slate-600 dark:text-slate-300 transition-colors">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>
                    {attachmentName
                      ? attachmentName
                      : lang === 'th'
                        ? 'เลือกไฟล์จากเครื่องของคุณ'
                        : 'Select file from device'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t(lang, 'cancelBtn')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              {t(lang, 'submitDarBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
