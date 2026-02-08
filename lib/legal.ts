export type LegalConfig = {
  operatorName: string
  address: string
  email: string
  phone?: string
  representative?: string
  register?: string
  vatId?: string
  contentResponsible?: string
  lastUpdated: string
}

function val(key: string): string {
  return (process.env[key] || '').trim()
}

function fallback(v: string, fb: string): string {
  return v ? v : fb
}

// Central place for legal page placeholders.
// Keep defaults clearly as placeholders so we don't accidentally publish wrong legal info.
export const LEGAL: LegalConfig = {
  operatorName: fallback(val('DT_LEGAL_OPERATOR_NAME'), 'DriveTuning (bitte Betreibername eintragen)'),
  address: fallback(val('DT_LEGAL_ADDRESS'), '(bitte Anschrift eintragen)'),
  email: fallback(val('DT_LEGAL_EMAIL'), '(bitte E-Mail eintragen)'),
  phone: val('DT_LEGAL_PHONE') || undefined,
  representative: val('DT_LEGAL_REPRESENTATIVE') || undefined,
  register: val('DT_LEGAL_REGISTER') || undefined,
  vatId: val('DT_LEGAL_VAT_ID') || undefined,
  contentResponsible: val('DT_LEGAL_CONTENT_RESPONSIBLE') || undefined,
  lastUpdated: fallback(val('DT_LEGAL_LAST_UPDATED'), '2026-02-07'),
}

