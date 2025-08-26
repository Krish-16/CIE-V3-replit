// src/components/EmptyState.jsx
import React from "react";

export default function EmptyState({ title = "No data", description = "Try adjusting your filters or add new items.", action }) {
  return (
    <div style={{ padding: "24px", textAlign: "center", color: "#555" }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ marginTop: 8 }}>{description}</p>
      {action}
    </div>
  );
}
