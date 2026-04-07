'use client';
import React, { createContext, useContext, ReactNode, useReducer } from 'react';

// Initial state for legacy dashboard pages to prevent crash
const initialState = {
  operationalData: [],
  analysis: null,
  recommendations: null,
  loading: {
    data: false,
    analysis: false,
    recommendations: false
  },
  error: null
};

function appReducer(state: any, action: any) {
  switch (action.type) {
    case 'SET_ANALYSIS_LOADING':
      return { ...state, loading: { ...state.loading, analysis: action.payload } };
    case 'SET_ANALYSIS_RESULT':
      return { ...state, analysis: action.payload, loading: { ...state.loading, analysis: false } };
    case 'SET_RECOMMENDATIONS_LOADING':
      return { ...state, loading: { ...state.loading, recommendations: action.payload } };
    case 'SET_RECOMMENDATIONS_RESULT':
      return { ...state, recommendations: action.payload, loading: { ...state.loading, recommendations: false } };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<any>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    // Return dummy state to prevent destructuring errors if called outside provider
    return { state: initialState, dispatch: () => {} };
  }
  return context;
}
