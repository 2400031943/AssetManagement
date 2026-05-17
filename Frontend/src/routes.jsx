import React, { useState, useEffect, createContext, useContext } from 'react';
import Login from './components/Login';
import User from './pages/User';
import Admin from './pages/Admin';

const RouterContext = createContext(null);

export const useNavigate = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within a RouterProvider');
  }
  return context.navigate;
};

export const RouterProvider = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, '', to);
    setCurrentPath(to);
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const AppRoutes = () => {
  const { currentPath } = useContext(RouterContext);

  switch (currentPath) {
    case '/user':
      return <User />;
    case '/admin':
      return <Admin />;
    case '/':
    default:
      return <Login />;
  }
};
