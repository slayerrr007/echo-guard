import React, { createContext, useContext, useEffect, useState } from 'react';
import Papa from 'papaparse';
import { DataPoint, Label, Dataset, ValidModelName } from '../services/api';

interface AppContextType {
  dataset: Dataset | null;
  loading: boolean;
  error: string | null;
  metrics: any;
  setMetrics: (metrics: any) => void;
  trainedModel: any;
  setTrainedModel: (model: any) => void;
  selectedModel: ValidModelName;
  setSelectedModel: (model: ValidModelName) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [trainedModel, setTrainedModel] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<ValidModelName>('knn');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check local storage for theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    const loadData = async () => {
      try {
        const response = await fetch('/sonar.csv');
        if (!response.ok) throw new Error('Failed to fetch dataset');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          complete: (results) => {
            const data = results.data as string[][];
            const features: DataPoint[] = [];
            const labels: Label[] = [];
            
            for (const row of data) {
              if (row.length === 61) { // 60 features + 1 label
                const label = row[60].trim();
                if (label === 'R' || label === 'M') {
                  const featureRow = row.slice(0, 60).map(Number);
                  // Ensure no NaNs
                  if (!featureRow.some(isNaN)) {
                    features.push(featureRow);
                    labels.push(label as Label);
                  }
                }
              }
            }
            setDataset({ features, labels });
            setLoading(false);
          },
          error: (error: any) => {
            setError(error.message);
            setLoading(false);
          }
        });
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <AppContext.Provider value={{ dataset, loading, error, metrics, setMetrics, trainedModel, setTrainedModel, selectedModel, setSelectedModel, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
