import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Radio, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import logoUrl from '../assets/logo.webp';
import { roleLabels } from '../state/seed';
import { useMissionStore } from '../state/useMissionStore';
import { navItems, primaryMobileNavItems } from './router';

export function AppShell() {
  const location = useLocation();
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const selectedRole = useMissionStore((state) => state.selectedRole);
  const online = useMissionStore((state) => state.online);
  const offlineQueue = useMissionStore((state) => state.offlineQueue);
  const setActiveActor = useMissionStore((state) => state.setActiveActor);
  const setSelectedRole = useMissionStore((state) => state.setSelectedRole);
  const setOnlineStatus = useMissionStore((state) => state.setOnlineStatus);
  const resetMission = useMissionStore((state) => state.resetMission);

  useEffect(() => {
    const updateOnline = () => setOnlineStatus(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, [setOnlineStatus]);

  const currentNavItem = navItems.find((item) => {
    if (item.to === '/') {
      return location.pathname === '/';
    }

    return location.pathname.startsWith(item.to);
  });

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Mission navigation">
        <div className="brand">
          <img src={logoUrl} alt="Swim California" />
          <div>
            <h1 className="brand-title">Swim California</h1>
            <p className="brand-subtitle">{mission.name}</p>
          </div>
        </div>

        <nav className="nav-stack">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <label className="field-label">
            Active role
            <select
              className="select"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as typeof selectedRole)}
            >
              {Object.entries(roleLabels).map(([role, label]) => (
                <option key={role} value={role}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Acting as
            <select className="select" value={activeActorId} onChange={(event) => setActiveActor(event.target.value)}>
              {mission.crew.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>

      <main className="main-frame">
        <header className="topbar">
          <div>
            <p className="page-kicker">Checklist · Tracking · WOWSA Evidence</p>
            <h2 className="page-title">{currentNavItem?.title ?? 'Mission Control'}</h2>
          </div>

          <div className="topbar-actions">
            <span className={online ? 'sync-pill online' : 'sync-pill offline'}>
              {online ? 'Online' : `${offlineQueue.length} queued offline`}
            </span>
            <button
              className="button-icon"
              type="button"
              title={online ? 'Switch to offline simulation' : 'Restore online simulation'}
              aria-label={online ? 'Switch to offline simulation' : 'Restore online simulation'}
              onClick={() => setOnlineStatus(!online)}
            >
              {online ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
            </button>
            <button className="button-icon" type="button" title="Reset demo mission" aria-label="Reset demo mission" onClick={resetMission}>
              <RotateCcw aria-hidden="true" />
            </button>
            <span className={`status-pill ${mission.status}`}>
              <Radio aria-hidden="true" size={14} />
              {mission.status}
            </span>
          </div>
        </header>

        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="Primary mobile navigation">
        {primaryMobileNavItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="mobile-nav-item">
            <item.icon aria-hidden="true" />
            <span>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
