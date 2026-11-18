import { DocCodeConfig, DocTypeDefinition } from '../types/dcc';

export const DEFAULT_DOC_TYPES: DocTypeDefinition[] = [
  { code: 'QM', nameTh: 'คู่มือคุณภาพ', nameEn: 'Quality Manual' },
  { code: 'QP', nameTh: 'ระเบียบปฏิบัติ', nameEn: 'Quality Procedure' },
  { code: 'WI', nameTh: 'วิธีปฏิบัติงาน', nameEn: 'Work Instruction' },
  { code: 'FM', nameTh: 'แบบฟอร์มบันทึก', nameEn: 'Quality Form' },
  { code: 'SD', nameTh: 'เอกสารสนับสนุน', nameEn: 'Supporting Doc' },
  { code: 'EXT', nameTh: 'เอกสารภายนอก', nameEn: 'External Standard' },
];

export const DEFAULT_DOC_CODE_CONFIG: DocCodeConfig = {
  pattern: '{TYPE}-{DEPT}-{SEQ}',
  prefix: '',
  seqDigits: 3,
  docTypes: DEFAULT_DOC_TYPES,
};

function cleanFormattedCode(raw: string): string {
  return raw
    .replace(/--+/g, '-')
    .replace(/\/\/+/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '');
}

export function formatDocNumber(
  config: DocCodeConfig,
  docType: string,
  dept: string,
  seq: number,
  year = String(new Date().getFullYear())
): string {
  const digits = Math.min(6, Math.max(2, Number(config.seqDigits) || 3));
  const seqStr = String(Math.max(1, seq)).padStart(digits, '0');
  const pattern = (config.pattern || '{TYPE}-{DEPT}-{SEQ}').trim();
  const cleanPrefix = (config.prefix || '').trim().toUpperCase();
  const cleanType = (docType || 'DOC').trim().toUpperCase();
  const cleanDept = (dept || 'GEN').trim().toUpperCase();

  const rendered = pattern
    .replace(/\{PREFIX\}/g, cleanPrefix)
    .replace(/\{TYPE\}/g, cleanType)
    .replace(/\{DEPT\}/g, cleanDept)
    .replace(/\{YEAR\}/g, year)
    .replace(/\{SEQ\}/g, seqStr);

  return cleanFormattedCode(rendered) || `${cleanType}-${cleanDept}-${seqStr}`;
}

export function computeNextDocNumber(
  config: DocCodeConfig,
  docType: string,
  dept: string,
  existingDocNumbers: string[],
  year = String(new Date().getFullYear())
): string {
  const marker = '__SEQ_MARKER__';
  const pattern = (config.pattern || '{TYPE}-{DEPT}-{SEQ}').trim();
  const cleanPrefix = (config.prefix || '').trim().toUpperCase();
  const cleanType = (docType || 'DOC').trim().toUpperCase();
  const cleanDept = (dept || 'GEN').trim().toUpperCase();

  const rawTemplate = cleanFormattedCode(
    pattern
      .replace(/\{PREFIX\}/g, cleanPrefix)
      .replace(/\{TYPE\}/g, cleanType)
      .replace(/\{DEPT\}/g, cleanDept)
      .replace(/\{YEAR\}/g, year)
      .replace(/\{SEQ\}/g, marker)
  );

  const escaped = rawTemplate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = `^${escaped.replace(marker, '(\\d+)')}$`;
  const matcher = new RegExp(regexStr, 'i');

  let maxSeq = 0;
  for (const num of existingDocNumbers) {
    const match = num.match(matcher);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  return formatDocNumber(config, cleanType, cleanDept, maxSeq + 1, year);
}
