// src/components/Paginator.jsx
import React from "react";
import styles from './Paginator.module.css';

export default function Paginator({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(pages, page + 1));

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <span>Rows per page:</span>
        <select 
          value={pageSize} 
          onChange={(e) => onPageSizeChange(Number(e.target.value))} 
          className={styles.select}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.rightSection}>
        <span className={styles.pageInfo}>
          {total > 0 ? `${startItem}-${endItem} of ${total}` : "0 of 0"}
        </span>
        <button 
          onClick={prev} 
          disabled={page === 1}
          className={styles.button}
        >
          Previous
        </button>
        <button 
          onClick={next} 
          disabled={page === pages}
          className={styles.button}
        >
          Next
        </button>
      </div>
    </div>
  );
}
