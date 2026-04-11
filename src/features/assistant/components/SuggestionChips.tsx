import styles from './AssistantPanel.module.css';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (s: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className={styles.suggestions}>
      {suggestions.map((s) => (
        <button key={s} className={styles.chip} onClick={() => onSelect(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
