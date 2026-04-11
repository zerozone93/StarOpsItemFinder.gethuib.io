import styles from './TagPill.module.css';

interface TagPillProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export function TagPill({ label, variant = 'default' }: TagPillProps) {
  return <span className={`${styles.pill} ${styles[variant]}`}>{label}</span>;
}
