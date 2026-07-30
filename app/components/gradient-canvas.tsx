import { useEffect, useRef } from "react";

// A lightweight, dependency-free stand-in for a WebGL shader gradient: a few
// soft blurred blobs in the brand hues, drifting on independent sine paths
// and radial-composited on a canvas. Reserved for standout moments only
// (login screen) per the brand's "sparingly" motion guidance — not used
// anywhere else in the app.
const COLORS = ["#2D3191", "#00A551", "#4B4FC4"];

export function GradientCanvas({ className }: { className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf = 0;
		let width = 0;
		let height = 0;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		function resize() {
			const rect = canvas!.getBoundingClientRect();
			width = rect.width;
			height = rect.height;
			canvas!.width = width * dpr;
			canvas!.height = height * dpr;
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		resize();
		window.addEventListener("resize", resize);

		const blobs = COLORS.map((color, i) => ({
			color,
			baseX: 0.2 + i * 0.3,
			baseY: 0.3 + (i % 2) * 0.4,
			speed: 0.00025 + i * 0.00008,
			radius: 0.42 - i * 0.05,
			phase: i * 2.1,
		}));

		function frame(t: number) {
			if (!ctx) return;
			ctx.clearRect(0, 0, width, height);
			ctx.fillStyle = "#0b0e2e";
			ctx.fillRect(0, 0, width, height);

			for (const b of blobs) {
				const x = (b.baseX + 0.08 * Math.sin(t * b.speed + b.phase)) * width;
				const y = (b.baseY + 0.08 * Math.cos(t * b.speed * 1.3 + b.phase)) * height;
				const r = b.radius * Math.max(width, height);
				const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
				grad.addColorStop(0, `${b.color}aa`);
				grad.addColorStop(1, `${b.color}00`);
				ctx.fillStyle = grad;
				ctx.fillRect(0, 0, width, height);
			}
			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
		};
	}, []);

	return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
