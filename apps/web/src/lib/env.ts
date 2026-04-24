export function requireEnv(
  value: string | undefined,
  name: string,
): string {
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
