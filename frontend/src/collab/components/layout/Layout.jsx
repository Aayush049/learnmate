import { useState, useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children = null }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const title = (location.pathname === "/" || location.pathname === "/dashboard")
      ? "Dashboard"
      : location.pathname
          .split("/")
          .filter(Boolean)
          .pop()
          ?.replaceAll("-", " ") || "Dashboard";

  return (
    <div className="app-shell">
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)}></div>}
      
      <Sidebar 
        open={open} 
        setOpen={setOpen} 
        collapsed={collapsed} 
        toggleCollapse={toggleCollapse} 
      />

      <main className={`main ${collapsed ? "collapsed" : ""}`}>
        <Topbar title={title} setOpen={setOpen} />
        {children || <Outlet />}
      </main>
    </div>
  );
}
