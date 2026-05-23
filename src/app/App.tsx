import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Copy, Radio, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import logoUrl from '../assets/logo.webp';
import { roleLabels } from '../state/seed';
import { createLiveStateFromTemplate, useLiveMissionStore, useMissionStore } from '../state/useMissionStore';
import {
  buildMissionNavItems,
  getAlternateDeliverableLink,
  getDeliverableBrand,
  getDeliverableTitle,
  getPrimaryMobileNavItems
} from './missionNavigation';

export function AppShell() {
  const navigate = useNavigate();
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
  const navItems = buildMissionNavItems(mission.mode);
  const primaryMobileNavItems = getPrimaryMobileNavItems(navItems);
  const deliverableTitle = getDeliverableTitle(mission.mode);
  const deliverableBrand = getDeliverableBrand(mission.mode);
  const alternateDeliverable = getAlternateDeliverableLink(mission.mode);
  const inTemplateMode = mission.mode === 'template';

  const duplicateTemplateToLive = () => {
    if (!inTemplateMode) {
      return;
    }

    useLiveMissionStore.setState(createLiveStateFromTemplate(mission));
    navigate('/');
  };

  useEffect(() => {
    const updateOnline = () => setOnlineStatus(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, [setOnlineStatus]);

  const currentNavItem = navItems.find((item, index) => {
    if (index === 0) {
      return location.pathname === item.to;
    }

    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  });

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Mission navigation">
        <div className="brand">
          <img src={logoUrl} alt={deliverableBrand} />
          <div>
            <h1 className="brand-title">{deliverableBrand}</h1>
            <p className="brand-subtitle">{mission.name}</p>
            <p className="brand-context">{deliverableTitle}</p>
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
            <p className="page-kicker">{deliverableTitle}</p>
            <h2 className="page-title">{currentNavItem?.title ?? 'Mission Control'}</h2>
          </div>

          <div className="topbar-actions">
            {inTemplateMode ? (
              <>
                <button className="button" type="button" onClick={duplicateTemplateToLive}>
                  <Copy aria-hidden="true" />
                  Duplicate To Live
                </button>
                <button className="button" type="button" onClick={resetMission}>
                  <RotateCcw aria-hidden="true" />
                  Reset Template
                </button>
              </>
            ) : null}
            <NavLink className="button" to={alternateDeliverable.to}>
              {alternateDeliverable.label}
            </NavLink>
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
            {!inTemplateMode ? (
              <button className="button-icon" type="button" title="Reset live mission" aria-label="Reset live mission" onClick={resetMission}>
                <RotateCcw aria-hidden="true" />
              </button>
            ) : null}
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
