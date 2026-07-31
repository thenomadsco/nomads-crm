import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ChevronRight, ExternalLink, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { useData } from "~/lib/data-context";
import { updateBooking, createPayment } from "~/lib/db";
import type { BookedTrip, Payment } from "~/lib/mock-data";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	Confirmed: "default",
	Completed: "secondary",
	Planning: "outline",
	Cancelled: "destructive",
};

const PAYMENT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	Paid: "default",
	Partial: "secondary",
	Unpaid: "destructive",
};

const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Cheque", "Online", "Credit Card"];

export default function Bookings() {
	const { bookedTrips, bookingItems, payments, setBookedTrips, setPayments, loading } = useData();
	const [selected, setSelected] = useState<BookedTrip | null>(null);
	const [query, setQuery] = useState("");
	const [searchParams] = useSearchParams();
	const highlight = searchParams.get("highlight");
	const highlightRef = useRef<HTMLTableRowElement | null>(null);

	useEffect(() => {
		if (!highlight || loading) return;
		const trip = bookedTrips.find((b) => b.id === highlight);
		if (trip) setSelected(trip);
		const timer = setTimeout(() => {
			highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 200);
		return () => clearTimeout(timer);
	}, [highlight, loading, bookedTrips]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return bookedTrips;
		return bookedTrips.filter((b) =>
			(b.leads?.name?.toLowerCase().includes(q) ?? false) ||
			(b.trip_name?.toLowerCase().includes(q) ?? false) ||
			(b.destination?.toLowerCase().includes(q) ?? false) ||
			(b.invoice_number?.toLowerCase().includes(q) ?? false),
		);
	}, [bookedTrips, query]);

	function handlePaymentAdded(payment: Payment) {
		setPayments([...payments, payment]);
		// Update amount_paid and balance_due on the booking optimistically
		setBookedTrips(bookedTrips.map((b) => {
			if (b.id !== payment.booked_trip_id) return b;
			const newAmountPaid = (b.amount_paid ?? 0) + payment.amount;
			const newBalanceDue = Math.max(0, (b.total_invoice_value ?? 0) - newAmountPaid);
			const newPaymentStatus = newBalanceDue === 0 ? "Paid" : newAmountPaid > 0 ? "Partial" : "Unpaid";
			return { ...b, amount_paid: newAmountPaid, balance_due: newBalanceDue, payment_status: newPaymentStatus };
		}));
		// Keep the selected booking in sync
		setSelected((prev) => {
			if (!prev || prev.id !== payment.booked_trip_id) return prev;
			const newAmountPaid = (prev.amount_paid ?? 0) + payment.amount;
			const newBalanceDue = Math.max(0, (prev.total_invoice_value ?? 0) - newAmountPaid);
			const newPaymentStatus = newBalanceDue === 0 ? "Paid" : newAmountPaid > 0 ? "Partial" : "Unpaid";
			return { ...prev, amount_paid: newAmountPaid, balance_due: newBalanceDue, payment_status: newPaymentStatus };
		});
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Bookings</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length}${query ? ` of ${bookedTrips.length}` : ""} booked trips`}
					</p>
				</div>
				<div className="relative w-full sm:w-64">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search client, trip, destination…"
						className="pl-8"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
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
							<TableHead>Client</TableHead>
							<TableHead>Trip</TableHead>
							<TableHead>Destination</TableHead>
							<TableHead>Dates</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Invoice Value</TableHead>
							<TableHead>Balance Due</TableHead>
							<TableHead className="w-8" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
									Loading bookings…
								</TableCell>
							</TableRow>
						)}
						{!loading && filtered.map((b) => {
							const isHighlighted = highlight === b.id;
							return (
								<TableRow
									key={b.id}
									ref={isHighlighted ? highlightRef : undefined}
									className={cn(
										"cursor-pointer",
										isHighlighted && "ring-2 ring-inset ring-primary bg-primary/5",
									)}
									onClick={() => setSelected(b)}
								>
									<TableCell className="font-medium">{b.leads?.name ?? "—"}</TableCell>
									<TableCell className="max-w-[180px] truncate text-sm">{b.trip_name}</TableCell>
									<TableCell>{b.destination}</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{b.travel_start && b.travel_end
											? `${b.travel_start} → ${b.travel_end}`
											: b.travel_start ?? b.booking_date ?? "—"}
									</TableCell>
									<TableCell>
										<Badge variant={STATUS_VARIANT[b.trip_status] ?? "outline"}>{b.trip_status}</Badge>
									</TableCell>
									<TableCell>₹{(b.total_invoice_value ?? 0).toLocaleString("en-IN")}</TableCell>
									<TableCell>
										{(b.balance_due ?? 0) > 0 ? (
											<span className="font-medium text-destructive">₹{(b.balance_due ?? 0).toLocaleString("en-IN")}</span>
										) : (
											<span className="text-muted-foreground">Nil</span>
										)}
									</TableCell>
									<TableCell>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</TableCell>
								</TableRow>
							);
						})}
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
									{query ? "No bookings match your search." : "No booked trips yet."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>

			<Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
				<SheetContent className="w-full sm:max-w-md">
					{selected && (
						<BookingDetail
							booking={selected}
							bookingItems={bookingItems}
							payments={payments.filter((p) => p.booked_trip_id === selected.id)}
							onTripStatusChange={(id, tripStatus) => {
								setBookedTrips(bookedTrips.map((b) => b.id === id ? { ...b, trip_status: tripStatus } : b));
								setSelected((prev) => prev ? { ...prev, trip_status: tripStatus } : prev);
							}}
							onPaymentAdded={handlePaymentAdded}
						/>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function BookingDetail({
	booking,
	bookingItems,
	payments,
	onTripStatusChange,
	onPaymentAdded,
}: {
	booking: BookedTrip;
	bookingItems: import("~/lib/mock-data").BookingItem[];
	payments: Payment[];
	onTripStatusChange: (id: string, tripStatus: string) => void;
	onPaymentAdded: (payment: Payment) => void;
}) {
	const [savingStatus, setSavingStatus] = useState(false);
	const [showAddPayment, setShowAddPayment] = useState(false);
	const [paymentForm, setPaymentForm] = useState({
		amount: "",
		method: "",
		payment_date: new Date().toISOString().slice(0, 10),
		isPending: false,
	});
	const [savingPayment, setSavingPayment] = useState(false);

	const items = bookingItems.filter((i) => i.booked_trip_id === booking.id);

	async function handleTripStatusChange(tripStatus: string) {
		setSavingStatus(true);
		try {
			await updateBooking(booking.id, { trip_status: tripStatus });
			onTripStatusChange(booking.id, tripStatus);
			toast.success(`Trip status updated to ${tripStatus}`);
		} catch (e) {
			toast.error("Failed to update trip status", { description: String(e) });
		} finally {
			setSavingStatus(false);
		}
	}

	async function handleAddPayment() {
		if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
			toast.error("Enter a valid amount");
			return;
		}
		setSavingPayment(true);
		try {
			const payment = await createPayment({
				booked_trip_id: booking.id,
				amount: Number(paymentForm.amount),
				method: paymentForm.method || undefined,
				payment_date: paymentForm.isPending ? null : paymentForm.payment_date,
			});
			onPaymentAdded(payment);
			toast.success(`₹${Number(paymentForm.amount).toLocaleString("en-IN")} payment recorded`);
			setShowAddPayment(false);
			setPaymentForm({ amount: "", method: "", payment_date: new Date().toISOString().slice(0, 10), isPending: false });
		} catch (e) {
			toast.error("Failed to record payment", { description: String(e) });
		} finally {
			setSavingPayment(false);
		}
	}

	return (
		<div className="flex h-full flex-col">
			<SheetHeader>
				<SheetTitle>{booking.leads?.name ?? "—"} · {booking.destination}</SheetTitle>
				<SheetDescription>
					{booking.invoice_number ? `Invoice ${booking.invoice_number}` : "No invoice number"}
					{booking.travel_start && ` · ${booking.travel_start}${booking.travel_end ? ` → ${booking.travel_end}` : ""}`}
				</SheetDescription>
			</SheetHeader>

			<div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
				{booking.invoice_file_url && (
					<Button
						variant="outline"
						size="sm"
						className="w-full gap-2"
						onClick={() => window.open(booking.invoice_file_url!, "_blank")}
					>
						<ExternalLink className="h-4 w-4" /> View Invoice PDF
					</Button>
				)}

				<div className="space-y-1 rounded-md border p-3 text-sm">
					<div className="flex justify-between py-1">
						<span className="text-muted-foreground">Trip Name</span>
						<span className="max-w-[200px] text-right font-medium">{booking.trip_name}</span>
					</div>
					<div className="flex items-center justify-between py-1">
						<span className="text-muted-foreground">Trip Status</span>
						<Select value={booking.trip_status} disabled={savingStatus} onValueChange={handleTripStatusChange}>
							<SelectTrigger className="h-7 w-32 text-xs">
								<SelectValue>
									<Badge variant={STATUS_VARIANT[booking.trip_status] ?? "outline"} className="pointer-events-none">
										{booking.trip_status}
									</Badge>
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Planning">Planning</SelectItem>
								<SelectItem value="Confirmed">Confirmed</SelectItem>
								<SelectItem value="Completed">Completed</SelectItem>
								<SelectItem value="Cancelled">Cancelled</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex justify-between py-1">
						<span className="text-muted-foreground">Payment Status</span>
						<Badge variant={PAYMENT_VARIANT[booking.payment_status] ?? "outline"}>{booking.payment_status}</Badge>
					</div>
					{booking.booking_date && (
						<div className="flex justify-between py-1">
							<span className="text-muted-foreground">Booking Date</span>
							<span className="font-medium">{booking.booking_date}</span>
						</div>
					)}
				</div>

				{items.length > 0 && (
					<>
						<div>
							<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Booking Items
							</h3>
							<div className="space-y-2">
								{items.map((item) => (
									<div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
										<div>
											<p className="font-medium">{item.item_type}</p>
											{item.provider && <p className="text-xs text-muted-foreground">{item.provider}</p>}
											{item.confirmation_number && (
												<p className="text-xs text-muted-foreground">Ref: {item.confirmation_number}</p>
											)}
										</div>
										<span className="font-medium">₹{(item.cost ?? 0).toLocaleString("en-IN")}</span>
									</div>
								))}
							</div>
						</div>
						<Separator />
					</>
				)}

				{/* Payments section */}
				<div>
					<div className="mb-2 flex items-center justify-between">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments</h3>
						<Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={() => setShowAddPayment((v) => !v)}>
							<Plus className="h-3 w-3" /> Add
						</Button>
					</div>

					{showAddPayment && (
						<div className="mb-3 space-y-2 rounded-md border p-3 text-sm bg-muted/30">
							<div className="grid grid-cols-2 gap-2">
								<div className="flex flex-col gap-1">
									<label className="text-xs text-muted-foreground">Amount (₹) *</label>
									<Input
										type="number"
										placeholder="50000"
										className="h-8 text-xs"
										value={paymentForm.amount}
										onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
									/>
								</div>
								<div className="flex flex-col gap-1">
									<label className="text-xs text-muted-foreground">Method</label>
									<Select value={paymentForm.method} onValueChange={(v) => setPaymentForm((f) => ({ ...f, method: v }))}>
										<SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
										<SelectContent>
											{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-xs text-muted-foreground">Payment Date</label>
								<Input
									type="date"
									className="h-8 text-xs"
									value={paymentForm.payment_date}
									disabled={paymentForm.isPending}
									onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
								/>
							</div>
							<label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
								<input
									type="checkbox"
									checked={paymentForm.isPending}
									onChange={(e) => setPaymentForm((f) => ({ ...f, isPending: e.target.checked }))}
									className="rounded"
								/>
								Mark as pending (no date yet)
							</label>
							<div className="flex gap-2 pt-1">
								<Button size="sm" className="h-7 text-xs flex-1" disabled={savingPayment || !paymentForm.amount} onClick={handleAddPayment}>
									{savingPayment ? "Saving…" : "Record Payment"}
								</Button>
								<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddPayment(false)}>
									Cancel
								</Button>
							</div>
						</div>
					)}

					<div className="space-y-2">
						{payments.length === 0 && !showAddPayment && (
							<p className="text-sm text-muted-foreground">No payments recorded yet.</p>
						)}
						{payments.map((p) => (
							<div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
								<div>
									<p className="font-medium">{p.method ?? "Payment"}</p>
									<p className="text-xs text-muted-foreground">
										{p.payment_date ?? "Awaiting payment"}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span className="font-medium">₹{p.amount.toLocaleString("en-IN")}</span>
									<Badge variant={p.payment_date ? "default" : "secondary"}>
										{p.payment_date ? "Paid" : "Pending"}
									</Badge>
								</div>
							</div>
						))}
					</div>
				</div>

				<Separator />

				<div className="space-y-1 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Total Invoice Value</span>
						<span className="font-semibold">₹{(booking.total_invoice_value ?? 0).toLocaleString("en-IN")}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Amount Paid</span>
						<span className="font-medium text-accent">₹{(booking.amount_paid ?? 0).toLocaleString("en-IN")}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Balance Due</span>
						<span className={(booking.balance_due ?? 0) > 0 ? "font-medium text-destructive" : "font-medium"}>
							₹{(booking.balance_due ?? 0).toLocaleString("en-IN")}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
