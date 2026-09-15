export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="var(--color-ink)" stroke="var(--color-amber)" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="var(--color-amber)" strokeWidth="0.9" opacity="0.45" />
      <path
        d="M16 8.5L18.4 14.6L24 16L18.4 17.4L16 23.5L13.6 17.4L8 16L13.6 14.6L16 8.5Z"
        fill="var(--color-amber)"
      />
      <circle cx="16" cy="16" r="2.1" fill="var(--color-ink)" />
    </svg>
  );
}
