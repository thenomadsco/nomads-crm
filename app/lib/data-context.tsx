import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type {
	Lead,
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
import {
	fetchLeads,
	fetchTasks,
	fetchBookedTrips,
	fetchBookingItems,
	fetchPayments,
	fetchTravelers,
	fetchTripTravelers,
	fetchVisaApplications,
	fetchDocuments,
	fetchQuotes,
	fetchFeedback,
	fetchInquiries,
	fetchFollowUps,
	computeLeadScore,
} from "./db";
import { supabase } from "./supabase";
import { useNotifications } from "./notifications";

type DataState = {
	leads: Lead[];
	tasks: Task[];
	bookedTrips: BookedTrip[];
	bookingItems: BookingItem[];
	payments: Payment[];
	travelers: Traveler[];
	tripTravelers: TripTraveler[];
	visaApplications: VisaApplication[];
	documents: Document[];
	quotes: Quote[];
	feedback: FeedbackEntry[];
	inquiries: Inquiry[];
	followUps: FollowUp[];
	loading: boolean;
	error: string | null;
	// Local-only mutations (optimistic update in context, persisted to Supabase via db.ts)
	setLeads: (leads: Lead[]) => void;
	setTasks: (tasks: Task[]) => void;
	setBookedTrips: (trips: BookedTrip[]) => void;
	setPayments: (payments: Payment[]) => void;
	setVisaApplications: (visas: VisaApplication[]) => void;
	setQuotes: (quotes: Quote[]) => void;
	refetch: () => Promise<void>;
};

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
	const [leads, setLeads] = useState<Lead[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [bookedTrips, setBookedTrips] = useState<BookedTrip[]>([]);
	const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
	const [payments, setPayments] = useState<Payment[]>([]);
	const [travelers, setTravelers] = useState<Traveler[]>([]);
	const [tripTravelers, setTripTravelers] = useState<TripTraveler[]>([]);
	const [visaApplications, setVisaApplications] = useState<VisaApplication[]>([]);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [quotes, setQuotes] = useState<Quote[]>([]);
	const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
	const [inquiries, setInquiries] = useState<Inquiry[]>([]);
	const [followUps, setFollowUps] = useState<FollowUp[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { pushEvent } = useNotifications();
	const pushEventRef = useRef(pushEvent);
	useEffect(() => { pushEventRef.current = pushEvent; }, [pushEvent]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		const results = await Promise.allSettled([
			fetchLeads(),
			fetchTasks(),
			fetchBookedTrips(),
			fetchBookingItems(),
			fetchPayments(),
			fetchTravelers(),
			fetchTripTravelers(),
			fetchVisaApplications(),
			fetchDocuments(),
			fetchQuotes(),
			fetchFeedback(),
			fetchInquiries(),
			fetchFollowUps(),
		]);
		const get = <T,>(i: number, fallback: T): T =>
			results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<T>).value : fallback;
		const errors = results
			.map((r, i) => (r.status === "rejected" ? `[${i}] ${(r as PromiseRejectedResult).reason}` : null))
			.filter(Boolean);
		setLeads(get(0, []));
		setTasks(get(1, []));
		setBookedTrips(get(2, []));
		setBookingItems(get(3, []));
		setPayments(get(4, []));
		setTravelers(get(5, []));
		setTripTravelers(get(6, []));
		setVisaApplications(get(7, []));
		setDocuments(get(8, []));
		setQuotes(get(9, []));
		setFeedback(get(10, []));
		setInquiries(get(11, []));
		setFollowUps(get(12, []));
		setError(errors.length ? errors.join("; ") : null);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	// Supabase Realtime — listen for new leads inserted from the website
	useEffect(() => {
		const channel = supabase
			.channel("crm-leads-realtime")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "leads" },
				(payload) => {
					const newLead = payload.new as Lead;
					if (newLead.is_test || newLead.deleted_at) return;
					const score = newLead.lead_score ?? computeLeadScore(newLead);
					const enriched: Lead = { ...newLead, lead_score: score };
					setLeads((prev) => {
						// avoid duplicates if refetch already captured it
						if (prev.some((l) => l.id === enriched.id)) return prev;
						return [enriched, ...prev];
					});
					const dest = [newLead.destination, newLead.trip_category].filter(Boolean).join(" · ");
					if (score >= 75) {
						pushEventRef.current(
							"hot_lead",
							`Hot lead: ${newLead.name || "New lead"}`,
							`Scored ${score}${dest ? ` · ${dest}` : ""}`,
						);
					} else {
						pushEventRef.current(
							"new_lead",
							`New lead: ${newLead.name || "Unknown"}`,
							`Scored ${score}${dest ? ` · ${dest}` : ""}`,
						);
					}
				},
			)
			.subscribe();

		return () => { supabase.removeChannel(channel); };
	}, []); // intentionally empty — channel is stable for app lifetime

	return (
		<DataContext.Provider
			value={{
				leads,
				tasks,
				bookedTrips,
				bookingItems,
				payments,
				travelers,
				tripTravelers,
				visaApplications,
				documents,
				quotes,
				feedback,
				inquiries,
				followUps,
				loading,
				error,
				setLeads,
				setTasks,
				setBookedTrips,
				setPayments,
				setVisaApplications,
				setQuotes,
				refetch: load,
			}}
		>
			{children}
		</DataContext.Provider>
	);
}

export function useData(): DataState {
	const ctx = useContext(DataContext);
	if (!ctx) throw new Error("useData must be used inside DataProvider");
	return ctx;
}
