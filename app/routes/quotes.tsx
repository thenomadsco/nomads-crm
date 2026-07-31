import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "~/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useData } from "~/lib/data-context";
import { updateQuoteStatus, createQuote } from "~/lib/db";
import type { Quote } from "~/lib/mock-data";

type StatusFilter = "All" | Quote["status"];

const VARIANT: Record<Quote["status"], "default" | "secondary" | "destructive" | "outline"> = {
	Draft: "outline",
	Sent: "secondary",
	Accepted: "default",
	Expired: "destructive",
};

const NEXT_ACTION: Partial<Record<Quote["status"], { label: string; next: Quote["status"] }>> = {
	Draft: { label: "Send", next: "Sent" },
	Sent: { label: "Mark Accepted", next: "Accepted" },
};

const EMPTY_FORM = {
	lead_id: "",
	amount: "",
	sent_date: "",
	status: "Draft" as Quote["status"],
};

export default function Quotes() {
	const { quotes, leads, setQuotes, loading } = useData();
	const [filter, setFilter] = useState<StatusFilter>("All");
	const [showNewQuote, setShowNewQuote] = useState(false);
	const [form, setForm] = useState(EMPTY_FORM);
	const [saving, setSaving] = useState(false);

	async function advance(quote: Quote) {
		const action = NEXT_ACTION[quote.status];
		if (!action) return;
		setQuotes(quotes.map((q) => (q.id === quote.id ? { ...q, status: action.next } : q)));
		try {
			await updateQuoteStatus(quote.id, action.next);
			toast.success(`Quote marked as ${action.next}`);
		} catch {
			setQuotes(quotes.map((q) => (q.id === quote.id ? { ...q, status: quote.status } : q)));
			toast.error("Failed to update quote status");
		}
	}

	async function handleCreateQuote() {
		if (!form.lead_id || !form.amount) {
			toast.error("Lead and amount are required");
			return;
		}
		setSaving(true);
		try {
			const quote = await createQuote({
				lead_id: form.lead_id,
				amount: Number(form.amount),
				sent_date: form.sent_date || undefined,
				status: form.status,
			});
			setQuotes([quote, ...quotes]);
			toast.success("Quote created", { description: `₹${Number(form.amount).toLocaleString("en-IN")} · ${form.status}` });
			setShowNewQuote(false);
			setForm(EMPTY_FORM);
		} catch (e) {
			toast.error("Failed to create quote", { description: String(e) });
		} finally {
			setSaving(false);
		}
	}

	const filtered = useMemo(
		() => quotes.filter((q) => filter === "All" || q.status === filter),
		[quotes, filter],
	);

	// Sort leads for dropdown
	const sortedLeads = useMemo(
		() => [...leads].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
		[leads],
	);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Quotes</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length} of ${quotes.length} quotes`}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
						<TabsList>
							<TabsTrigger value="All">All</TabsTrigger>
							<TabsTrigger value="Draft">Draft</TabsTrigger>
							<TabsTrigger value="Sent">Sent</TabsTrigger>
							<TabsTrigger value="Accepted">Accepted</TabsTrigger>
							<TabsTrigger value="Expired">Expired</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button size="sm" onClick={() => setShowNewQuote(true)}>
						<Plus className="h-4 w-4 mr-1" />
						New Quote
					</Button>
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
							<TableHead>Lead</TableHead>
							<TableHead>Destination</TableHead>
							<TableHead>Amount</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Sent Date</TableHead>
							<TableHead className="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									Loading quotes…
								</TableCell>
							</TableRow>
						)}
						{!loading && filtered.map((q) => {
							const action = NEXT_ACTION[q.status];
							return (
								<TableRow key={q.id}>
									<TableCell className="font-medium">{q.leads?.name ?? "—"}</TableCell>
									<TableCell>{q.leads?.destination ?? <span className="text-muted-foreground">—</span>}</TableCell>
									<TableCell>₹{q.amount.toLocaleString("en-IN")}</TableCell>
									<TableCell>
										<Badge variant={VARIANT[q.status]}>{q.status}</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground">{q.sent_date ?? "—"}</TableCell>
									<TableCell className="text-right">
										{action && (
											<Button size="sm" variant="outline" onClick={() => advance(q)}>
												{action.label}
											</Button>
										)}
									</TableCell>
								</TableRow>
							);
						})}
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									No quotes match this filter.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>

			{/* New Quote Dialog */}
			<Dialog open={showNewQuote} onOpenChange={(open) => { if (!open) { setShowNewQuote(false); setForm(EMPTY_FORM); } }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>New Quote</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 text-sm">
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Lead *</label>
							<Select value={form.lead_id} onValueChange={(v) => setForm((f) => ({ ...f, lead_id: v }))}>
								<SelectTrigger><SelectValue placeholder="Select a lead…" /></SelectTrigger>
								<SelectContent className="max-h-60">
									{sortedLeads.map((l) => (
										<SelectItem key={l.id} value={l.id}>
											{l.name || "Unnamed"}{l.destination ? ` · ${l.destination}` : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-muted-foreground">Amount (₹) *</label>
							<Input
								type="number"
								placeholder="150000"
								value={form.amount}
								onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">Status</label>
								<Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as Quote["status"] }))}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="Draft">Draft</SelectItem>
										<SelectItem value="Sent">Sent</SelectItem>
										<SelectItem value="Accepted">Accepted</SelectItem>
										<SelectItem value="Expired">Expired</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-muted-foreground">Sent Date</label>
								<Input type="date" value={form.sent_date} onChange={(e) => setForm((f) => ({ ...f, sent_date: e.target.value }))} />
							</div>
						</div>
					</div>
					<DialogFooter showCloseButton>
						<Button onClick={handleCreateQuote} disabled={saving || !form.lead_id || !form.amount}>
							{saving ? "Creating…" : "Create Quote"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
