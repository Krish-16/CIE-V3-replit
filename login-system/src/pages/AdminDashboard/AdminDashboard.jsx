// src/pages/admindashboard/AdminDashboard.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import AdminSidebar from "./AdminSidebar";
import DashboardHome from "./DashboardHome";
import ManageFaculties from "./ManageFaculties";
import ManageStudents from "./ManageStudents";
import ManageSubjects from "./ManageSubjects";
import ManageClasses from "./ManageClasses";
import ManageDepartments from "./ManageDepartments";
import ManageExams from "./ManageExams"; 
import ExamReport from "./ExamReport";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin-login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Set up session timeout and cleanup
  useEffect(() => {
    // Set session timeout (15 minutes of inactivity)
    const timeoutDuration = 15 * 60 * 1000; // 15 minutes
    let timeoutId;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Set new timeout
      timeoutId = setTimeout(() => {
        console.log('Session expired due to inactivity');
        handleLogout();
      }, timeoutDuration);
    };

    // Reset timeout on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimeout));
    
    // Initial setup
    resetTimeout();

    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimeout));
    };
  }, [logout]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <AdminSidebar adminName={user.id || 'Admin'} />

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Top Bar */}
        <header className={styles.topBar}>
          <h1 className={styles.topBarTitle}>
            Admin Dashboard
          </h1>
          <div className={styles.topBarActions}>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              aria-label="Logout"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className={styles.pageContent}>
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/manage-faculties" element={<ManageFaculties />} />
            <Route path="/manage-students" element={<ManageStudents />} />
            <Route path="/manage-subjects" element={<ManageSubjects />} />
            <Route path="/manage-classes" element={<ManageClasses />} />
            <Route path="/manage-departments" element={<ManageDepartments />} />
            <Route path="/manage-exams" element={<ManageExams />} />
            <Route path="/exam-report" element={<ExamReport />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
