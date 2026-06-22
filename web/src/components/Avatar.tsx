interface AvatarProps {
  name: string;
  size?: number;
}

/**
 * Deterministic colored-initials circle for any person reference (farmer,
 * dealer, assignee, reviewer). Same name always renders the same color —
 * verified in Task 4 Step 1 — so a colored swatch isn't needed; the hue is
 * computed on the fly from the name string.
 */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash) % 360;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 28 }: AvatarProps) {
  const hue = nameToHue(name || '?');
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${hue}, 70%, 92%)`,
        color: `hsl(${hue}, 70%, 32%)`,
        fontSize: size * 0.4,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  );
}
