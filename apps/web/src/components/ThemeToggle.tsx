"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg border border-[#3C4A42] flex items-center justify-center opacity-50">
        <span className="material-symbols-outlined text-[#10B981]">light_mode</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#3C4A42] hover:bg-[#201F20] transition-all active:scale-95 group"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <span className="material-symbols-outlined text-[#10B981] group-hover:scale-110 transition-transform">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
