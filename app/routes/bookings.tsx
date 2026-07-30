import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ChevronRight, ExternalLink, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { useData } from "~/lib/data-context";
import type { BookedTrip } from "~/lib/mock-data";

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

export default function Bookings() {
	const { bookedTrips, bookingItems, payments, loading } = useData();
	const [selected, setSelected] = useState<BookedTrip | null>(null);
	const [query, setQuery] = useState("");
	const [searchParams] = useSearchParams();
	const highlight = searchParams.get("highlight");
	const highlightRef = useRef<HTMLTableRowElement | null>(null);

	// Auto-open the sheet for the highlighted booking
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
					{selected && <BookingDetail booking={selected} bookingItems={bookingItems} payments={payments} />}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function BookingDetail({
	booking,
	bookingItems,
	payments,
}: {
	booking: BookedTrip;
	bookingItems: import("~/lib/mock-data").BookingItem[];
	payments: import("~/lib/mock-data").Payment[];
}) {
	const items = bookingItems.filter((i) => i.booked_trip_id === booking.id);
	const tripPayments = payments.filter((p) => p.booked_trip_id === booking.id);

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
					<div className="flex justify-between py-1">
						<span className="text-muted-foreground">Trip Status</span>
						<Badge variant={STATUS_VARIANT[booking.trip_status] ?? "outline"}>{booking.trip_status}</Badge>
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

				{tripPayments.length > 0 && (
					<>
						<div>
							<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Payments
							</h3>
							<div className="space-y-2">
								{tripPayments.map((p) => (
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
					</>
				)}

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
