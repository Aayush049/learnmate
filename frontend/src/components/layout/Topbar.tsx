import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Icons } from '../../assets/icons';
import ThemeSelector from '../../collab/components/common/ThemeSelector';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: Implement actual logout in Phase 3
    navigate('/');
  };

  return (
    <div className="bg-[var(--surface-color)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-[var(--text-main)]">{title}</h1>

      <div className="flex items-center gap-4">
        <ThemeSelector />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--primary-color)] rounded-full flex items-center justify-center text-white font-semibold">
            RK
          </div>
          <Button variant="secondary" size="sm" onClick={handleLogout}>
            <Icons.LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};
