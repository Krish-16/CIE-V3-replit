// src/pages/admindashboard/ExamReport.jsx
import React, { useState } from "react";
import Breadcrumbs from "./Breadcrumbs";
import ExcelJS from "exceljs";

// Mock exams data
const mockExams = [
  {
    examId: "EX123456",
    title: "Mid-Term Mathematics",
    department: "Mathematics",
    classId: "CLS-10A",
    subject: "Mathematics",
    subjectId: "SUB-101",
    startDateTime: "2025-08-20T09:00",
    endDateTime: "2025-08-20T12:00",
    scheduledBy: "Faculty",
    status: "Ended",
  },
];

// Mock results linked to examId
const mockResults = {
  EX123456: [
    { studentId: "SID-101", name: "Alice Brown", score: 85 },
    { studentId: "SID-102", name: "Bob Green", score: 75 },
    { studentId: "SID-103", name: "Charlie White", score: 92 },
  ],
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return "";
  const options = {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  };
  return new Date(dateTimeString).toLocaleString(undefined, options);
};

export default function ExamReport() {
  const [examId, setExamId] = useState("");
  const [examDetails, setExamDetails] = useState(null);
  const [results, setResults] = useState([]);

  const handleGenerateReport = () => {
    const found = mockExams.find(e => e.examId.trim() === examId.trim());
    if (found) {
      setExamDetails(found);
      setResults(mockResults[found.examId] || []);
    } else {
      setExamDetails(null);
      setResults([]);
      alert("No exam found with that ID");
    }
  };

  // Export to Excel using ExcelJS
  const handleExportExcel = async () => {
    if (!examDetails || results.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Scores");

    worksheet.columns = [
      { header: "Student ID", key: "studentId", width: 20 },
      { header: "Name", key: "name", width: 30 },
      { header: "Score", key: "score", width: 15 }
    ];

    results.forEach(r => worksheet.addRow(r));
    worksheet.getRow(1).font = { bold: true };

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const datePart = examDetails.startDateTime.split("T")[0];
    const filename = `${examDetails.subjectId}_${examDetails.classId}_${datePart}.xlsx`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Breadcrumbs />
      <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1rem" }}>
        Exam Report
      </h2>

      {/* Exam ID input */}
      <div style={{
        background: "#fff", padding: "1.5rem", borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        marginBottom: "1.5rem", maxWidth: "400px"
      }}>
        <label style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>
          Enter Exam ID
        </label>
        <input
          type="text"
          placeholder="EX123456"
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
            fontSize: "1rem",
            marginBottom: "1rem"
          }}
        />
        <button
          onClick={handleGenerateReport}
          style={{
            padding: "0.6rem 1.2rem",
            background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
            color: "#fff", fontWeight: 600,
            border: "none", borderRadius: "6px",
            fontSize: "1rem", cursor: "pointer"
          }}
        >
          Generate Report
        </button>
      </div>

      {/* Report output */}
      {examDetails && (
        <div style={{
          background: "#fff", padding: "1.5rem", borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          width: "100%", marginBottom: "2rem"
        }}>
          <h3 style={{ marginBottom: "1rem" , fontSize: "1.2rem", fontWeight: 700 }}>Exam Details</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
            <tbody>
              <tr><td><b>Exam ID:</b></td><td>{examDetails.examId}</td></tr>
              <tr><td><b>Title:</b></td><td>{examDetails.title}</td></tr>
              <tr><td><b>Department:</b></td><td>{examDetails.department}</td></tr>
              <tr><td><b>Class ID:</b></td><td>{examDetails.classId}</td></tr>
              <tr><td><b>Subject:</b></td><td>{examDetails.subject}</td></tr>
              <tr><td><b>Subject ID:</b></td><td>{examDetails.subjectId}</td></tr>
              <tr><td><b>Start Date & Time:</b></td><td>{formatDateTime(examDetails.startDateTime)}</td></tr>
              <tr><td><b>End Date & Time:</b></td><td>{formatDateTime(examDetails.endDateTime)}</td></tr>
              <tr><td><b>Scheduled By:</b></td><td>{examDetails.scheduledBy}</td></tr>
              <tr><td><b>Status:</b></td><td>{examDetails.status}</td></tr>
            </tbody>
          </table>

          {results.length > 0 && (
            <button
              onClick={handleExportExcel}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2563eb",
                color: "#fff",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                marginBottom: "1rem"
              }}
            >
              Export to Excel
            </button>
          )}

          <h4 style={{ marginBottom: "1rem" , fontSize: "1.2rem", fontWeight: 700 }}>Scoreboard</h4>
          {results.length === 0 ? (
            <p>No scores available for this exam.</p>
          ) : (
            <table style={{
              width: "100%", borderCollapse: "collapse", marginBottom: "1rem"
            }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{
                    border: "1px solid #ccc", padding: "0.5rem",
                    textAlign: "center", verticalAlign: "middle"
                  }}>Student ID</th>
                  <th style={{
                    border: "1px solid #ccc", padding: "0.5rem",
                    textAlign: "center", verticalAlign: "middle"
                  }}>Name</th>
                  <th style={{
                    border: "1px solid #ccc", padding: "0.5rem",
                    textAlign: "center", verticalAlign: "middle"
                  }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.studentId}>
                    <td style={{
                      border: "1px solid #ccc", padding: "0.5rem",
                      textAlign: "center", verticalAlign: "middle"
                    }}>{r.studentId}</td>
                    <td style={{
                      border: "1px solid #ccc", padding: "0.5rem",
                      textAlign: "center", verticalAlign: "middle"
                    }}>{r.name}</td>
                    <td style={{
                      border: "1px solid #ccc", padding: "0.5rem",
                      textAlign: "center", verticalAlign: "middle"
                    }}>{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
