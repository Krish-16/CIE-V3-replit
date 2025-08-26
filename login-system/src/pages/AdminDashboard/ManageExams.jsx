import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import styles from "./ManageExams.module.css";
import Breadcrumbs from "./Breadcrumbs";
import SearchBar from "./SearchBar";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useKeyboardListNav from "../../hooks/useKeyboardListNav";
import EmptyState from "../../components/EmptyState";
import Paginator from "../../components/Paginator";
import VirtualTable from "../../components/VirtualTable";
import { adminAPI } from "../../services/api";

const ManageExams = () => {
  // Backend-driven data
  const [departments, setDepartments] = useState([]); // [{ id, did, name }]
  const [classes, setClasses] = useState([]); // [{ classId, className, department, status }]
  const [subjects, setSubjects] = useState([]); // [{ _id, name, classId }]

  // Keep local exams for now until backend exam endpoints exist
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  // State for form inputs
  const [editId, setEditId] = useState(null);
  const [departmentId, setDepartmentId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  // Inline validation errors
  const [formErrors, setFormErrors] = useState({});

  // Keyboard nav + table focus
  const firstRowRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Derived options for Select components
  const departmentOptions = useMemo(
    () => departments.map(d => ({ value: d.did, label: d.name })),
    [departments]
  );
  const classOptions = useMemo(
    () => classes
      .filter(c => (departmentId ? c.department === departmentId : true))
      .map(c => ({ value: c.classId, label: c.className })),
    [classes, departmentId]
  );
  const subjectOptions = useMemo(
    () => subjects.map(s => ({ value: s._id, label: s.name })),
    [subjects]
  );

  // Helper functions
  const getDepartmentName = (did) => departments.find(d => d.did === did)?.name || 'N/A';
  const getClassName = (cid) => classes.find(c => c.classId === cid)?.className || 'N/A';
  const getSubjectName = (sid) => subjects.find(s => s._id === sid)?.name || 'N/A';
  const formatDateTime = (dateTime) => new Date(dateTime).toLocaleString();

  // Data fetchers
  const loadDepartments = async () => {
    try {
      const deps = await adminAPI.getDepartments();
      setDepartments(Array.isArray(deps) ? deps : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadClasses = async (depDid = "") => {
    try {
      const params = depDid ? { department: depDid, status: "Active" } : { status: "Active" };
      const cls = await adminAPI.getClasses(params);
      setClasses(Array.isArray(cls) ? cls : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubjects = async (cid = "") => {
    if (!cid) { setSubjects([]); return; }
    try {
      const subs = await adminAPI.getSubjects({ classId: cid });
      setSubjects(Array.isArray(subs) ? subs : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Form actions
  const resetForm = () => {
    setEditId(null);
    setDepartmentId("");
    setClassId("");
    setSubjectId("");
    setTitle("");
    setStartDateTime("");
    setEndDateTime("");
    setFormErrors({});
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([loadDepartments(), loadClasses()])
      .finally(() => setLoading(false));
  }, []);

  // When department changes, reload classes and reset class/subject
  useEffect(() => {
    loadClasses(departmentId);
  }, [departmentId]);

  // When class changes, load subjects
  useEffect(() => {
    loadSubjects(classId);
  }, [classId]);

  const validate = () => {
    const errs = {};
    if (!departmentId) errs.departmentId = "Department is required";
    if (!classId) errs.classId = "Class is required";
    if (!subjectId) errs.subjectId = "Subject is required";
    if (!title) errs.title = "Title is required";
    if (!startDateTime) errs.startDateTime = "Start date/time is required";
    if (!endDateTime) errs.endDateTime = "End date/time is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addOrUpdateExam = () => {
    if (validate()) {
      if (editId) {
        setExams(exams.map(exam => exam.id === editId ? { ...exam, departmentId, classId, subjectId, title, startDateTime, endDateTime } : exam));
      } else {
        const newExam = { id: Date.now(), examId: `EXM${String(exams.length + 1).padStart(3, '0')}`, departmentId, classId, subjectId, title, startDateTime, endDateTime, scheduledBy: "Admin", status: "Not Started" };
        setExams([...exams, newExam]);
      }
      resetForm();
    }
  };

  const editExam = (exam) => {
    setEditId(exam.id);
    setDepartmentId(exam.departmentId);
    setClassId(exam.classId);
    setSubjectId(exam.subjectId);
    setTitle(exam.title);
    setStartDateTime(exam.startDateTime);
    setEndDateTime(exam.endDateTime);
  };

  const startExam = (id) => setExams(exams.map(exam => exam.id === id ? { ...exam, status: "Ongoing" } : exam));
  const endExam = (id) => setExams(exams.map(exam => exam.id === id ? { ...exam, status: "Completed" } : exam));

  const filteredExams = useMemo(() =>
    exams.filter(exam => {
      const q = debouncedQuery.toLowerCase();
      return (
        exam.title.toLowerCase().includes(q) ||
        getDepartmentName(exam.departmentId).toLowerCase().includes(q) ||
        getClassName(exam.classId).toLowerCase().includes(q) ||
        getSubjectName(exam.subjectId).toLowerCase().includes(q)
      );
    }), [exams, debouncedQuery, departments, classes, subjects]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const total = filteredExams.length;
  const startIndex = (page - 1) * pageSize;
  const pageItems = filteredExams.slice(startIndex, startIndex + pageSize);

  const onKeyDown = useKeyboardListNav({
    onEnter: () => addOrUpdateExam(),
    onEscape: () => resetForm(),
  });

  const filterOption = (option, inputValue) => {
    return option.label.toLowerCase().includes(inputValue.toLowerCase());
  };

  return (
    <div>
      <Breadcrumbs />
      <h2 className={styles.title}>Manage Exams</h2>

      <div className={styles.formWrapper} onKeyDown={onKeyDown}>
        <div className={styles.rowWrapper}>
          <Select
            placeholder="Select Department"
            options={departmentOptions}
            value={departmentOptions.find(option => option.value === departmentId)}
            onChange={option => {
              setDepartmentId(option ? option.value : "");
              setClassId("");
              setSubjectId("");
            }}
            filterOption={filterOption}
            isClearable
            classNamePrefix="react-select"
          />
          {formErrors.departmentId && <span className={styles.errorText}>{formErrors.departmentId}</span>}
          <Select
            placeholder="Select Class"
            options={classOptions}
            value={classOptions.find(option => option.value === classId)}
            onChange={option => {
              const next = option ? option.value : "";
              setClassId(next);
              setSubjectId("");
            }}
            isDisabled={!departmentId}
            filterOption={filterOption}
            isClearable
            classNamePrefix="react-select"
          />
          {formErrors.classId && <span className={styles.errorText}>{formErrors.classId}</span>}
          <Select
            placeholder="Select Subject"
            options={subjectOptions}
            value={subjectOptions.find(option => option.value === subjectId)}
            onChange={option => setSubjectId(option ? option.value : "")}
            isDisabled={!classId}
            filterOption={filterOption}
            isClearable
            classNamePrefix="react-select"
          />
          {formErrors.subjectId && <span className={styles.errorText}>{formErrors.subjectId}</span>}
          <input
            type="text"
            placeholder="Exam Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.inputStyle}
          />
          {formErrors.title && <span className={styles.errorText}>{formErrors.title}</span>}
        </div>

        <div className={styles.rowWrapper}>
          <div className={styles.dateField}>
            <label className={styles.label}>Start Date & Time</label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className={styles.inputStyle}
            />
            {formErrors.startDateTime && <span className={styles.errorText}>{formErrors.startDateTime}</span>}
          </div>
          <div className={styles.dateField}>
            <label className={styles.label}>End Date & Time</label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className={styles.inputStyle}
            />
            {formErrors.endDateTime && <span className={styles.errorText}>{formErrors.endDateTime}</span>}
          </div>
        </div>

        <div className={styles.rowWrapper}>
          <button onClick={addOrUpdateExam} className={styles.btn}>
            {editId ? "Update Exam" : "Schedule Exam"}
          </button>
          {editId && (
            <button onClick={resetForm} className={`${styles.btn} ${styles.btnCancel}`}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search exams..."
      />

      {total === 0 ? (
        <EmptyState title="No exams found" description="Try changing your search or add a new exam." />
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.table}>
            <div className={styles.thead}>
                <div className={styles.th}>Sr. No.</div>
                <div className={styles.th}>Exam ID</div>
                <div className={styles.th}>Department</div>
                <div className={styles.th}>Class</div>
                <div className={styles.th}>Subject</div>
                <div className={styles.th}>Title</div>
                <div className={styles.th}>Start Time</div>
                <div className={styles.th}>End Time</div>
                <div className={styles.th}>Status</div>
                <div className={styles.th}>Actions</div>
            </div>
            <VirtualTable
              height={Math.min(400, pageItems.length * 55)} // 55 is the rowHeight
              items={pageItems}
              renderRow={(exam, index) => (
                <div key={exam.id} className={styles.tr} ref={index === 0 ? firstRowRef : null} tabIndex={0}>
                  <div className={styles.td}>{startIndex + index + 1}</div>
                  <div className={styles.td}>{exam.examId}</div>
                  <div className={styles.td}>{getDepartmentName(exam.departmentId)}</div>
                  <div className={styles.td}>{getClassName(exam.classId)}</div>
                  <div className={styles.td}>{getSubjectName(exam.subjectId)}</div>
                  <div className={styles.td}>{exam.title}</div>
                  <div className={styles.td}>{formatDateTime(exam.startDateTime)}</div>
                  <div className={styles.td}>{formatDateTime(exam.endDateTime)}</div>
                  <div className={styles.td}>
                    <span className={`${styles.badge} ${styles[exam.status.toLowerCase().replace(/\s+/g, '')]}`}>
                      {exam.status}
                    </span>
                  </div>
                  <div className={`${styles.td} ${styles.actionsCell}`}>
                    <button onClick={() => startExam(exam.id)} disabled={exam.status !== 'Not Started'} className={`${styles.btn} ${styles.startBtn}`}>
                      Start
                    </button>
                    <button onClick={() => endExam(exam.id)} disabled={exam.status !== 'Ongoing'} className={`${styles.btn} ${styles.endBtn}`}>
                      End
                    </button>
                    <button onClick={() => editExam(exam)} className={`${styles.btn} ${styles.editBtn}`}>
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
};

export default ManageExams;
