import React, { createContext, useContext, useMemo } from 'react';
import { ZenithClient } from '@zenith/sdk';

interface ZenithContextValue {
  client: ZenithClient;
}

const ZenithContext = createContext<ZenithContextValue | null>(null);

interface ZenithProviderProps {
  baseURL: string;
  token?: string;
  cacheTTL?: number;
  children: React.ReactNode;
}

/**
 * ZenithProvider
 * ──────────────
 * Initializes the Zenith SDK and provides it to the component tree.
 */
export const ZenithProvider: React.FC<ZenithProviderProps> = ({ 
  baseURL, 
  token, 
  cacheTTL, 
  children 
}) => {
  const client = useMemo(() => new ZenithClient({ baseURL, token, cacheTTL }), [baseURL, token, cacheTTL]);

  return (
    <ZenithContext.Provider value={{ client }}>
      {children}
    </ZenithContext.Provider>
  );
};

/**
 * useZenith
 * ─────────
 * Hook to access the Zenith SDK client directly.
 */
export const useZenith = () => {
  const context = useContext(ZenithContext);
  if (!context) {
    throw new Error('useZenith must be used within a ZenithProvider');
  }
  return context.client;
};

/**
 * useZenithQuery
 * ──────────────
 * High-level hook for fetching collection data with loading and error states.
 */
export const useZenithQuery = <T = any,>(
  slug: string, 
  options: { id?: string; params?: Record<string, any>; isGlobal?: boolean } = {}
) => {
  const client = useZenith();
  const [data, setData] = React.useState<T | T[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let result;
        
        if (options.isGlobal) {
          result = await client.getGlobal<T>(slug);
        } else if (options.id) {
          result = await client.findOne<T>(slug, options.id);
        } else {
          result = await client.find<T>(slug, options.params);
        }
        
        setData(result.data);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [client, slug, options.id, JSON.stringify(options.params), options.isGlobal]);

  return { data, loading, error };
};
