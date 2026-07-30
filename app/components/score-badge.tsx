import { Badge } from "~/components/ui/badge";
import type { LeadCategory } from "~/lib/mock-data";

const STYLES: Record<LeadCategory, string> = {
	Hot: "bg-score-hot text-score-hot-foreground",
	Warm: "bg-score-warm text-score-warm-foreground",
	Cold: "bg-score-cold text-score-cold-foreground",
};

export function ScoreBadge({ category, score }: { category: LeadCategory | null; score: number | null }) {
	if (!category) {
		return <Badge variant="outline" className="text-muted-foreground">Unscored</Badge>;
	}
	return (
		<Badge className={STYLES[category]} variant="secondary">
			{category}{score !== null ? ` · ${score}` : ""}
		</Badge>
	);
}
