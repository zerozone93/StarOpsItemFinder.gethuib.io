import { useDataContext } from '../context/DataContext';
import type { StarCitizenData } from '../types';

export function useData(): { data: StarCitizenData | null; loading: boolean; error: string | null } {
  return useDataContext();
}
