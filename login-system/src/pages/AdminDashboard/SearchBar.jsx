import React from "react";

const SearchBar = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          border: "1px solid #2563eb",
          fontSize: "16px",
          outline: "none",
          background: "#f9fafb",
        }}
      />
    </div>
  );
};

export default SearchBar;
