import React, { createContext, useContext, useEffect, useState } from 'react';
import type { StarCitizenData } from '../types';

interface DataContextValue {
  data: StarCitizenData | null;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextValue>({
  data: null,
  loading: true,
  error: null,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StarCitizenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? '/';
    const url = `${base}star-citizen-data.json`.replace('//', '/');
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
        return res.json() as Promise<StarCitizenData>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  return useContext(DataContext);
}
