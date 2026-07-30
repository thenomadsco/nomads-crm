import { Users, Flame, CheckSquare, Stamp, Receipt, Wallet, ArrowDownLeft } from "lucide-react";
import { motion } from "motion/react";
import { StatCard } from "~/components/stat-card";
import { ScoreBadge } from "~/components/score-badge";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
import { today } from "~/lib/mock-data";

export default function Dashboard() {
	const { user } = useAuth();
	if (!user) return null;

	return user.scopes.includes("operational") ? <OperationalDashboard /> : <FinancialDashboard />;
}

function OperationalDashboard() {
	const { leads, tasks, visaApplications, loading } = useData();
	const todayStr = today();

	const hotLeads = leads.filter((l) => (l.lead_score ?? -1) >= 75).length;
	const openTasks = tasks.filter((t) => t.status === "Open").length;
	const dueToday = tasks.filter((t) => t.status === "Open" && t.due_date === todayStr);
	const expiringVisas = visaApplications.filter((v) => v.status === "Approved" && v.expiry_date);

	return (
		<div className="mx-auto max-w-6xl space-y-8">
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
				<h1 className="font-display text-2xl font-semibold">Good morning 👋</h1>
				<p className="text-sm text-muted-foreground">Here's what needs attention today.</p>
			</motion.div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Total Leads" value={loading ? "—" : leads.length} icon={Users} delay={0} />
				<StatCard label="Hot Leads" value={loading ? "—" : hotLeads} icon={Flame} accent="destructive" delay={0.05} />
				<StatCard label="Open Tasks" value={loading ? "—" : openTasks} icon={CheckSquare} accent="accent" delay={0.1} />
				<StatCard label="Visas Expiring Soon" value={loading ? "—" : expiringVisas.length} icon={Stamp} delay={0.15} />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="p-5">
					<h2 className="mb-4 text-sm font-semibold">Tasks due today</h2>
					<div className="space-y-3">
						{loading && <p className="text-sm text-muted-foreground">Loading…</p>}
						{!loading && dueToday.length === 0 && (
							<p className="text-sm text-muted-foreground">Nothing due today.</p>
						)}
						{!loading && dueToday.map((t) => (
							<div key={t.id} className="flex items-center justify-between rounded-md border p-3">
								<div>
									<p className="text-sm font-medium">{t.leads?.name || "Unnamed lead"}</p>
									<p className="text-xs text-muted-foreground">
										{t.task_type}{t.leads?.destination ? ` · ${t.leads.destination}` : ""}
									</p>
								</div>
								<Badge variant={t.priority === "High" ? "destructive" : "secondary"}>{t.priority}</Badge>
							</div>
						))}
					</div>
				</Card>

				<Card className="p-5">
					<h2 className="mb-4 text-sm font-semibold">Recent leads</h2>
					<div className="space-y-3">
						{loading && <p className="text-sm text-muted-foreground">Loading…</p>}
						{!loading && leads.slice(0, 5).map((l) => (
							<div key={l.id} className="flex items-center justify-between rounded-md border p-3 gap-2">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium truncate">
										{l.name || <span className="italic text-muted-foreground">No name on file</span>}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{l.destination ?? "—"}{l.trip_category ? ` · ${l.trip_category}` : ""}
									</p>
								</div>
								<ScoreBadge category={l.lead_category ?? null} score={l.lead_score} />
							</div>
						))}
					</div>
				</Card>
			</div>
		</div>
	);
}

function FinancialDashboard() {
	const { bookedTrips, payments, loading } = useData();

	// Derive invoice stats from booked_trips
	const unpaidTrips = bookedTrips.filter((b) => b.invoice_number && b.payment_status !== "Paid");
	const totalOutstanding = unpaidTrips.reduce((s, b) => s + (b.balance_due ?? 0), 0);
	const totalIn = payments.filter((p) => p.payment_date !== null).reduce((s, p) => s + (p.amount ?? 0), 0);

	return (
		<div className="mx-auto max-w-6xl space-y-8">
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
				<h1 className="font-display text-2xl font-semibold">Good morning 👋</h1>
				<p className="text-sm text-muted-foreground">Financial overview.</p>
			</motion.div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard label="Invoices Outstanding" value={loading ? "—" : unpaidTrips.length} icon={Receipt} accent="destructive" delay={0} />
				<StatCard label="Outstanding Amount" value={loading ? "—" : `₹${totalOutstanding.toLocaleString("en-IN")}`} icon={Wallet} delay={0.05} />
				<StatCard label="Money Received" value={loading ? "—" : `₹${totalIn.toLocaleString("en-IN")}`} icon={ArrowDownLeft} accent="accent" delay={0.1} />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<Card className="p-5">
					<h2 className="mb-4 text-sm font-semibold">Invoices needing attention</h2>
					<div className="space-y-3">
						{loading && <p className="text-sm text-muted-foreground">Loading…</p>}
						{!loading && unpaidTrips.length === 0 && (
							<p className="text-sm text-muted-foreground">All invoices are settled.</p>
						)}
						{!loading && unpaidTrips.slice(0, 8).map((b) => (
							<div key={b.id} className="flex items-center justify-between rounded-md border p-3">
								<div>
									<p className="text-sm font-medium">{b.invoice_number}</p>
									<p className="text-xs text-muted-foreground">
										{b.leads?.name ?? "—"} · ₹{(b.balance_due ?? 0).toLocaleString("en-IN")} due
									</p>
								</div>
								<Badge variant={b.payment_status === "Unpaid" ? "destructive" : "secondary"}>
									{b.payment_status}
								</Badge>
							</div>
						))}
						{!loading && unpaidTrips.length > 8 && (
							<p className="text-xs text-muted-foreground text-center">
								+{unpaidTrips.length - 8} more · see Invoices page
							</p>
						)}
					</div>
				</Card>

				<Card className="p-5">
					<h2 className="mb-4 text-sm font-semibold">Recent payments received</h2>
					<div className="space-y-3">
						{loading && <p className="text-sm text-muted-foreground">Loading…</p>}
						{!loading && payments.filter((p) => p.payment_date).length === 0 && (
							<p className="text-sm text-muted-foreground">No payments recorded yet.</p>
						)}
						{!loading && payments
							.filter((p) => p.payment_date)
							.slice(0, 5)
							.map((p) => (
								<div key={p.id} className="flex items-center justify-between rounded-md border p-3">
									<div>
										<p className="text-sm font-medium">
											{p.booked_trips?.leads?.name ?? "Client"}
										</p>
										<p className="text-xs text-muted-foreground">
											{p.method ?? "Payment"} · {p.payment_date}
										</p>
									</div>
									<span className="text-sm font-medium text-accent">
										₹{(p.amount ?? 0).toLocaleString("en-IN")}
									</span>
								</div>
							))}
					</div>
				</Card>
			</div>
		</div>
	);
}
