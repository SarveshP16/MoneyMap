import { Pencil } from 'lucide-react';

/** A small always-visible pencil next to anything that opens an edit form
 *  on click — entry cards give no other sign of that (no underline, no
 *  cursor change worth noticing), which made it easy to not realize a row
 *  was tappable at all, especially on mobile where there's no hover state
 *  to stumble onto it with. Deliberately not hover-only for that reason. */
export function EditHint() {
  return <Pencil size={13} className="shrink-0 text-ink-faint" aria-hidden="true" />;
}
