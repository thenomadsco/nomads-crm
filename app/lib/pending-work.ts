import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
import { severityFor, type CalendarSeverity } from "~/lib/calendar";

export type PendingItemType = "task" | "visa" | "document" | "payment";

export type PendingItem = {
	id: string;
	type: PendingItemType;
	title: string;
	subtitle: string;
	severity: CalendarSeverity;
	href: string;
};

const SEVERITY_RANK: Record<CalendarSeverity, number> = { overdue: 0, due_soon: 1, upcoming: 2 };

export function usePendingWork(): PendingItem[] {
	const { user } = useAuth();
	const { tasks, visaApplications, documents, payments, bookedTrips, loading } = useData();

	if (!user || loading) return [];

	const items: PendingItem[] = [];
	const hasOperational = user.scopes.includes("operational");
	const hasFinancial = user.scopes.includes("financial");

	if (hasOperational) {
		for (const t of tasks) {
			if (t.status === "Done") continue;
			const leadName = t.leads?.name || "Unnamed lead";
			items.push({
				id: `task-${t.id}`,
				type: "task",
				title: t.task_type,
				subtitle: leadName,
				severity: severityFor(t.due_date),
				href: "/tasks",
			});
		}

		for (const v of visaApplications) {
			if (v.status === "Pending") {
				const travelerName = v.travelers?.name || "Traveler";
				items.push({
					id: `visa-pending-${v.id}`,
					type: "visa",
					title: `${v.country} ${v.visa_type} awaiting decision`,
					subtitle: travelerName,
					severity: severityFor(v.expiry_date),
					href: "/visas",
				});
			} else if (v.status === "Approved" && v.expiry_date) {
				const sev = severityFor(v.expiry_date);
				if (sev !== "upcoming") {
					const travelerName = v.travelers?.name || "Traveler";
					items.push({
						id: `visa-expiring-${v.id}`,
						type: "visa",
						title: `${v.country} ${v.visa_type} expiring`,
						subtitle: travelerName,
						severity: sev,
						href: "/visas",
					});
				}
			}
		}

		// All documents are surfaced as needing attention (real schema has no status field)
		for (const d of documents) {
			const travelerName = d.travelers?.name || "Traveler";
			const tripName = d.booked_trips?.destination ?? "";
			items.push({
				id: `doc-${d.id}`,
				type: "document",
				title: `${d.document_type} uploaded`,
				subtitle: `${travelerName}${tripName ? ` · ${tripName}` : ""}`,
				severity: "due_soon",
				href: "/documents",
			});
		}
	}

	if (hasFinancial) {
		// Pending client payments: payment_date IS NULL
		for (const p of payments) {
			if (p.payment_date !== null) continue;
			const trip = bookedTrips.find((b) => b.id === p.booked_trip_id);
			const clientName = trip?.leads?.name || p.booked_trips?.leads?.name || "client";
			items.push({
				id: `payment-${p.id}`,
				type: "payment",
				title: `Collect from ${clientName}`,
				subtitle: `₹${p.amount.toLocaleString("en-IN")}${p.method ? ` · ${p.method}` : ""}`,
				severity: trip?.travel_start ? severityFor(trip.travel_start) : "due_soon",
				href: "/spendings",
			});
		}
	}

	return items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
