import { createContext, startTransition, useContext, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  askAssistant,
  createAdminUser,
  exportAdminStorage,
  fetchAdminMe,
  fetchAdminState,
  fetchAdminUsers,
  fetchCollection,
  fetchDataset,
  fetchPublicSnapshot,
  loginAdmin,
  logoutAdmin,
  updateAdminPassword,
  updateAdminState,
  type AdminState,
  type AdminUser,
  type AssistantResponse,
  type ManagedAdminUser,
  type PaginatedResponse,
} from './api';
import { type AppModel, type ConsoleEntity, buildAppModel, buildModelFromExportedSnapshot, formatLabel, navigationSections, primaryBrowseSections } from './data';

type FilterState = {
  query: string;
  verification: string;
  category: string;
  mission: string;
  locationType: 'all' | 'market' | 'mission' | 'crafting';
};

type SortMode = 'name' | 'status' | 'category' | 'mission';
type DataSourceMode = 'live' | 'snapshot';

function getBlueprintMissionLabel(entry: ConsoleEntity) {
  const acquireValue = entry.metadata.find((item) => item.label.toLowerCase() === 'acquire')?.value.trim();
  if (acquireValue && acquireValue.length > 0) {
    return `Mission: ${acquireValue}`;
  }

  if (entry.tags.length > 0) {
    return `Mission: ${entry.tags.join(', ')}`;
  }

  return 'Mission info pending';
}

function getCraftingResourcesLabel(entry: ConsoleEntity) {
  const resources = entry.metadata.find((item) => item.label.toLowerCase() === 'resources')?.value.trim();
  if (resources && resources.length > 0 && resources.toLowerCase() !== 'unknown') {
    return `Resources: ${resources}`;
  }

  return 'Resources: pending data';
}

function getLocationConfidence(locationId: string) {
  if (locationId === 'location:stanton-mining-claims' || locationId === 'location:unknown-market' || locationId === 'location:mission-reward') {
    return {
      label: 'General Fallback',
      tone: 'warning' as const,
    };
  }

  return {
    label: 'Web Confirmed',
    tone: 'success' as const,
  };
}

const assistantPrompts = [
  'Show verified mining resources for Daymar',
  'What armor is best for FPS mining?',
  'List weapon records with crafting paths',
  'Find stations with equipment vendors',
];

const adminTokenKey = 'starops.adminToken';
const AppModelContext = createContext<AppModel | null>(null);

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildSearchText(entry: ConsoleEntity) {
  return normalizeSearchValue([
    entry.id,
    entry.name,
    entry.category,
    entry.summary,
    entry.tags.join(' '),
    entry.metadata.map((item) => `${item.label} ${item.value}`).join(' '),
  ].join(' '));
}

function findBestSearchMatch(query: string, entities: ConsoleEntity[]) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return null;
  }

  const matches = entities
    .map((entry) => {
      const normalizedName = normalizeSearchValue(entry.name);
      const normalizedId = normalizeSearchValue(entry.id);
      const haystack = buildSearchText(entry);
      let score = 0;

      if (normalizedName === normalizedQuery || normalizedId === normalizedQuery) {
        score = 100;
      } else if (normalizedName.startsWith(normalizedQuery)) {
        score = 80;
      } else if (normalizedName.includes(normalizedQuery)) {
        score = 68;
      } else if (normalizeSearchValue(entry.category).includes(normalizedQuery)) {
        score = 52;
      } else if (normalizeSearchValue(entry.tags.join(' ')).includes(normalizedQuery)) {
        score = 40;
      } else if (haystack.includes(normalizedQuery)) {
        score = 24;
      }

      return { entry, score, exact: score === 100 };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name));

  return matches[0] ?? null;
}

export function App() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [model, setModel] = useState<AppModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotFallback, setSnapshotFallback] = useState(false);

  const loadModel = async () => {
    setLoading(true);
    setError(null);

    try {
      const dataset = await fetchDataset();
      startTransition(() => {
        setModel(buildAppModel(dataset));
      });
      setSnapshotFallback(false);
    } catch (loadError) {
      try {
        const snapshot = await fetchPublicSnapshot();
        startTransition(() => {
          setModel(buildModelFromExportedSnapshot(snapshot));
        });
        setSnapshotFallback(true);
      } catch {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load operations dataset.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModel();
  }, []);

  if (loading || !model) {
    return (
      <ShellFrame>
        {error ? <ErrorState error={error} onRetry={() => void loadModel()} /> : <LoadingState />}
      </ShellFrame>
    );
  }

  return (
    <AppModelContext.Provider value={model}>
      <div className="app-shell">
        <GridDecor />
        <div className="app-frame">
          <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} onAssistant={() => setAssistantOpen(true)} />
          <main className="app-main">
            <TopBar
              dataSourceMode={snapshotFallback ? 'snapshot' : 'live'}
              onMenu={() => setMobileNavOpen(true)}
              onAssistant={() => setAssistantOpen((value) => !value)}
            />
            <Routes>
              <Route path="/" element={<HomePage onAssistant={() => setAssistantOpen(true)} />} />
              <Route path="/admin" element={<AdminPage onRefreshModel={() => void loadModel()} />} />
              <Route path="/:section/:id" element={<DetailPage />} />
              <Route path="/:section" element={<BrowsePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          {assistantOpen ? <button type="button" className="assistant-backdrop" aria-label="Close assistant" onClick={() => setAssistantOpen(false)} /> : null}
          <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
        </div>
      </div>
    </AppModelContext.Provider>
  );
}

