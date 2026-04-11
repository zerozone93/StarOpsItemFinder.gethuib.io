import { useData } from '../hooks/useData';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { TagPill } from '../components/TagPill';
import styles from './shared.module.css';
import cStyles from './Crafting.module.css';

export function Crafting() {
  const { data, loading } = useData();

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className={styles.notFound}>Data unavailable.</div>;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Crafting</h1>
        <p className={styles.pageSubtitle}>Recipes, blueprints, and crafting requirements. (Feature in development in-game)</p>
      </div>

      <div className={cStyles.notice}>
        ⚠️ Crafting is an upcoming feature in Star Citizen. The recipes below represent anticipated mechanics based on community data.
      </div>

      <h2 className={cStyles.sectionTitle}>Blueprints</h2>
      <div className={cStyles.grid}>
        {data.blueprints.map((bp) => {
          const recipe = data.recipes.find((r) => r.id === bp.recipeId);
          const vendors = bp.vendorIds
            .map((vid) => data.vendors.find((v) => v.id === vid))
            .filter(Boolean);
          return (
            <div key={bp.id} className={cStyles.card}>
              <div className={cStyles.cardHeader}>
                <div className={cStyles.cardName}>{bp.name}</div>
                <TagPill label={bp.verificationStatus} variant={bp.verificationStatus === 'verified' ? 'success' : 'warning'} />
              </div>
              <p className={cStyles.cardDesc}>{bp.description}</p>
              {bp.buyPrice && <div className={cStyles.price}>💰 {bp.buyPrice.toLocaleString()} aUEC</div>}
              {vendors.length > 0 && (
                <div className={cStyles.vendorInfo}>
                  Sold at: {vendors.map((v) => v?.name).filter(Boolean).join(', ')}
                </div>
              )}
              {recipe && (
                <div className={cStyles.recipeRef}>
                  📄 Recipe: {recipe.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className={cStyles.sectionTitle}>Recipes</h2>
      <div className={cStyles.grid}>
        {data.recipes.map((recipe) => {
          const ingredients = recipe.ingredients.map((ing) => ({
            resource: data.resources.find((r) => r.id === ing.resourceId),
            quantity: ing.quantity,
          }));
          return (
            <div key={recipe.id} className={cStyles.card}>
              <div className={cStyles.cardHeader}>
                <div className={cStyles.cardName}>{recipe.name}</div>
                <TagPill label={recipe.category} variant="primary" />
              </div>
              <p className={cStyles.cardDesc}>{recipe.description}</p>
              <div className={cStyles.ingredients}>
                <div className={cStyles.ingTitle}>🧪 Ingredients:</div>
                {ingredients.map(({ resource, quantity }) => resource && (
                  <div key={resource.id} className={cStyles.ingItem}>
                    <span className={cStyles.ingName}>{resource.name}</span>
                    <span className={cStyles.ingQty}>×{quantity}</span>
                  </div>
                ))}
              </div>
              <div className={cStyles.craftingMeta}>
                <span>⏱️ {recipe.craftingTime}s</span>
                <span>🏭 {recipe.craftingStation}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
