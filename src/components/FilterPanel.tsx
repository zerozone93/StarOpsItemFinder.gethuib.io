import styles from './FilterPanel.module.css';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}

export function FilterPanel({ label, options, value, onChange }: FilterPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.label}>{label}</div>
      <div className={styles.options}>
        <button
          className={`${styles.option} ${value === '' ? styles.active : ''}`}
          onClick={() => onChange('')}
        >
          All
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.option} ${value === opt.value ? styles.active : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