function useAppModel() {
  const model = useContext(AppModelContext);

  if (!model) {
    throw new Error('App model is not available.');
  }

  return model;
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <GridDecor />
      <div className="app-frame app-frame--single">
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="panel shell-message">
      <div className="eyebrow">Boot Sequence</div>
      <h1>Connecting to the Star Ops backend</h1>
      <p>Loading operational data, indexing entities, and preparing the command console.</p>
      <div className="loading-grid">
        <div className="loading-card" />
        <div className="loading-card" />
        <div className="loading-card" />
      </div>
    </section>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <section className="panel shell-message">
      <div className="eyebrow">Connection Error</div>
      <h1>Backend connection failed</h1>
      <p>{error}</p>
      <button type="button" className="button" onClick={onRetry}>
        Retry connection
      </button>
    </section>
  );
}

function GridDecor() {
  return (
    <div className="grid-decor" aria-hidden="true">
      <div className="grid-decor__glow grid-decor__glow--one" />
      <div className="grid-decor__glow grid-decor__glow--two" />
      <div className="grid-decor__mesh" />
    </div>
  );
}

function Sidebar({ mobileOpen, onClose, onAssistant }: { mobileOpen: boolean; onClose: () => void; onAssistant: () => void }) {
  const { data } = useAppModel();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <button className="sidebar__close" type="button" onClick={onClose}>
          Close
        </button>
        <div>
          <div className="eyebrow">Operations Network</div>
          <h1>Star Ops Item Finder</h1>
        </div>
      </div>

      <nav className="nav-list nav-list--secondary">
        <button className={`nav-link ${location.pathname === '/' ? 'nav-link--active' : ''}`} type="button" onClick={() => {
          onClose();
          navigate('/');
        }}>
          <span className="nav-link__label">Overview</span>
        </button>
        <button className="nav-link" type="button" onClick={() => {
          onClose();
          onAssistant();
        }}>
          <span className="nav-link__label">Assistant</span>
        </button>
        <button className={`nav-link ${location.pathname.startsWith('/admin') ? 'nav-link--active' : ''}`} type="button" onClick={() => {
          onClose();
          navigate('/admin');
        }}>
          <span className="nav-link__label">Admin</span>
        </button>
      </nav>

      <div className="sidebar__footer panel">
        <p>{data.meta.gameVersionTarget} dataset online. Use the top tabs for mining, blueprints, crafting, armor, weapons, and utility records.</p>
      </div>
    </aside>
  );
}

