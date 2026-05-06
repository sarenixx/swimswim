import { Check, Clock3, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { roleLabels } from '../../state/seed';
import {
  formatClock,
  getChecklistDomain,
  getChecklistStatus,
  getCrewLabel,
  getReadinessGroups,
  readinessDomainLabels,
  type ReadinessDomain
} from '../../state/selectors';
import type { ChecklistCategory } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';
import { useNow } from '../../lib/useNow';

const categories: Array<{ id: ChecklistCategory; label: string }> = [
  { id: 'pre-swim', label: 'Pre-Swim' },
  { id: 'in-swim', label: 'In-Swim' },
  { id: 'post-swim', label: 'Post-Swim' },
  { id: 'mental-health', label: 'Mental Health' }
];

export function Checklists() {
  const now = useNow();
  const [activeCategory, setActiveCategory] = useState<ChecklistCategory>('pre-swim');
  const [activeDomain, setActiveDomain] = useState<ReadinessDomain | 'all'>('all');
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const completeChecklistItem = useMissionStore((state) => state.completeChecklistItem);
  const setChecklistOwner = useMissionStore((state) => state.setChecklistOwner);

  const categoryItems = useMemo(
    () =>
      mission.checklistItems.filter(
        (item) => item.category === activeCategory && (activeDomain === 'all' || getChecklistDomain(item) === activeDomain)
      ),
    [activeCategory, activeDomain, mission.checklistItems]
  );
  const readinessGroups = getReadinessGroups(mission, now);

  const counts = useMemo(
    () =>
      categories.reduce<Record<ChecklistCategory, number>>((acc, category) => {
        acc[category.id] = mission.checklistItems.filter((item) => item.category === category.id).length;
        return acc;
      }, {} as Record<ChecklistCategory, number>),
    [mission.checklistItems]
  );

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Checklist Runs</h3>
            <p className="panel-subtitle">Owner, due time, completion actor, and lateness are captured on every item.</p>
          </div>
          <Check aria-hidden="true" />
        </div>
        <div className="readiness-grid" style={{ marginBottom: 16 }}>
          {readinessGroups.map((group) => (
            <button
              className={`readiness-card ${group.status}`}
              key={group.domain}
              type="button"
              onClick={() => setActiveDomain(group.domain)}
            >
              <div className="readiness-head">
                <strong>{group.label}</strong>
                <span className={group.status === 'ready' ? 'status-pill done' : group.status === 'attention' ? 'status-pill overdue' : 'status-pill pending'}>
                  {group.done}/{group.total}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${group.percent}%` }} />
              </div>
              <span className="row-meta">{group.open ? `${group.open} open` : 'ready'}</span>
            </button>
          ))}
        </div>
        <div className="checklist-tabs" role="tablist" aria-label="Checklist categories">
          {categories.map((category) => (
            <button
              className={activeCategory === category.id ? 'segment active' : 'segment'}
              key={category.id}
              role="tab"
              type="button"
              aria-selected={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label} ({counts[category.id]})
            </button>
          ))}
        </div>
        <div className="checklist-tabs" role="tablist" aria-label="Readiness domains" style={{ marginTop: 10 }}>
          <button
            className={activeDomain === 'all' ? 'segment active' : 'segment'}
            type="button"
            role="tab"
            aria-selected={activeDomain === 'all'}
            onClick={() => setActiveDomain('all')}
          >
            All domains
          </button>
          {(Object.keys(readinessDomainLabels) as ReadinessDomain[]).map((domain) => (
            <button
              className={activeDomain === domain ? 'segment active' : 'segment'}
              key={domain}
              type="button"
              role="tab"
              aria-selected={activeDomain === domain}
              onClick={() => setActiveDomain(domain)}
            >
              {readinessDomainLabels[domain]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel span-12">
        <ul className="row-list">
          {categoryItems.map((item) => {
            const status = getChecklistStatus(item, now);
            return (
              <li className="list-row" key={item.id}>
                <div className="split-row">
                  <div>
                    <div className="row-title">{item.title}</div>
                    <div className="row-meta">
                      {readinessDomainLabels[getChecklistDomain(item)]} ·{' '}
                      Owner: {getCrewLabel(mission, item.ownerId)}
                      {item.dueAt ? ` · Due ${formatClock(item.dueAt)}` : ''}
                      {item.completedAt ? ` · Completed ${formatClock(item.completedAt)}` : ''}
                    </div>
                  </div>
                  <span className={`status-pill ${status}`}>{status}</span>
                </div>

                <div className="row-actions">
                  <label className="field-label">
                    <span>Owner</span>
                    <select className="select" value={item.ownerId} onChange={(event) => setChecklistOwner(item.id, event.target.value)}>
                      {mission.crew.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} · {roleLabels[member.role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button primary"
                    type="button"
                    disabled={status === 'done'}
                    onClick={() => completeChecklistItem(item.id, activeActorId)}
                  >
                    <Check aria-hidden="true" />
                    Complete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Due Soon</h3>
            <p className="panel-subtitle">Items within the current operational window.</p>
          </div>
          <Clock3 aria-hidden="true" />
        </div>
        <ul className="row-list">
          {mission.checklistItems
            .filter((item) => item.dueAt && getChecklistStatus(item, now) !== 'done')
            .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
            .slice(0, 5)
            .map((item) => (
              <li className="list-row" key={item.id}>
                <div className="split-row">
                  <span className="row-title">{item.title}</span>
                  <span className={`status-pill ${getChecklistStatus(item, now)}`}>{formatClock(item.dueAt!)}</span>
                </div>
                <span className="row-meta">{getCrewLabel(mission, item.ownerId)}</span>
              </li>
            ))}
        </ul>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Ownership</h3>
            <p className="panel-subtitle">Open items grouped by active responsibility.</p>
          </div>
          <UserRound aria-hidden="true" />
        </div>
        <ul className="row-list">
          {mission.crew.map((member) => {
            const openCount = mission.checklistItems.filter(
              (item) => item.ownerId === member.id && getChecklistStatus(item, now) !== 'done'
            ).length;
            return (
              <li className="list-row" key={member.id}>
                <div className="split-row">
                  <span className="row-title">{member.name}</span>
                  <span className="role-pill">{roleLabels[member.role]}</span>
                </div>
                <span className="row-meta">{openCount} open items</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
