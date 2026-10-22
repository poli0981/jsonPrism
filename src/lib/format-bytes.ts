const KIB = 1024;
const MIB = KIB * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < KIB) return `${bytes} B`;
  // Round before picking the unit, or the last bytes below 1 MiB print as "1024.0 KB".
  const kib = (bytes / KIB).toFixed(1);
  if (Number(kib) < 1024) return `${kib} KB`;
  return `${(bytes / MIB).toFixed(2)} MB`;
}
