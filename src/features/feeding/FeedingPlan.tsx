import { addMinutes } from 'date-fns';
import { CheckCircle2, Droplets, Flame, ShieldPlus, TimerReset, Utensils } from 'lucide-react';
import { useMemo } from 'react';
import { formatClock, getCrewLabel, getMinutesUntil } from '../../state/selectors';
import { useMissionStore } from '../../state/useMissionStore';
import { useNow } from '../../lib/useNow';

export function FeedingPlan() {
  const now = useNow();
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const logQuickAction = useMissionStore((state) => state.logQuickAction);
  const feedingPlan = mission.feedingPlan ?? [];
  const minutesToFeeding = getMinutesUntil(mission.nextFeedingAt, now);
  const primaryPlan = feedingPlan.find((item) => !item.backup) ?? feedingPlan[0];
  const backupPlans = feedingPlan.filter((item) => item.backup);
  const caloriesPerHour = feedingPlan
    .filter((item) => !item.backup)
    .reduce((total, item) => total + Math.round((60 / item.intervalMinutes) * item.calories), 0);
  const hydrationPerHour = feedingPlan
    .filter((item) => !item.backup)
    .reduce((total, item) => total + Math.round((60 / item.intervalMinutes) * item.hydrationOz), 0);

  const upcomingFeeds = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const at = addMinutes(new Date(mission.nextFeedingAt), index * mission.feedingIntervalMinutes).toISOString();
        return {
          id: `feed-${index}`,
          at,
          label: index === 0 ? 'Next feed' : `Feed +${index}`,
          minutesUntil: getMinutesUntil(at, now)
        };
      }),
    [mission.feedingIntervalMinutes, mission.nextFeedingAt, now]
  );

  return (
    <div className="page-grid">
      <section className={`panel critical-action span-12 ${minutesToFeeding <= 0 ? 'critical' : minutesToFeeding <= 5 ? 'warning' : 'normal'}`}>
        <div>
          <p className="page-kicker">Feeding Window</p>
          <h3 className="critical-title">{minutesToFeeding <= 0 ? 'Feeding due now' : `Feeding in ${minutesToFeeding} min`}</h3>
        </div>
        <p className="critical-detail">
          {primaryPlan?.label ?? 'Primary feed'} · {primaryPlan?.calories ?? 0} cal · {primaryPlan?.hydrationOz ?? 0} oz ·{' '}
          {primaryPlan?.electrolytesMg ?? 0} mg sodium
        </p>
        <div className="critical-meta">
          <span className="sync-pill online">{formatClock(mission.nextFeedingAt)}</span>
          <span className="severity-pill info">Actor: {getCrewLabel(mission, activeActorId)}</span>
          <button className="button primary" type="button" onClick={() => logQuickAction('feeding-completed', activeActorId)}>
            <CheckCircle2 aria-hidden="true" />
            Feeding completed
          </button>
        </div>
      </section>

      <section className="panel span-4">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Targets</h3>
            <p className="panel-subtitle">Primary plan only.</p>
          </div>
          <Utensils aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Interval</span>
            <span className="metric-value">{mission.feedingIntervalMinutes} min</span>
          </div>
          <div className="metric">
            <span className="metric-label">Calories</span>
            <span className="metric-value">{caloriesPerHour}/hr</span>
          </div>
          <div className="metric">
            <span className="metric-label">Hydration</span>
            <span className="metric-value">{hydrationPerHour} oz/hr</span>
          </div>
          <div className="metric">
            <span className="metric-label">Last Feed</span>
            <span className="metric-value">{formatClock(mission.lastFeedingAt)}</span>
          </div>
        </div>
      </section>

      <section className="panel span-8">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Upcoming Schedule</h3>
            <p className="panel-subtitle">Generated from the last completed feed.</p>
          </div>
          <TimerReset aria-hidden="true" />
        </div>
        <ul className="cadence-list">
          {upcomingFeeds.map((feed) => (
            <li className={`cadence-row ${feed.minutesUntil <= 0 ? 'critical' : feed.minutesUntil <= 5 ? 'warning' : ''}`} key={feed.id}>
              <div>
                <div className="row-title">{feed.label}</div>
                <div className="row-meta">
                  {primaryPlan?.label ?? 'Primary feed'} · {feed.minutesUntil <= 0 ? `${Math.abs(feed.minutesUntil)} min overdue` : `${feed.minutesUntil} min`}
                </div>
              </div>
              <span className={`severity-pill ${feed.minutesUntil <= 0 ? 'critical' : feed.minutesUntil <= 5 ? 'warning' : 'info'}`}>
                {formatClock(feed.at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Nutrition Options</h3>
            <p className="panel-subtitle">Primary and backup feeds.</p>
          </div>
          <ShieldPlus aria-hidden="true" />
        </div>
        <div className="feed-plan-grid">
          {feedingPlan.map((item) => (
            <article className="feed-plan-card" key={item.id}>
              <div className="split-row">
                <div>
                  <div className="row-title">{item.label}</div>
                  <div className="row-meta">Every {item.intervalMinutes} min</div>
                </div>
                <span className={item.backup ? 'status-pill pending' : 'status-pill active'}>{item.backup ? 'backup' : 'primary'}</span>
              </div>
              <div className="feed-stat-row">
                <span>
                  <Flame aria-hidden="true" />
                  {item.calories} cal
                </span>
                <span>
                  <Droplets aria-hidden="true" />
                  {item.hydrationOz} oz
                </span>
                <span>{item.electrolytesMg} mg sodium</span>
              </div>
              <p className="row-meta">{item.notes}</p>
            </article>
          ))}
        </div>
      </section>

      {backupPlans.length ? (
        <section className="panel span-12">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Backup Triggers</h3>
              <p className="panel-subtitle">Use when the primary feed is not working.</p>
            </div>
            <ShieldPlus aria-hidden="true" />
          </div>
          <ul className="row-list">
            {backupPlans.map((item) => (
              <li className="list-row" key={`${item.id}-trigger`}>
                <div className="split-row">
                  <span className="row-title">{item.label}</span>
                  <span className="role-pill">{item.calories} cal</span>
                </div>
                <span className="row-meta">{item.notes}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
