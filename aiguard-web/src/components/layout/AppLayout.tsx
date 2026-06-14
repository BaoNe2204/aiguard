import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { RoleWorkspaceBanner } from './RoleWorkspaceBanner';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="content-outlet">
          <RoleWorkspaceBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
