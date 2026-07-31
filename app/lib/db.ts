import { supabase } from "./supabase";
import type {
	Lead,
	LeadStatus,
	Task,
	BookedTrip,
	BookingItem,
	Payment,
	Traveler,
	TripTraveler,
	VisaApplication,
	Document,
	Quote,
	FeedbackEntry,
	Inquiry,
	FollowUp,
} from "./mock-data";

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
	const { error } = await supabase.from("leads").update({ lead_status: status }).eq("id", id);
	if (error) throw new Error(`updateLeadStatus: ${error.message}`);
}

export async function fetchLeads(): Promise<Lead[]> {
	const { data, error } = await supabase
		.from("leads")
		.select("*")
		.is("deleted_at", null)
		.or("is_test.is.null,is_test.eq.false")
		.order("created_at", { ascending: false })
		.range(0, 9999);
	if (error) throw new Error(`fetchLeads: ${error.message}`);
	return (data ?? []) as Lead[];
}

export async function fetchLeadsSince(since: string): Promise<Lead[]> {
	const { data, error } = await supabase
		.from("leads")
		.select("*")
		.gt("created_at", since)
		.is("deleted_at", null)
		.or("is_test.is.null,is_test.eq.false")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchLeadsSince: ${error.message}`);
	return (data ?? []) as Lead[];
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
	const { data, error } = await supabase
		.from("tasks")
		.select("*, leads(name, destination)")
		.order("due_date", { ascending: true });
	if (error) throw new Error(`fetchTasks: ${error.message}`);
	return (data ?? []) as Task[];
}

export async function updateTaskStatus(id: string, status: "Open" | "Done"): Promise<void> {
	const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
	if (error) throw new Error(`updateTaskStatus: ${error.message}`);
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function fetchBookedTrips(): Promise<BookedTrip[]> {
	const { data, error } = await supabase
		.from("booked_trips")
		.select("*, leads(name)")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchBookedTrips: ${error.message}`);
	return (data ?? []) as BookedTrip[];
}

export async function fetchBookingItems(): Promise<BookingItem[]> {
	const { data, error } = await supabase
		.from("booking_items")
		.select("*")
		.order("created_at", { ascending: true });
	if (error) throw new Error(`fetchBookingItems: ${error.message}`);
	return (data ?? []) as BookingItem[];
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function fetchPayments(): Promise<Payment[]> {
	const { data, error } = await supabase
		.from("payments")
		.select("*, booked_trips(destination, lead_id, leads(name))")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchPayments: ${error.message}`);
	return (data ?? []) as Payment[];
}

// ── Travelers ─────────────────────────────────────────────────────────────────

export async function fetchTravelers(): Promise<Traveler[]> {
	const { data, error } = await supabase
		.from("travelers")
		.select("*, leads(name, destination)")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchTravelers: ${error.message}`);
	return (data ?? []) as Traveler[];
}

export async function fetchTripTravelers(): Promise<TripTraveler[]> {
	const { data, error } = await supabase
		.from("trip_travelers")
		.select("*");
	if (error) throw new Error(`fetchTripTravelers: ${error.message}`);
	return (data ?? []) as TripTraveler[];
}

// ── Visas ─────────────────────────────────────────────────────────────────────

export async function fetchVisaApplications(): Promise<VisaApplication[]> {
	const { data, error } = await supabase
		.from("visa_applications")
		.select("*, travelers(name)")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchVisaApplications: ${error.message}`);
	return (data ?? []) as VisaApplication[];
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function fetchDocuments(): Promise<Document[]> {
	const { data, error } = await supabase
		.from("documents")
		.select("*, travelers(name, lead_id), booked_trips(destination, leads(name))")
		.order("uploaded_at", { ascending: false });
	if (error) throw new Error(`fetchDocuments: ${error.message}`);
	return (data ?? []) as Document[];
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function fetchQuotes(): Promise<Quote[]> {
	const { data, error } = await supabase
		.from("quotes")
		.select("*, leads(name, destination)")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchQuotes: ${error.message}`);
	return (data ?? []) as Quote[];
}

