import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type) => {
    setNotifications(prev => [...prev, { message, type }]);
    setTimeout(() => setNotifications(prev => prev.slice(1)), 3000);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
      {notifications.map((notif, idx) => (
        <div key={idx} className={`toast ${notif.type}`}>
          {notif.message}
        </div>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};