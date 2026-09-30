import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from '../../assets/icons';

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Icons.Home },
    { path: '/exams', label: 'Exams & Syllabus', icon: Icons.BookOpen },
    { path: '/practice', label: 'Practice', icon: Icons.PenTool },
    { path: '/tests', label: 'Mock Tests', icon: Icons.Clock },
    { path: '/progress', label: 'Progress', icon: Icons.BarChart },
    { path: '/bookmarks', label: 'Bookmarks', icon: Icons.Bookmark },
  ];

  return (
    <aside className="w-64 bg-[var(--surface-color)] border-r border-[var(--border-color)] h-screen flex flex-col transition-colors">
      <div className="p-6">
        <h1 className="text-xl font-bold text-[var(--primary-color)]">LearnMate AI</h1>
      </div>

      <nav className="flex-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-[var(--primary-light)] text-[var(--primary-color)] font-medium'
                  : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)]/40 hover:text-[var(--text-main)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
