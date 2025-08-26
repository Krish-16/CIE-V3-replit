import React from "react";

const FacultyDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-green-700 mb-6">Faculty Dashboard</h1>

      <div className="bg-white p-6 shadow rounded">
        <h2 className="text-xl font-semibold mb-4">Student Approvals</h2>
        <p>List of students awaiting approval...</p>
        {/* You can simulate approval buttons here */}
      </div>
    </div>
  );
};

export default FacultyDashboard;
