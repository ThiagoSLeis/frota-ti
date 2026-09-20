const numberFormat = new Intl.NumberFormat('pt-BR');

export function pluralizar(n, singular, plural) {
  return Math.abs(Number(n)) === 1 ? singular : plural;
}

export function formatarContagem(n) {
  const valor = Number(n);
  return numberFormat.format(Number.isFinite(valor) ? valor : 0);
}

export function iniciais(nome) {
  if (typeof nome !== 'string') return '';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function percentual(parte, total) {
  const p = Number(parte);
  const t = Number(total);
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return 0;
  return Math.round((p / t) * 100);
}
