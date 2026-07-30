import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useData } from "~/lib/data-context";
import { updateQuoteStatus } from "~/lib/db";
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

export default function Quotes() {
	const { quotes, setQuotes, loading } = useData();
	const [filter, setFilter] = useState<StatusFilter>("All");

	async function advance(quote: Quote) {
		const action = NEXT_ACTION[quote.status];
		if (!action) return;
		// Optimistic update
		setQuotes(quotes.map((q) => (q.id === quote.id ? { ...q, status: action.next } : q)));
		try {
			await updateQuoteStatus(quote.id, action.next);
			toast.success(`Quote marked as ${action.next}`);
		} catch {
			// revert
			setQuotes(quotes.map((q) => (q.id === quote.id ? { ...q, status: quote.status } : q)));
			toast.error("Failed to update quote status");
		}
	}

	const filtered = useMemo(
		() => quotes.filter((q) => filter === "All" || q.status === filter),
		[quotes, filter],
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
				<Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
					<TabsList>
						<TabsTrigger value="All">All</TabsTrigger>
						<TabsTrigger value="Draft">Draft</TabsTrigger>
						<TabsTrigger value="Sent">Sent</TabsTrigger>
						<TabsTrigger value="Accepted">Accepted</TabsTrigger>
					</TabsList>
				</Tabs>
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
		</div>
	);
}
