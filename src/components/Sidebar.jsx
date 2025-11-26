import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FileText, LogOut } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Tests', path: '/tests', icon: FileText },
  ];

  return (
    <div className="h-screen w-64 bg-neo-white border-r-4 border-neo-black flex flex-col fixed left-0 top-0 z-10">
      <div className="p-6 border-b-4 border-neo-black">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Alz Admin</h1>
        <p className="text-sm font-bold text-gray-500 mt-1">Welcome, {user?.name || 'Admin'}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 font-bold border-2 border-transparent transition-all hover:translate-x-1",
                isActive 
                  ? "bg-neo-main border-neo-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" 
                  : "hover:bg-neo-bg hover:border-neo-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              )}
            >
              <Icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t-4 border-neo-black">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full font-bold bg-neo-error border-2 border-neo-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

