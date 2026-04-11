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
  { value: 'rifle', label: 'Rifle' },
  { value: 'pistol', label: 'Pistol' },
  { value: 'shotgun', label: 'Shotgun' },
  { value: 'sniper', label: 'Sniper' },
  { value: 'smg', label: 'SMG' },
];

export function Weapons() {
  const { data, loading } = useData();
  const navigate = useNavigate();
  const { query, setQuery, results } = useSearch(data?.weapons ?? []);
  const { filter, setFilter, filtered } = useFilter(results, 'category');

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  return (
    <div className={styles.pageLayout}>
      <aside className={styles.sidebar}>
        <FilterPanel
          label="Category"
          options={CATEGORY_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      </aside>
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Weapons</h1>
          <p className={styles.pageSubtitle}>{filtered.length} weapons found</p>
        </div>
        <div className={styles.searchWrap}>
          <SearchBar value={query} onChange={setQuery} placeholder="Search weapons..." />
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No weapons match your search.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((w) => (
              <ItemCard
                key={w.id}
                item={w}
                subtitle={`${w.category} • ${w.manufacturer} • ${w.damage} dmg`}
                onClick={() => navigate(`/weapons/${w.slug}`)}
                extra={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <TagPill label={w.category} variant="primary" />
                    {w.buyPrice && <span style={{ color: '#00e5ff', fontSize: 12 }}>{w.buyPrice.toLocaleString()} aUEC</span>}
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

export function WeaponDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  const weapon = data.weapons.find((w) => w.slug === slug);
  if (!weapon) return <div className={styles.notFound}>Weapon not found.</div>;

  const vendors = weapon.vendorIds
    .map((vid) => data.vendors.find((v) => v.id === vid))
    .filter(Boolean);
  const lootSources = weapon.lootSourceIds
    .map((lid) => data.lootSources.find((l) => l.id === lid))
    .filter(Boolean);

  return (
    <div className={styles.detailPage}>
      <Link to="/weapons" className={styles.backLink}>← Back to Weapons</Link>
      <div className={styles.detailCard}>
        <div className={styles.detailTitle}>{weapon.name}</div>
        <div className={styles.detailSubtitle}>{weapon.category} • {weapon.manufacturer}</div>
        <p className={styles.detailDescription}>{weapon.description}</p>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Damage</div>
            <div className={styles.statBoxValue}>{weapon.damage}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Fire Rate</div>
            <div className={styles.statBoxValue}>{weapon.fireRate}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Ammo</div>
            <div className={styles.statBoxValue} style={{ fontSize: 14 }}>{weapon.ammoType}</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statBoxLabel}>Attachments</div>
            <div className={styles.statBoxValue}>{weapon.attachmentSlots}</div>
          </div>
          {weapon.buyPrice && (
            <div className={styles.statBox}>
              <div className={styles.statBoxLabel}>Price</div>
              <div className={styles.statBoxValue} style={{ fontSize: 14 }}>{weapon.buyPrice.toLocaleString()}</div>
            </div>
          )}
        </div>
        <div className={styles.tagRow}>
          {weapon.tags.map((t) => <TagPill key={t} label={t} />)}
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
