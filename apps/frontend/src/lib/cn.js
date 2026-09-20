export function cn(...classes) {
  return classes.filter((c) => typeof c === 'string' && c.trim() !== '').join(' ');
}
