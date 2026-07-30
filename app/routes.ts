import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
	index("routes/login.tsx"),
	layout("routes/_app.tsx", [
		route("dashboard", "routes/dashboard.tsx"),
		route("pending", "routes/pending-work.tsx"),
		route("calendar", "routes/calendar.tsx"),
		route("leads", "routes/leads.tsx"),
		route("tasks", "routes/tasks.tsx"),
		route("bookings", "routes/bookings.tsx"),
		route("travelers", "routes/travelers.tsx"),
		route("visas", "routes/visas.tsx"),
		route("documents", "routes/documents.tsx"),
		route("quotes", "routes/quotes.tsx"),
		route("invoices", "routes/invoices.tsx"),
		route("spendings", "routes/spendings.tsx"),
		route("feedback", "routes/feedback.tsx"),
		route("settings", "routes/settings.tsx"),
	]),
] satisfies RouteConfig;
