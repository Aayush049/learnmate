import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from '../../assets/icons';

export const AdminSidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: Icons.Home },
    { path: '/admin/users', label: 'Users', icon: Icons.Users },
    { path: '/admin/hierarchy', label: 'Hierarchy', icon: Icons.BookOpen },
    { path: '/admin/questions', label: 'Question Bank', icon: Icons.PenTool },
    { path: '/admin/mock-tests', label: 'Mock Tests', icon: Icons.Clock },
    { path: '/dashboard', label: 'Student View', icon: Icons.User },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icons.Settings className="w-6 h-6 text-indigo-400" />
          Admin Panel
        </h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path) && (item.path !== '/dashboard' || location.pathname === '/dashboard');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 font-medium'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="text-sm text-slate-500 text-center">LearnMate AI Core</div>
      </div>
    </aside>
  );
};
