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
  show_family_picker: boolean;
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
      try {
        const storedMarathon = await AsyncStorage.getItem('selectedMarathon');
        if (storedMarathon) {
          setSelectedMarathonState(JSON.parse(storedMarathon));
        }
      } catch (err) {
        console.error('Error loading stored marathon:', err);
      }
      refreshMarathons();
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