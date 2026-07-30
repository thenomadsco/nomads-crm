// Types mirror the real Supabase schema exactly (column names, nullability).
// All data is now fetched from Supabase via app/lib/db.ts.

// ── Leads ────────────────────────────────────────────────────────────────────

export type LeadStatus = "New" | "Contacted" | "Converted" | "Lost";
export type LeadCategory = "Hot" | "Warm" | "Cold";

export type Lead = {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	destination: string | null;
	timeline: string | null;
	trip_category: string | null;
	travelers: number | null;
	vibe: string | null;
	budget: number;
	contact_method: string | null;
	lead_category: LeadCategory | null;
	lead_score: number | null;
	urgency_level: "Low" | "Medium" | "High" | null;
	ai_summary: string | null;
	next_action: string | null;
	lead_status: LeadStatus;
	source: string | null;
	is_test: boolean;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	contact_consent: boolean;
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type Task = {
	id: string;
	lead_id: string;
	task_type: string;
	priority: "High" | "Medium" | "Low";
	due_date: string;
	status: "Open" | "Done";
	notes: string | null;
	created_at: string;
	escalated: boolean;
	// joined
	leads?: { name: string | null; destination: string | null } | null;
};

// ── Bookings ──────────────────────────────────────────────────────────────────

export type BookedTrip = {
	id: string;
	lead_id: string;
	trip_name: string;
	destination: string;
	travel_start: string | null;
	travel_end: string | null;
	invoice_number: string | null;
	invoice_file_url: string | null;
	total_invoice_value: number;
	amount_paid: number;
	balance_due: number;
	payment_status: string; // "Paid" | "Partial" | "Unpaid" | "Advance Paid" etc.
	booking_date: string | null;
	trip_status: string; // "Confirmed" | "Completed" | "Cancelled" | "Planning"
	created_at: string;
	trip_group_id: string | null;
	// joined
	leads?: { name: string | null } | null;
};

export type BookingItem = {
	id: string;
	booked_trip_id: string;
	item_type: string;
	provider: string | null;
	start_date: string | null;
	end_date: string | null;
	confirmation_number: string | null;
	cost: number;
	created_at: string;
};

// ── Payments ──────────────────────────────────────────────────────────────────

export type Payment = {
	id: string;
	booked_trip_id: string;
	amount: number;
	payment_date: string | null; // null = not yet paid / pending
	method: string | null;
	created_at: string;
	// joined
	booked_trips?: { destination: string; lead_id: string; leads?: { name: string | null } | null } | null;
};

// ── Travelers ─────────────────────────────────────────────────────────────────

export type Traveler = {
	id: string;
	lead_id: string | null;
	name: string;
	passport_number: string | null;
	date_of_birth: string | null;
	nationality: string | null;
	created_at: string;
	// joined
	leads?: { name: string | null; destination: string | null } | null;
};

export type TripTraveler = {
	id: string;
	booked_trip_id: string;
	traveler_id: string;
	created_at: string;
};

// ── Visas ─────────────────────────────────────────────────────────────────────

export type VisaApplication = {
	id: string;
	traveler_id: string;
	booked_trip_id: string | null;
	country: string;
	visa_type: string;
	status: "Pending" | "Approved" | "Rejected";
	submission_date: string | null;
	appointment_date: string | null;
	expiry_date: string | null;
	created_at: string;
	// joined
	travelers?: { name: string } | null;
};

// ── Documents ─────────────────────────────────────────────────────────────────

export type Document = {
	id: string;
	traveler_id: string | null;
	booked_trip_id: string | null;
	document_type: string;
	file_url: string | null;
	uploaded_at: string;
	// joined
	travelers?: { name: string; lead_id: string | null } | null;
	booked_trips?: { destination: string; leads?: { name: string | null } | null } | null;
};

// ── Quotes ────────────────────────────────────────────────────────────────────

export type Quote = {
	id: string;
	lead_id: string;
	amount: number;
	sent_date: string | null;
	status: "Draft" | "Sent" | "Accepted" | "Expired";
	created_at: string;
	// joined
	leads?: { name: string | null; destination: string | null } | null;
};

// ── Feedback ──────────────────────────────────────────────────────────────────

export type FeedbackEntry = {
	id: string;
	booked_trip_id: string;
	rating: number;
	quote_text: string | null;
	collected_date: string | null;
	created_at: string;
	// joined
	booked_trips?: { destination: string; trip_name: string; leads?: { name: string | null } | null } | null;
};

// ── Inquiries ─────────────────────────────────────────────────────────────────

export type Inquiry = {
	id: string;
	lead_id: string;
	destination: string | null;
	timeline: string | null;
	vibe: string | null;
	travelers: number | null;
	created_at: string;
};

// ── Follow-ups ────────────────────────────────────────────────────────────────

export type FollowUp = {
	id: string;
	lead_id: string;
	follow_up_date: string;
	message_template: string | null;
	sequence_stage: number;
	completed: boolean;
	created_at: string;
};

// ── Utilities ─────────────────────────────────────────────────────────────────

export function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr: string | null | undefined): number {
	if (!dateStr) return Infinity;
	const ms = new Date(dateStr).getTime() - new Date(today()).getTime();
	return Math.round(ms / (1000 * 60 * 60 * 24));
}
