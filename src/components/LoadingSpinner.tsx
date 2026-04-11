import styles from './LoadingSpinner.module.css';

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
