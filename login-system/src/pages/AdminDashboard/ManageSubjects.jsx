// src/pages/admindashboard/ManageSubjects.jsx
import React, { useEffect, useState } from "react";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar";
import styles from './ManageSubjects.module.css'; // adjust path if needed
import { adminAPI } from "../../services/api";

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editId, setEditId] = useState(null);

  // New state for dropdowns
  const [departments, setDepartments] = useState([]); // [{ id, did, name }]
  const [selectedDepartment, setSelectedDepartment] = useState(""); // DID string
  const [classes, setClasses] = useState([]); // [{ classId, className, department, status }]

  const resetForm = () => {
    setClassId("");
    setName("");
    setEditId(null);
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError("");
      const docs = await adminAPI.getSubjects();
      const mapped = Array.isArray(docs)
        ? docs.map((d) => ({ id: d._id, name: d.name, classId: d.classId }))
        : [];
      setSubjects(mapped);
    } catch (e) {
      console.error(e);
      setError("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  // Load departments and classes (active) for dropdowns
  const fetchDepartments = async () => {
    try {
      const deps = await adminAPI.getDepartments();
      setDepartments(Array.isArray(deps) ? deps : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClasses = async (depDid = "") => {
    try {
      const params = depDid ? { department: depDid, status: "Active" } : { status: "Active" };
      const cls = await adminAPI.getClasses(params);
      setClasses(Array.isArray(cls) ? cls : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
    fetchClasses(); // all active by default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Refetch classes when department filter changes
    fetchClasses(selectedDepartment);
  }, [selectedDepartment]);

  const addOrUpdateSubject = async () => {
    if (!(name && classId)) return;
    try {
      setError("");
      if (editId) {
        await adminAPI.updateSubject(editId, { name, classId });
      } else {
        await adminAPI.createSubject({ name, classId });
      }
      resetForm();
      await fetchSubjects();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to save subject';
      setError(msg);
      alert(msg);
    }
  };

  const editSubject = (subject) => {
    setClassId(subject.classId);
    setName(subject.name);
    setEditId(subject.id);
  };

  const deleteCurrentSubject = async () => {
    if (!editId) return;
    if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) return;
    try {
      setError("");
      await adminAPI.deleteSubject(editId);
      resetForm();
      await fetchSubjects();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to delete subject';
      setError(msg);
      alert(msg);
    }
  };

  // Safe filter logic
  const filteredSubjects = subjects.filter((sub) =>
    [sub.name, sub.classId]
      .map((val) => (val ?? "").toString().toLowerCase())
      .join(" ")
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <Breadcrumbs />
      <h2 className={styles.title}>
        Manage Subjects
      </h2>

      {/* Form */}
      <div className={styles.formWrapper}>
        {/* Optional department filter for classes */}
        <select
          value={selectedDepartment}
          onChange={(e) => {
            setSelectedDepartment(e.target.value);
            setClassId("");
          }}
          className={styles.inputStyle}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d.did}>
              {d.name} ({d.did})
            </option>
          ))}
        </select>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className={styles.inputStyle}
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.className} ({c.classId})
            </option>
          ))}
        </select>
        <input
          placeholder="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.inputStyle}
        />
        <button onClick={addOrUpdateSubject} className={styles.btn}>
          {editId ? "Update Subject" : "Add Subject"}
        </button>
        {editId && (
          <>
            <button
              onClick={resetForm}
              className={`${styles.btn} ${styles.btnCancel}`}
            >
              Cancel
            </button>
            <button
              onClick={deleteCurrentSubject}
              className={`${styles.btn} ${styles.btnDanger}`}
              style={{ marginLeft: 8 }}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search subjects..."
      />

      {/* Table */}
      {loading && <div style={{ marginBottom: 8, fontSize: 13 }}>Loading…</div>}
      {error && !loading && (
        <div style={{ marginBottom: 8, color: '#b91c1c', fontSize: 13 }}>{error}</div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Sr. No.</th>
            <th className={styles.th}>Subject Name</th>
            <th className={styles.th}>Class ID</th>
            <th className={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubjects.map((sub, index) => (
            <tr key={sub.id}>
              <td className={styles.td}>{index + 1}</td>
              <td className={styles.td}>{sub.name}</td>
              <td className={styles.td}>{sub.classId}</td>
              <td className={`${styles.td} ${styles.actionsCell}`}>
                <button
                  className={styles.btn}
                  onClick={() => editSubject(sub)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
