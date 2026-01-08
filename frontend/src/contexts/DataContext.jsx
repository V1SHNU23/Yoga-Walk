import React, { createContext, useState, useEffect, useContext } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  
  // 1. LOAD FROM CACHE IMMEDIATELY
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("yoga_history_v1");
      // If we find data, we use it instantly
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error reading cache", e);
      return [];
    }
  });

  // 2. SMART LOADING STATE
  // We are ONLY "loading" if we have absolutely nothing in storage
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem("yoga_history_v1");
  });

  // 3. BACKGROUND UPDATE (Syncs with server silently)
  useEffect(() => {
    async function fetchAllData() {
      try {
        console.log("📥 Syncing data in background...");
        
        // Use localhost to avoid IP issues
        const historyRes = await fetch("http://localhost:5000/api/walk_history");
        const historyData = await historyRes.json();

        const list = historyData.history || historyData || [];
        
        // Update State & Update Cache
        setHistory(list);
        setLoading(false);
        localStorage.setItem("yoga_history_v1", JSON.stringify(list));
        
        console.log("✅ Data synced & cached");
      } catch (error) {
        console.error("Background sync failed (using cache):", error);
        setLoading(false); 
      }
    }

    fetchAllData();
  }, []); 

  return (
    <DataContext.Provider value={{ history, loading }}>
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  return useContext(DataContext);
}