import type { Scope } from "~/lib/auth-context";
import type { BookedTrip, VisaApplication, Task, Payment } from "~/lib/mock-data";
import { daysUntil } from "~/lib/mock-data";

export type CalendarEventType = "trip" | "visa" | "task" | "invoice" | "payment";
export type CalendarSeverity = "overdue" | "due_soon" | "upcoming";

export type CalendarEvent = {
	id: string;
	date: string;
	type: CalendarEventType;
	title: string;
	subtitle: string;
	severity: CalendarSeverity;
	href: string;
};

export const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
	trip: "Trips",
	visa: "Visas",
	task: "Tasks",
	invoice: "Invoices",
	payment: "Client Payments",
};

const FINANCIAL_TYPES: CalendarEventType[] = ["invoice", "payment"];

export function severityFor(dateStr: string | null | undefined): CalendarSeverity {
	const d = daysUntil(dateStr);
	if (d === Infinity) return "upcoming";
	if (d < 0) return "overdue";
	if (d <= 3) return "due_soon";
	return "upcoming";
}

type CalendarData = {
	bookedTrips: BookedTrip[];
	visaApplications: VisaApplication[];
	tasks: Task[];
	payments: Payment[];
};

export function getCalendarEvents(scopes: Scope[], data: CalendarData): CalendarEvent[] {
	const hasOperational = scopes.includes("operational");
	const hasFinancial = scopes.includes("financial");
	const events: CalendarEvent[] = [];

	if (hasOperational) {
		for (const trip of data.bookedTrips) {
			const who = trip.leads?.name || "Unnamed lead";
			if (trip.travel_start) {
				events.push({
					id: `${trip.id}-start`,
					date: trip.travel_start,
					type: "trip",
					title: `${trip.destination} trip starts`,
					subtitle: `${who} · ${trip.trip_status}`,
					severity: severityFor(trip.travel_start),
					href: `/bookings?highlight=${trip.id}`,
				});
			}
			if (trip.travel_end) {
				events.push({
					id: `${trip.id}-end`,
					date: trip.travel_end,
					type: "trip",
					title: `${trip.destination} trip ends`,
					subtitle: `${who} · ${trip.trip_status}`,
					severity: severityFor(trip.travel_end),
					href: `/bookings?highlight=${trip.id}`,
				});
			}
		}

		for (const visa of data.visaApplications) {
			if (!visa.expiry_date) continue;
			const travelerName = visa.travelers?.name || "Traveler";
			events.push({
				id: visa.id,
				date: visa.expiry_date,
				type: "visa",
				title: `${visa.country} ${visa.visa_type} expires`,
				subtitle: travelerName,
				severity: severityFor(visa.expiry_date),
				href: "/visas",
			});
		}

		for (const task of data.tasks) {
			if (task.status === "Done") continue;
			const leadName = task.leads?.name || "Unnamed lead";
			events.push({
				id: task.id,
				date: task.due_date,
				type: "task",
				title: task.task_type,
				subtitle: leadName,
				severity: severityFor(task.due_date),
				href: `/tasks?highlight=${task.id}`,
			});
		}
	}

	if (hasFinancial) {
		// Unpaid invoices derived from booked_trips (payment_status != "Paid")
		for (const trip of data.bookedTrips) {
			if (!trip.invoice_number || trip.payment_status === "Paid") continue;
			const who = trip.leads?.name || "Unnamed";
			events.push({
				id: `inv-${trip.id}`,
				date: trip.booking_date ?? trip.created_at.slice(0, 10),
				type: "invoice",
				title: `Invoice ${trip.invoice_number}`,
				subtitle: `₹${trip.balance_due.toLocaleString("en-IN")} due · ${who}`,
				severity: severityFor(trip.booking_date),
				href: "/invoices",
			});
		}

		// Pending client payments (payment_date IS NULL)
		for (const p of data.payments) {
			if (p.payment_date !== null) continue;
			const clientName = p.booked_trips?.leads?.name || "Client";
			const dest = p.booked_trips?.destination || "";
			events.push({
				id: `pay-${p.id}`,
				date: p.created_at.slice(0, 10),
				type: "payment",
				title: `Collect from ${clientName}`,
				subtitle: `₹${p.amount.toLocaleString("en-IN")}${dest ? ` · ${dest}` : ""}`,
				severity: severityFor(p.created_at.slice(0, 10)),
				href: "/spendings",
			});
		}
	}

	return events.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function isFinancialEventType(type: CalendarEventType): boolean {
	return FINANCIAL_TYPES.includes(type);
}
