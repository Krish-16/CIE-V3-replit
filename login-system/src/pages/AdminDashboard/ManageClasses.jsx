// src/pages/admindashboard/ManageClasses.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar"; // adjust path if needed
import styles from './ManageClasses.module.css';
import { adminAPI } from "../../services/api";

export default function ManageClasses() {
  // Custom filter for react-select to search by label and value (code)
  const filterOption = (option, rawInput) => {
    const { label, value } = option;
    const input = rawInput.toLowerCase();
    return label.toLowerCase().includes(input) || value.toLowerCase().includes(input);
  };
  // Backend data
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [departmentId, setDepartmentId] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [customTerms, setCustomTerms] = useState([]);
  const [sem, setSem] = useState(""); // Odd/Even
  const [semester, setSemester] = useState(""); // 1-8
  const [searchQuery, setSearchQuery] = useState("");
  const [editId, setEditId] = useState(null);

  const fetchDepartments = async () => {
    try {
      const data = await adminAPI.getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load departments");
    }
  };

  const mapClassToUI = (doc) => ({
    id: doc._id,
    departmentId: doc.department,
    cid: doc.classId,
    name: doc.className,
    year: doc.termYear,
    sem: doc.oddEven || (typeof doc.semester === 'number' ? (doc.semester % 2 === 0 ? 'Even' : 'Odd') : ''),
    semester: doc.semester,
    status: doc.status || 'Active',
    endedAt: doc.endedAt || null,
  });

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");
      const docs = await adminAPI.getClasses();
      const mapped = Array.isArray(docs) ? docs.map(mapClassToUI) : [];
      setClasses(mapped);
    } catch (e) {
      console.error(e);
      setError("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchClasses();
  }, []);

  // Compute current academic term from Indian Standard Time (IST), AY starts in July
  const istTerm = useMemo(() => {
    // Get year/month in Asia/Kolkata regardless of local timezone
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric' });
    const parts = fmt.formatToParts(new Date());
    const yearPart = parts.find(p => p.type === 'year')?.value;
    const monthPart = parts.find(p => p.type === 'month')?.value; // 1-12
    const y = parseInt(yearPart || String(new Date().getFullYear()), 10);
    const m = parseInt(monthPart || String(new Date().getMonth() + 1), 10); // 1-12
    const startYear = (m >= 7) ? y : (y - 1); // AY starts in July
    const nextYY = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${nextYY}`;
  }, []);

  // On first render, auto-select IST-based term if empty; admin can still override
  useEffect(() => {
    setYear((prev) => prev || istTerm);
  }, [istTerm]);

  const departmentOptions = useMemo(() => 
    (departments ?? []).map(dept => ({
      value: dept.did,
      label: `${dept.did} - ${dept.name}`
    })), [departments]);

  // Term (academic year) options like 2023-24, 2024-25 ... using current year window
  const baseTermOptions = useMemo(() => {
    const istStartYear = parseInt((istTerm || "").slice(0, 4), 10) || new Date().getFullYear();
    const start = istStartYear - 5;
    const end = istStartYear + 5;
    const list = [];
    for (let y = start; y <= end; y++) {
      const nextYY = String((y + 1) % 100).padStart(2, '0');
      const label = `${y}-${nextYY}`;
      list.push({ value: label, label });
    }
    return list.reverse(); // show newest first
  }, [istTerm]);

  const termOptions = useMemo(() => {
    return [...customTerms, ...baseTermOptions];
  }, [customTerms, baseTermOptions]);

  const oddEvenOptions = useMemo(() => ([
    { value: 'Odd', label: 'Odd' },
    { value: 'Even', label: 'Even' },
  ]), []);

  const resetForm = () => {
    setDepartmentId("");
    setName("");
    // Preserve selected term across actions; if empty, default to IST term
    setYear((prev) => prev || istTerm);
    setSem("");
    setSemester("");
    setEditId(null);
  };

  const addOrUpdateClass = async () => {
    if (!(departmentId && name && year && sem && semester)) return;
    const semNum = Number(semester);
    if (sem === 'Odd' && semNum % 2 === 0) {
      const msg = 'Semester parity mismatch: choose 1, 3, 5, or 7 for Odd.';
      setError(msg);
      alert(msg);
      return;
    }
    if (sem === 'Even' && semNum % 2 === 1) {
      const msg = 'Semester parity mismatch: choose 2, 4, 6, or 8 for Even.';
      setError(msg);
      alert(msg);
      return;
    }
    const payload = {
      department: departmentId,
      className: name,
      termYear: String(year),
      oddEven: sem,
      semester: semNum,
    };
    try {
      setError("");
      if (editId) {
        await adminAPI.updateClass(editId, payload);
      } else {
        await adminAPI.createClass(payload);
      }
      resetForm();
      await fetchClasses();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to save class';
      setError(msg);
      alert(msg);
    }
  };

  const deleteCurrentClass = async () => {
    if (!editId) return;
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;
    try {
      setError("");
      await adminAPI.deleteClass(editId);
      resetForm();
      await fetchClasses();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to delete class';
      setError(msg);
      alert(msg);
    }
  };

  const endCurrentClass = async () => {
    if (!editId) return;
    if (!window.confirm('End this class? Students/faculty assignments will remain, but the class will be marked as Ended.')) return;
    try {
      setError("");
      await adminAPI.endClass(editId);
      resetForm();
      await fetchClasses();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to end class';
      setError(msg);
      alert(msg);
    }
  };

  const editClass = (cls) => {
    setDepartmentId(cls.departmentId);
    setName(cls.name);
    setYear(cls.year);
    setSem(cls.sem);
    setSemester(String(cls.semester || ""));
    setEditId(cls.id);
  };

  const getDepartmentName = (depId) => {
    const dept = departments.find((d) => d.did === depId);
    return dept ? dept.name : "";
  };

  const filteredClasses = (classes ?? []).filter((cls) =>
    [
      getDepartmentName(cls.departmentId),
      cls.departmentId,
      cls.cid,
      cls.name,
      String(cls.year),
      cls.sem,
      String(cls.semester),
      cls.status,
    ]
      .map((val) => (val ?? "").toString().toLowerCase())
      .join(" ")
      .includes(searchQuery.toLowerCase())
  );

  const semesterOptions = useMemo(() => {
    const nums = sem === 'Odd' ? [1,3,5,7] : sem === 'Even' ? [2,4,6,8] : [];
    return nums.map(n => ({ value: String(n), label: String(n) }));
  }, [sem]);

  return (
    <div>
      <Breadcrumbs />
      <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.2rem" }}>
        Manage Classes
      </h2>

      {loading && <div style={{ marginBottom: 8, fontSize: 13 }}>Loading…</div>}
      {error && !loading && (
        <div style={{ marginBottom: 8, color: '#b91c1c', fontSize: 13 }}>{error}</div>
      )}

      {/* Form */}
      <div className={styles.formWrapper}>
        <Select
          placeholder="Select Department"
          options={departmentOptions}
          value={departmentOptions.find(o => o.value === departmentId)}
          onChange={option => setDepartmentId(option ? option.value : "")}
          filterOption={filterOption}
          isClearable
          classNamePrefix="react-select" styles={{ control: (base) => ({ ...base, minWidth: '150px', flex: 1 }) }}
        />
        <input
          placeholder="Class Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.inputStyle}
        />
        <CreatableSelect
          placeholder="Select Term"
          options={termOptions}
          value={termOptions.find(o => o.value === year) || null}
          onChange={(opt) => setYear(opt ? opt.value : "")}
          onCreateOption={(inputValue) => {
            const option = { value: inputValue, label: inputValue };
            setCustomTerms((prev) => [option, ...prev.filter(o => o.value !== inputValue)]);
            setYear(inputValue);
          }}
          isClearable
          filterOption={filterOption}
          classNamePrefix="react-select"
          styles={{ control: (base) => ({ ...base, minWidth: '150px', flex: 1 }) }}
        />
        <Select
          placeholder="Select Odd/Even"
          options={oddEvenOptions}
          value={oddEvenOptions.find(o => o.value === sem) || null}
          onChange={(opt) => { setSem(opt ? opt.value : ""); setSemester(""); }}
          isClearable
          classNamePrefix="react-select"
          styles={{ control: (base) => ({ ...base, minWidth: '150px', flex: 1 }) }}
        />
        <Select
          placeholder="Select Semester"
          options={semesterOptions || []}
          value={(semesterOptions || []).find(o => o.value === String(semester)) || null}
          onChange={(opt) => setSemester(opt ? String(opt.value) : "")}
          isClearable
          isDisabled={!sem}
          classNamePrefix="react-select"
          styles={{ control: (base) => ({ ...base, minWidth: '150px', flex: 1 }) }}
        />
        <button onClick={addOrUpdateClass} className={styles.btn}>
          {editId ? "Update Class" : "Add Class"}
        </button>
        {editId && (
          <>
            <button onClick={resetForm} className={`${styles.btn} ${styles.btnCancel}`}>
              Cancel
            </button>
            {(classes.find(c => c.id === editId)?.status !== 'Ended') && (
              <button
                onClick={endCurrentClass}
                className={`${styles.btn} ${styles.btnDanger}`}
                style={{ marginLeft: 8 }}
              >
                End
              </button>
            )}
            <button
              onClick={deleteCurrentClass}
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
        placeholder="Search classes..."
      />

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Sr. No.</th>
            <th className={styles.th}>Department Name</th>
            <th className={styles.th}>Department ID</th>
            <th className={styles.th}>Class ID</th>
            <th className={styles.th}>Class Name</th>
            <th className={styles.th}>Term</th>
            <th className={styles.th}>Semester</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredClasses.map((cls, index) => (
            <tr key={cls.id}>
              <td className={styles.td}>{index + 1}</td>
              <td className={styles.td}>{getDepartmentName(cls.departmentId)}</td>
              <td className={styles.td}>{cls.departmentId}</td>
              <td className={styles.td}>{cls.cid}</td>
              <td className={styles.td}>{cls.name}</td>
              <td className={styles.td}>{cls.year}</td>
              <td className={styles.td}>{cls.sem} ({cls.semester})</td>
              <td className={styles.td}>
                {cls.status === 'Ended' ? `Ended${cls.endedAt ? ` on ${new Date(cls.endedAt).toLocaleDateString()}` : ''}` : 'Active'}
              </td>
              <td className={`${styles.td} ${styles.actionsCell}`}>
                <button
                  className={styles.btn}
                  onClick={() => editClass(cls)}
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


