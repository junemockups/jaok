// Placeholder mark until the real june mockups logo file is dropped in —
// swap this for an <img src="/logo.svg" /> once that's available.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="june mockups">
      <circle cx="50" cy="50" r="48" fill="#000" stroke="#f5f3f0" strokeWidth="2" />
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="46"
        fill="#f5f3f0"
      >
        Jm
      </text>
    </svg>
  );
}
