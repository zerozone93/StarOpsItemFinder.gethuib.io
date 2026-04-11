import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useSearch } from '../hooks/useSearch';
import { useFilter } from '../hooks/useFilter';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { ItemCard } from '../components/ItemCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TagPill } from '../components/TagPill';
import styles from './shared.module.css';

const RARITY_OPTIONS = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'very_rare', label: 'Very Rare' },
];

function rarityVariant(rarity: string): 'default' | 'success' | 'primary' | 'warning' | 'danger' {
  const map: Record<string, 'default' | 'success' | 'primary' | 'warning'> = {
    common: 'default',
    uncommon: 'success',
    rare: 'primary',
    very_rare: 'warning',
  };
  return map[rarity] ?? 'default';
}

export function Resources() {
  const { data, loading } = useData();
  const navigate = useNavigate();
  const { query, setQuery, results } = useSearch(data?.resources ?? []);
  const { filter, setFilter, filtered } = useFilter(results, 'rarity');

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  return (
    <div className={styles.pageLayout}>
      <aside className={styles.sidebar}>
        <FilterPanel
          label="Rarity"
          options={RARITY_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
        <FilterPanel
          label="Category"
          options={[
            { value: 'mineral', label: 'Mineral' },
            { value: 'gas', label: 'Gas' },
            { value: 'organic', label: 'Organic' },
          ]}
          value={''}
          onChange={() => {}}
        />
      </aside>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Resources</h1>
          <p className={styles.pageSubtitle}>{filtered.length} resources found</p>
        </div>
        <div className={styles.searchWrap}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search resources..." />
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No resources match your search.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((r) => (
              <ItemCard
                key={r.id}
                item={r}
                subtitle={`${r.category} • ${r.baseValue} aUEC`}
                onClick={() => navigate(`/resources/${r.slug}`)}
                extra={<TagPill label={r.rarity.replace('_', ' ')} variant={rarityVariant(r.rarity)} />}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ResourceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  const resource = data.resources.find((r) => r.slug === slug);
  if (!resource) return <div className={styles.notFound}>Resource not found.</div>;

  const locations = resource.locationIds
    .map((lid) => data.locations.find((l) => l.id === lid))
    .filter(Boolean);
  const methods = resource.miningMethodIds
    .map((mid) => data.miningMethods.find((m) => m.id === mid))
    .filter(Boolean);

  return (
    <div className={styles.detailPage}>
      <Link to="/resources" className={styles.backLink}>← Back to Resources</Link>
      <div className={styles.detailCard}>
        <div className={styles.detailTitle}>{resource.name}</div>
        <div className={styles.detailSubtitle}>{resource.category}</div>
        <p className={styles.detailDescription}>{resource.description}</p>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Base Value</div>
            <div className={styles.statBoxValue}>{resource.baseValue}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Rarity</div>
            <div className={styles.statBoxValue}>{resource.rarity.replace('_', ' ')}</div>
          </div>
          {resource.instabilityRating !== undefined && (
            <div className={styles.statBox}>
              <div className={styles.statBoxLabel}>Instability</div>
              <div className={styles.statBoxValue}>{resource.instabilityRating}/10</div>
            </div>
          )}
        </div>
        <div className={styles.tagRow}>
          {resource.tags.map((t) => <TagPill key={t} label={t} />)}
        </div>
      </div>

      {locations.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>📍 Found At</div>
          {locations.map((l) => l && (
            <div key={l.id} className={styles.listItem}>
              <span className={styles.listItemIcon}>🪐</span>
              <Link to={`/locations/${l.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                {l.name}
              </Link>
              <span style={{ color: '#475569', fontSize: 12 }}>({l.category})</span>
            </div>
          ))}
        </div>
      )}

      {methods.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>⛏️ Mining Methods</div>
          {methods.map((m) => m && (
            <div key={m.id} className={styles.listItem}>
              <span className={styles.listItemIcon}>🔧</span>
              <span>{m.name}</span>
            </div>
          ))}
        </div>
      )}

      {resource.sourceNotes && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>📝 Notes</div>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{resource.sourceNotes}</p>
        </div>
      )}
    </div>
  );
}
