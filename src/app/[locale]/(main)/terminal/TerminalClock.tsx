"use client";

import { useEffect, useState } from "react";

export default function TerminalClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const d = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(/ /g, "-");
      const t = now.toLocaleTimeString("en-GB", { hour12: false });
      setTime(`${d} ${t}`);
    }
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <p className="text-xs text-[#ffba3c]/60" suppressHydrationWarning>
      {time || "--"}
    </p>
  );
}