export async function updateQuoteStatus(id: string, status: Quote["status"]): Promise<void> {
	const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
	if (error) throw new Error(`updateQuoteStatus: ${error.message}`);
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function fetchFeedback(): Promise<FeedbackEntry[]> {
	const { data, error } = await supabase
		.from("feedback")
		.select("*, booked_trips(destination, trip_name, leads(name))")
		.order("created_at", { ascending: false });
	if (error) throw new Error(`fetchFeedback: ${error.message}`);
	return (data ?? []) as FeedbackEntry[];
}

// ── Inquiries ─────────────────────────────────────────────────────────────────

export async function fetchInquiries(): Promise<Inquiry[]> {
	const { data, error } = await supabase
		.from("inquiries")
		.select("*")
		.order("created_at", { ascending: false });
	if (error) return [];
	return (data ?? []) as Inquiry[];
}

// ── Follow-ups ────────────────────────────────────────────────────────────────

export async function fetchFollowUps(): Promise<FollowUp[]> {
	const { data, error } = await supabase
		.from("follow_ups")
		.select("*")
		.order("follow_up_date", { ascending: true });
	if (error) throw new Error(`fetchFollowUps: ${error.message}`);
	return (data ?? []) as FollowUp[];
}

// ── Lead scoring ──────────────────────────────────────────────────────────────

export function computeLeadScore(lead: Partial<Lead>): number {
	let score = 0;

	// Budget (max 30)
	const b = lead.budget ?? 0;
	if (b >= 300000) score += 30;
	else if (b >= 100000) score += 20;
	else if (b >= 50000) score += 10;
	else if (b > 0) score += 5;

	// Urgency (max 25)
	if (lead.urgency_level === "High") score += 25;
	else if (lead.urgency_level === "Medium") score += 15;
	else if (lead.urgency_level === "Low") score += 5;

	// Group size (max 15)
	const t = lead.travelers ?? 1;
	if (t >= 8) score += 15;
	else if (t >= 4) score += 12;
	else if (t >= 2) score += 10;
	else score += 5;

	// Destination provided (+10)
	if (lead.destination?.trim()) score += 10;

	// Contact completeness (max 10)
	if (lead.phone?.trim()) score += 5;
	if (lead.email?.trim()) score += 5;

	// Profile completeness (max 10)
	if (lead.vibe?.trim()) score += 5;
	if (lead.trip_category?.trim()) score += 3;
	if (lead.contact_method?.trim()) score += 2;

	return Math.min(100, score);
}

export function scoreToUrgency(score: number): "High" | "Medium" | "Low" {
	if (score >= 75) return "High";
	if (score >= 50) return "Medium";
	return "Low";
}

export async function batchScoreLeads(): Promise<number> {
	// Fetch all unscored non-deleted leads in pages to avoid oversized responses
	let scored = 0;
	let from = 0;
	const pageSize = 200;

	while (true) {
		const { data, error } = await supabase
			.from("leads")
			.select("id,budget,urgency_level,travelers,destination,phone,email,vibe,trip_category,contact_method")
			.is("lead_score", null)
			.is("deleted_at", null)
			.range(from, from + pageSize - 1);
		if (error) throw new Error(`batchScoreLeads fetch: ${error.message}`);
		if (!data || data.length === 0) break;

		const updates = data.map((l) => {
			const s = computeLeadScore(l as Partial<Lead>);
			return { id: l.id, lead_score: s, urgency_level: scoreToUrgency(s) };
		});

		for (const u of updates) {
			const { error: ue } = await supabase
				.from("leads")
				.update({ lead_score: u.lead_score, urgency_level: u.urgency_level })
				.eq("id", u.id);
			if (ue) console.warn(`batchScoreLeads update ${u.id}: ${ue.message}`);
			else scored++;
		}

		if (data.length < pageSize) break;
		from += pageSize;
	}

	return scored;
}

// ── Create lead ───────────────────────────────────────────────────────────────

export type NewLeadInput = {
	name: string;
	email?: string;
	phone?: string;
	destination?: string;
	trip_category?: string;
	timeline?: string;
	travelers?: number;
	budget?: number;
	vibe?: string;
	contact_method?: string;
	urgency_level?: "High" | "Medium" | "Low";
	lead_status?: LeadStatus;
	source?: string;
	contact_consent?: boolean;
};

export async function createLead(input: NewLeadInput): Promise<Lead> {
	const score = computeLeadScore(input);
	const urgency = input.urgency_level ?? scoreToUrgency(score);

	const payload = {
		name: input.name,
		email: input.email || null,
		phone: input.phone || null,
		destination: input.destination || null,
		trip_category: input.trip_category || null,
		timeline: input.timeline || null,
		travelers: input.travelers ?? null,
		budget: input.budget ?? 0,
		vibe: input.vibe || null,
		contact_method: input.contact_method || null,
		urgency_level: urgency,
		lead_score: score,
		lead_status: input.lead_status ?? "New",
		source: input.source ?? "manual",
		contact_consent: input.contact_consent ?? false,
		is_test: false,
	};

	const { data, error } = await supabase
		.from("leads")
		.insert(payload)
		.select("*")
		.single();
	if (error) throw new Error(`createLead: ${error.message}`);
	return data as Lead;
}

// ── Create task ───────────────────────────────────────────────────────────────

export type NewTaskInput = {
	lead_id: string;
	task_type: string;
	priority: "High" | "Medium" | "Low";
	due_date: string;
	notes?: string;
};

export async function createTask(input: NewTaskInput): Promise<Task> {
	const { data, error } = await supabase
		.from("tasks")
		.insert({
			lead_id: input.lead_id,
			task_type: input.task_type,
			priority: input.priority,
			due_date: input.due_date,
			notes: input.notes || null,
			status: "Open",
			escalated: false,
		})
		.select("*, leads(name, destination)")
		.single();
	if (error) throw new Error(`createTask: ${error.message}`);
	return data as Task;
}

// ── Delete lead (soft) ────────────────────────────────────────────────────────

export async function deleteLead(id: string): Promise<void> {
	const { error } = await supabase
		.from("leads")
		.update({ deleted_at: new Date().toISOString() })
		.eq("id", id);
	if (error) throw new Error(`deleteLead: ${error.message}`);
}

// ── Update lead fields ────────────────────────────────────────────────────────

export type UpdateLeadInput = Partial<Pick<Lead,
	"name" | "email" | "phone" | "destination" | "trip_category" | "timeline" |
	"travelers" | "budget" | "vibe" | "contact_method" | "urgency_level" | "lead_status" | "source"
>> & { lead_score?: number };

export async function updateLead(id: string, fields: UpdateLeadInput): Promise<void> {
	const { error } = await supabase.from("leads").update(fields).eq("id", id);
	if (error) throw new Error(`updateLead: ${error.message}`);
}

// ── Update task ───────────────────────────────────────────────────────────────

export async function updateTask(id: string, fields: {
	task_type?: string;
	priority?: "High" | "Medium" | "Low";
	due_date?: string;
	notes?: string | null;
}): Promise<Task> {
	const { data, error } = await supabase
		.from("tasks")
		.update(fields)
		.eq("id", id)
		.select("*, leads(name, destination)")
		.single();
	if (error) throw new Error(`updateTask: ${error.message}`);
	return data as Task;
}

// ── Delete task ───────────────────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<void> {
	const { error } = await supabase.from("tasks").delete().eq("id", id);
	if (error) throw new Error(`deleteTask: ${error.message}`);
}

