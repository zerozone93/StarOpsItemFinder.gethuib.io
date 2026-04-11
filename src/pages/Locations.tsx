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

const CATEGORY_OPTIONS = [
  { value: 'planet', label: 'Planet' },
  { value: 'moon', label: 'Moon' },
  { value: 'station', label: 'Station' },
  { value: 'city', label: 'City' },
  { value: 'cave', label: 'Cave' },
  { value: 'lagrange', label: 'Lagrange' },
];

export function Locations() {
  const { data, loading } = useData();
  const navigate = useNavigate();
  const { query, setQuery, results } = useSearch(data?.locations ?? []);
  const { filter, setFilter, filtered } = useFilter(results, 'category');

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  return (
    <div className={styles.pageLayout}>
      <aside className={styles.sidebar}>
        <FilterPanel
          label="Type"
          options={CATEGORY_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </aside>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Locations</h1>
          <p className={styles.pageSubtitle}>{filtered.length} locations in Stanton</p>
        </div>
        <div className={styles.searchWrap}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search locations..." />
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No locations match your search.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((l) => (
              <ItemCard
                key={l.id}
                item={l}
                subtitle={l.category}
                onClick={() => navigate(`/locations/${l.slug}`)}
                extra={
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <TagPill label={l.category} variant="primary" />
                    {l.resourceIds.length > 0 && (
                      <TagPill label={`${l.resourceIds.length} resources`} variant="success" />
                    )}
                    {l.vendorIds.length > 0 && (
                      <TagPill label={`${l.vendorIds.length} vendors`} />
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LocationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  const location = data.locations.find((l) => l.slug === slug);
  if (!location) return <div className={styles.notFound}>Location not found.</div>;

  const parentLoc = location.parentId
    ? data.locations.find((l) => l.id === location.parentId)
    : null;
  const childLocs = data.locations.filter((l) => l.parentId === location.id);
  const resources = location.resourceIds
    .map((rid) => data.resources.find((r) => r.id === rid))
    .filter(Boolean);
  const vendors = location.vendorIds
    .map((vid) => data.vendors.find((v) => v.id === vid))
    .filter(Boolean);

  return (
    <div className={styles.detailPage}>
      <Link to="/locations" className={styles.backLink}>← Back to Locations</Link>
      <div className={styles.detailCard}>
        <div className={styles.detailTitle}>{location.name}</div>
        <div className={styles.detailSubtitle}>{location.category}</div>
        <p className={styles.detailDescription}>{location.description}</p>
        {parentLoc && (
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Part of:{' '}
            <Link to={`/locations/${parentLoc.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
              {parentLoc.name}
            </Link>
          </div>
        )}
        <div className={styles.tagRow}>
          {location.tags.map((t) => <TagPill key={t} label={t} />)}
        </div>
      </div>

      {resources.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>⛏️ Available Resources</div>
          {resources.map((r) => r && (
            <div key={r.id} className={styles.listItem}>
              <span className={styles.listItemIcon}>💎</span>
              <Link to={`/resources/${r.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                {r.name}
              </Link>
              <TagPill label={r.rarity.replace('_', ' ')} variant="primary" />
            </div>
          ))}
        </div>
      )}

      {vendors.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>🏪 Vendors</div>
          {vendors.map((v) => v && (
            <div key={v.id} className={styles.listItem}>
              <span className={styles.listItemIcon}>🏪</span>
              <span>{v.name}</span>
              <TagPill label={v.category} />
            </div>
          ))}
        </div>
      )}

      {childLocs.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>📍 Sub-Locations</div>
          {childLocs.map((child) => (
            <div key={child.id} className={styles.listItem}>
              <span className={styles.listItemIcon}>🪐</span>
              <Link to={`/locations/${child.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                {child.name}
              </Link>
              <TagPill label={child.category} />
            </div>
          ))}
        </div>
      )}

      {location.sourceNotes && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>📝 Notes</div>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{location.sourceNotes}</p>
        </div>
      )}
    </div>
  );
}
