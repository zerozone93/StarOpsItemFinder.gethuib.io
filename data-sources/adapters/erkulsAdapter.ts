import { AdapterFetchResult, AdapterWeaponItem, AdapterLoadout } from '../types/adapterTypes.js';
const SOURCE_NAME = 'ErkulsGames';
export class ErkulsAdapter {
  async fetchWeaponStats(): Promise<AdapterFetchResult<AdapterWeaponItem>> {
    return { success: true, source: SOURCE_NAME, fetchedAt: new Date().toISOString(), data: [{ id: 'erkul-p4ar', slug: 'p4-ar', name: 'P4-AR', manufacturer: 'Behring', category: 'rifle', damage: 22.5, fireRate: 800, ammoType: '4mm Caseless' }] };
  }
  async fetchShipLoadouts(shipSlug: string): Promise<AdapterFetchResult<AdapterLoadout>> {
    return { success: true, source: SOURCE_NAME, fetchedAt: new Date().toISOString(), data: [{ shipSlug, componentSlug: 'laser-cannon-s1', componentType: 'weapon', size: 1 }] };
  }
}
export default new ErkulsAdapter();
