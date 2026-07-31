import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowDownLeft, Info } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { StatCard } from "~/components/stat-card";
import { useData } from "~/lib/data-context";

export default function Spendings() {
	const { payments, bookedTrips, loading } = useData();

	const ledger = useMemo(() => {
		return payments
			.map((p) => {
				const trip = p.booked_trips ?? bookedTrips.find((b) => b.id === p.booked_trip_id);
				const clientName = (trip as typeof p.booked_trips)?.leads?.name ?? "Client";
				const dest = (trip as typeof p.booked_trips)?.destination ?? "";
				const paid = p.payment_date !== null;
				return {
					id: p.id,
					date: p.payment_date ?? p.created_at.slice(0, 10),
					description: `${clientName}${dest ? ` · ${dest}` : ""}`,
					subtext: p.method ?? "Payment",
					amount: p.amount,
					paid,
				};
			})
			.sort((a, b) => (a.date < b.date ? 1 : -1));
	}, [payments, bookedTrips]);

	const paidIn = payments.filter((p) => p.payment_date !== null).reduce((s, p) => s + p.amount, 0);
	const pendingIn = payments.filter((p) => p.payment_date === null).reduce((s, p) => s + p.amount, 0);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div>
				<h1 className="font-display text-2xl font-semibold">Spendings</h1>
				<p className="text-sm text-muted-foreground">Client payment ledger — money received from clients</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard label="Money In (Received)" value={loading ? "—" : `₹${paidIn.toLocaleString("en-IN")}`} icon={ArrowDownLeft} accent="accent" />
				<StatCard label="Pending Collection" value={loading ? "—" : `₹${pendingIn.toLocaleString("en-IN")}`} icon={ArrowDownLeft} accent="destructive" delay={0.05} />
				<StatCard label="Total Billed" value={loading ? "—" : `₹${(paidIn + pendingIn).toLocaleString("en-IN")}`} icon={ArrowDownLeft} delay={0.1} />
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				<Info className="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					Company card spend (outgoing expenses) is not yet tracked in the database. This ledger shows only incoming client payments.
				</p>
			</div>

			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35 }}
				className="overflow-x-auto rounded-lg border"
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Client / Trip</TableHead>
							<TableHead>Method</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Amount</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
									Loading payments…
								</TableCell>
							</TableRow>
						)}
						{!loading && ledger.map((e) => (
							<TableRow key={e.id}>
								<TableCell className="text-muted-foreground">{e.date}</TableCell>
								<TableCell className="font-medium">{e.description}</TableCell>
								<TableCell className="text-muted-foreground">{e.subtext}</TableCell>
								<TableCell>
									<Badge variant={e.paid ? "default" : "secondary"}>
										{e.paid ? "Received" : "Pending"}
									</Badge>
								</TableCell>
								<TableCell className="text-right font-medium text-accent">
									+₹{e.amount.toLocaleString("en-IN")}
								</TableCell>
							</TableRow>
						))}
						{!loading && ledger.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
									No payment records yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>
		</div>
	);
}
