// src/pages/admindashboard/DashboardHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs";
import styles from "./DashboardHome.module.css";
import { adminAPI } from "../../services/api";

export default function DashboardHome() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sseState, setSseState] = useState("connecting");

  const fetchStats = async () => {
    try {
      const data = await adminAPI.getStats();
      setStats(data || {});
    } catch (e) {
      console.error("Stats fetch error", e);
      setError("Failed to load stats");
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await adminAPI.getAuditLogs({ page: 1, limit: 5 });
      setRecent(Array.isArray(res?.data) ? res.data : res?.data ?? []);
    } catch (e) {
      console.error("Audit logs fetch error", e);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRecent()]);
      setLoading(false);
    })();

    // Subscribe to server-sent events and refresh on notifications
    const es = adminAPI.subscribeToEvents?.();
    if (es) {
      es.onopen = () => setSseState("open");
      es.onerror = () => setSseState("reconnecting");
      es.onmessage = (evt) => {
        setSseState("open");
        let data = null;
        try { data = evt?.data ? JSON.parse(evt.data) : null; } catch (_) { data = null; }
        const type = data && typeof data === 'object' ? data.type : undefined;
        if (type === 'STATS_UPDATED' || type === 'AUDIT_LOG_UPDATED' || type === 'BULK_IMPORT_COMPLETED') {
          fetchStats();
          fetchRecent();
        } else if (type === undefined) {
          // Maintain legacy behavior for generic messages
          fetchStats();
          fetchRecent();
        } // else: unknown type -> ignore safely
      };
    }
    return () => {
      if (es) es.close();
    };
  }, []);

  const summary = useMemo(() => ([
    { label: "Total Faculties", value: stats.totalFaculty || 0 },
    { label: "Total Students", value: stats.totalStudents || 0 },
    { label: "Total Test Taken", value: stats.completedExams || 0 },
    { label: "Active Test", value: stats.activeExams || 0, highlight: "green" },
    { label: "Total Departments", value: stats.totalDepartments || 0 },
    { label: "Total Classes", value: stats.totalClasses || 0 },
  ]), [stats]);

  const quickActions = [
    { label: "Add Faculty", path: "/admin/manage-faculties" },
    { label: "Add Student", path: "/admin/manage-students" },
    { label: "Add Subject", path: "/admin/manage-subjects" },
    { label: "Add Class", path: "/admin/manage-classes" },
    { label: "Schedule Exam", path: "/admin/manage-exams" },
    { label: "Generate Reports", path: "/admin/exam-report" },
  ];

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const d = Math.floor(hr / 24);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs />
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Campus information and Examination system</p>
        <div style={{ marginTop: 4, fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-label="SSE status"
            title={sseState === 'open' ? 'Connected' : sseState === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
            style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              backgroundColor: sseState === 'open' ? '#10b981' : (sseState === 'reconnecting' ? '#f59e0b' : '#9ca3af')
            }}
          />
          <span>{sseState === 'open' ? 'Live updates connected' : (sseState === 'reconnecting' ? 'Reconnecting…' : 'Connecting…')}</span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {loading ? (
          <div className={styles.summaryCard}><div className={styles.summaryLabel}>Loading...</div></div>
        ) : (
          summary.map((s) => (
            <div
              key={s.label}
              className={`${styles.summaryCard} ${s.highlight === "green" ? styles.activeCard : ""}`}
            >
              <div className={`${styles.summaryValue} ${s.highlight === "green" ? styles.summaryValueGreen : ""}`}>{s.value}</div>
              <div className={styles.summaryLabel}>{s.label}</div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions & Recent */}
      <div className={styles.contentGrid}>
        {/* Quick Actions */}
        <div className={styles.quickActionsCard}>
          <h3 className={styles.cardTitle}>Quick Actions</h3>
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className={styles.quickActionButton}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Recent Activities */}
        <div className={styles.recentActivitiesCard}>
          <h3 className={styles.cardTitle}>Recent Activities</h3>
          {recent.length === 0 ? (
            <p className={styles.activityText}>No recent activity.</p>
          ) : (
            <ul className={styles.activityList}>
              {recent.map((log) => (
                <li key={log._id} className={styles.activityItem}>
                  <p className={styles.activityText}>
                    {log.action?.replaceAll("_", " ")}
                  </p>
                  <small className={styles.activityTime}>{timeAgo(log.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
