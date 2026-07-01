import React, { createContext, useContext, useEffect, useState } from 'react';
import { consumePrefillIntent } from '../services/activeModuleService';

const ActiveCaseContext = createContext(null);

export const useActiveCase = () => {
  const context = useContext(ActiveCaseContext);
  if (!context) {
    throw new Error('useActiveCase must be used within an ActiveCaseProvider');
  }
  return context;
};

export const ActiveCaseProvider = ({ children, currentCase, activeModuleId }) => {
  const [triggerAutoRun, setTriggerAutoRun] = useState(false);

  // Check for auto-run intent when module mounts/changes
  useEffect(() => {
    if (activeModuleId) {
      const intent = consumePrefillIntent(activeModuleId);
      if (intent) {
        setTriggerAutoRun(true);
        // Reset the trigger after a short delay so it doesn't repeatedly fire
        const timer = setTimeout(() => setTriggerAutoRun(false), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [activeModuleId]);

  const value = React.useMemo(() => ({
    triggerAutoRun,
    setTriggerAutoRun
  }), [triggerAutoRun]);

  return (
    <ActiveCaseContext.Provider value={value}>
      {children}
    </ActiveCaseContext.Provider>
  );
};
