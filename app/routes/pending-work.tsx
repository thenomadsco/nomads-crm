import { useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { usePendingWork, type PendingItem } from "~/lib/pending-work";

const GROUP_ORDER = ["Overdue", "Due Soon", "Open"] as const;

function groupFor(item: PendingItem): (typeof GROUP_ORDER)[number] {
	if (item.severity === "overdue") return "Overdue";
	if (item.severity === "due_soon") return "Due Soon";
	return "Open";
}

export default function PendingWork() {
	const items = usePendingWork();
	const navigate = useNavigate();

	const grouped = useMemo(() => {
		const groups: Record<string, PendingItem[]> = { Overdue: [], "Due Soon": [], Open: [] };
		for (const item of items) groups[groupFor(item)].push(item);
		return groups;
	}, [items]);

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div>
				<h1 className="font-display text-2xl font-semibold">Pending Work</h1>
				<p className="text-sm text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"} need attention across the workspace.</p>
			</div>

			<div className="space-y-8">
				{GROUP_ORDER.map((group) => {
					const groupItems = grouped[group];
					if (groupItems.length === 0) return null;
					return (
						<div key={group}>
							<h2
								className={cn(
									"mb-3 text-xs font-semibold tracking-wide uppercase",
									group === "Overdue" ? "text-destructive" : "text-muted-foreground",
								)}
							>
								{group} · {groupItems.length}
							</h2>
							<div className="space-y-2">
								<AnimatePresence initial={false}>
									{groupItems.map((item) => (
										<motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
											<button
												onClick={() => navigate(item.href)}
												className={cn(
													"flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md border p-3.5 text-left transition-colors hover:bg-accent/5",
													item.severity === "overdue" && "border-destructive/40 bg-destructive/5",
												)}
											>
												<div>
													<p className="text-sm font-medium">{item.title}</p>
													<p className="text-xs text-muted-foreground">{item.subtitle}</p>
												</div>
												<Badge variant={item.severity === "overdue" ? "destructive" : item.severity === "due_soon" ? "secondary" : "outline"}>
													{item.severity === "overdue" ? "Overdue" : item.severity === "due_soon" ? "Due soon" : "Open"}
												</Badge>
											</button>
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</div>
					);
				})}
				{items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nothing pending — you're all caught up.</p>}
			</div>
		</div>
	);
}
