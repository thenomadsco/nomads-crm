import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
import { useIsMobile } from "~/hooks/use-mobile";
import { getCalendarEvents, EVENT_TYPE_LABEL, type CalendarEvent, type CalendarEventType } from "~/lib/calendar";
import { daysUntil, today as todayStr } from "~/lib/mock-data";

const TYPE_COLOR: Record<CalendarEventType, string> = {
	trip: "bg-primary",
	visa: "bg-accent",
	task: "bg-amber-500",
	invoice: "bg-destructive",
	payment: "bg-sky-500",
};

function ymd(d: Date) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SeverityBadge({ severity }: { severity: CalendarEvent["severity"] }) {
	return (
		<Badge variant={severity === "overdue" ? "destructive" : severity === "due_soon" ? "secondary" : "outline"}>
			{severity === "overdue" ? "Overdue" : severity === "due_soon" ? "Due soon" : "Upcoming"}
		</Badge>
	);
}

function EventRow({ event, navigate }: { event: CalendarEvent; navigate: (href: string) => void }) {
	return (
		<button
			onClick={() => navigate(event.href)}
			className="flex w-full min-h-[44px] items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/5"
		>
			<span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_COLOR[event.type])} />
			<div className="flex-1">
				<p className="text-sm font-medium">{event.title}</p>
				<p className="text-xs text-muted-foreground">{event.subtitle}</p>
			</div>
			<SeverityBadge severity={event.severity} />
		</button>
	);
}

