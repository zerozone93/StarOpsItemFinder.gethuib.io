import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TagPill } from '../components/TagPill';
import styles from './shared.module.css';
import mStyles from './Mining.module.css';

export function Mining() {
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mining Guide</h1>
        <p className={styles.pageSubtitle}>Methods, tools, vehicles, and best locations for mining in Stanton.</p>
      </div>

      <div className={mStyles.methodsGrid}>
        {data.miningMethods.map((method) => {
          const tools = method.requiredTools
            .map((tid) => data.tools.find((t) => t.id === tid))
            .filter(Boolean);
          const resources = method.resourceIds
            .map((rid) => data.resources.find((r) => r.id === rid))
            .filter(Boolean);

          return (
            <div key={method.id} className={mStyles.methodCard}>
              <div className={mStyles.methodHeader}>
                <span className={mStyles.methodIcon}>
                  {method.category === 'fps' ? '🔫' : method.category === 'roc' ? '🚗' : '🚀'}
                </span>
                <div>
                  <div className={mStyles.methodName}>{method.name}</div>
                  <TagPill label={method.category.toUpperCase()} variant="primary" />
                </div>
              </div>
              <p className={mStyles.methodDesc}>{method.description}</p>

              {tools.length > 0 && (
                <div className={mStyles.subsection}>
                  <div className={mStyles.subsectionTitle}>🔧 Required Tools / Vehicles</div>
                  {tools.map((t) => t && (
                    <div key={t.id} className={mStyles.toolItem}>
                      <strong>{t.name}</strong>
                      {t.buyPrice ? <span className={mStyles.price}>{t.buyPrice.toLocaleString()} aUEC</span> : null}
                    </div>
                  ))}
                </div>
              )}

              {resources.length > 0 && (
                <div className={mStyles.subsection}>
                  <div className={mStyles.subsectionTitle}>⛏️ Mineable Resources</div>
                  <div className={mStyles.tagRow}>
                    {resources.map((r) => r && <TagPill key={r.id} label={r.name} variant="success" />)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className={mStyles.sectionTitle}>Mining Ships & Vehicles</h2>
      <div className={mStyles.toolsGrid}>
        {data.tools.map((tool) => {
          const vendors = tool.vendorIds
            .map((vid) => data.vendors.find((v) => v.id === vid))
            .filter(Boolean);
          return (
            <div key={tool.id} className={mStyles.toolCard}>
              <div className={mStyles.toolName}>{tool.name}</div>
              <TagPill label={tool.category} variant="primary" />
              <p className={mStyles.toolDesc}>{tool.description}</p>
              {tool.buyPrice && (
                <div className={mStyles.toolPrice}>💰 {tool.buyPrice.toLocaleString()} aUEC</div>
              )}
              {vendors.length > 0 && (
                <div className={mStyles.vendorList}>
                  <strong>Buy at:</strong>{' '}
                  {vendors.map((v) => v && (
                    <span key={v.id}>
                      <Link
                        to={`/locations/${data.locations.find((l) => l.id === v.locationId)?.slug ?? ''}`}
                        style={{ color: '#38bdf8', textDecoration: 'none' }}
                      >
                        {v.name}
                      </Link>{' '}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className={mStyles.sectionTitle}>Best Mining Locations</h2>
      <div className={mStyles.locGrid}>
        {data.locations
          .filter((l) => l.resourceIds.length > 0)
          .slice(0, 8)
          .map((loc) => {
            const resources = loc.resourceIds
              .map((rid) => data.resources.find((r) => r.id === rid))
              .filter(Boolean);
            return (
              <Link key={loc.id} to={`/locations/${loc.slug}`} className={mStyles.locCard}>
                <div className={mStyles.locName}>{loc.name}</div>
                <TagPill label={loc.category} />
                <div className={mStyles.locResources}>
                  {resources.map((r) => r && <TagPill key={r.id} label={r.name} variant="success" />)}
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