// ── Update booking ────────────────────────────────────────────────────────────

export async function updateBooking(id: string, fields: { trip_status?: string; payment_status?: string }): Promise<void> {
	const { error } = await supabase.from("booked_trips").update(fields).eq("id", id);
	if (error) throw new Error(`updateBooking: ${error.message}`);
}

// ── Create quote ──────────────────────────────────────────────────────────────

export type NewQuoteInput = {
	lead_id: string;
	amount: number;
	sent_date?: string;
	status?: Quote["status"];
};

export async function createQuote(input: NewQuoteInput): Promise<Quote> {
	const { data, error } = await supabase
		.from("quotes")
		.insert({
			lead_id: input.lead_id,
			amount: input.amount,
			sent_date: input.sent_date || null,
			status: input.status ?? "Draft",
		})
		.select("*, leads(name, destination)")
		.single();
	if (error) throw new Error(`createQuote: ${error.message}`);
	return data as Quote;
}

// ── Update visa ───────────────────────────────────────────────────────────────

export async function updateVisa(id: string, fields: {
	status?: VisaApplication["status"];
	appointment_date?: string | null;
	expiry_date?: string | null;
	submission_date?: string | null;
}): Promise<void> {
	const { error } = await supabase.from("visa_applications").update(fields).eq("id", id);
	if (error) throw new Error(`updateVisa: ${error.message}`);
}

// ── Create payment ────────────────────────────────────────────────────────────

export type NewPaymentInput = {
	booked_trip_id: string;
	amount: number;
	method?: string;
	payment_date?: string | null;
};

export async function createPayment(input: NewPaymentInput): Promise<Payment> {
	const { data, error } = await supabase
		.from("payments")
		.insert({
			booked_trip_id: input.booked_trip_id,
			amount: input.amount,
			method: input.method || null,
			payment_date: input.payment_date || null,
		})
		.select("*, booked_trips(destination, lead_id, leads(name))")
		.single();
	if (error) throw new Error(`createPayment: ${error.message}`);
	return data as Payment;
}

// ── Create booking ────────────────────────────────────────────────────────────

export type NewBookingInput = {
	lead_id: string;
	trip_name: string;
	destination: string;
	travel_start?: string;
	travel_end?: string;
	total_invoice_value?: number;
};

export async function createBooking(input: NewBookingInput): Promise<BookedTrip> {
	const invoiceValue = input.total_invoice_value ?? 0;
	const { data, error } = await supabase
		.from("booked_trips")
		.insert({
			lead_id: input.lead_id,
			trip_name: input.trip_name,
			destination: input.destination,
			travel_start: input.travel_start || null,
			travel_end: input.travel_end || null,
			total_invoice_value: invoiceValue,
			amount_paid: 0,
			balance_due: invoiceValue,
			payment_status: "Unpaid",
			trip_status: "Planning",
			booking_date: new Date().toISOString().slice(0, 10),
		})
		.select("*, leads(name)")
		.single();
	if (error) throw new Error(`createBooking: ${error.message}`);
	return data as BookedTrip;
}
