import { createContext, useContext } from 'react';
import type { SettingsBag } from '../core/types';

/* Context handed to every renderer: live data + editor interaction hooks. */

export interface StoreData {
  products: Record<string, any[]>;   // keyed by source signature
  categories: any[];
  collections: any[];
  pages: any[];
  blogs: any[];
  menus: Record<string, any[]>;
  settings: Record<string, any>;
  /** Route data for non-home templates (product / collection / CMS page). */
  product?: any;
  collectionSlug?: string;
  page?: any;
  /** Current sort chosen by a collection_filters section. */
  collectionSort?: string;
  setCollectionSort?: (sort: string) => void;
}

export interface RenderCtx {
  editable: boolean;
  theme: SettingsBag;
  data: StoreData;
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** Request products for a source configuration; renderer caches per signature. */
  getProducts: (key: string) => any[] | undefined;
  requestProducts: (key: string, query: string) => void;
}

const Ctx = createContext<RenderCtx>({
  editable: false,
  theme: {},
  data: { products: {}, categories: [], collections: [], pages: [], blogs: [], menus: {}, settings: {} },
  getProducts: () => undefined,
  requestProducts: () => {},
});

export const RenderProvider = Ctx.Provider;
export const useRenderCtx = () => useContext(Ctx);
