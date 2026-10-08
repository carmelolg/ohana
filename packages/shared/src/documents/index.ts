import { pickAmount } from './amount';
import { detectType, labelFor } from './docType';
import { DUE_KEYS, findDates, ISSUE_KEYS, pickDate } from './dates';
import { pickSupplier } from './supplier';
import { flat } from './text';
import { DOC_FOLDER, type ParsedDocument } from './types';

export { parseAmount, type AmountResult } from './amount';
export { DOC_FOLDER, DOC_FOLDERS, DOC_TYPE_LABEL, type DocType, type ParsedDocument } from './types';

export function parseDocumentText(text: string): ParsedDocument {
  const clean = text.replace(/[ \t]+/g, ' ');
  const low = flat(clean).toLowerCase();
  const { type, sure } = detectType(low);
  const supplier = pickSupplier(clean);
  const amount = pickAmount(low, type);
  const ds = findDates(clean);
  const flatDates = findDates(flat(clean));
  const dueDate = pickDate(low, flatDates, DUE_KEYS);
  const issueDate =
    pickDate(low, flatDates, ISSUE_KEYS) ?? ds.find((d) => !dueDate || +d.value !== +dueDate)?.value ?? null;
  return {
    docType: type,
    docLabel: labelFor(type, low),
    supplier,
    amount: amount.best,
    amountCandidates: amount.candidates,
    dueDate,
    issueDate,
    folder: DOC_FOLDER[type],
    found: {
      type: sure,
      supplier: !!supplier,
      amount: amount.best != null && amount.sure,
      dueDate: !!dueDate,
    },
  };
}
