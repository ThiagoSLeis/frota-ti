import 'dotenv/config';
import { SHEET_TAB_NAME } from '@frota/shared';

function readEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: Number.parseInt(process.env.PORT ?? '3333', 10),
    corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
    googleSheetId: (process.env.GOOGLE_SHEET_ID ?? '').trim(),
    googleServiceAccountEmail: (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '').trim(),
    googlePrivateKey: parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    sheetTabName: (process.env.SHEET_TAB_NAME ?? '').trim() || SHEET_TAB_NAME,
    seedSampleData: /^(1|true|yes)$/i.test(process.env.SEED_SAMPLE_DATA ?? ''),
  };
}

function parsePrivateKey(raw) {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');
}

function parseCorsOrigin(raw) {
  const value = (raw ?? '').trim();
  if (!value || value === '*') return '*';

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] : origins;
}

export const env = readEnv();

const REQUIRED_FOR_SHEETS = Object.freeze([
  ['GOOGLE_SHEET_ID', env.googleSheetId],
  ['GOOGLE_SERVICE_ACCOUNT_EMAIL', env.googleServiceAccountEmail],
  ['GOOGLE_PRIVATE_KEY', env.googlePrivateKey],
]);

export function missingSheetsEnv() {
  return REQUIRED_FOR_SHEETS.filter(([, value]) => !value).map(([name]) => name);
}

export function assertSheetsEnv() {
  const missing = missingSheetsEnv();
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes: ${missing.join(', ')}. ` +
        'Copie apps/backend/.env.example para apps/backend/.env e preencha com suas credenciais.',
    );
  }
}
