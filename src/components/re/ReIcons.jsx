import React from "react";
import { Music } from "lucide-react";

export function ServiceIcon({ name, size = "md" }) {
  const dim = size === "lg" ? "w-14 h-14 rounded-2xl text-lg" : size === "sm" ? "w-9 h-9 rounded-xl text-xs" : "w-11 h-11 rounded-2xl text-sm";
  const lower = (name || "").toLowerCase();
  
  if (lower.includes("netflix")) {
    return (
      <div className={`${dim} bg-black flex items-center justify-center font-black text-red-600 shadow-sm shrink-0`}>
        N
      </div>
    );
  }
  if (lower.includes("youtube")) {
    return (
      <div className={`${dim} bg-[#FF0000] flex items-center justify-center text-white shadow-sm shrink-0`}>
        <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white ml-0.5" />
      </div>
    );
  }
  if (lower.includes("spotify")) {
    return (
      <div className={`${dim} bg-[#1DB954] flex items-center justify-center text-black font-bold shadow-sm shrink-0`}>
        <Music className="w-5 h-5 text-black" />
      </div>
    );
  }
  if (lower.includes("disney")) {
    return (
      <div className={`${dim} bg-[#001D66] flex items-center justify-center text-white font-bold tracking-tighter text-xs shadow-sm shrink-0`}>
        Disney+
      </div>
    );
  }
  return (
    <div className={`${dim} bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm shrink-0`}>
      {(name || "S").slice(0, 2).toUpperCase()}
    </div>
  );
}
