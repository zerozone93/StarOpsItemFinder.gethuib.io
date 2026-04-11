import { Link } from 'react-router-dom';
import { entityPath, labelForVerification } from '../utils/data';

export function EntityCard({
  type,
  id,
  title,
  subtitle,
  meta,
  verification,
}: {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  verification?: string;
}) {
  return (
    <Link to={entityPath(type, id)} className="panel card-link">
      <div className="card-head">
        <h3>{title}</h3>
        {verification ? <span className="badge">{labelForVerification(verification)}</span> : null}
      </div>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
      {meta?.length ? (
        <div className="chip-row">
          {meta.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
