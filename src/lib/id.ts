/** A locally-unique id — equivalent to id_generator.dart's generateLocalId(),
 *  just backed by the platform's own UUID generator instead of a manual
 *  timestamp+random scheme. Opaque either way; nothing parses these. */
export function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
