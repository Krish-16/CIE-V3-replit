// src/hooks/useKeyboardListNav.js
import { useCallback } from "react";

export default function useKeyboardListNav({ onEnter, onEscape, onArrow }) {
  return useCallback(
    (e) => {
      if (e.key === "Enter" && onEnter) onEnter(e);
      if (e.key === "Escape" && onEscape) onEscape(e);
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && onArrow) onArrow(e);
    },
    [onEnter, onEscape, onArrow]
  );
}
