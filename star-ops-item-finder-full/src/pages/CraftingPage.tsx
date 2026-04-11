import { useData } from '../App';
import { SectionHeader } from '../components/SectionHeader';
import { EntityCard } from '../components/EntityCard';
import { recipeLabel } from '../utils/data';

export function CraftingPage() {
  const data = useData();

  return (
    <div className="page-grid">
      <SectionHeader title="Crafting" description="Blueprints, recipes, ingredients, and item fabrication." />
      <div className="cards-grid">
        {data.crafting.blueprints.map((bp) => (
          <EntityCard
            key={bp.id}
            type="blueprint"
            id={bp.id}
            title={bp.name}
            subtitle={bp.fabricatorType}
            meta={[bp.craftsCategory ?? 'unknown', ...(bp.acquisitionHints ?? []).slice(0, 2)]}
            verification={bp.verificationStatus}
          />
        ))}
      </div>
      <SectionHeader title="Recipes" description="Starter recipes linked to outputs and ingredients." />
      <div className="cards-grid">
        {data.crafting.recipes.map((recipe) => (
          <EntityCard
            key={recipe.id}
            type="recipe"
            id={recipe.id}
            title={recipeLabel(recipe, data)}
            subtitle={`Recipe ID: ${recipe.id}`}
            meta={recipe.ingredients?.map((i) => `${i.amount} ${i.unit ?? ''} ${i.resourceId}`.trim()).slice(0, 3)}
            verification={recipe.verificationStatus}
          />
        ))}
      </div>
    </div>
  );
}
