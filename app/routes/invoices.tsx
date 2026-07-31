import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useData } from "~/lib/data-context";
import { updateBooking } from "~/lib/db";

type PaymentStatusFilter = "All" | "Paid" | "Partial" | "Unpaid";
type PaymentStatus = "Paid" | "Partial" | "Unpaid";

const VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	Paid: "default",
	Partial: "secondary",
	Unpaid: "destructive",
};

export default function Invoices() {
	const { bookedTrips, setBookedTrips, loading } = useData();
	const [filter, setFilter] = useState<PaymentStatusFilter>("All");
	const [query, setQuery] = useState("");
	const [updatingId, setUpdatingId] = useState<string | null>(null);

	const invoiced = useMemo(
		() => bookedTrips.filter((b) => Boolean(b.invoice_number)),
		[bookedTrips],
	);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return invoiced.filter((b) => {
			const matchesStatus = filter === "All" || b.payment_status === filter;
			const matchesQuery =
				!q ||
				(b.invoice_number?.toLowerCase().includes(q) ?? false) ||
				(b.leads?.name?.toLowerCase().includes(q) ?? false) ||
				(b.trip_name?.toLowerCase().includes(q) ?? false) ||
				(b.destination?.toLowerCase().includes(q) ?? false);
			return matchesStatus && matchesQuery;
		});
	}, [invoiced, filter, query]);

	const totalValue = invoiced.reduce((s, b) => s + (b.total_invoice_value ?? 0), 0);
	const totalBalance = invoiced.reduce((s, b) => s + (b.balance_due ?? 0), 0);

	async function handlePaymentStatusChange(id: string, paymentStatus: PaymentStatus) {
		setUpdatingId(id);
		const prev = bookedTrips.find((b) => b.id === id)?.payment_status;
		setBookedTrips(bookedTrips.map((b) => b.id === id ? { ...b, payment_status: paymentStatus } : b));
		try {
			await updateBooking(id, { payment_status: paymentStatus });
			toast.success(`Payment status updated to ${paymentStatus}`);
		} catch (e) {
			setBookedTrips(bookedTrips.map((b) => b.id === id ? { ...b, payment_status: prev ?? b.payment_status } : b));
			toast.error("Failed to update payment status", { description: String(e) });
		} finally {
			setUpdatingId(null);
		}
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Invoices</h1>
					<p className="text-sm text-muted-foreground">
						{loading
							? "Loading…"
							: `${invoiced.length} invoices · ₹${totalValue.toLocaleString("en-IN")} total · ₹${totalBalance.toLocaleString("en-IN")} outstanding`}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="relative w-full sm:w-56">
						<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search invoice, client, trip…"
							className="pl-8"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
					<Tabs value={filter} onValueChange={(v) => setFilter(v as PaymentStatusFilter)}>
						<TabsList>
							<TabsTrigger value="All">All</TabsTrigger>
							<TabsTrigger value="Unpaid">Unpaid</TabsTrigger>
							<TabsTrigger value="Partial">Partial</TabsTrigger>
							<TabsTrigger value="Paid">Paid</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35 }}
				className="overflow-hidden rounded-lg border"
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Invoice #</TableHead>
							<TableHead>Client</TableHead>
							<TableHead>Trip / Destination</TableHead>
							<TableHead>Invoice Value</TableHead>
							<TableHead>Amount Paid</TableHead>
							<TableHead>Balance Due</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Booking Date</TableHead>
							<TableHead className="w-8" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
									Loading invoices…
								</TableCell>
							</TableRow>
						)}
						{!loading && filtered.map((b) => (
							<TableRow key={b.id}>
								<TableCell className="font-medium">{b.invoice_number}</TableCell>
								<TableCell>{b.leads?.name ?? "—"}</TableCell>
								<TableCell>
									<p className="truncate max-w-[160px]">{b.trip_name}</p>
									<p className="text-xs text-muted-foreground">{b.destination}</p>
								</TableCell>
								<TableCell>₹{(b.total_invoice_value ?? 0).toLocaleString("en-IN")}</TableCell>
								<TableCell className="text-accent">₹{(b.amount_paid ?? 0).toLocaleString("en-IN")}</TableCell>
								<TableCell>
									{(b.balance_due ?? 0) > 0 ? (
										<span className="font-medium text-destructive">₹{(b.balance_due ?? 0).toLocaleString("en-IN")}</span>
									) : (
										<span className="text-muted-foreground">Nil</span>
									)}
								</TableCell>
								<TableCell>
									<Select
										value={b.payment_status}
										disabled={updatingId === b.id}
										onValueChange={(v) => handlePaymentStatusChange(b.id, v as PaymentStatus)}
									>
										<SelectTrigger className="h-7 w-28 text-xs">
											<SelectValue>
												<Badge variant={VARIANT[b.payment_status] ?? "outline"} className="pointer-events-none">
													{b.payment_status}
												</Badge>
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Unpaid">Unpaid</SelectItem>
											<SelectItem value="Partial">Partial</SelectItem>
											<SelectItem value="Paid">Paid</SelectItem>
										</SelectContent>
									</Select>
								</TableCell>
								<TableCell className="text-muted-foreground">{b.booking_date ?? "—"}</TableCell>
								<TableCell>
									{b.invoice_file_url && (
										<a
											href={b.invoice_file_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-muted-foreground hover:text-foreground"
											title="View invoice PDF"
										>
											<ExternalLink className="h-4 w-4" />
										</a>
									)}
								</TableCell>
							</TableRow>
						))}
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
									{query ? "No invoices match your search." : "No invoices match this filter."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>
		</div>
	);
}
