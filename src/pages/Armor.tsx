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
  { value: 'helmet', label: 'Helmet' },
  { value: 'torso', label: 'Torso' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
  { value: 'undersuit', label: 'Undersuit' },
  { value: 'set', label: 'Full Set' },
];

export function Armor() {
  const { data, loading } = useData();
  const navigate = useNavigate();
  const { query, setQuery, results } = useSearch(data?.armor ?? []);
  const { filter, setFilter, filtered } = useFilter(results, 'category');

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  return (
    <div className={styles.pageLayout}>
      <aside className={styles.sidebar}>
        <FilterPanel
          label="Piece Type"
          options={CATEGORY_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </aside>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Armor</h1>
          <p className={styles.pageSubtitle}>{filtered.length} armor pieces found</p>
        </div>
        <div className={styles.searchWrap}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search armor..." />
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No armor matches your search.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((a) => (
              <ItemCard
                key={a.id}
                item={a}
                subtitle={`${a.category} • ${a.manufacturer} • AR: ${a.armorRating}`}
                onClick={() => navigate(`/armor/${a.slug}`)}
                extra={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <TagPill label={a.category} variant="primary" />
                    {a.buyPrice && <span style={{ color: '#00e5ff', fontSize: 12 }}>{a.buyPrice.toLocaleString()} aUEC</span>}
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

export function ArmorDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  const armor = data.armor.find((a) => a.slug === slug);
  if (!armor) return <div className={styles.notFound}>Armor not found.</div>;

  const vendors = armor.vendorIds
    .map((vid) => data.vendors.find((v) => v.id === vid))
    .filter(Boolean);
  const lootSources = armor.lootSourceIds
    .map((lid) => data.lootSources.find((l) => l.id === lid))
    .filter(Boolean);

  return (
    <div className={styles.detailPage}>
      <Link to="/armor" className={styles.backLink}>← Back to Armor</Link>
      <div className={styles.detailCard}>
        <div className={styles.detailTitle}>{armor.name}</div>
        <div className={styles.detailSubtitle}>{armor.category} • {armor.manufacturer}</div>
        <p className={styles.detailDescription}>{armor.description}</p>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Armor Rating</div>
            <div className={styles.statBoxValue}>{armor.armorRating}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Temperature</div>
            <div className={styles.statBoxValue} style={{ fontSize: 14 }}>{armor.temperatureRating}</div>
          </div>
          {armor.buyPrice && (
            <div className={styles.statBox}>
              <div className={styles.statBoxLabel}>Price</div>
              <div className={styles.statBoxValue} style={{ fontSize: 14 }}>{armor.buyPrice.toLocaleString()}</div>
            </div>
          )}
        </div>
        <div className={styles.tagRow}>
          {armor.tags.map((t) => <TagPill key={t} label={t} />)}
        </div>
      </div>

      {vendors.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>🏪 Where to Buy</div>
          {vendors.map((v) => {
            if (!v) return null;
            const loc = data.locations.find((l) => l.id === v.locationId);
            return (
              <div key={v.id} className={styles.listItem}>
                <span className={styles.listItemIcon}>🏪</span>
                <span>{v.name}</span>
                {loc && (
                  <Link to={`/locations/${loc.slug}`} style={{ color: '#38bdf8', textDecoration: 'none', fontSize: 12 }}>
                    ({loc.name})
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lootSources.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardTitle}>🎯 Loot Sources</div>
          {lootSources.map((ls) => ls && (
            <div key={ls.id} className={styles.listItem}>
              <span className={styles.listItemIcon}>📦</span>
              <span>{ls.name}</span>
              <span style={{ color: '#475569', fontSize: 12 }}>({ls.category})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
