// src/pages/admindashboard/AdminSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaChalkboardTeacher,
  FaUsers,
  FaBookOpen,
  FaLayerGroup,
  FaBuilding,
  FaUserCircle,
  FaCalendarAlt, 
  FaFileAlt,
} from "react-icons/fa";
import styles from "./AdminSidebar.module.css";

const menuItems = [
  { label: "Dashboard", path: "/admin", icon: <FaTachometerAlt /> },
  { label: "Faculties", path: "/admin/manage-faculties", icon: <FaChalkboardTeacher /> },
  { label: "Students", path: "/admin/manage-students", icon: <FaUsers /> },
  { label: "Subjects", path: "/admin/manage-subjects", icon: <FaBookOpen /> },
  { label: "Classes", path: "/admin/manage-classes", icon: <FaLayerGroup /> },
  { label: "Departments", path: "/admin/manage-departments", icon: <FaBuilding /> },
  { label: "Exams", path: "/admin/manage-exams", icon: <FaCalendarAlt /> }, 
  { label: "Exam Reports", path: "/admin/exam-report", icon: <FaFileAlt /> },
];

export default function AdminSidebar({ adminName }) {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navigation}>
        <ul className={styles.menuList}>
          {menuItems.map(({ label, path, icon }) => (
            <li key={label} className={styles.menuItem}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `${styles.menuLink} ${isActive ? styles.menuLinkActive : ''}`
                }
                {...(path === "/admin" ? { end: true } : {})}
              >
                <span className={styles.menuIcon}>{icon}</span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

        {/* Admin Info at bottom */}
        <div className={styles.adminInfo}>
          <FaUserCircle className={styles.adminAvatar} />
          <div className={styles.adminDetails}>
            <p className={styles.adminName}>{adminName}</p>
            <p className={styles.adminRole}>Administrator</p>
          </div>
        </div>
      </aside>
  );
}
