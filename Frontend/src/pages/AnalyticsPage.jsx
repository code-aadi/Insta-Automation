import { useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ANALYTICS_SERIES } from '../data/mockData.js';

/**
 * AnalyticsPage
 * ---------------------------------------------------------------------------
 * Displays channel attribution breakdown, timeframe selector (7d / 14d / 30d),
 * and a sortable Top Reels & Posts performance table.
 */
export default function AnalyticsPage() {
  const { mediaList, automations } = useApp();

  const [timeframe, setTimeframe] = useState('14d');
  const [sortField, setSortField] = useState('commentsCount');

  // Scale totals cleanly depending on selected timeframe
  const scaleFactor = timeframe === '7d' ? 0.52 : timeframe === '14d' ? 1 : 2.1;

  // Aggregate channel totals from the 14-day series
  const totals = useMemo(() => {
    const base = ANALYTICS_SERIES.reduce(
      (acc, d) => ({
        dm: acc.dm + d.dm,
        comment: acc.comment + d.comment,
        story: acc.story + d.story,
        ai: acc.ai + d.ai,
      }),
      { dm: 0, comment: 0, story: 0, ai: 0 },
    );
    const dm = Math.round(base.dm * scaleFactor);
    const comment = Math.round(base.comment * scaleFactor);
    const story = Math.round(base.story * scaleFactor);
    const ai = Math.round(base.ai * scaleFactor);
    const grand = dm + comment + story + ai;
    return { dm, comment, story, ai, grand };
  }, [scaleFactor]);

  // Sort media items by selected engagement metric
  const sortedMedia = useMemo(() => {
    return [...mediaList].sort((a, b) => b[sortField] - a[sortField]);
  }, [mediaList, sortField]);

  return (
    <DashboardLayout title="Analytics">
      <div className="page-head">
        <div>
          <h1 className="page-title">Funnel Analytics</h1>
          <p className="page-subtitle">
            Channel delivery volume and top-performing Instagram Reels and Posts.
          </p>
        </div>

        <div className="segmented-tabs" role="tablist" aria-label="Timeframe filter">
          {['7d', '14d', '30d'].map((tf) => (
            <button
              key={tf}
              type="button"
              role="tab"
              aria-selected={timeframe === tf}
              className={`segmented-tab ${timeframe === tf ? 'is-active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              Last {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Automated Replies</span>
          <span className="kpi-value tabular-num">{totals.grand.toLocaleString()}</span>
          <span className="kpi-foot">Across all active channels</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Comment-to-DM Volume</span>
          <span className="kpi-value tabular-num">{totals.comment.toLocaleString()}</span>
          <span className="kpi-foot">Highest converting funnel</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">DM Keyword Matches</span>
          <span className="kpi-value tabular-num">{totals.dm.toLocaleString()}</span>
          <span className="kpi-foot">Direct inbox triggers</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">AI Fallback Handled</span>
          <span className="kpi-value tabular-num">{totals.ai.toLocaleString()}</span>
          <span className="kpi-foot">Unmatched organic DMs</span>
        </div>
      </section>

      <div className="dashboard-split">
        {/* Channel Share Bars */}
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Channel Attribution</h2>
              <p className="panel-sub">Share of automated replies by Instagram surface</p>
            </div>
          </div>

          <div className="channel-bars">
            {[
              { label: 'Comment-to-DM Funnels', value: totals.comment, color: 'var(--accent-primary)' },
              { label: 'DM Keyword Triggers', value: totals.dm, color: 'var(--signal-active)' },
              { label: 'Story Replies & Reactions', value: totals.story, color: '#6366f1' },
              { label: 'AI Auto-Reply Fallback', value: totals.ai, color: 'var(--signal-warning)' },
            ].map((row) => {
              const pct = Math.round((row.value / Math.max(totals.grand, 1)) * 100);
              return (
                <div key={row.label} className="channel-row">
                  <div className="channel-row-top">
                    <span>{row.label}</span>
                    <span className="tabular-num">
                      {row.value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top Rules Summary */}
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Top Active Rules</h2>
              <p className="panel-sub">Sorted by lifetime trigger volume</p>
            </div>
          </div>

          <div className="health-list">
            {[...automations]
              .sort((a, b) => b.triggersCount - a.triggersCount)
              .slice(0, 4)
              .map((rule) => (
                <div key={rule.id} className="health-row">
                  <div>
                    <div className="health-row-title">{rule.name}</div>
                    <div className="health-row-sub">
                      {rule.triggerType.toUpperCase()} · {rule.conversionRate}% conversion
                    </div>
                  </div>
                  <span className="tabular-num" style={{ fontWeight: 700 }}>
                    {rule.triggersCount}
                  </span>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* Media Performance Table */}
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Instagram Media Performance</h2>
            <p className="panel-sub">Posts, Reels, and Stories connected to your funnels</p>
          </div>

          <div className="segmented-tabs">
            <button
              type="button"
              className={`segmented-tab ${sortField === 'commentsCount' ? 'is-active' : ''}`}
              onClick={() => setSortField('commentsCount')}
            >
              Sort by Comments
            </button>
            <button
              type="button"
              className={`segmented-tab ${sortField === 'likes' ? 'is-active' : ''}`}
              onClick={() => setSortField('likes')}
            >
              Sort by Likes
            </button>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Media Title</th>
                <th>Format</th>
                <th>Posted</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Comments</th>
              </tr>
            </thead>
            <tbody>
              {sortedMedia.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td className="tabular-num">{item.thumbnailLabel}</td>
                  <td>{item.postedAt}</td>
                  <td className="text-right tabular-num">{item.likes.toLocaleString()}</td>
                  <td className="text-right tabular-num">
                    {item.commentsCount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
