import React from "react";

const StudentDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">Student Dashboard</h1>

      <div className="bg-white p-6 shadow rounded">
        <p>Welcome to EzCIE. Your status is: <strong>Pending Approval</strong></p>
      </div>
    </div>
  );
};

export default StudentDashboard;
