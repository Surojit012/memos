"use client";

import { useState } from "react";
import { OriginButton } from "@/components/ui/origin-button";
import { GripVertical } from "lucide-react";

function ProblemComparisonSlider() {
  const [inset, setInset] = useState<number>(50);
  const [onMouseDown, setOnMouseDown] = useState<boolean>(false);

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!onMouseDown) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let x = 0;

    if ("touches" in e && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left;
    } else if ("clientX" in e) {
      x = e.clientX - rect.left;
    }

    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setInset(percentage);
  };

  return (
    <section id="product" className="relative z-10 w-full py-20 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-4 items-center text-center">
          <div className="flex gap-2 flex-col max-w-2xl">
            <h2 className="text-3xl md:text-5xl tracking-tighter font-semibold text-white">
              Every session starts from zero.
            </h2>
            <p className="text-base md:text-lg max-w-xl mx-auto leading-relaxed tracking-tight text-neutral-400">
              Drag to see what changes when an agent has a persistent brain.
            </p>
          </div>

          <div className="pt-12 w-full max-w-4xl">
            <div
              className="relative aspect-video w-full h-full overflow-hidden rounded-2xl select-none border border-white/10 bg-neutral-950"
              onMouseMove={onMouseMove}
              onMouseUp={() => setOnMouseDown(false)}
              onMouseLeave={() => setOnMouseDown(false)}
              onTouchMove={onMouseMove}
              onTouchEnd={() => setOnMouseDown(false)}
            >
              <div
                className="bg-white/80 h-full w-0.5 absolute z-20 top-0 -ml-px select-none"
                style={{ left: inset + "%" }}
              >
                <OriginButton
                  aria-label="Drag to compare before and after"
                  variant="handle"
                  className="absolute top-1/2 z-30 -ml-3 h-10 w-6 -translate-y-1/2 cursor-ew-resize select-none rounded-md p-0 transition-all hover:scale-110"
                  onTouchStart={(e) => {
                    setOnMouseDown(true);
                    onMouseMove(e);
                  }}
                  onMouseDown={(e) => {
                    setOnMouseDown(true);
                    onMouseMove(e);
                  }}
                  onTouchEnd={() => setOnMouseDown(false)}
                  onMouseUp={() => setOnMouseDown(false)}
                >
                  <GripVertical className="h-4 w-4 text-neutral-900 select-none" />
                </OriginButton>
              </div>

              <div
                className="absolute inset-0 z-10 flex items-center justify-center p-6 md:p-8 font-mono text-xs md:text-sm text-center overflow-hidden bg-neutral-950"
              >
                <div>
                  <div className="mb-4 flex items-center justify-center gap-2 text-neutral-500">
                    <span className="h-2 w-2 rounded-full bg-neutral-600" />
                    <span>session_002.log — without memory</span>
                  </div>
                  <div className="space-y-2 text-neutral-400">
                    <p><span className="text-neutral-500">user:</span> what were we working on yesterday?</p>
                    <p><span className="text-neutral-500">agent:</span> I don't have any record of previous</p>
                    <p className="text-neutral-500">sessions. Could you fill me in?</p>
                    <p className="pt-2 text-neutral-700">→ no memory available</p>
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden border-l border-white/10 bg-neutral-950 p-6 text-center font-mono text-xs md:p-8 md:text-sm"
                style={{ clipPath: `inset(0 0 0 ${inset}%)` }}
              >
                <div>
                  <div className="mb-4 flex items-center justify-center gap-2 text-emerald-400/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>session_002.log — with memos</span>
                  </div>
                  <div className="space-y-2 text-neutral-300">
                    <p><span className="text-neutral-500">user:</span> what were we working on yesterday?</p>
                    <p><span className="text-emerald-400">agent:</span> You were debugging the Sui Move</p>
                    <p>registry contract — the Table inner UID</p>
                    <p>lookup bug. Want me to pick that back up?</p>
                    <p className="pt-2 text-neutral-600">→ retrieved from memory:0091, memory:0094</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 z-30 text-[10px] md:text-xs font-mono uppercase tracking-wider text-neutral-500 bg-black/60 px-2 py-1 rounded">
                Before
              </div>
              <div className="absolute bottom-4 right-4 z-30 text-[10px] md:text-xs font-mono uppercase tracking-wider text-emerald-400/80 bg-black/60 px-2 py-1 rounded">
                After
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { ProblemComparisonSlider };
