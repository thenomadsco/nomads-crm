import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth, type Role } from "~/lib/auth-context";

export type NotificationType =
	| "new_lead"
	| "hot_lead"
	| "task_overdue"
	| "visa_expiring"
	| "payment_received"
	| "payment_overdue"
	| "card_bill_due"
	| "no_activity";

export const NOTIFICATION_TYPES: { id: NotificationType; label: string; description: string }[] = [
	{ id: "new_lead", label: "New lead", description: "Any new lead submitted through the website." },
	{ id: "hot_lead", label: "Hot lead", description: "A new lead scores 75+ and needs same-day outreach." },
	{ id: "task_overdue", label: "Task overdue", description: "An open task has passed its due date." },
	{ id: "visa_expiring", label: "Visa/passport expiring", description: "A traveler's visa or passport expires within 30 days." },
	{ id: "payment_received", label: "Payment received", description: "A client payment has been marked Paid." },
	{ id: "payment_overdue", label: "Payment overdue", description: "An expected payment is past due." },
	{ id: "card_bill_due", label: "Card bill due", description: "A company credit card bill is due soon or overdue." },
	{ id: "no_activity", label: "No recent activity", description: "No new leads, tasks, or bookings logged in 3+ days — something may be stuck or broken." },
];

export type NotificationEvent = {
	id: string;
	type: NotificationType;
	title: string;
	body: string;
	created_at: string;
	read: boolean;
};

const SEED_EVENTS: NotificationEvent[] = [
	{ id: "n1", type: "hot_lead", title: "Hot lead: Vikram & Priya Shah", body: "Scored 91 — Switzerland anniversary trip, returning customer.", created_at: "2026-07-26T14:31:00Z", read: false },
	{ id: "n2", type: "task_overdue", title: "Task overdue: Arjun Desai", body: "Email Follow-Up was due 2026-07-25.", created_at: "2026-07-26T09:00:00Z", read: false },
	{ id: "n3", type: "visa_expiring", title: "Visa expiring: Ananya Rao", body: "Maldives Visa on Arrival expires 2026-08-20.", created_at: "2026-07-25T08:00:00Z", read: true },
	{ id: "n4", type: "payment_received", title: "Payment received: Ananya Rao", body: "₹1,00,000 via Credit Card for Maldives trip.", created_at: "2026-07-26T11:20:00Z", read: true },
	{ id: "n5", type: "no_activity", title: "No recent activity", body: "No new leads or task updates logged since 2026-07-24 (3 days). Check the funnel and cron logs.", created_at: "2026-07-27T07:00:00Z", read: false },
	{ id: "n6", type: "card_bill_due", title: "Card bill overdue: HDFC Biz ••1042", body: "₹4,12,500 was due 2026-07-25.", created_at: "2026-07-26T08:00:00Z", read: false },
	{ id: "n7", type: "card_bill_due", title: "Card bill due soon: ICICI Corp ••7788", body: "₹5,600 due 2026-07-30.", created_at: "2026-07-27T08:00:00Z", read: false },
];

const DEFAULT_PREFS: Record<Role, Record<NotificationType, boolean>> = {
	vedant: { new_lead: true, hot_lead: true, task_overdue: true, visa_expiring: true, payment_received: true, payment_overdue: true, card_bill_due: true, no_activity: true },
	kirti: { new_lead: true, hot_lead: true, task_overdue: true, visa_expiring: true, payment_received: false, payment_overdue: false, card_bill_due: false, no_activity: true },
	billing: { new_lead: false, hot_lead: false, task_overdue: false, visa_expiring: false, payment_received: true, payment_overdue: true, card_bill_due: true, no_activity: false },
};

const PREFS_KEY = "nomads-crm.notification-prefs";
const EVENTS_KEY = "nomads-crm.notification-events";

type NotificationsContextValue = {
	prefs: Record<Role, Record<NotificationType, boolean>>;
	setPref: (role: Role, type: NotificationType, enabled: boolean) => void;
	visibleEvents: NotificationEvent[];
	unreadCount: number;
	markRead: (id: string) => void;
	markAllRead: () => void;
	simulateEvent: (type: NotificationType) => void;
	pushEvent: (type: NotificationType, title: string, body: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [prefs, setPrefs] = useState(DEFAULT_PREFS);
	const [events, setEvents] = useState<NotificationEvent[]>(SEED_EVENTS);

	useEffect(() => {
		try {
			const storedPrefs = window.localStorage.getItem(PREFS_KEY);
			if (storedPrefs) setPrefs(JSON.parse(storedPrefs));
			const storedEvents = window.localStorage.getItem(EVENTS_KEY);
			if (storedEvents) setEvents(JSON.parse(storedEvents));
		} catch {
			// ignore malformed localStorage — fall back to defaults
		}
	}, []);

	function savePrefs(next: typeof prefs) {
		setPrefs(next);
		try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
	}

	function saveEvents(updater: NotificationEvent[] | ((prev: NotificationEvent[]) => NotificationEvent[])) {
		setEvents((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater;
			try { window.localStorage.setItem(EVENTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
			return next;
		});
	}

	function setPref(role: Role, type: NotificationType, enabled: boolean) {
		savePrefs({ ...prefs, [role]: { ...prefs[role], [type]: enabled } });
	}

	function markRead(id: string) {
		saveEvents((prev) => prev.map((e) => (e.id === id ? { ...e, read: true } : e)));
	}

	function markAllRead() {
		saveEvents((prev) => prev.map((e) => ({ ...e, read: true })));
	}

	function simulateEvent(type: NotificationType) {
		const meta = NOTIFICATION_TYPES.find((t) => t.id === type)!;
		const event: NotificationEvent = {
			id: `sim-${Date.now()}`,
			type,
			title: meta.label,
			body: "Test alert triggered from Settings.",
			created_at: new Date().toISOString(),
			read: false,
		};
		saveEvents((prev) => [event, ...prev]);
		if (user && prefs[user.role]?.[type]) {
			toast(meta.label, { description: event.body });
		}
	}

	function pushEvent(type: NotificationType, title: string, body: string) {
		const event: NotificationEvent = {
			id: `live-${Date.now()}`,
			type,
			title,
			body,
			created_at: new Date().toISOString(),
			read: false,
		};
		saveEvents((prev) => [event, ...prev]);
		if (user && prefs[user.role]?.[type]) {
			toast(title, { description: body });
		}
	}

	const visibleEvents = user ? events.filter((e) => prefs[user.role]?.[e.type]) : [];
	const unreadCount = visibleEvents.filter((e) => !e.read).length;

	return (
		<NotificationsContext.Provider
			value={{ prefs, setPref, visibleEvents, unreadCount, markRead, markAllRead, simulateEvent, pushEvent }}
		>
			{children}
		</NotificationsContext.Provider>
	);
}

export function useNotifications() {
	const ctx = useContext(NotificationsContext);
	if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
	return ctx;
}
