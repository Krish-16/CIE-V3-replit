import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoginCard from "../components/LoginCard";

const AdminLogin = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      const dashboardRoutes = {
        admin: '/admin',
        faculty: '/faculty',
        student: '/student',
      };
      navigate(dashboardRoutes[user.role] || "/admin", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    
    setError("");
    if (!id || !password) {
      setError("Please enter both ID and password");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await login({
        id,
        password,
        role: "admin"
      });

      if (result.success) {
        navigate("/admin", { replace: true });
      } else {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: "url('https://i.postimg.cc/QMvRwF9r/IMG-1611-jpg.jpg')",
      }}
    >
      <LoginCard
        title="EZCIE Admin Portal"
        subtitle="Admin Login"
        idPlaceholder="Admin ID"
        passwordPlaceholder="Password"
        buttonText={isLoading ? "Logging in..." : "Log In"}
        isSubmitting={isLoading}
        id={id}
        setId={setId}
        password={password}
        setPassword={setPassword}
        onSubmit={handleLogin}
        error={error}
      />
    </div>
  );
};

export default AdminLogin;
