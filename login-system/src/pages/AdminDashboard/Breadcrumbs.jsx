// src/pages/admindashboard/Breadcrumbs.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  return (
    <div style={{ marginBottom: "1rem", fontSize: "14px" }}>
      <Link to="/admin">Home</Link>
      {paths.slice(1).map((segment, idx) => {
        const url = `/admin/${paths.slice(1, idx + 2).join("/")}`;
        return (
          <span key={url}>
            {" "}
            / <Link to={url}>{segment.replace("-", " ")}</Link>
          </span>
        );
      })}
    </div>
  );
}
