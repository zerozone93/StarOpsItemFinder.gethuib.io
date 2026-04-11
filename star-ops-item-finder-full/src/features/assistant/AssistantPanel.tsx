import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../App';
import { answerQuestion } from '../../utils/assistant';
import { AssistantMessage } from '../../types/assistant';

const starters = ['Where do I find Hadanite?', 'What do I need for ROC mining?', 'Show me weapons sold in Area18'];

export function AssistantPanel() {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  function ask(question: string) {
    if (!question.trim()) return;
    const response = answerQuestion(question, data);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: question },
      { id: crypto.randomUUID(), role: 'assistant', content: response.answer, relatedLinks: response.links },
    ]);
    setInput('');
    setOpen(true);
  }

  return (
    <>
      <button className="assistant-toggle" onClick={() => setOpen((v) => !v)}>
        AI Assistant
      </button>
      {open ? (
        <aside className="assistant-panel">
          <div className="assistant-head">
            <strong>Ops Assistant</strong>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="assistant-suggestions">
            {starters.map((starter) => (
              <button key={starter} className="chip" onClick={() => ask(starter)}>
                {starter}
              </button>
            ))}
          </div>
          <div className="assistant-messages">
            {messages.length === 0 ? <p className="muted">Ask about resources, mining, weapons, armor, crafting, or locations.</p> : null}
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'assistant' ? 'msg assistant' : 'msg user'}>
                <p>{message.content}</p>
                {message.relatedLinks?.length ? (
                  <div className="chip-row">
                    {message.relatedLinks.map((link) => (
                      <Link key={link.to + link.label} to={link.to} className="chip link-chip">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <form
            className="assistant-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a Star Citizen question" />
            <button type="submit">Send</button>
          </form>
        </aside>
      ) : null}
    </>
  );
}
