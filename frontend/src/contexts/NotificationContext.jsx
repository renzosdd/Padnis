// src/frontend/src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, severity = 'info') => {
    const key = Date.now();
    setNotifications((prev) => [...prev, { key, message, severity }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.key !== key));
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};

// export default para casos donde importe directamente el contexto
export default NotificationContext;
