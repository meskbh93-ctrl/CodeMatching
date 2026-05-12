import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

// Simplified AuthProvider — no base44 auth needed, app is public
export const AuthProvider = ({ children }) => {
  const [appPublicSettings] = useState({ id: 'local', public_settings: {} });

  return (
    <AuthContext.Provider value={{
      user: null,
      isAuthenticated: false,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings,
      authChecked: true,
      logout: () => {},
      navigateToLogin: () => {},
      checkUserAuth: async () => {},
      checkAppState: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
