
'use client';
import React, { createContext, useContext, ReactNode } from 'react';

// Placeholder context to prevent import errors in existing files
const AppContext = createContext<any>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  return <AppContext.Provider value={{}}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
