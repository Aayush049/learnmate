import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Layers3,
  Brain,
  Bot,
  Clock3,
  BarChart3,
  Trophy,
  CalendarDays,
  Target,
  FileText,
  Bookmark,
  UserRound,
  SlidersHorizontal,
  Shield,
  X,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useState, useRef, useEffect } from "react";

const getNav = (isAdmin) => [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  ...(isAdmin ? [{ label: "Admin Panel", icon: Settings, to: "/admin/dashboard" }] : []),
  { section: "LEARN" },
  { label: "Syllabus", icon: BookOpen, to: "/learn/textbook" },
  { label: "Topics", icon: Layers3, to: "/learn/topics" },
  { section: "PRACTICE" },
  { label: "PYQs", icon: Brain, to: "/learn/practice" },
  { label: "Mock Tests", icon: Clock3, to: "/test/mock" },
  { section: "AI" },
  { label: "AI Tutor", icon: Bot, to: "/learn/ai-tutor", comingSoon: true },
  { section: "PROGRESS" },
  { label: "Progress", icon: BarChart3, to: "/track/progress" },
  { label: "Performance", icon: Trophy, to: "/track/performance" },
  { section: "RESOURCES" },
  { label: "Saved Resources", icon: Bookmark, to: "/resources/bookmarks" },
  { label: "Settings", icon: Settings, to: "/settings/profile" }
];

export default function Sidebar({ open, setOpen, collapsed, toggleCollapse }) {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout || (() => {});
  
  const nav = getNav(user?.is_admin);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      <button className="collapse-toggle" onClick={toggleCollapse}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      
      <div className="brand">
        <div className="brand-mark">✦</div>
        <div>
          <strong>LearnMate</strong>
          <span>SSC JE Civil Prep</span>
        </div>
        <button className="mobile-close" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <nav>
        {nav.map((item, index) =>
          item.section ? (
            <div className="nav-section" key={index}>{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.comingSoon ? "#" : item.to}
              onClick={(e) => { 
                if (item.comingSoon) { e.preventDefault(); return; }
                setOpen(false); 
              }}
              className={({ isActive }) => `nav-item ${isActive && !item.comingSoon ? "active" : ""} ${item.comingSoon ? "opacity-60 cursor-default" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && !collapsed && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full ml-auto">
                  COMING SOON
                </span>
              )}
            </NavLink>
          )
        )}
      </nav>

      <div 
        className="sidebar-user" 
        onClick={() => setMenuOpen(!menuOpen)}
        ref={menuRef}
      >
        <div className="avatar">
          {user?.full_name?.charAt(0) || user?.name?.charAt(0) || 'U'}
        </div>
        <div>
          <strong>{user?.full_name || user?.name || 'Mrinal'}</strong>
          <span>{user?.email || 'user1@test.com'}</span>
        </div>
        
        {menuOpen && (
          <div className="user-menu-popover" onClick={(e) => e.stopPropagation()}>
            <NavLink
              key={item.to}
              to={item.comingSoon ? "#" : item.to}
              onClick={(e) => { 
                if (item.comingSoon) { e.preventDefault(); return; }
                setOpen(false); 
              }}
              className={({ isActive }) => `nav-item ${isActive && !item.comingSoon ? "active" : ""} ${item.comingSoon ? "opacity-60 cursor-default" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && !collapsed && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full ml-auto">
                  COMING SOON
                </span>
              )}
            </NavLink>
            <NavLink
              key={item.to}
              to={item.comingSoon ? "#" : item.to}
              onClick={(e) => { 
                if (item.comingSoon) { e.preventDefault(); return; }
                setOpen(false); 
              }}
              className={({ isActive }) => `nav-item ${isActive && !item.comingSoon ? "active" : ""} ${item.comingSoon ? "opacity-60 cursor-default" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && !collapsed && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full ml-auto">
                  COMING SOON
                </span>
              )}
            </NavLink>
            <NavLink
              key={item.to}
              to={item.comingSoon ? "#" : item.to}
              onClick={(e) => { 
                if (item.comingSoon) { e.preventDefault(); return; }
                setOpen(false); 
              }}
              className={({ isActive }) => `nav-item ${isActive && !item.comingSoon ? "active" : ""} ${item.comingSoon ? "opacity-60 cursor-default" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && !collapsed && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full ml-auto">
                  COMING SOON
                </span>
              )}
            </NavLink>
            <button className="user-menu-item logout" onClick={() => { logout(); setMenuOpen(false); }}>
              <LogOut size={15} /> Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
