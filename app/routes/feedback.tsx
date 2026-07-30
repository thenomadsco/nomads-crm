import { Star } from "lucide-react";
import { motion } from "motion/react";
import { Card } from "~/components/ui/card";
import { useData } from "~/lib/data-context";

export default function Feedback() {
	const { feedback, loading } = useData();

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div>
				<h1 className="font-display text-2xl font-semibold">Feedback</h1>
				<p className="text-sm text-muted-foreground">
					{loading ? "Loading…" : `${feedback.length} reviews from past trips`}
				</p>
			</div>

			{loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading feedback…</p>}

			{!loading && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{feedback.map((f, i) => {
						const clientName = f.booked_trips?.leads?.name;
						const dest = f.booked_trips?.destination;
						const tripName = f.booked_trips?.trip_name;
						return (
							<motion.div
								key={f.id}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: i * 0.05 }}
							>
								<Card className="p-5">
									<div className="mb-2 flex items-center gap-1">
										{Array.from({ length: 5 }).map((_, idx) => (
											<Star
												key={idx}
												className={`h-4 w-4 ${idx < f.rating ? "fill-accent text-accent" : "text-muted-foreground"}`}
											/>
										))}
									</div>
									<p className="text-sm">{f.quote_text ?? <span className="italic text-muted-foreground">No comment</span>}</p>
									<p className="mt-3 text-xs text-muted-foreground">
										{clientName ?? "Client"}
										{dest ? ` · ${dest}` : ""}
										{tripName && !dest ? ` · ${tripName}` : ""}
										{f.collected_date ? ` · ${f.collected_date}` : ""}
									</p>
								</Card>
							</motion.div>
						);
					})}
					{feedback.length === 0 && (
						<p className="text-sm text-muted-foreground">No feedback yet.</p>
					)}
				</div>
			)}
		</div>
	);
}
