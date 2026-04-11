export interface AdapterResourceItem { id: string; slug: string; name: string; description: string; category: string; rarity?: string; baseValue?: number; locations?: string[]; }
export interface AdapterWeaponItem { id: string; slug: string; name: string; manufacturer: string; category: string; damage?: number; fireRate?: number; ammoType?: string; buyPrice?: number; }
export interface AdapterArmorItem { id: string; slug: string; name: string; manufacturer: string; category: string; armorRating?: number; buyPrice?: number; }
export interface AdapterVendorItem { id: string; slug: string; name: string; location: string; inventory: string[]; }
export interface AdapterShipItem { id: string; slug: string; name: string; manufacturer: string; size: string; buyPrice?: number; }
export interface AdapterCommodityPrice { commodity: string; location: string; buyPrice?: number; sellPrice?: number; inventory?: number; updatedAt: string; }
export interface AdapterLoadout { shipSlug: string; componentSlug: string; componentType: string; size: number; }
export interface AdapterFetchResult<T> { success: boolean; data: T[]; source: string; fetchedAt: string; error?: string; }
