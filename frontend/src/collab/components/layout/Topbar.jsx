import { Menu, Search, Bell, LogOut } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ThemeSelector from "../common/ThemeSelector";

export default function Topbar({ title, setOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setOpen(true)}>
        <Menu />
      </button>

      <div>
        <h1>{title.charAt(0).toUpperCase() + title.slice(1)}</h1>
        <p>Prepare smarter. Crack SSC JE Civil.</p>
      </div>

      <div className="top-actions">
        <ThemeSelector />
        <button className="icon-button"><Search size={18} /></button>
        <button className="icon-button notification">
          <Bell size={18} />
          <span />
        </button>
        <button className="icon-button" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
        <div className="top-avatar" title={user?.full_name}>{user?.full_name?.charAt(0) || 'U'}</div>
      </div>
    </header>
  );
}
