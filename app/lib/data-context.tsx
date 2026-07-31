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
	fetchLeadsSince,
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
		let active = true;
		let retryTimer: ReturnType<typeof setTimeout> | null = null;
		let currentChannel: ReturnType<typeof supabase.channel> | null = null;

		function handlePayload(payload: { new: unknown }) {
			const newLead = payload.new as Lead;
			if (newLead.is_test || newLead.deleted_at) return;
			const score = newLead.lead_score ?? computeLeadScore(newLead);
			const enriched: Lead = { ...newLead, lead_score: score };
			setLeads((prev) => {
				if (prev.some((l) => l.id === enriched.id)) return prev;
				return [enriched, ...prev];
			});
			const dest = [newLead.destination, newLead.trip_category].filter(Boolean).join(" · ");
			const isHot = score >= 75;
			const notifTitle = isHot
				? `Hot lead: ${newLead.name || "New lead"}`
				: `New lead: ${newLead.name || "Unknown"}`;
			const notifBody = `Scored ${score}${dest ? ` · ${dest}` : ""}`;

			pushEventRef.current(isHot ? "hot_lead" : "new_lead", notifTitle, notifBody);

			if (typeof Notification !== "undefined" && Notification.permission === "granted") {
				if ("serviceWorker" in navigator) {
					navigator.serviceWorker.ready.then((reg) => {
						reg.showNotification(notifTitle, {
							body: notifBody,
							icon: "/icons/icon-192.png",
							badge: "/icons/icon-192.png",
							tag: "new-lead",
							renotify: true,
						});
					}).catch(() => {
						new Notification(notifTitle, { body: notifBody, icon: "/icons/icon-192.png" });
					});
				} else {
					new Notification(notifTitle, { body: notifBody, icon: "/icons/icon-192.png" });
				}
			}
		}

		function subscribe() {
			if (!active) return;
			currentChannel = supabase
				.channel(`crm-leads-realtime-${Date.now()}`)
				.on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, handlePayload)
				.subscribe((status) => {
					if (!active) return;
					if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
						if (currentChannel) supabase.removeChannel(currentChannel);
						retryTimer = setTimeout(subscribe, 5000);
					}
				});
		}

		subscribe();

		return () => {
			active = false;
			if (retryTimer) clearTimeout(retryTimer);
			if (currentChannel) supabase.removeChannel(currentChannel);
		};
	}, []);

	// Polling fallback — catches new leads every 15s regardless of Realtime status
	useEffect(() => {
		// Track the newest lead timestamp seen so far
		const latestRef = { current: new Date().toISOString() };

		const poll = async () => {
			try {
				const newLeads = await fetchLeadsSince(latestRef.current);
				if (newLeads.length === 0) return;
				// Update timestamp to newest we've seen
				latestRef.current = newLeads[0].created_at;
				const enriched = newLeads.map((l) => ({
					...l,
					lead_score: l.lead_score ?? computeLeadScore(l),
				}));
				setLeads((prev) => {
					const currentIds = new Set(prev.map((l) => l.id));
					const added = enriched.filter((l) => !currentIds.has(l.id));
					if (added.length === 0) return prev;
					// Fire notifications for each genuinely new lead
					added.forEach((lead) => {
						const score = lead.lead_score ?? 0;
						const isHot = score >= 75;
						const dest = [lead.destination, lead.trip_category].filter(Boolean).join(" · ");
						const title = isHot ? `Hot lead: ${lead.name || "New lead"}` : `New lead: ${lead.name || "Unknown"}`;
						const body = `Scored ${score}${dest ? ` · ${dest}` : ""}`;
						pushEventRef.current(isHot ? "hot_lead" : "new_lead", title, body);
						if (typeof Notification !== "undefined" && Notification.permission === "granted") {
							if ("serviceWorker" in navigator) {
								navigator.serviceWorker.ready.then((reg) =>
									reg.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "new-lead", renotify: true })
								).catch(() => new Notification(title, { body }));
							} else {
								new Notification(title, { body });
							}
						}
					});
					return [...added, ...prev];
				});
			} catch { /* silent — polling is a fallback */ }
		};

		const interval = setInterval(poll, 15000);
		return () => clearInterval(interval);
	}, []);

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
