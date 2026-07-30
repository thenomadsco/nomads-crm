import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { GradientCanvas } from "~/components/gradient-canvas";
import { Card } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useAuth, verifyPin, type Role } from "~/lib/auth-context";

const PROFILES: { role: Role; name: string; subtitle: string; initials: string }[] = [
	{ role: "vedant", name: "Vedant Shah", subtitle: "Full access", initials: "VS" },
	{ role: "kirti", name: "Kirti Shah", subtitle: "Operations", initials: "KS" },
	{ role: "billing", name: "Billing Desk", subtitle: "Financial only", initials: "BD" },
];

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15000;

export default function Login() {
	const navigate = useNavigate();
	const { signIn } = useAuth();
	const [selectedRole, setSelectedRole] = useState<Role | null>(null);
	const [pin, setPin] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [attempts, setAttempts] = useState(0);
	const [lockedUntil, setLockedUntil] = useState<number | null>(null);
	const [checking, setChecking] = useState(false);

	const profile = PROFILES.find((p) => p.role === selectedRole) ?? null;
	const locked = lockedUntil !== null;

	// Client-side cooldown deterrent only — a UX speed bump against fast
	// repeated guessing, not an enforceable security control (there is no
	// server here to actually rate-limit). Clears itself once the timer elapses.
	useEffect(() => {
		if (!lockedUntil) return;
		const ms = lockedUntil - Date.now();
		const timer = setTimeout(() => {
			setLockedUntil(null);
			setAttempts(0);
			setError(null);
		}, Math.max(ms, 0));
		return () => clearTimeout(timer);
	}, [lockedUntil]);

	function reset() {
		setSelectedRole(null);
		setPin("");
		setError(null);
	}

	async function submitPin(e: FormEvent) {
		e.preventDefault();
		if (!selectedRole || locked || checking) return;
		setChecking(true);
		const ok = await verifyPin(selectedRole, pin);
		setChecking(false);

		if (ok) {
			signIn(selectedRole);
			navigate("/dashboard");
			return;
		}

		setPin("");
		const next = attempts + 1;
		setAttempts(next);
		if (next >= MAX_ATTEMPTS) {
			setLockedUntil(Date.now() + COOLDOWN_MS);
			setError(`Too many attempts. Try again in ${Math.round(COOLDOWN_MS / 1000)}s.`);
		} else {
			setError(`Incorrect PIN (${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? "" : "s"} left).`);
		}
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#0b0e2e]">
			<GradientCanvas className="absolute inset-0 h-full w-full" />
			<div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
					className="mb-10 flex flex-col items-center text-center"
				>
					<img
						src="/icons/icon-192.png"
						alt="The Nomads Co."
						className="mb-5 h-20 w-20 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
					/>
					<h1 className="font-display text-3xl font-semibold text-white">Nomads CRM</h1>
					<p className="mt-2 text-sm text-white/60">Sign in to continue</p>
				</motion.div>

				<AnimatePresence mode="wait">
					{!profile ? (
						<motion.div
							key="grid"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.25 }}
							className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-3"
						>
							{PROFILES.map((p, i) => (
								<motion.div
									key={p.role}
									initial={{ opacity: 0, y: 24, scale: 0.97 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
								>
									<Card
										role="button"
										tabIndex={0}
										onClick={() => setSelectedRole(p.role)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") setSelectedRole(p.role);
										}}
										className="group min-h-[44px] cursor-pointer border-white/10 bg-white/5 p-6 text-center backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[0_12px_40px_rgba(0,165,81,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A551]"
									>
										<Avatar className="mx-auto mb-3 h-14 w-14">
											<AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
												{p.initials}
											</AvatarFallback>
										</Avatar>
										<p className="font-medium text-white">{p.name}</p>
										<p className="mt-1 text-xs text-white/50">{p.subtitle}</p>
									</Card>
								</motion.div>
							))}
						</motion.div>
					) : (
						<motion.div
							key="pin"
							initial={{ opacity: 0, y: 12, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
							className="w-full max-w-xs"
						>
							<Card className="border-white/10 bg-white/5 p-6 backdrop-blur-md">
								<button
									type="button"
									onClick={reset}
									className="mb-4 flex min-h-[44px] items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
								>
									<ArrowLeft className="h-3.5 w-3.5" /> Choose a different profile
								</button>
								<Avatar className="mx-auto mb-3 h-14 w-14">
									<AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
										{profile.initials}
									</AvatarFallback>
								</Avatar>
								<p className="text-center font-medium text-white">{profile.name}</p>
								<p className="mb-5 text-center text-xs text-white/50">Enter your PIN to continue</p>
								<form onSubmit={submitPin} className="space-y-3">
									<Input
										type="password"
										inputMode="numeric"
										autoComplete="off"
										autoFocus
										value={pin}
										onChange={(e) => {
											setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
											setError(null);
										}}
										disabled={locked || checking}
										placeholder="••••"
										aria-label="PIN"
										className="h-12 border-white/20 bg-white/10 text-center text-lg tracking-[0.5em] text-white placeholder:text-white/30"
									/>
									{error && <p className="text-center text-xs text-red-400">{error}</p>}
									<Button type="submit" disabled={locked || checking || pin.length < 4} className="h-12 w-full">
										{checking ? "Checking…" : "Unlock"}
									</Button>
								</form>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6, duration: 0.6 }}
					className="mt-10 max-w-sm text-center text-xs text-white/30"
				>
					Design preview — PIN-gated for now, not real authentication. Real security requires a backend (Supabase Auth), coming next.
				</motion.p>
			</div>
		</div>
	);
}
