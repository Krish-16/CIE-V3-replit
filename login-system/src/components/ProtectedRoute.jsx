import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    // Not logged in: redirect to respective login page
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "faculty") return <Navigate to="/faculty" replace />;
    if (role === "student") return <Navigate to="/" replace />;

    // fallback
    return <Navigate to="/" replace />;
  }

  // Logged in but role mismatch: redirect to their login (can customize)
  if (user.role !== role) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "faculty") return <Navigate to="/faculty" replace />;
    if (user.role === "student") return <Navigate to="/" replace />;
  }

  // Authorized — render children (dashboard)
  return children;
};

export default PrivateRoute;
