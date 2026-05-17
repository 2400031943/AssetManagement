import React from 'react';
import { RouterProvider, AppRoutes } from './routes';
import './App.css';

function App() {
  return (
    <RouterProvider>
      <div className="app-container">
        <AppRoutes />
      </div>
    </RouterProvider>
  );
}

export default App;