function TopBar({
  dataSourceMode,
  onMenu,
  onAssistant,
}: {
  dataSourceMode: DataSourceMode;
  onMenu: () => void;
  onAssistant: () => void;
}) {
  const { consoleEntities } = useAppModel();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  useEffect(() => {
    const nextQuery = searchParams.get('q') ?? '';
    setQuery(nextQuery);
    setSearchStatus(null);
  }, [searchParams]);

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
      return ['Home'];
    }
    return ['Home', ...parts.map(formatLabel)];
  }, [location.pathname]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const match = findBestSearchMatch(query, consoleEntities);

    if (match?.exact) {
      setSearchStatus(null);
      navigate(`/${match.entry.type}/${match.entry.id}`);
      return;
    }

    if (match) {
      setSearchStatus(null);
      navigate(`/${match.entry.type}?q=${encodeURIComponent(query.trim())}`);
      return;
    }

    setSearchStatus('No matching records found. Try an item name, material, or location.');
  };

  return (
    <header className="topbar panel">
      <div className="topbar__row">
        <button type="button" className="icon-button mobile-only" onClick={onMenu}>
          Menu
        </button>
        <div className="topbar__context">
          <div className="topbar__title">{breadcrumbs[breadcrumbs.length - 1]}</div>
          <div className="breadcrumbs">{breadcrumbs.join(' / ')}</div>
        </div>
        <div className="topbar__status">
          <div className={`source-indicator source-indicator--${dataSourceMode}`}>
            <span className="source-indicator__dot" aria-hidden="true" />
            <div>
              <div className="source-indicator__label">Source</div>
              <strong>{dataSourceMode === 'live' ? 'Live Backend Dataset' : 'Static Public Snapshot'}</strong>
            </div>
          </div>
        </div>
        <button type="button" className="button button--ghost" onClick={onAssistant}>
          Assistant
        </button>
      </div>
      <form className="searchbar" onSubmit={submit}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the index for items, routes, or locations" />
        <button type="submit" className="button">
          Search
        </button>
      </form>
      {searchStatus ? <div className="topbar__search-note">{searchStatus}</div> : null}
      <div className="topbar__tabs" role="tablist" aria-label="Primary sections">
        {primaryBrowseSections.map((section) => {
          const active = location.pathname.startsWith(`/${section.id}`);

          return (
            <button
              key={section.id}
              type="button"
              className={`topbar__tab ${active ? 'topbar__tab--active' : ''}`}
              onClick={() => navigate(`/${section.id}`)}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

function HomePage({ onAssistant }: { onAssistant: () => void }) {
  const model = useAppModel();
  const navigate = useNavigate();
  const noteItems = [...(model.data.meta.adminVerificationNotes ?? []), ...model.data.meta.notes].slice(0, 3);

  return (
    <div className="page-stack page-stack--home">
      <section className="hero hero--clean panel panel--hero">
        <div className="hero__copy">
          <div className="eyebrow">Star Ops command index</div>
          <h2>Find mining, crafting, armor, weapons, and utility data fast.</h2>
          <p>
            The interface is centered around six working tabs and a stronger search flow so you can move straight to the right records.
          </p>
          {model.data.meta.opsAnnouncement ? <div className="hero__announcement">{model.data.meta.opsAnnouncement}</div> : null}
          <div className="hero__actions">
            <button type="button" className="button" onClick={() => navigate('/mining')}>
              Start browsing
            </button>
            <button type="button" className="button button--ghost" onClick={onAssistant}>
              Open assistant
            </button>
          </div>
        </div>
        <div className="hero__aside">
          <div className="hero__meta">
            <span>Build target</span>
            <strong>{model.data.meta.gameVersionTarget}</strong>
            <small>Generated {model.data.meta.generatedOn}</small>
          </div>
          <div className="hero__stats hero__stats--compact">
            {model.stats.slice(0, 4).map((stat) => (
              <article key={stat.label} className={`stat-card stat-card--compact stat-card--${stat.tone}`}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section">
        <PanelHeader title="Browse by tab" subtitle="The main workflow is now reduced to the sections you asked for." />
        <div className="category-grid category-grid--clean">
          {primaryBrowseSections.map((entry) => (
              <button key={entry.id} type="button" className="category-card" onClick={() => navigate(`/${entry.id}`)}>
                <strong>{entry.label}</strong>
                <p>{entry.description}</p>
              </button>
            ))}
        </div>
      </section>

      <section className="panel surface-card surface-card--secondary home-notes-panel">
        <PanelHeader title="Quick notes" subtitle="Only the core operational context stays on the landing page." />
        <div className="overview-list overview-list--compact">
          <article className="overview-list__item">
            <span>Systems</span>
            <strong>{model.data.gameSystems.map((system) => system.name).join(' / ')}</strong>
          </article>
          <article className="overview-list__item">
            <span>Crafting coverage</span>
            <strong>{model.data.crafting.blueprints.length} blueprints and {model.data.crafting.recipes.length} recipes indexed</strong>
          </article>
        </div>
        <div className="note-stack">
          {noteItems.map((note) => (
            <p key={note} className="muted-copy">
              {note}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function BrowsePage() {
  const model = useAppModel();
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({ query: '', verification: 'all', category: 'all', mission: '', locationType: 'all' });
  const [sortMode, setSortMode] = useState<SortMode>('name');

  useEffect(() => {
    setFilters({
      query: searchParams.get('q') ?? '',
      verification: searchParams.get('verification') ?? 'all',
      category: searchParams.get('category') ?? 'all',
      mission: searchParams.get('mission') ?? '',
      locationType: (searchParams.get('locationType') as FilterState['locationType']) ?? 'all',
    });
  }, [searchParams, section]);

  useEffect(() => {
    if (section === 'blueprints' && sortMode !== 'mission') {
      setSortMode('mission');
      return;
    }

    if (section !== 'blueprints' && sortMode === 'mission') {
      setSortMode('name');
    }
  }, [section, sortMode]);

  const deferredQuery = useDeferredValue(filters.query);
  const locationTypeByEntityId = useMemo(() => {
    const types = new Map<string, FilterState['locationType']>();

    if (section !== 'weapons' && section !== 'armor') {
      return types;
    }

    const source = section === 'weapons' ? model.data.weapons : model.data.armor;

    for (const entry of source) {
      const purchaseLocations = entry.purchaseLocations ?? [];
      const foundLocations = entry.foundLocations ?? [];
      const allLocations = [...purchaseLocations, ...foundLocations];

      if (allLocations.includes('location:crafting-fabricator-network')) {
        types.set(entry.id, 'crafting');
        continue;
      }

      if (allLocations.includes('location:mission-reward')) {
        types.set(entry.id, 'mission');
        continue;
      }

      if (purchaseLocations.length > 0) {
        types.set(entry.id, 'market');
        continue;
      }

      if (foundLocations.length > 0) {
        types.set(entry.id, 'mission');
        continue;
      }

      types.set(entry.id, 'market');
    }

    return types;
  }, [model.data.armor, model.data.weapons, section]);

  const items = useMemo(() => {
    const source = model.getEntitiesByType(section ?? 'resources');
    const filtered = source.filter((entry) => {
      const matchesQuery = deferredQuery.length === 0 || `${entry.name} ${entry.summary} ${entry.tags.join(' ')}`.toLowerCase().includes(deferredQuery.toLowerCase());
      const matchesVerification = filters.verification === 'all' || entry.verificationStatus === filters.verification;
      const matchesCategory = filters.category === 'all' || entry.category === filters.category;
      const missionLabel = entry.type === 'blueprints' ? getBlueprintMissionLabel(entry).toLowerCase() : '';
      const matchesMission = section === 'blueprints'
        ? filters.mission.trim().length === 0 || missionLabel.includes(filters.mission.toLowerCase())
        : true;
      const matchesLocationType = (section === 'weapons' || section === 'armor')
        ? filters.locationType === 'all' || locationTypeByEntityId.get(entry.id) === filters.locationType
        : true;
      return matchesQuery && matchesVerification && matchesCategory && matchesMission && matchesLocationType;
    });

    return [...filtered].sort((left, right) => {
      if (sortMode === 'mission' && section === 'blueprints') {
        return getBlueprintMissionLabel(left).localeCompare(getBlueprintMissionLabel(right));
      }
      if (sortMode === 'status') {
        return left.verificationStatus.localeCompare(right.verificationStatus);
      }
      if (sortMode === 'category') {
        return left.category.localeCompare(right.category);
      }
      return left.name.localeCompare(right.name);
    });
  }, [deferredQuery, filters.category, filters.locationType, filters.mission, filters.verification, locationTypeByEntityId, model, section, sortMode]);

  const sectionConfig = navigationSections.find((entry) => entry.id === section && !['home', 'assistant', 'admin'].includes(entry.id));

  if (!section || !sectionConfig) {
    return <Navigate to="/" replace />;
  }

  const availableStatuses = Array.from(new Set(model.getEntitiesByType(section).map((entry) => entry.verificationStatus)));
  const availableCategories = Array.from(new Set(model.getEntitiesByType(section).map((entry) => entry.category))).sort();
  const availabilityByEntityId = useMemo(() => {
    const labels = new Map<string, { text: string; to?: string }>();

    for (const entry of items) {
      if (entry.type === 'blueprints') {
        labels.set(entry.id, { text: getBlueprintMissionLabel(entry) });
        continue;
      }

      if (entry.type === 'crafting') {
        labels.set(entry.id, { text: getCraftingResourcesLabel(entry) });
        continue;
      }

      if (entry.type === 'locations') {
        labels.set(entry.id, { text: `Found at ${entry.name}`, to: `/locations/${entry.id}` });
        continue;
      }

      const related = model.getEntityLinks(entry);
      const firstLocation = related.find((item) => 'locationType' in item);
      if (firstLocation && 'locationType' in firstLocation) {
        labels.set(entry.id, { text: `Found at ${firstLocation.name}`, to: `/locations/${firstLocation.id}` });
        continue;
      }

      const firstVendor = related.find((item) => 'locationId' in item);
      if (firstVendor && 'locationId' in firstVendor) {
        const vendorLocationName = model.getLocationName(firstVendor.locationId);
        labels.set(entry.id, {
          text: `Bought at ${firstVendor.name} (${vendorLocationName})`,
          to: `/locations/${firstVendor.locationId}`,
        });
        continue;
      }

      labels.set(entry.id, { text: 'Location data pending' });
    }

    return labels;
  }, [items, model]);

  return (
    <div className="browse-layout">
      <section className="page-stack">
        <div className="section-intro section-intro--clean">
          <div>
            <h2>{sectionConfig.label}</h2>
            <p>{sectionConfig.description}</p>
          </div>
          <span className="section-count">{items.length} records</span>
        </div>

        <div className="panel browse-toolbar">
          <label className="field browse-toolbar__field browse-toolbar__field--search">
            <span>Search</span>
            <input value={filters.query} onChange={(event) => setFilters((value) => ({ ...value, query: event.target.value }))} placeholder={`Search ${formatLabel(section)} records`} />
          </label>
          <label className="field field--inline">
            <span>Status</span>
            <select value={filters.verification} onChange={(event) => setFilters((value) => ({ ...value, verification: event.target.value }))}>
              <option value="all">All statuses</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span>Category</span>
            <select value={filters.category} onChange={(event) => setFilters((value) => ({ ...value, category: event.target.value }))}>
              <option value="all">All categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span>Sort</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              {section === 'blueprints' ? <option value="mission">Mission</option> : null}
              <option value="name">Name</option>
              <option value="status">Verification</option>
              <option value="category">Category</option>
            </select>
          </label>
          {section === 'blueprints' ? (
            <label className="field browse-toolbar__field browse-toolbar__field--search">
              <span>Mission</span>
              <input
                value={filters.mission}
                onChange={(event) => setFilters((value) => ({ ...value, mission: event.target.value }))}
                placeholder="Filter by mission or acquisition requirement"
              />
            </label>
          ) : null}
          {(section === 'weapons' || section === 'armor') ? (
            <div className="field browse-toolbar__field browse-toolbar__chips">
              <span>Location Type</span>
              <div className="chip-list">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'market', label: 'Market' },
                  { id: 'mission', label: 'Mission' },
                  { id: 'crafting', label: 'Crafting' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`chip ${filters.locationType === chip.id ? 'chip--active' : ''}`}
                    onClick={() => setFilters((value) => ({ ...value, locationType: chip.id as FilterState['locationType'] }))}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="card-grid card-grid--catalog">
          {items.map((entry) => {
            const availability = availabilityByEntityId.get(entry.id);

            return (
            <article
              key={entry.id}
              className="record-card record-card--box"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/${section}/${entry.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/${section}/${entry.id}`);
                }
              }}
            >
              <div className="record-card__top">
                <span className="record-card__category">{entry.category}</span>
                <span className={`badge badge--${toneForStatus(entry.verificationStatus)}`}>{formatLabel(entry.verificationStatus)}</span>
              </div>
              {entry.imageUrl ? (
                <div className="record-card__media" aria-hidden="true">
                  <img src={entry.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </div>
              ) : null}
              <h3 className="record-card__name">{entry.name}</h3>
              <p className="record-card__summary">{entry.summary}</p>
              {availability?.to ? (
                <button
                  type="button"
                  className="record-card__availability record-card__availability--link"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(availability.to as string);
                  }}
                >
                  {availability.text}
                </button>
              ) : (
                <p className="record-card__availability">{availability?.text}</p>
              )}
              <div className="chip-list">
                {entry.type === 'crafting'
                  ? model.getBlueprintRecipe(entry.id)?.ingredients.slice(0, 3).map((ingredient) => {
                    const amount = Number.isFinite(ingredient.amount) ? ingredient.amount : String(ingredient.amount);
                    const chipText = `${formatLabel(ingredient.resourceId)} ${amount} ${ingredient.unit}`.trim();

                    return (
                      <button
                        key={ingredient.resourceId}
                        type="button"
                        className="chip"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/resources/${ingredient.resourceId}`);
                        }}
                      >
                        {chipText}
                      </button>
                    );
                  })
                  : entry.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="chip chip--static">
                      {tag}
                    </span>
                  ))}
              </div>
              <div className="record-card__cta">Open details</div>
            </article>
            );
          })}
        </div>

        {items.length === 0 ? (
          <div className="panel empty-state">
            <h3>No records matched current filters.</h3>
            <p>Reset filters or broaden the query to restore database visibility.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DetailPage() {
  const model = useAppModel();
  const { section, id } = useParams();

  if (!section || !id) {
    return <Navigate to="/" replace />;
  }

  const entity = model.findEntity(section, id);

  if (!entity) {
    return <Navigate to={`/${section}`} replace />;
  }

  const recipe = section === 'crafting' || section === 'blueprints' ? model.getBlueprintRecipe(entity.id) : undefined;
  const related = model.getEntityLinks(entity);
  const directItemLocations = (() => {
    if (section === 'weapons') {
      const record = model.data.weapons.find((entry) => entry.id === entity.id);
      if (!record) {
        return [] as Array<{ id: string; source: 'Bought' | 'Found' | 'Crafted' }>;
      }

      const bought = (record.purchaseLocations ?? []).map((locationId) => ({ id: locationId, source: 'Bought' as const }));
      const found = (record.foundLocations ?? []).map((locationId) => ({
        id: locationId,
        source: locationId === 'location:crafting-fabricator-network' ? 'Crafted' as const : 'Found' as const,
      }));

      return [...bought, ...found].filter(
        (value, index, array) => array.findIndex((entry) => entry.id === value.id && entry.source === value.source) === index,
      );
    }

    if (section === 'armor') {
      const record = model.data.armor.find((entry) => entry.id === entity.id);
      if (!record) {
        return [] as Array<{ id: string; source: 'Bought' | 'Found' | 'Crafted' }>;
      }

      const bought = (record.purchaseLocations ?? []).map((locationId) => ({ id: locationId, source: 'Bought' as const }));
      const found = (record.foundLocations ?? []).map((locationId) => ({
        id: locationId,
        source: locationId === 'location:crafting-fabricator-network' ? 'Crafted' as const : 'Found' as const,
      }));

      return [...bought, ...found].filter(
        (value, index, array) => array.findIndex((entry) => entry.id === value.id && entry.source === value.source) === index,
      );
    }

    return [] as Array<{ id: string; source: 'Bought' | 'Found' | 'Crafted' }>;
  })();
  const stores = section === 'locations' ? model.getLocationStores(entity.id) : [];
  const relatedLocations = related.filter((item) => 'locationType' in item);
  const relatedVendors = related.filter((item) => 'locationId' in item);

  return (
    <div className="page-stack">
      <section className="panel dossier-header">
        <div className="dossier-header__copy">
          <div>
            <div className="eyebrow">Operations Dossier</div>
            <h2>{entity.name}</h2>
            <p>{entity.summary}</p>
          </div>
          {entity.imageUrl ? (
            <div className="dossier-header__media" aria-hidden="true">
              <img src={entity.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          ) : null}
        </div>
        <div className="chip-list">
          <span className="chip chip--static">{entity.category}</span>
          {entity.tags.map((tag) => (
            <span key={tag} className="chip chip--static">
              {tag}
            </span>
          ))}
          <span className={`badge badge--${toneForStatus(entity.verificationStatus)}`}>{formatLabel(entity.verificationStatus)}</span>
        </div>
      </section>

      <section className="detail-grid">
        <div className="panel">
          <PanelHeader title="Summary Panel" subtitle="Fast-scan metadata for operational decisions." />
          <dl className="meta-grid meta-grid--detail">
            {entity.metadata.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="panel">
          {section === 'blueprints' ? (
            <>
              <PanelHeader title="Recipe And Requirements" subtitle="Materials required to craft this blueprint output." />
              <div className="list-stack">
                {!recipe ? <p className="muted-copy">No recipe mapped for this blueprint yet.</p> : null}
                {recipe?.ingredients.map((ingredient) => (
                  <Link key={ingredient.resourceId} className="list-card list-card--link" to={`/resources/${ingredient.resourceId}`}>
                    <div>
                      <strong>{formatLabel(ingredient.resourceId)}</strong>
                      <p>{ingredient.amount} {ingredient.unit}</p>
                    </div>
                    <span className="badge badge--info">Resource</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <PanelHeader title="Related Links" subtitle="Cross-linked records and operational dependencies." />
              <div className="list-stack">
                {related.length === 0 && directItemLocations.length === 0 ? <p className="muted-copy">No related entities mapped for this record yet.</p> : null}
                {directItemLocations.map((entry) => {
                  const confidence = getLocationConfidence(entry.id);
                  const locationName = model.getLocationName(entry.id);

                  return (
                    <Link key={`${entry.id}-${entry.source}`} className="list-card list-card--link" to={`/locations/${entry.id}`}>
                      <div>
                        <strong>{locationName}</strong>
                        <p>{entry.source}</p>
                      </div>
                      <div className="chip-list">
                        <span className={`badge badge--${confidence.tone}`}>{confidence.label}</span>
                        <span className="badge badge--info">{entry.source}</span>
                      </div>
                    </Link>
                  );
                })}
                {related.map((item, index) => {
                  if ('type' in item) {
                    const typedItem = item as ConsoleEntity;
                    return (
                      <Link key={`${typedItem.id}-${index}`} className="list-card list-card--link" to={`/${typedItem.type}/${typedItem.id}`}>
                        <div>
                          <strong>{typedItem.name}</strong>
                          <p>{typedItem.category}</p>
                        </div>
                        <span className="badge badge--info">Linked</span>
                      </Link>
                    );
                  }

                  if ('locationType' in item) {
                    const confidence = getLocationConfidence(item.id);

                    return (
                      <Link key={`${item.id}-${index}`} className="list-card list-card--link" to={`/locations/${item.id}`}>
                        <div>
                          <strong>{item.name}</strong>
                          <p>{formatLabel(item.locationType)}</p>
                        </div>
                        <div className="chip-list">
                          <span className={`badge badge--${confidence.tone}`}>{confidence.label}</span>
                          <span className="badge badge--info">Location</span>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <article key={`${item.id}-${index}`} className="list-card">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{formatLabel(item.category)}</p>
                      </div>
                      <span className="badge badge--info">Store</span>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {(relatedLocations.length > 0 || relatedVendors.length > 0) ? (
        <section className="panel">
          <PanelHeader title="Locations And Availability" subtitle="Known places connected to this item." />
          <div className="availability-grid">
            <div className="availability-column">
              <h4>Locations</h4>
              <div className="list-stack">
                {relatedLocations.length === 0 ? <p className="muted-copy">No linked locations listed.</p> : null}
                {relatedLocations.map((item) => {
                  const confidence = getLocationConfidence(item.id);

                  return (
                    <Link key={item.id} className="list-card list-card--link" to={`/locations/${item.id}`}>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{formatLabel(item.locationType)}</p>
                      </div>
                      <div className="chip-list">
                        <span className={`badge badge--${confidence.tone}`}>{confidence.label}</span>
                        <span className="badge badge--info">Location</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="availability-column">
              <h4>Vendors</h4>
              <div className="list-stack">
                {relatedVendors.length === 0 ? <p className="muted-copy">No linked vendors listed.</p> : null}
                {relatedVendors.map((item) => (
                  <article key={item.id} className="list-card">
                    <div>
                      <strong>{item.name}</strong>
                      <p>{formatLabel(item.category)}</p>
                    </div>
                    <span className={`badge badge--${toneForStatus(item.verificationStatus)}`}>{formatLabel(item.verificationStatus)}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {recipe ? (
        <section className="panel">
          <PanelHeader title="Blueprint Requirements" subtitle="Recipe inputs tied to this blueprint record." />
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Amount</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ingredient) => (
                  <tr key={ingredient.resourceId}>
                    <td>{formatLabel(ingredient.resourceId)}</td>
                    <td>{ingredient.amount}</td>
                    <td>{ingredient.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <PanelHeader title="Verification Status" subtitle="Use this record with the right confidence level during route planning." />
        <div className="status-rail">
          <span className={`badge badge--${toneForStatus(entity.verificationStatus)}`}>{formatLabel(entity.verificationStatus)}</span>
          <p className="muted-copy">
            Verified records are safest for route planning. Partial, general, and placeholder statuses should be treated as guidance until rechecked against current patch behavior.
          </p>
        </div>
      </section>

      {stores.length > 0 ? (
        <section className="panel">
          <PanelHeader title="Sold and Supported Here" subtitle="Operational services mapped to this location." />
          <div className="list-stack">
            {stores.map((store) => (
              <article key={store.id} className="list-card">
                <div>
                  <strong>{store.name}</strong>
                  <p>{store.subLocation ?? formatLabel(store.category)}</p>
                </div>
                <span className={`badge badge--${toneForStatus(store.verificationStatus)}`}>{formatLabel(store.verificationStatus)}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AdminPage({ onRefreshModel }: { onRefreshModel: () => void }) {
  const model = useAppModel();
  const [token, setToken] = useState(() => localStorage.getItem(adminTokenKey) ?? '');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [adminState, setAdminState] = useState<AdminState | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedAdminUser[]>([]);
  const [resourcesPreview, setResourcesPreview] = useState<PaginatedResponse<{ id: string; name: string }> | null>(null);
  const [storesPreview, setStoresPreview] = useState<PaginatedResponse<{ id: string; name: string }> | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' });
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ userId: '', password: '' });
  const [editForm, setEditForm] = useState({
    featuredResourceIds: model.data.uiPresets.featuredResourceIds.join(', '),
    featuredArmorIds: model.data.uiPresets.featuredArmorIds.join(', '),
    featuredWeaponIds: model.data.uiPresets.featuredWeaponIds.join(', '),
    featuredStoreIds: model.data.uiPresets.featuredStoreIds.join(', '),
    announcement: model.data.meta.opsAnnouncement ?? '',
    verificationNotes: (model.data.meta.adminVerificationNotes ?? []).join('\n'),
  });

  const applyAdminState = (nextState: AdminState) => {
    setAdminState(nextState);
    setEditForm({
      featuredResourceIds: (nextState.uiOverrides.featuredResourceIds ?? model.data.uiPresets.featuredResourceIds).join(', '),
      featuredArmorIds: (nextState.uiOverrides.featuredArmorIds ?? model.data.uiPresets.featuredArmorIds).join(', '),
      featuredWeaponIds: (nextState.uiOverrides.featuredWeaponIds ?? model.data.uiPresets.featuredWeaponIds).join(', '),
      featuredStoreIds: (nextState.uiOverrides.featuredStoreIds ?? model.data.uiPresets.featuredStoreIds).join(', '),
      announcement: nextState.uiOverrides.announcement ?? '',
      verificationNotes: (nextState.uiOverrides.verificationNotes ?? []).join('\n'),
    });
  };

  const loadAdmin = async (nextToken: string) => {
    setLoading(true);
    setAuthError(null);

    try {
      const [me, state, users, resourcePage, storePage] = await Promise.all([
        fetchAdminMe(nextToken),
        fetchAdminState(nextToken),
        fetchAdminUsers(nextToken),
        fetchCollection<{ id: string; name: string }>('resources', { page: 1, pageSize: 5, sortBy: 'name' }),
        fetchCollection<{ id: string; name: string }>('stores', { page: 1, pageSize: 5, sortBy: 'name' }),
      ]);

      setUser(me.user);
      applyAdminState(state);
      setManagedUsers(users.users);
      setResourcesPreview(resourcePage);
      setStoresPreview(storePage);
      setStatus('Admin session active.');
    } catch (loadError) {
      setAuthError(loadError instanceof Error ? loadError.message : 'Unable to load admin state.');
      setUser(null);
      setAdminState(null);
      setManagedUsers([]);
      localStorage.removeItem(adminTokenKey);
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void loadAdmin(token);
    }
  }, [token]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      const auth = await loginAdmin(loginForm.username, loginForm.password);
      localStorage.setItem(adminTokenKey, auth.token);
      setToken(auth.token);
      setUser(auth.user);
      setStatus(`Signed in as ${auth.user.username}.`);
    } catch (loginError) {
      setAuthError(loginError instanceof Error ? loginError.message : 'Login failed.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!token) {
      return;
    }

    try {
      await logoutAdmin(token);
    } finally {
      localStorage.removeItem(adminTokenKey);
      setToken('');
      setUser(null);
      setAdminState(null);
      setManagedUsers([]);
      setStatus('Admin session ended.');
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setLoading(true);
    setAuthError(null);
    setStatus(null);

    try {
      const response = await createAdminUser(token, newUserForm);
      const users = await fetchAdminUsers(token);
      setManagedUsers(users.users);
      setNewUserForm({ username: '', password: '' });
      setStatus(`Created admin user ${response.user.username}.`);
    } catch (createError) {
      setAuthError(createError instanceof Error ? createError.message : 'Creating admin user failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRotatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !passwordForm.userId) {
      return;
    }

    setLoading(true);
    setAuthError(null);
    setStatus(null);

    try {
      await updateAdminPassword(token, passwordForm.userId, { password: passwordForm.password });
      setPasswordForm({ userId: passwordForm.userId, password: '' });
      setStatus('Password rotated and active sessions for that admin were revoked.');
    } catch (rotateError) {
      setAuthError(rotateError instanceof Error ? rotateError.message : 'Password rotation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportStorage = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const payload = await exportAdminStorage(token);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `starops-storage-export-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus('Storage export downloaded.');
    } catch (exportError) {
      setAuthError(exportError instanceof Error ? exportError.message : 'Storage export failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    const toList = (value: string) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    setLoading(true);
    setStatus(null);

    try {
      const nextPayload = {
        featuredResourceIds: toList(editForm.featuredResourceIds),
        featuredArmorIds: toList(editForm.featuredArmorIds),
        featuredWeaponIds: toList(editForm.featuredWeaponIds),
        featuredStoreIds: toList(editForm.featuredStoreIds),
        announcement: editForm.announcement,
        verificationNotes: editForm.verificationNotes.split('\n').map((entry) => entry.trim()).filter(Boolean),
      };
      const response = await updateAdminState(token, nextPayload);
      applyAdminState({ ...(adminState as AdminState), uiOverrides: response.uiOverrides });
      await onRefreshModel();
      setStatus('Persistent admin overrides saved.');
    } catch (saveError) {
      setAuthError(saveError instanceof Error ? saveError.message : 'Saving admin state failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !adminState) {
    return (
      <div className="page-stack">
        <section className="panel admin-panel">
          <PanelHeader title="Admin Access" subtitle="Token-based admin auth secures persistent overrides and tooling." />
          <form className="admin-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Username</span>
              <input value={loginForm.username} onChange={(event) => setLoginForm((value) => ({ ...value, username: event.target.value }))} />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((value) => ({ ...value, password: event.target.value }))} />
            </label>
            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign in'}
            </button>
            <p className="muted-copy">Default username is `admin` unless overridden with `STAROPS_ADMIN_USERNAME` on the server.</p>
            {authError ? <p className="status-copy status-copy--error">{authError}</p> : null}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="panel admin-panel">
        <div className="admin-header">
          <div>
            <div className="eyebrow">Admin Console</div>
            <h2>Persistent overrides and tooling</h2>
            <p>Authenticated as {user.username}. Changes are saved to server storage and immediately affect the merged dataset.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </div>
        {status ? <p className="status-copy">{status}</p> : null}
        {authError ? <p className="status-copy status-copy--error">{authError}</p> : null}
      </section>

      <section className="two-up">
        <form className="panel admin-panel admin-form" onSubmit={handleSave}>
          <PanelHeader title="Featured Presets" subtitle="Override homepage featured entities with persistent IDs." />
          <label className="field">
            <span>Featured resources</span>
            <input value={editForm.featuredResourceIds} onChange={(event) => setEditForm((value) => ({ ...value, featuredResourceIds: event.target.value }))} />
          </label>
          <label className="field">
            <span>Featured armor</span>
            <input value={editForm.featuredArmorIds} onChange={(event) => setEditForm((value) => ({ ...value, featuredArmorIds: event.target.value }))} />
          </label>
          <label className="field">
            <span>Featured weapons</span>
            <input value={editForm.featuredWeaponIds} onChange={(event) => setEditForm((value) => ({ ...value, featuredWeaponIds: event.target.value }))} />
          </label>
          <label className="field">
            <span>Featured stores</span>
            <input value={editForm.featuredStoreIds} onChange={(event) => setEditForm((value) => ({ ...value, featuredStoreIds: event.target.value }))} />
          </label>
          <label className="field">
            <span>Ops announcement</span>
            <textarea rows={3} value={editForm.announcement} onChange={(event) => setEditForm((value) => ({ ...value, announcement: event.target.value }))} />
          </label>
          <label className="field">
            <span>Verification notes</span>
            <textarea rows={5} value={editForm.verificationNotes} onChange={(event) => setEditForm((value) => ({ ...value, verificationNotes: event.target.value }))} />
          </label>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Saving...' : 'Save overrides'}
          </button>
        </form>

        <div className="panel admin-panel">
          <PanelHeader title="Granular API Preview" subtitle="Paginated backend collections are now available for targeted queries." />
          <div className="admin-preview-grid">
            <div>
              <div className="eyebrow">Resources Page 1</div>
              <div className="list-stack">
                {resourcesPreview?.results.map((entry) => (
                  <article key={entry.id} className="list-card">
                    <strong>{entry.name}</strong>
                    <p>{entry.id}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <div className="eyebrow">Stores Page 1</div>
              <div className="list-stack">
                {storesPreview?.results.map((entry) => (
                  <article key={entry.id} className="list-card">
                    <strong>{entry.name}</strong>
                    <p>{entry.id}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="two-up">
        <form className="panel admin-panel admin-form" onSubmit={handleCreateUser}>
          <PanelHeader title="Admin Users" subtitle="Create additional admin operators backed by persistent file storage." />
          <label className="field">
            <span>New username</span>
            <input value={newUserForm.username} onChange={(event) => setNewUserForm((value) => ({ ...value, username: event.target.value }))} placeholder="ops-admin" />
          </label>
          <label className="field">
            <span>Temporary password</span>
            <input type="password" value={newUserForm.password} onChange={(event) => setNewUserForm((value) => ({ ...value, password: event.target.value }))} placeholder="At least 10 characters" />
          </label>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Saving...' : 'Create admin user'}
          </button>
          <div className="admin-user-grid">
            {managedUsers.map((entry) => (
              <article key={entry.id} className="storage-card">
                <span className="eyebrow">Admin</span>
                <strong>{entry.username}</strong>
                <p>Created {new Date(entry.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </form>

        <div className="panel admin-panel">
          <PanelHeader title="Password Rotation" subtitle="Rotate an admin password and revoke current sessions for that account." />
          <form className="admin-form" onSubmit={handleRotatePassword}>
            <label className="field">
              <span>Admin account</span>
              <select value={passwordForm.userId} onChange={(event) => setPasswordForm((value) => ({ ...value, userId: event.target.value }))}>
                <option value="">Select admin user</option>
                {managedUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>New password</span>
              <input type="password" value={passwordForm.password} onChange={(event) => setPasswordForm((value) => ({ ...value, password: event.target.value }))} placeholder="At least 10 characters" />
            </label>
            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Saving...' : 'Rotate password'}
            </button>
            <button type="button" className="button button--ghost" onClick={() => void handleExportStorage()} disabled={loading}>
              Export storage snapshot
            </button>
          </form>
        </div>
      </section>

      <section className="two-up">
        <div className="panel admin-panel">
          <PanelHeader title="Storage Layout" subtitle="Persistent storage is file-backed and merged into the runtime dataset at request time." />
          <div className="storage-grid">
            <div className="storage-card">
              <span className="eyebrow">State File</span>
              <strong>{adminState.storage.storageExists ? 'Ready' : 'Missing'}</strong>
              <p>{adminState.storage.storagePath}</p>
            </div>
            <div className="storage-card">
              <span className="eyebrow">Dataset Source</span>
              <strong>Live Base Dataset</strong>
              <p>{adminState.storage.datasetPath}</p>
            </div>
            <div className="storage-card">
              <span className="eyebrow">Sessions</span>
              <strong>{adminState.storage.sessions}</strong>
              <p>Active admin sessions retained in local storage state.</p>
            </div>
            <div className="storage-card">
              <span className="eyebrow">Version Fingerprint</span>
              <strong>Cache Aware</strong>
              <p>{adminState.storage.datasetVersion}</p>
            </div>
          </div>
        </div>

        <div className="panel admin-panel">
          <PanelHeader title="Storage Notes" subtitle="What persists and what stays derived at runtime." />
          <div className="list-stack">
            <article className="list-card">
              <div>
                <strong>Persistent</strong>
                <p>Admin users, hashed credentials, sessions, UI overrides, and audit history are written to the server state file.</p>
              </div>
            </article>
            <article className="list-card">
              <div>
                <strong>Read-only source</strong>
                <p>The master Star Ops JSON remains the canonical base dataset and is merged with overrides on each backend read.</p>
              </div>
            </article>
            <article className="list-card">
              <div>
                <strong>Cache behavior</strong>
                <p>API responses are cache-keyed by dataset and storage file version, so changes invalidate cached payloads automatically.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="panel admin-panel">
        <PanelHeader title="Audit Log" subtitle="Recent authenticated mutations and session activity are persisted server-side." />
        <div className="list-stack">
          {adminState.auditLog.map((entry) => (
            <article key={entry.id} className="list-card">
              <div>
                <strong>{formatLabel(entry.action)}</strong>
                <p>{entry.actor} / {new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureColumn({ title, items }: { title: string; items: ConsoleEntity[] }) {
  const navigate = useNavigate();

  return (
    <div className="panel">
      <PanelHeader title={title} subtitle="Curated presets surfaced from the current dataset." />
      <div className="list-stack">
        {items.map((item) => (
          <button key={item.id} type="button" className="list-card list-card--link" onClick={() => navigate(`/${item.type}/${item.id}`)}>
            <div>
              <strong>{item.name}</strong>
              <p>{item.summary}</p>
            </div>
            <span className={`badge badge--${toneForStatus(item.verificationStatus)}`}>{formatLabel(item.verificationStatus)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="panel-header">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </header>
  );
}

function AssistantDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { consoleEntities } = useAppModel();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitQuery = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await askAssistant(trimmed);
      setResult(response);
      setQuery(trimmed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Assistant request failed.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitQuery(query);
  };

  return (
    <aside className={`assistant ${open ? 'assistant--open' : ''}`}>
      <div className="assistant__header">
        <div>
          <div className="eyebrow">AI Support</div>
          <h2>Operations Assistant</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="assistant__body">
        <div className="assistant-console panel panel--inset">
          <div className="eyebrow">Console State</div>
          <strong>{consoleEntities.length} indexed records</strong>
          <p>Assistant guidance is grounded in the loaded backend dataset and its verification flags.</p>
        </div>

        <form className="assistant-form" onSubmit={onSubmit}>
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask about mining routes, armor, blueprints, or vendor locations" rows={4} />
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Querying...' : 'Run query'}
          </button>
        </form>

        <div className="chip-list">
          {assistantPrompts.map((prompt) => (
            <button key={prompt} type="button" className="chip" onClick={() => void submitQuery(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        {error ? (
          <div className="chat-bubble chat-bubble--user">
            <p>{error}</p>
          </div>
        ) : null}

        {result ? (
          <>
            <div className="chat-bubble chat-bubble--assistant">
              <strong>Ship AI</strong>
              <p>{result.response}</p>
            </div>
            <div className="assistant-results list-stack">
              {result.matches.map((match) => (
                <Link key={`${match.type}-${match.id}`} className="list-card list-card--link" to={`/${match.type}/${match.id}`}>
                  <div>
                    <strong>{match.name}</strong>
                    <p>{match.summary}</p>
                  </div>
                  <span className={`badge badge--${toneForStatus(match.verificationStatus)}`}>{formatLabel(match.verificationStatus)}</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="chat-bubble chat-bubble--assistant">
            <strong>Ship AI</strong>
            <p>I can route you to mining materials, equipment categories, blueprint records, and verified location dossiers.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function toneForStatus(status: string) {
  if (status.includes('verified')) {
    return 'success';
  }
  if (status.includes('partial') || status.includes('general')) {
    return 'warning';
  }
  return 'info';
}