function TypeFilterTabs({
	typeFilter,
	setTypeFilter,
	availableTypes,
}: {
	typeFilter: CalendarEventType | "All";
	setTypeFilter: (v: CalendarEventType | "All") => void;
	availableTypes: CalendarEventType[];
}) {
	return (
		<Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as CalendarEventType | "All")}>
			<TabsList className="h-auto flex-wrap justify-start">
				<TabsTrigger value="All">All</TabsTrigger>
				{availableTypes.map((t) => (
					<TabsTrigger key={t} value={t}>
						{EVENT_TYPE_LABEL[t]}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}

const AGENDA_GROUP_ORDER = ["Overdue", "Today", "This week", "Upcoming"] as const;

function groupForAgenda(event: CalendarEvent): (typeof AGENDA_GROUP_ORDER)[number] {
	const d = daysUntil(event.date);
	if (d === Infinity || d > 7) return "Upcoming";
	if (d < 0) return "Overdue";
	if (d === 0) return "Today";
	return "This week";
}

function AgendaView({
	events,
	typeFilter,
	setTypeFilter,
	availableTypes,
	navigate,
}: {
	events: CalendarEvent[];
	typeFilter: CalendarEventType | "All";
	setTypeFilter: (v: CalendarEventType | "All") => void;
	availableTypes: CalendarEventType[];
	navigate: (href: string) => void;
}) {
	const grouped = useMemo(() => {
		const groups: Record<string, CalendarEvent[]> = { Overdue: [], Today: [], "This week": [], Upcoming: [] };
		for (const e of events) groups[groupForAgenda(e)].push(e);
		return groups;
	}, [events]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-display text-2xl font-semibold">Calendar</h1>
				<p className="text-sm text-muted-foreground">Trip, visa, task, and finance dates — agenda view.</p>
			</div>
			<TypeFilterTabs typeFilter={typeFilter} setTypeFilter={setTypeFilter} availableTypes={availableTypes} />
			<div className="space-y-8">
				{AGENDA_GROUP_ORDER.map((group) => {
					const items = grouped[group];
					if (items.length === 0) return null;
					return (
						<div key={group}>
							<h2
								className={cn(
									"mb-3 text-xs font-semibold tracking-wide uppercase",
									group === "Overdue" ? "text-destructive" : "text-muted-foreground",
								)}
							>
								{group} · {items.length}
							</h2>
							<div className="space-y-2">
								<AnimatePresence initial={false}>
									{items.map((e) => (
										<motion.div key={e.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
											<EventRow event={e} navigate={navigate} />
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</div>
					);
				})}
				{events.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nothing on the calendar for this filter.</p>}
			</div>
		</div>
	);
}

export default function CalendarPage() {
	const { user } = useAuth();
	const { bookedTrips, visaApplications, tasks, payments, loading } = useData();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const [typeFilter, setTypeFilter] = useState<CalendarEventType | "All">("All");

	const todayDate = useMemo(() => todayStr(), []);
	const todayObj = useMemo(() => new Date(`${todayDate}T00:00:00`), [todayDate]);
	const [cursor, setCursor] = useState(() => new Date(todayObj.getFullYear(), todayObj.getMonth(), 1));
	const [selectedDate, setSelectedDate] = useState<string | null>(todayDate);

	const events = useMemo(() => {
		if (!user || loading) return [];
		return getCalendarEvents(user.scopes, { bookedTrips, visaApplications, tasks, payments });
	}, [user, loading, bookedTrips, visaApplications, tasks, payments]);

	const availableTypes = useMemo(() => {
		const seen = new Set<CalendarEventType>();
		const ordered: CalendarEventType[] = [];
		for (const e of events) {
			if (!seen.has(e.type)) {
				seen.add(e.type);
				ordered.push(e.type);
			}
		}
		return ordered;
	}, [events]);

	const filtered = typeFilter === "All" ? events : events.filter((e) => e.type === typeFilter);

	const eventsByDate = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		for (const e of filtered) {
			const list = map.get(e.date) ?? [];
			list.push(e);
			map.set(e.date, list);
		}
		return map;
	}, [filtered]);

	if (!user) return null;

	if (isMobile) {
		return (
			<AgendaView
				events={filtered}
				typeFilter={typeFilter}
				setTypeFilter={setTypeFilter}
				availableTypes={availableTypes}
				navigate={navigate}
			/>
		);
	}

	const year = cursor.getFullYear();
	const month = cursor.getMonth();
	const firstOfMonth = new Date(year, month, 1);
	const startWeekday = firstOfMonth.getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const cells: (Date | null)[] = [];
	for (let i = 0; i < startWeekday; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
	while (cells.length % 7 !== 0) cells.push(null);

	const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Calendar</h1>
					<p className="text-sm text-muted-foreground">Trip, visa, task, and finance dates in one view.</p>
				</div>
				<TypeFilterTabs typeFilter={typeFilter} setTypeFilter={setTypeFilter} availableTypes={availableTypes} />
			</div>

			{loading && <p className="text-sm text-muted-foreground">Loading calendar data…</p>}

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
				<Card className="p-4">
					<div className="mb-4 flex items-center justify-between">
						<button
							onClick={() => setCursor(new Date(year, month - 1, 1))}
							className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent/10"
							aria-label="Previous month"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<h2 className="text-sm font-semibold">
							{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
						</h2>
						<button
							onClick={() => setCursor(new Date(year, month + 1, 1))}
							className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent/10"
							aria-label="Next month"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
					<div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
						{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
							<div key={d}>{d}</div>
						))}
					</div>
					<div className="grid grid-cols-7 gap-1">
						{cells.map((date, i) => {
							if (!date) return <div key={`pad-${i}`} />;
							const key = ymd(date);
							const dayEvents = eventsByDate.get(key) ?? [];
							const isToday = key === todayDate;
							const isSelected = key === selectedDate;
							return (
								<button
									key={key}
									onClick={() => setSelectedDate(key)}
									className={cn(
										"flex min-h-[56px] flex-col items-center gap-1 rounded-md border p-1.5 text-xs transition-colors",
										isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-border hover:bg-accent/5",
										isToday && !isSelected && "border-accent/50",
									)}
								>
									<span className={cn("font-medium", isToday && "text-accent")}>{date.getDate()}</span>
									<div className="flex flex-wrap justify-center gap-0.5">
										{dayEvents.slice(0, 4).map((e) => (
											<span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", TYPE_COLOR[e.type])} />
										))}
									</div>
								</button>
							);
						})}
					</div>
				</Card>

				<Card className="p-4">
					<h2 className="mb-3 text-sm font-semibold">
						{selectedDate
							? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
							: "Select a date"}
					</h2>
					<div className="space-y-2">
						{selectedEvents.length === 0 && <p className="text-sm text-muted-foreground">No events this day.</p>}
						<AnimatePresence initial={false}>
							{selectedEvents.map((e) => (
								<motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
									<EventRow event={e} navigate={navigate} />
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</Card>
			</div>
		</div>
	);
}
