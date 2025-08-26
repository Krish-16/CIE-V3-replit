import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import AdminLogin from "./pages/AdminLogin";
import FacultyLogin from "./pages/FacultyLogin";
import StudentLogin from "./pages/StudentLogin";

// Dashboard Components
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import FacultyDashboard from "./pages/facultydashboard/FacultyDashboard";
import StudentDashboard from "./pages/studentdashboard/StudentDashboard";

// Components
import PrivateRoute from "./components/PrivateRoute";

// Context
import { AuthProvider } from "./contexts/AuthContext";

// Initialize axios defaults
import './services/api';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
        {/* Login Pages */}
        <Route path="/" element={<StudentLogin />} />
        <Route path="/faculty" element={<FacultyLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Dashboards */}
        <Route
          path="/admin/*"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/faculty/*"
          element={
            <PrivateRoute role="faculty">
              <FacultyDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/*"
          element={
            <PrivateRoute role="student">
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
