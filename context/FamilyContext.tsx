import React, { createContext, useContext, useState } from 'react';

export type Family = {
  id: number;
  name: string;
  avatar_url: string | null;
  marathon_id: number;
  member_count?: number
};

type FamilyContextType = {
  currentFamily: Family | null;
  setCurrentFamily: (family: Family | null) => void;
};

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);

  const value = {
    currentFamily,
    setCurrentFamily,
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}

export default FamilyProvider; 