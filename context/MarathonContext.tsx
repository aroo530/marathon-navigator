import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchAvailableMarathons } from '../services/marathonService';

export type Marathon = {
  id: number;
  title: string;
  description: string;
  picture_url: string | null;
  start_date: string;
  end_date: string;
  family_count: number;
  week_count: number;
  status: string;
  show_games: boolean;
  show_tournament: boolean;
  show_family_picker: boolean;
  accent_color: string | null;
};

type MarathonContextType = {
  marathons: Marathon[];
  selectedMarathon: Marathon | null;
  loading: boolean;
  error: string | null;
  refreshMarathons: () => Promise<void>;
  setSelectedMarathon: (marathon: Marathon | null) => Promise<void>;
};

const MarathonContext = createContext<MarathonContextType | undefined>(undefined);

function MarathonProvider({ children }: { children: React.ReactNode }) {
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [selectedMarathon, setSelectedMarathonState] = useState<Marathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setSelectedMarathon = async (marathon: Marathon | null) => {
    setSelectedMarathonState(marathon);
    if (marathon) {
      await AsyncStorage.setItem('selectedMarathon', JSON.stringify(marathon));
    } else {
      await AsyncStorage.removeItem('selectedMarathon');
    }
  };

  const refreshMarathons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvailableMarathons();
      if (data) {
        setMarathons(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch marathons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initialize() {
      let storedId: number | null = null;
      try {
        const storedMarathon = await AsyncStorage.getItem('selectedMarathon');
        if (storedMarathon) {
          const parsed = JSON.parse(storedMarathon);
          if (parsed?.status !== 'completed') {
            setSelectedMarathonState(parsed);
            storedId = parsed?.id ?? null;
          } else {
            await AsyncStorage.removeItem('selectedMarathon');
          }
        }
      } catch (err) {
        logger.error('Error loading stored marathon:', err);
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchAvailableMarathons();
        if (data) {
          setMarathons(data);
          // Re-hydrate selected marathon with fresh DB data so new fields (e.g. accent_color) are picked up
          if (storedId !== null) {
            const fresh = data.find((m) => m.id === storedId);
            if (fresh) {
              setSelectedMarathonState(fresh);
              await AsyncStorage.setItem('selectedMarathon', JSON.stringify(fresh));
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch marathons');
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, []);

  const value = {
    marathons,
    selectedMarathon,
    loading,
    error,
    refreshMarathons,
    setSelectedMarathon,
  };

  return (
    <MarathonContext.Provider value={value}>
      {children}
    </MarathonContext.Provider>
  );
}

function useMarathon() {
  const context = useContext(MarathonContext);
  if (!context) {
    throw new Error('useMarathon must be used within a MarathonProvider');
  }
  return context;
}

export { MarathonProvider, useMarathon };
export default MarathonProvider; 
