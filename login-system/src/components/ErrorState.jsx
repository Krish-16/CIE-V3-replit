// src/components/ErrorState.jsx
import React from "react";

export default function ErrorState({ title = "Something went wrong", description = "Please try again.", onRetry }) {
  return (
    <div style={{ padding: "24px", textAlign: "center", color: "#a00" }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ marginTop: 8 }}>{description}</p>
      {onRetry && (
        <button onClick={onRetry} style={{ marginTop: 12 }}>Retry</button>
      )}
    </div>
  );
}
