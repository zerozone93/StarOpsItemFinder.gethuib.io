import type { AssistantMessage } from '../types';
import styles from './AssistantPanel.module.css';

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const nodes = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} style={{ color: '#00e5ff' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    return (
      <span key={i}>
        {nodes}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
      <div className={styles.bubbleContent}>
        {renderMarkdown(message.content)}
      </div>
    </div>
  );
}
