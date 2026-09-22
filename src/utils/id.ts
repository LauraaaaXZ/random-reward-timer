export function randomUUID() {
  const seed = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${seed}`;
}
