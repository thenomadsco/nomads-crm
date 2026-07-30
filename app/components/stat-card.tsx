import { motion } from "motion/react";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";

// Magic UI-style reusable interface animation: a subtle shimmer sweep on
// mount plus a gentle rise-and-fade — used throughout (dashboard stat tiles),
// unlike the login screen's one-off standout treatment.
export function StatCard({
	label,
	value,
	icon: Icon,
	accent,
	delay = 0,
}: {
	label: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
	accent?: "primary" | "accent" | "destructive";
	delay?: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
		>
			<Card className="relative overflow-hidden p-5">
				<div
					className={cn(
						"absolute inset-0 -z-10 opacity-[0.06]",
						accent === "accent" && "bg-accent",
						accent === "destructive" && "bg-destructive",
						(!accent || accent === "primary") && "bg-primary",
					)}
				/>
				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">{label}</span>
					<Icon
						className={cn(
							"h-4 w-4",
							accent === "accent" && "text-accent",
							accent === "destructive" && "text-destructive",
							(!accent || accent === "primary") && "text-primary",
						)}
					/>
				</div>
				<p className="mt-2 font-display text-3xl font-semibold">{value}</p>
			</Card>
		</motion.div>
	);
}
