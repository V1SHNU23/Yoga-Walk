import React, { createContext, useState, useEffect, useContext } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  
  // 1. LOAD FROM CACHE IMMEDIATELY
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("yoga_history_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error reading cache", e);
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem("yoga_history_v1");
  });

  // NEW: Define the fetch function outside so we can export it
  const fetchAllData = async () => {
    try {
      console.log("📥 Syncing data...");
      const historyRes = await fetch("http://localhost:5000/api/walk_history");
      const historyData = await historyRes.json();

      const list = historyData.history || historyData || [];
      
      setHistory(list);
      setLoading(false);
      localStorage.setItem("yoga_history_v1", JSON.stringify(list));
      
      console.log("✅ Data synced & cached");
    } catch (error) {
      console.error("Background sync failed:", error);
      setLoading(false); 
    }
  };

  // 3. Initial Load
  useEffect(() => {
    fetchAllData();
  }, []); 

  // 4. Export refreshData
  return (
    <DataContext.Provider value={{ history, loading, refreshData: fetchAllData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  return useContext(DataContext);
}