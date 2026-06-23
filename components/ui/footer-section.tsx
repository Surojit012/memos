"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";

export function FooterSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<{ active: boolean; delay: number }[][]>([]);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);

  const phrases = ["memos", "0G Storage", "0G compute", "0G"];
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const updateGrid = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      const cubeSize = 16; // 12px width + 4px margin (m-0.5 = 2px on each side)
      const newCols = Math.floor(width / cubeSize);
      const newRows = Math.floor(height / cubeSize);
      
      setCols(newCols);
      setRows(newRows);
    };

    updateGrid();
    window.addEventListener("resize", updateGrid);
    return () => window.removeEventListener("resize", updateGrid);
  }, []);

  useEffect(() => {
    if (cols === 0 || rows === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const phrase = phrases[phraseIdx];
    ctx.clearRect(0, 0, cols, rows);
    ctx.fillStyle = "white";
    
    // Dynamically size font to fit within the grid
    const maxFontSizeX = cols / (phrase.length * 0.65);
    const maxFontSizeY = rows * 0.8;
    const fontSize = Math.floor(Math.min(maxFontSizeX, maxFontSizeY));
    
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(phrase, cols / 2, rows / 2);

    const imgData = ctx.getImageData(0, 0, cols, rows).data;
    const newGrid = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        const active = imgData[idx + 3] > 64; // Check alpha channel
        const delay = ((x * 17 + y * 23) % 20) * 0.03;
        row.push({ active, delay });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);

  }, [cols, rows, phraseIdx]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % phrases.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="relative w-full h-screen min-h-[700px] bg-[#08090A] text-white flex flex-col justify-between overflow-hidden border-t border-white/10 z-20">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between p-8 md:p-12 w-full max-w-7xl mx-auto z-10">
        <div className="mb-12 md:mb-0">
          <div className="flex items-center gap-3 mb-4">
            <Logo className="w-8 h-8 text-white" />
            <h2 className="text-3xl font-bold tracking-tight">memos</h2>
          </div>
          <p className="text-neutral-400 text-sm max-w-xs">
            Persistent memory for AI agents.<br/>Built on 0G infrastructure.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-12 md:gap-24 text-sm">
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-medium mb-2">Platform</h3>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">Documentation</a>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">SDK</a>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">Storage</a>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">Compute</a>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-medium mb-2">Company</h3>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">About</a>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">Blog</a>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-neutral-400 hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>

      {/* Grid Animation Section */}
      <div className="flex-1 w-full relative flex items-center justify-center" ref={containerRef}>
        {cols > 0 && rows > 0 && (
          <div className="flex flex-col items-center justify-center">
            {grid.map((row, y) => (
              <div key={y} className="flex">
                {row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className="w-3 h-3 m-0.5 rounded-[3px] transition-all duration-700 ease-out"
                    style={{
                      transform: cell.active ? "scale(1)" : "scale(0.3)",
                      opacity: cell.active ? 1 : 0.05,
                      backgroundColor: cell.active ? "#ABD1C6" : "#ffffff",
                      transitionDelay: `${cell.delay}s`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Section */}
      <div className="flex flex-col md:flex-row justify-between items-center p-8 md:p-12 w-full max-w-7xl mx-auto z-10 text-xs text-neutral-500">
        <p>© 2026 memos. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-neutral-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-neutral-300 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
