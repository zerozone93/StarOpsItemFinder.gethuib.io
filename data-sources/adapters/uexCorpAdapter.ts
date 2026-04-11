import { AdapterFetchResult, AdapterCommodityPrice, AdapterVendorItem } from '../types/adapterTypes.js';
const SOURCE_NAME = 'UEXCorp';
export class UexCorpAdapter {
  constructor(private readonly apiKey?: string) {}
  async fetchCommodityPrices(commoditySlug?: string): Promise<AdapterFetchResult<AdapterCommodityPrice>> {
    return { success: true, source: SOURCE_NAME, fetchedAt: new Date().toISOString(), data: [{ commodity: 'Quantanium', location: 'Daymar', sellPrice: 1380, inventory: 2500, updatedAt: new Date().toISOString() }] };
  }
  async fetchTerminals(): Promise<AdapterFetchResult<AdapterVendorItem>> {
    return { success: true, source: SOURCE_NAME, fetchedAt: new Date().toISOString(), data: [{ id: 'uex-cm', slug: 'centermass-lorville', name: 'CenterMass - Lorville', location: 'Lorville', inventory: ['p4-ar'] }] };
  }
}
export default new UexCorpAdapter(process.env.UEX_API_KEY);
