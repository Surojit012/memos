"use client";

import { useEffect, useRef } from "react";

type ActiveCell = {
    strength: number;
    previousX: number;
    previousY: number;
    previousSize: number;
};

type TrailPoint = {
    x: number;
    y: number;
    time: number;
};

const CELL_SIZE = 5;
const TRAIL_RADIUS = 50;
const DECAY = 0.87;
const MIN_STRENGTH = 0.012;

export function PixelTrailBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const frameRef = useRef<number | null>(null);
    const activeCellsRef = useRef<Map<string, ActiveCell>>(new Map());
    const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        if (prefersReducedMotion) return;

        const context = canvas.getContext("2d", { alpha: true });
        if (!context) return;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = window.innerWidth;
            const height = window.innerHeight;

            sizeRef.current = { width, height, dpr };
            canvas.width = Math.ceil(width * dpr);
            canvas.height = Math.ceil(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            context.clearRect(0, 0, width, height);
            activeCellsRef.current.clear();
        };

        const cellKey = (cellX: number, cellY: number) => `${cellX}:${cellY}`;

        const boostCellsNear = (x: number, y: number) => {
            const radius = TRAIL_RADIUS;
            const radiusCells = Math.ceil(radius / CELL_SIZE);
            const centerCellX = Math.floor(x / CELL_SIZE);
            const centerCellY = Math.floor(y / CELL_SIZE);

            for (let offsetY = -radiusCells; offsetY <= radiusCells; offsetY += 1) {
                for (let offsetX = -radiusCells; offsetX <= radiusCells; offsetX += 1) {
                    const cellX = centerCellX + offsetX;
                    const cellY = centerCellY + offsetY;
                    const pixelX = cellX * CELL_SIZE + CELL_SIZE / 2;
                    const pixelY = cellY * CELL_SIZE + CELL_SIZE / 2;
                    const distance = Math.hypot(pixelX - x, pixelY - y);

                    if (distance > radius) continue;

                    const falloff = 1 - distance / radius;
                    const key = cellKey(cellX, cellY);
                    const current = activeCellsRef.current.get(key);
                    const nextStrength = Math.min(
                        1,
                        (current?.strength ?? 0) + falloff * 0.32
                    );

                    activeCellsRef.current.set(key, {
                        strength: nextStrength,
                        previousX: current?.previousX ?? cellX * CELL_SIZE,
                        previousY: current?.previousY ?? cellY * CELL_SIZE,
                        previousSize: current?.previousSize ?? CELL_SIZE,
                    });
                }
            }
        };

        const draw = () => {
            const now = performance.now();
            const activeCells = activeCellsRef.current;

            for (const cell of Array.from(activeCells.values())) {
                context.clearRect(
                    cell.previousX - 10,
                    cell.previousY - 10,
                    cell.previousSize + 20,
                    cell.previousSize + 20
                );
            }

            for (const [key, cell] of Array.from(activeCells.entries())) {
                const [cellX, cellY] = key.split(":").map(Number);
                const baseX = cellX * CELL_SIZE;
                const baseY = cellY * CELL_SIZE;
                const hash = (cellX * 73856093) ^ (cellY * 19349663);
                const jitter = cell.strength * 3.8;
                const offsetX = (((hash & 7) - 3) / 3) * jitter;
                const offsetY = ((((hash >> 3) & 7) - 3) / 3) * jitter;
                const size = CELL_SIZE * (0.7 + cell.strength * 0.5);
                const alpha = Math.min(0.34, cell.strength * 0.26);

                cell.previousX = baseX + offsetX;
                cell.previousY = baseY + offsetY;
                cell.previousSize = size;

                cell.strength *= DECAY;
                if (cell.strength < MIN_STRENGTH) {
                    activeCells.delete(key);
                    context.clearRect(
                        cell.previousX - 10,
                        cell.previousY - 10,
                        cell.previousSize + 20,
                        cell.previousSize + 20
                    );
                    continue;
                }

                context.fillStyle =
                    cell.strength > 0.72
                        ? `rgba(228, 228, 231, ${alpha})`
                        : `rgba(74, 122, 98, ${alpha})`;
                context.fillRect(cell.previousX, cell.previousY, size, size);
            }

            if (activeCells.size > 0) {
                frameRef.current = requestAnimationFrame(draw);
            } else {
                const { width, height } = sizeRef.current;
                context.clearRect(0, 0, width, height);
                frameRef.current = null;
            }
        };

        const startAnimation = () => {
            if (frameRef.current === null) {
                frameRef.current = requestAnimationFrame(draw);
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            boostCellsNear(event.clientX, event.clientY);
            startAnimation();
        };

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onPointerMove, { passive: true });

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onPointerMove);
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="fixed inset-0 z-0 pointer-events-none"
        />
    );
}
