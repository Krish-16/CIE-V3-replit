// src/pages/admindashboard/ManageDepartments.jsx
import React, { useEffect, useState } from "react";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar";
import styles from './ManageDepartments.module.css'; // adjust the path if needed
import { adminAPI } from "../../services/api";

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [did, setDid] = useState("");
  const [name, setName] = useState("");
  const [hod, setHod] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editId, setEditId] = useState(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminAPI.getDepartments();
      // backend already maps { id: _id, did, name, hod }
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const resetForm = () => {
    setDid("");
    setName("");
    setHod("");
    setEditId(null);
  };

  const addOrUpdateDepartment = async () => {
    if (!did || !name || !hod) return;
    try {
      setError("");
      if (editId) {
        await adminAPI.updateDepartment(editId, { did, name, hod });
      } else {
        await adminAPI.createDepartment({ did, name, hod });
      }
      resetForm();
      await fetchDepartments();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Failed to save department";
      setError(msg);
      alert(msg);
    }
  };

  const deleteCurrentDepartment = async () => {
    if (!editId) return;
    if (!window.confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;
    try {
      setError("");
      await adminAPI.deleteDepartment(editId);
      resetForm();
      await fetchDepartments();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to delete department';
      setError(msg);
      alert(msg);
    }
  };

  const editDepartment = (dept) => {
    setDid(dept.did);
    setName(dept.name);
    setHod(dept.hod);
    setEditId(dept.id);
  };

  // Filter departments safely
  const filteredDepartments = departments.filter((dept) =>
    [dept.did, dept.name, dept.hod]
      .map((val) => (val ?? "").toString().toLowerCase())
      .join(" ")
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <Breadcrumbs />
      <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.2rem" }}>
        Manage Departments
      </h2>

      {loading && <div style={{ marginBottom: 8, fontSize: 13 }}>Loading…</div>}
      {error && !loading && (
        <div style={{ marginBottom: 8, color: "#b91c1c", fontSize: 13 }}>{error}</div>
      )}

      {/* Form */}
      <div className={styles.formWrapper}>
        <input
          placeholder="Department ID"
          value={did}
          onChange={(e) => setDid(e.target.value)}
          className={styles.inputStyle}
        />
        <input
          placeholder="Department Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.inputStyle}
        />
        <input
          placeholder="HOD"
          value={hod}
          onChange={(e) => setHod(e.target.value)}
          className={styles.inputStyle}
        />
        <button onClick={addOrUpdateDepartment} className={styles.btn}>
          {editId ? "Update Department" : "Add Department"}
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
              onClick={deleteCurrentDepartment}
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
        placeholder="Search departments..."
      />

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr className={styles.tr}>
            <th className={styles.th}>Sr. No.</th>
            <th className={styles.th}>Dept. ID</th>
            <th className={styles.th}>Department Name</th>
            <th className={styles.th}>HOD</th>
            <th className={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDepartments.map((d, index) => (
            <tr key={d.id} className={styles.tr}>
              <td className={styles.td}>{index + 1}</td>
              <td className={styles.td}>{d.did}</td>
              <td className={styles.td}>{d.name}</td>
              <td className={styles.td}>{d.hod}</td>
              <td className={`${styles.td} ${styles.actionsCell}`}>
                <button
                  className={styles.btn}
                  onClick={() => editDepartment(d)}
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
