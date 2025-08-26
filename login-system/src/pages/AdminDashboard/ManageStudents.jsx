// src/pages/admindashboard/ManageStudents.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar"; // adjust the path if needed
import styles from './ManageStudents.module.css';
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useKeyboardListNav from "../../hooks/useKeyboardListNav";
import EmptyState from "../../components/EmptyState";
import Paginator from "../../components/Paginator";
import VirtualTable from "../../components/VirtualTable";
import { adminAPI } from "../../services/api";

export default function ManageStudents() {
  // Custom filter for react-select to search by label and value (code)
  const filterOption = (option, rawInput) => {
    const { label, value } = option;
    const input = rawInput.toLowerCase();
    return label.toLowerCase().includes(input) || value.toLowerCase().includes(input);
  };
  // Backend data
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [departmentId, setDepartmentId] = useState("");
  const [sid, setSid] = useState("");
  const [name, setName] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [password, setPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [editId, setEditId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const tableRef = useRef(null);
  const firstRowRef = useRef(null);

  // Pagination (server-driven)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch helpers
  const fetchDepartments = async () => {
    try {
      const data = await adminAPI.getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load departments");
    }
  };

  // Helpers to derive current year from admission year and createdAt
  const extractAdmissionStartYear = (adm) => {
    if (!adm) return null;
    const m = String(adm).match(/(\d{4})/);
    const y = m ? parseInt(m[1], 10) : NaN;
    return Number.isFinite(y) ? y : null;
  };

  const computeCurrentYear = (admYear, createdAt) => {
    const startY = extractAdmissionStartYear(admYear);
    if (!startY) return "";
    const created = createdAt ? new Date(createdAt) : new Date();
    const y = created.getFullYear();
    const rel = Math.max(1, y - startY + 1);
    return String(rel);
  };

  const enrichStudents = (items) => {
    // Map backend student docs to UI shape expected by table/form
    return (items ?? []).map((s) => {
      const cy = typeof s.currentYear === 'number' ? s.currentYear : computeCurrentYear(s.admissionYear, s.createdAt);
      return {
        id: s._id,
        sid: s.studentId,
        name: s.name || "",
        departmentId: s.department || "",
        currentYear: cy || "",
        admissionYear: s.admissionYear || "",
        rollNumber: s.rollNumber || "",
        createdAt: s.createdAt || null,
      };
    });
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await adminAPI.getStudents({ page, limit: pageSize, q: debouncedQuery || undefined });
      const items = resp?.items ?? (Array.isArray(resp) ? resp : []);
      const t = typeof resp?.total === 'number' ? resp.total : items.length;
      setStudents(enrichStudents(items));
      setTotal(t);
    } catch (e) {
      console.error(e);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load departments and classes first, then students
    (async () => {
      await fetchDepartments();
      await fetchStudents();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill Admission Year in create mode
  useEffect(() => {
    if (!editId && !admissionYear) {
      const now = new Date();
      setAdmissionYear(String(now.getFullYear()));
    }
    // only run when editId/admissionYear change
  }, [editId, admissionYear]);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // re-run when pagination/search changes
  }, [page, pageSize, debouncedQuery]);

  // Bulk import/upload state
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, skipped: 0, target: 'students' });
  const fileInputRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sseState, setSseState] = useState('connecting');

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await adminAPI.downloadStudentsTemplate();
      downloadBlob(blob, 'students_template.xlsx');
    } catch (e) {
      console.error(e);
      alert('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await adminAPI.exportStudents();
      downloadBlob(blob, 'students.xlsx');
    } catch (e) {
      console.error(e);
      alert('Failed to export students');
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setIsImporting(true);
    setIsUploading(true);
    setUploadPct(0);
    setCurrentFileName(file.name || 'selected.xlsx');
    setProgress({ processed: 0, total: 0, skipped: 0, target: 'students' });
    try {
      await adminAPI.bulkImportStudents(file, (evt) => {
        if (!evt || !evt.total) return;
        const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        setUploadPct(pct);
      });
      // Completion will also be reflected by SSE event
    } catch (e) {
      console.error(e);
      alert('Import failed');
    } finally {
      setIsUploading(false);
      setIsImporting(false);
      setSelectedFile(null);
      setCurrentFileName('');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setCurrentFileName(file.name || 'selected.xlsx');
      setUploadPct(0);
      setProgress({ processed: 0, total: 0, skipped: 0, target: 'students' });
      setIsUploading(false);
      setIsImporting(false);
    }
    // reset input to allow same file re-selection
    e.target.value = '';
  };

  const onDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setCurrentFileName(file.name || 'selected.xlsx');
      setUploadPct(0);
      setProgress({ processed: 0, total: 0, skipped: 0, target: 'students' });
      setIsUploading(false);
      setIsImporting(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  // no-op placeholder (reserved for future modal keyboard handlers)

  const departmentOptions = useMemo(() => 
    (departments ?? []).map(dept => ({
      value: dept.did,
      label: `${dept.did} - ${dept.name}`
    })), [departments]);

  // Default admission year helper (prefill on create)
  const getDefaultAdmissionYear = () => {
    const now = new Date();
    return String(now.getFullYear());
  };

  const resetForm = () => {
    setDepartmentId("");
    setSid("");
    setName("");
    setAdmissionYear(getDefaultAdmissionYear());
    setRollNumber("");
    setCurrentYear("");
    setPassword("");
    setEditId(null);
    setFormErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!departmentId) errs.departmentId = "Department is required";
    if (!name) errs.name = "Name is required";
    if (!editId && !sid) errs.sid = "Student ID is required";
    if (!editId && !password) errs.password = "Password is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addOrUpdateStudent = async () => {
    if (!validate()) return;
    try {
      setError("");
      if (editId) {
        const payload = {
          department: departmentId || undefined,
        };
        if (name) payload.name = name;
        if (admissionYear) payload.admissionYear = admissionYear;
        if (sid) payload.studentId = sid;
        if (currentYear) payload.currentYear = Number(currentYear);
        if (password) payload.password = password;
        await adminAPI.updateStudent(editId, payload);
      } else {
        const payload = {
          studentId: sid,
          name,
          department: departmentId || undefined,
          admissionYear: admissionYear || undefined,
          password,
        };
        await adminAPI.createStudent(payload);
      }
      resetForm();
      await fetchStudents();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to save student';
      setError(msg);
      alert(msg);
    }
  };

  const deleteCurrentStudent = async () => {
    if (!editId) return;
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;
    try {
      setError("");
      await adminAPI.deleteStudent(editId);
      resetForm();
      await fetchStudents();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to delete student';
      setError(msg);
      alert(msg);
    }
  };

  const editStudent = (student) => {
    setDepartmentId(student.departmentId || "");
    setSid(student.sid || "");
    setName(student.name || "");
    setAdmissionYear(student.admissionYear || "");
    setRollNumber(student.rollNumber || "");
    setCurrentYear(student.currentYear ? String(student.currentYear) : computeCurrentYear(student.admissionYear, student.createdAt));
    setPassword(""); // Clear password on edit
    setEditId(student.id);
  };

  // Resolve department name from departmentId
  const getDepartmentName = (depId) => {
    return (departments ?? []).find((d) => d.did === depId)?.name || "";
  };

  // Safe filter, includes department name too
  const filteredStudents = (students ?? []).filter((s) =>
    [s.departmentId, s.currentYear, s.sid, s.name, getDepartmentName(s.departmentId)]
      .map((val) => (val ?? "").toString().toLowerCase())
      .join(" ")
      .includes(debouncedQuery.toLowerCase())
  );

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

   // Subscribe to SSE for live import progress
   useEffect(() => {
     const es = adminAPI.subscribeToEvents();
     es.onopen = () => setSseState('open');
     es.onerror = () => setSseState('reconnecting');
     es.onmessage = (evt) => {
       setSseState('open');
       let data = null;
       try { data = evt?.data ? JSON.parse(evt.data) : null; } catch (_) { data = null; }
       const isObj = data && typeof data === 'object';
       const type = isObj ? data.type : undefined;
       const target = isObj ? data.target : undefined;

       if (type === 'BULK_IMPORT_PROGRESS' && target === 'students') {
         setProgress((prev) => ({
           ...prev,
           target: 'students',
           processed: Number.isFinite(+data.processed) ? +data.processed : prev.processed,
           total: Number.isFinite(+data.total) ? +data.total : prev.total,
           skipped: Number.isFinite(+data.skipped) ? +data.skipped : prev.skipped,
         }));
       } else if (type === 'BULK_IMPORT_COMPLETED' && target === 'students') {
         setProgress((prev) => ({
           ...prev,
           target: 'students',
           processed: Number.isFinite(+data.processed) ? +data.processed : prev.processed,
           total: Number.isFinite(+data.total) ? +data.total : prev.total,
           skipped: Number.isFinite(+data.skipped) ? +data.skipped : prev.skipped,
         }));
         fetchStudents();
       } // else ignore unknown events
     };
     return () => es.close();
   }, []);

  const totalFiltered = filteredStudents.length; // Optional local filter count
  const startIndex = (page - 1) * pageSize;
  const pageItems = filteredStudents; // server-paginated list already sized

  const onKeyDown = useKeyboardListNav({
    onEnter: () => addOrUpdateStudent(),
    onEscape: () => resetForm(),
    onArrow: (e) => {
      if (e.key === 'ArrowDown' && firstRowRef.current) {
        firstRowRef.current.focus();
      }
    }
  });

  return (
    <div>
      <Breadcrumbs />
      <h2
        style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.2rem" }}
      >
        Manage Students
      </h2>

      {loading && <div style={{ marginBottom: 8, fontSize: 13 }}>Loading…</div>}
      {error && !loading && (
        <div style={{ marginBottom: 8, color: '#b91c1c', fontSize: 13 }}>{error}</div>
      )}

      {/* Primary actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button className={styles.btn} onClick={() => setShowImportModal(true)} disabled={isImporting}>
          {isImporting ? 'Importing…' : 'Import'}
        </button>
        <button className={styles.btn} onClick={handleExport}>Export (.xlsx)</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
          <span
            aria-label="SSE status"
            title={sseState === 'open' ? 'Connected' : sseState === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
            style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: sseState === 'open' ? '#10b981' : (sseState === 'reconnecting' ? '#f59e0b' : '#9ca3af') }}
          />
          <span>{sseState === 'open' ? 'Live' : (sseState === 'reconnecting' ? 'Reconnecting…' : 'Connecting…')}</span>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => !isImporting && setShowImportModal(false)}
        >
          <div
            style={{ width: 'min(560px, 92vw)', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 10px 28px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Import Students (.xlsx)</h3>
              <button onClick={() => !isImporting && setShowImportModal(false)} className={styles.btn} style={{ padding: '6px 10px' }}>Close</button>
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#555' }}>
              Use the provided template to ensure correct columns.
              <div style={{ marginTop: 4 }}>
                <div><strong>Expected columns (order):</strong></div>
                <ol style={{ paddingLeft: 18, marginTop: 4 }}>
                  <li>Student ID</li>
                  <li>Name</li>
                  <li>Department ID</li>
                  <li>Admission Year</li>
                  <li>Roll Number <em>(optional; defaults to Student ID if blank)</em></li>
                  <li>Password</li>
                </ol>
                <div style={{ marginTop: 4 }}>
                  Department can be ID or Name (ID preferred). Semester is not required.
                </div>
                <div style={{ marginTop: 4, color: '#111' }}>
                  <strong>Note:</strong> Student ID is the primary identifier. If Roll Number is omitted in the file,
                  it will be set to the same value as Student ID.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={styles.btn} onClick={handleDownloadTemplate}>Download Template</button>
              <button className={styles.btn} onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={isImporting}>Choose File</button>
              <input type="file" ref={fileInputRef} accept=".xlsx" style={{ display: 'none' }} onChange={handleFileSelect} />
              <button className={styles.btn} onClick={() => uploadFile(selectedFile)} disabled={!selectedFile || isUploading || isImporting}>Upload</button>
            </div>
            {currentFileName && (
              <div style={{ fontSize: 12, color: '#333', marginBottom: 8 }}>File: <strong>{currentFileName}</strong></div>
            )}
            <div
              onDragOver={(e)=>{e.preventDefault(); setIsDragging(true);}}
              onDragLeave={()=>setIsDragging(false)}
              onDrop={(e)=>{ setIsDragging(false); onDrop(e); }}
              style={{
                border: `2px dashed ${isDragging ? '#4caf50' : '#bbb'}`,
                borderRadius: 10,
                padding: 20,
                textAlign: 'center',
                background: isDragging ? 'rgba(76,175,80,0.06)' : '#fafafa',
                transition: 'border-color 120ms ease, background 120ms ease',
                marginBottom: 8,
              }}
            >
              Drag & drop .xlsx here or click "Choose File"
            </div>

            {isUploading && (
              <div style={{ marginTop: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 12 }}>Uploading… {uploadPct}%</div>
                <div style={{ height: 6, background: '#eee', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${uploadPct}%`, height: '100%', background: '#3b82f6', transition: 'width 120ms ease' }} />
                </div>
              </div>
            )}

            {!isUploading && (isImporting || progress.processed > 0) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12 }}>Processing rows… {progress.total ? Math.round((progress.processed / Math.max(progress.total, 1)) * 100) : 0}%</div>
                <div style={{ height: 6, background: '#eee', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${progress.total ? Math.min(100, Math.round((progress.processed / Math.max(progress.total, 1)) * 100)) : 0}%`, height: '100%', background: '#10b981', transition: 'width 120ms ease' }} />
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#555' }}>
                  Processed {progress.processed}/{progress.total} • Skipped {progress.skipped}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <div className={styles.formWrapper} onKeyDown={onKeyDown}>
        <Select
          placeholder="Select Department"
          options={departmentOptions}
          value={departmentOptions.find(o => o.value === departmentId)}
          onChange={option => { setDepartmentId(option ? option.value : ""); }}
          filterOption={filterOption}
          isClearable
          classNamePrefix="react-select"
          styles={{ control: (base) => ({ ...base, minWidth: '150px', flex: 1 }) }}
        />
        {formErrors.departmentId && <span className={styles.errorText}>{formErrors.departmentId}</span>}

        <input
          placeholder="Student ID"
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          className={styles.inputStyle}
        />
        {formErrors.sid && <span className={styles.errorText}>{formErrors.sid}</span>}

        <input
          placeholder="Student Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.inputStyle}
        />
        {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}

        <input
          placeholder="Admission Year (e.g., 2023)"
          value={admissionYear}
          onChange={(e) => setAdmissionYear(e.target.value)}
          className={styles.inputStyle}
        />

        {/* Roll Number removed: Student ID is the single identifier now */}

        {editId && (
          <input
            placeholder="Current Year (e.g., 1, 2, 3, 4)"
            value={currentYear}
            onChange={(e) => setCurrentYear(e.target.value)}
            className={styles.inputStyle}
          />
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.inputStyle}
        />
        {formErrors.password && <span className={styles.errorText}>{formErrors.password}</span>}

        <button onClick={addOrUpdateStudent} className={styles.btn}>
          {editId ? "Update Student" : "Save"}
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
              onClick={deleteCurrentStudent}
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
        placeholder="Search students..."
      />

      {/* Table with empty state and pagination */}
      {total === 0 ? (
        <EmptyState title="No students found" description="Try changing your search or import students." />
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.table}>
            <div className={styles.thead}>
              <div className={styles.th}>Sr. No.</div>
              <div className={styles.th}>Name</div>
              <div className={styles.th}>Student ID</div>
              <div className={styles.th}>Department Name</div>
              <div className={styles.th}>Department ID</div>
              <div className={styles.th}>Current Year</div>
              <div className={styles.th}>Actions</div>
            </div>
            <VirtualTable
              height={Math.min(400, pageItems.length * 55)}
              items={pageItems}
              renderRow={(s, index) => (
                <div key={s.id} className={styles.tr} tabIndex={0} ref={index === 0 ? firstRowRef : null}>
                  <div className={styles.td}>{startIndex + index + 1}</div>
                  <div className={styles.td}>{s.name}</div>
                  <div className={styles.td}>{s.sid}</div>
                  <div className={styles.td}>{getDepartmentName(s.departmentId)}</div>
                  <div className={styles.td}>{s.departmentId}</div>
                  <div className={styles.td}>{s.currentYear}</div>
                  <div className={`${styles.td} ${styles.actionsCell}`}>
                    <button
                      className={styles.btn}
                      onClick={() => editStudent(s)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
          <Paginator
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
