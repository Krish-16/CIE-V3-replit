// src/pages/admindashboard/ManageFaculties.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar"; // adjust path if needed
import styles from './ManageFaculties.module.css';
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useKeyboardListNav from "../../hooks/useKeyboardListNav";
import EmptyState from "../../components/EmptyState";
import Paginator from "../../components/Paginator";
import VirtualTable from "../../components/VirtualTable";
import { adminAPI } from "../../services/api";

export default function ManageFaculties() {
  // Custom filter for react-select to search by label and value (code)
  const filterOption = (option, rawInput) => {
    const { label, value } = option;
    const input = rawInput.toLowerCase();
    return label.toLowerCase().includes(input) || value.toLowerCase().includes(input);
  };
  // Data from backend
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [departmentId, setDepartmentId] = useState("");
  const [fid, setFid] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [editId, setEditId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const firstRowRef = useRef(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk import/upload state
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, skipped: 0, target: 'faculty' });
  const fileInputRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sseState, setSseState] = useState('connecting');

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

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      setError("");
      const resp = await adminAPI.getFaculty({
        page,
        limit: pageSize,
        q: debouncedQuery || undefined,
      });
      const items = Array.isArray(resp) ? resp : resp?.items;
      const t = Array.isArray(resp) ? resp.length : resp?.total;
      const mapped = Array.isArray(items) ? items.map((it) => ({ id: it._id, ...it })) : [];
      setFaculties(mapped ?? []);
      setTotal(typeof t === 'number' ? t : (mapped?.length ?? 0));
    } catch (e) {
      console.error(e);
      setError("Failed to load faculty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchFaculties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedQuery]);

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
      const blob = await adminAPI.downloadFacultyTemplate();
      downloadBlob(blob, 'faculty_template.xlsx');
    } catch (e) {
      console.error(e);
      alert('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await adminAPI.exportFaculty();
      downloadBlob(blob, 'faculty.xlsx');
    } catch (e) {
      console.error(e);
      alert('Failed to export faculty');
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setIsImporting(true);
    setIsUploading(true);
    setUploadPct(0);
    setCurrentFileName(file.name || 'selected.xlsx');
    setProgress({ processed: 0, total: 0, skipped: 0, target: 'faculty' });
    try {
      await adminAPI.bulkImportFaculty(file, (evt) => {
        if (!evt || !evt.total) return;
        const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        setUploadPct(pct);
      });
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
      setProgress({ processed: 0, total: 0, skipped: 0, target: 'faculty' });
      setIsUploading(false);
      setIsImporting(false);
    }
    e.target.value = '';
  };

  const onDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setCurrentFileName(file.name || 'selected.xlsx');
      setUploadPct(0);
      setProgress({ processed: 0, total: 0, skipped: 0, target: 'faculty' });
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

  const resetForm = () => {
    setDepartmentId("");
    setFid("");
    setName("");
    setPassword("");
    setEditId(null);
    setFormErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!departmentId) errs.departmentId = "Department is required";
    if (!fid) errs.fid = "Faculty ID is required";
    if (!name) errs.name = "Name is required";
    if (!editId && !password) errs.password = "Password is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addOrUpdateFaculty = async () => {
    if (!validate()) return;
    try {
      setError("");
      if (editId) {
        const payload = { facultyId: fid, name, department: departmentId };
        if (password) payload.password = password;
        await adminAPI.updateFaculty(editId, payload);
      } else {
        await adminAPI.createFaculty({ facultyId: fid, name, department: departmentId, password });
      }
      resetForm();
      await fetchFaculties();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || "Failed to save faculty";
      setError(msg);
      alert(msg);
    }
  };

  const deleteCurrentFaculty = async () => {
    if (!editId) return;
    if (!window.confirm('Are you sure you want to delete this faculty? This action cannot be undone.')) return;
    try {
      setError("");
      await adminAPI.deleteFaculty(editId);
      resetForm();
      await fetchFaculties();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Failed to delete faculty';
      setError(msg);
      alert(msg);
    }
  };

  const editFaculty = (faculty) => {
    setDepartmentId(faculty.department);
    setFid(faculty.facultyId);
    setName(faculty.name);
    setPassword(""); // Clear password on edit
    setEditId(faculty.id);
  };

  const getDepartmentName = (depId) => {
    const dept = departments.find((d) => d.did === depId);
    return dept ? dept.name : "";
  };

  useEffect(() => { setPage(1); }, [debouncedQuery]);
  const startIndex = (page - 1) * pageSize;
  const pageItems = faculties ?? [];

  const onKeyDown = useKeyboardListNav({
    onEnter: () => addOrUpdateFaculty(),
    onEscape: () => resetForm(),
  });

  // SSE subscription for live progress
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

      if (type === 'BULK_IMPORT_PROGRESS' && target === 'faculty') {
        setProgress((prev) => ({
          ...prev,
          target: 'faculty',
          processed: Number.isFinite(+data.processed) ? +data.processed : prev.processed,
          total: Number.isFinite(+data.total) ? +data.total : prev.total,
          skipped: Number.isFinite(+data.skipped) ? +data.skipped : prev.skipped,
        }));
      } else if (type === 'BULK_IMPORT_COMPLETED' && target === 'faculty') {
        setProgress((prev) => ({
          ...prev,
          target: 'faculty',
          processed: Number.isFinite(+data.processed) ? +data.processed : prev.processed,
          total: Number.isFinite(+data.total) ? +data.total : prev.total,
          skipped: Number.isFinite(+data.skipped) ? +data.skipped : prev.skipped,
        }));
        fetchFaculties();
      } // else ignore unknown events
    };
    return () => es.close();
  }, []);

  return (
    <div>
      <Breadcrumbs />
      <h2
        style={{
          fontSize: "1.8rem",
          fontWeight: 700,
          marginBottom: "1.2rem",
        }}
      >
        Manage Faculties
      </h2>

      {loading && <div style={{ marginBottom: 8, fontSize: 13 }}>Loading…</div>}
      {error && !loading && (
        <div style={{ marginBottom: 8, color: "#b91c1c", fontSize: 13 }}>{error}</div>
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
              <h3 style={{ margin: 0 }}>Import Faculty (.xlsx)</h3>
              <button onClick={() => !isImporting && setShowImportModal(false)} className={styles.btn} style={{ padding: '6px 10px' }}>Close</button>
            </div>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#555' }}>
              Use the provided template to ensure correct columns.
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
          onChange={option => setDepartmentId(option ? option.value : "")}
          filterOption={filterOption}
          isClearable
          classNamePrefix="react-select" styles={{ control: (base) => ({ ...base, minWidth: '150px', flex: 1 }) }}
        />
        {formErrors.departmentId && <span className={styles.errorText}>{formErrors.departmentId}</span>}

        <input
          placeholder="Faculty ID"
          value={fid}
          onChange={(e) => setFid(e.target.value)}
          className={styles.inputStyle}
        />
        {formErrors.fid && <span className={styles.errorText}>{formErrors.fid}</span>}
        <input
          placeholder="Faculty Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.inputStyle}
        />
        {formErrors.name && <span className={styles.errorText}>{formErrors.name}</span>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.inputStyle}
        />
        {formErrors.password && <span className={styles.errorText}>{formErrors.password}</span>}
        <button onClick={addOrUpdateFaculty} className={styles.btn}>
          {editId ? "Update Faculty" : "Add Faculty"}
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
              onClick={deleteCurrentFaculty}
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
        placeholder="Search faculties..."
      />

      {/* Table with empty state and pagination */}
      {total === 0 ? (
        <EmptyState title="No faculties found" description="Try changing your search or add a new faculty." />
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.table}>
            <div className={styles.thead}>
              <div className={styles.th}>Sr. No.</div>
              <div className={styles.th}>Department Name</div>
              <div className={styles.th}>Department ID</div>
              <div className={styles.th}>Faculty ID</div>
              <div className={styles.th}>Faculty Name</div>
              <div className={styles.th}>Actions</div>
            </div>
            <VirtualTable
              height={Math.min(400, pageItems.length * 55)} // 55 is the rowHeight
              items={pageItems}
              renderRow={(f, index) => (
                <div key={f.id} className={styles.tr} tabIndex={0} ref={index === 0 ? firstRowRef : null}>
                  <div className={styles.td}>{startIndex + index + 1}</div>
                  <div className={styles.td}>{getDepartmentName(f.department)}</div>
                  <div className={styles.td}>{f.department}</div>
                  <div className={styles.td}>{f.facultyId}</div>
                  <div className={styles.td}>{f.name}</div>
                  <div className={`${styles.td} ${styles.actionsCell}`}>
                    <button
                      className={styles.btn}
                      onClick={() => editFaculty(f)}
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


