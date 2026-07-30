import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Placeholder-only stand-in for real Supabase Auth. Persisted to localStorage
// purely so the role picked on the login screen survives a refresh while
// designing — this gets replaced wholesale once real auth is wired up.
export type Role = "vedant" | "kirti" | "billing";

export type Scope = "operational" | "financial" | "admin";

export type CurrentUser = {
	role: Role;
	name: string;
	initials: string;
	title: string;
	scopes: Scope[];
};

// Vedant: everything, incl. admin (user management, notification-rules matrix).
// Kirti: full operational + financial parity with Vedant, no admin.
// Billing: financial only — no leads/tasks/bookings/travelers/visas.
const USERS: Record<Role, CurrentUser> = {
	vedant: { role: "vedant", name: "Vedant Shah", initials: "VS", title: "Admin", scopes: ["operational", "financial", "admin"] },
	kirti: { role: "kirti", name: "Kirti Shah", initials: "KS", title: "Operations", scopes: ["operational", "financial"] },
	billing: { role: "billing", name: "Billing Desk", initials: "BD", title: "Billing", scopes: ["financial"] },
};

const STORAGE_KEY = "nomads-crm.current-role";

// SHA-256 hex digests of each profile's PIN — the PIN itself is never in
// source. Still 100% client-side: anyone with devtools can call signIn()
// directly or edit localStorage and skip this entirely. This raises the
// casual-access bar (no more one-click-into-financial-data) but is NOT real
// security. Real security requires moving auth server-side (Supabase Auth +
// RLS) — a separate, bigger next step, not attempted here.
// TEMP: all three profiles share PIN 0000 until this is actually hosted —
// change these before sharing the link with anyone.
const PIN_HASHES: Record<Role, string> = {
	vedant: "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0",
	kirti: "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0",
	billing: "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0",
};

async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function verifyPin(role: Role, pin: string): Promise<boolean> {
	const hash = await sha256Hex(pin);
	return hash === PIN_HASHES[role];
}

type AuthContextValue = {
	user: CurrentUser | null;
	ready: boolean;
	signIn: (role: Role) => void;
	signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [role, setRole] = useState<Role | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
		if (stored && stored in USERS) setRole(stored);
		setReady(true);
	}, []);

	const signIn = (r: Role) => {
		window.localStorage.setItem(STORAGE_KEY, r);
		setRole(r);
	};
	const signOut = () => {
		window.localStorage.removeItem(STORAGE_KEY);
		setRole(null);
	};

	return (
		<AuthContext.Provider value={{ user: role ? USERS[role] : null, ready, signIn, signOut }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
