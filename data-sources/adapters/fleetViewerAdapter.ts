import { AdapterFetchResult, AdapterShipItem } from '../types/adapterTypes.js';
const SOURCE_NAME = 'FleetViewer';
export class FleetViewerAdapter {
  async fetchShips(page = 1): Promise<AdapterFetchResult<AdapterShipItem>> {
    return { success: true, source: SOURCE_NAME, fetchedAt: new Date().toISOString(), data: [{ id: 'fv-prospector', slug: 'prospector', name: 'MISC Prospector', manufacturer: 'MISC', size: 'Small', buyPrice: 2061750 }] };
  }
  async fetchShipBySlug(slug: string): Promise<AdapterFetchResult<AdapterShipItem>> {
    return { success: true, source: SOURCE_NAME, fetchedAt: new Date().toISOString(), data: [] };
  }
}
export default new FleetViewerAdapter();
