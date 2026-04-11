import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { SearchBar } from '../components/SearchBar';
import { ItemCard } from '../components/ItemCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import styles from './Home.module.css';

const CATEGORIES = [
  { icon: '⛏️', name: 'Resources', path: '/resources', key: 'resources' },
  { icon: '🪐', name: 'Locations', path: '/locations', key: 'locations' },
  { icon: '🔧', name: 'Mining', path: '/mining', key: 'mining' },
  { icon: '🧪', name: 'Crafting', path: '/crafting', key: 'crafting' },
  { icon: '🔫', name: 'Weapons', path: '/weapons', key: 'weapons' },
  { icon: '🛡️', name: 'Armor', path: '/armor', key: 'armor' },
];

function rarityClass(rarity: string): string {
  const map: Record<string, string> = {
    common: styles.rarityCommon,
    uncommon: styles.rarityUncommon,
    rare: styles.rarityRare,
    very_rare: styles.rarityVeryRare,
  };
  return map[rarity] ?? styles.rarityCommon;
}

export function Home() {
  const { data, loading } = useData();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    if (!data || !query.trim()) return [];
    const q = query.toLowerCase();
    const results: { type: string; name: string; description: string; path: string }[] = [];

    data.resources.forEach((r) => {
      if (r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q))) {
        results.push({ type: 'Resource', name: r.name, description: r.description, path: `/resources/${r.slug}` });
      }
    });
    data.locations.forEach((l) => {
      if (l.name.toLowerCase().includes(q) || l.tags.some((t) => t.includes(q))) {
        results.push({ type: 'Location', name: l.name, description: l.description, path: `/locations/${l.slug}` });
      }
    });
    data.weapons.forEach((w) => {
      if (w.name.toLowerCase().includes(q) || w.tags.some((t) => t.includes(q))) {
        results.push({ type: 'Weapon', name: w.name, description: w.description, path: `/weapons/${w.slug}` });
      }
    });
    data.armor.forEach((a) => {
      if (a.name.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q))) {
        results.push({ type: 'Armor', name: a.name, description: a.description, path: `/armor/${a.slug}` });
      }
    });

    return results.slice(0, 8);
  }, [data, query]);

  if (loading) return <LoadingSpinner message="Loading Star Citizen data..." />;

  const featuredResources = data?.resources.filter((r) => r.rarity !== 'common').slice(0, 3) ?? [];

  return (
    <div>
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <h1 className={styles.heroTitle}>
          Star Ops <span className={styles.heroAccent}>Item Finder</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Your complete guide to resources, mining, weapons, armor, and locations in the Stanton system.
        </p>
        <div className={styles.heroSearch}>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search resources, weapons, locations..."
          />
        </div>
        <p className={styles.heroHint}>Try: "Hadanite", "Area18", "Prospector", "P4-AR"</p>

        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map((r) => (
              <div
                key={r.path}
                className={styles.searchResult}
                onClick={() => { navigate(r.path); setQuery(''); }}
              >
                <span className={styles.searchResultType}>{r.type}</span>
                <span className={styles.searchResultName}>{r.name}</span>
                <span className={styles.searchResultDesc}>{r.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.categories}>
        <h2 className={styles.sectionTitle}>Browse Categories</h2>
        <div className={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const count = data ? (data[cat.key as keyof typeof data] as unknown[]).length : 0;
            return (
              <Link key={cat.path} to={cat.path} className={styles.categoryCard}>
                <div className={styles.categoryIcon}>{cat.icon}</div>
                <div className={styles.categoryName}>{cat.name}</div>
                <div className={styles.categoryCount}>{count} items</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.featured}>
        <h2 className={styles.sectionTitle}>Featured Resources</h2>
        <div className={styles.featuredGrid}>
          {featuredResources.map((r) => (
            <ItemCard
              key={r.id}
              item={r}
              subtitle={r.category}
              onClick={() => navigate(`/resources/${r.slug}`)}
              extra={
                <div>
                  <span className={`${styles.rarityBadge} ${rarityClass(r.rarity)}`}>{r.rarity.replace('_', ' ')}</span>
                  <div className={styles.statBar}>
                    <span className={styles.statLabel}>Base value:</span>
                    <span className={styles.statValue}>{r.baseValue} aUEC/unit</span>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
