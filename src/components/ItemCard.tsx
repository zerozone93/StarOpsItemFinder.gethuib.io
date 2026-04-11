import type { BaseEntity } from '../types';
import { TagPill } from './TagPill';
import styles from './ItemCard.module.css';

interface ItemCardProps {
  item: BaseEntity;
  subtitle?: string;
  extra?: React.ReactNode;
  onClick?: () => void;
}

export function ItemCard({ item, subtitle, extra, onClick }: ItemCardProps) {
  return (
    <div className={`${styles.card} ${onClick ? styles.clickable : ''}`} onClick={onClick}>
      <div className={styles.header}>
        <h3 className={styles.name}>{item.name}</h3>
        {item.verificationStatus !== 'verified' && (
          <TagPill
            label={item.verificationStatus}
            variant={item.verificationStatus === 'outdated' ? 'danger' : 'warning'}
          />
        )}
      </div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      <p className={styles.description}>{item.description}</p>
      {item.tags.length > 0 && (
        <div className={styles.tags}>
          {item.tags.slice(0, 4).map((t) => (
            <TagPill key={t} label={t} />
          ))}
        </div>
      )}
      {extra && <div className={styles.extra}>{extra}</div>}
    </div>
  );
}
