interface FilterPillOption<T extends string> {
  value: T;
  label: string;
}

interface FilterPillsProps<T extends string> {
  options: FilterPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Pill-row filter control for small enumerable option sets (stage, role,
 * category). Replaces dropdown `<select>` filters where the option count is
 * small enough to show all choices at once — matches the Turia reference's
 * filter-chip row.
 */
export default function FilterPills<T extends string>({ options, value, onChange }: FilterPillsProps<T>) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              background: active ? 'var(--color-text-main)' : 'var(--color-border)',
              color: active ? '#fff' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 999,
              padding: '5px 14px',
              fontSize: '0.78rem',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
