import { useState, useRef, useEffect } from 'react';
import type { AssistantMessage, AssistantResponse } from '../types';
import { LocalAssistantProvider } from '../providers/LocalAssistantProvider';
import { MessageBubble } from './MessageBubble';
import { SuggestionChips } from './SuggestionChips';
import { useData } from '../../../hooks/useData';
import styles from './AssistantPanel.module.css';

const EXAMPLE_SUGGESTIONS = [
  'Where do I find Hadanite?',
  'What do I need for ROC mining?',
  'Show me weapons in Area18',
  'What armor can I buy in Lorville?',
];

export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState<string[]>(EXAMPLE_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data } = useData();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !data) return;

    const userMsg: AssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setLastSuggestions([]);

    const provider = new LocalAssistantProvider(data);
    let response: AssistantResponse;
    try {
      response = await provider.query(trimmed, messages);
    } catch {
      response = { message: 'Sorry, something went wrong. Please try again.' };
    }

    const assistantMsg: AssistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.message,
      timestamp: Date.now(),
    };

    setTyping(false);
    setMessages((prev) => [...prev, assistantMsg]);
    setLastSuggestions(response.suggestions ?? []);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <>
      <button className={styles.fab} onClick={() => setOpen((o) => !o)} aria-label="Open AI Assistant">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>⚡ Star Ops Assistant</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.assistantBubble} style={{ alignSelf: 'flex-start' }}>
                <div className={styles.bubbleContent}>
                  👋 Hello, pilot! Ask me about resources, mining, weapons, armor, or locations in Stanton.
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {typing && <div className={styles.typing}>Star Ops Assistant is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <SuggestionChips
            suggestions={lastSuggestions}
            onSelect={(s) => void sendMessage(s)}
          />

          <div className={styles.inputArea}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={typing || !data}
            />
            <button
              className={styles.sendBtn}
              onClick={() => void sendMessage(input)}
              disabled={typing || !input.trim() || !data}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
