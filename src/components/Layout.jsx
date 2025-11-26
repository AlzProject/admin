import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen bg-neo-bg">
      <Sidebar />
      <main className="ml-64 p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

