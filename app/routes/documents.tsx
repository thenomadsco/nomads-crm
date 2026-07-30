import { motion } from "motion/react";
import { FileText, BookImage, Receipt, IdCard, ExternalLink } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { useData } from "~/lib/data-context";

// Icon hint based on document_type string (best-effort match, no exhaustive enum in real schema)
function DocIcon({ type }: { type: string }) {
	const t = type.toLowerCase();
	if (t.includes("passport")) return <BookImage className="h-3.5 w-3.5 text-muted-foreground" />;
	if (t.includes("invoice") || t.includes("receipt")) return <Receipt className="h-3.5 w-3.5 text-muted-foreground" />;
	if (t.includes("id") || t.includes("aadhaar") || t.includes("pan")) return <IdCard className="h-3.5 w-3.5 text-muted-foreground" />;
	return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
}

function fileNameFrom(url: string | null): string {
	if (!url) return "—";
	try {
		const parts = new URL(url).pathname.split("/");
		return decodeURIComponent(parts[parts.length - 1]);
	} catch {
		return url.split("/").pop() ?? url;
	}
}

export default function Documents() {
	const { documents, loading } = useData();

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div>
				<h1 className="font-display text-2xl font-semibold">Documents</h1>
				<p className="text-sm text-muted-foreground">
					{loading ? "Loading…" : `${documents.length} documents on file`}
				</p>
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
							<TableHead>Traveler</TableHead>
							<TableHead>Trip / Client</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>File</TableHead>
							<TableHead>Uploaded</TableHead>
							<TableHead className="w-8" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									Loading documents…
								</TableCell>
							</TableRow>
						)}
						{!loading && documents.map((d) => {
							const travelerName = d.travelers?.name ?? "—";
							const tripLabel = d.booked_trips?.leads?.name
								? `${d.booked_trips.leads.name} · ${d.booked_trips.destination}`
								: d.booked_trips?.destination ?? "—";
							return (
								<TableRow key={d.id}>
									<TableCell className="font-medium">{travelerName}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{tripLabel}</TableCell>
									<TableCell>
										<span className="inline-flex items-center gap-1.5">
											<DocIcon type={d.document_type} />
											{d.document_type}
										</span>
									</TableCell>
									<TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
										{fileNameFrom(d.file_url)}
									</TableCell>
									<TableCell className="text-muted-foreground">{d.uploaded_at.slice(0, 10)}</TableCell>
									<TableCell>
										{d.file_url && (
											<a
												href={d.file_url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-muted-foreground hover:text-foreground"
												title="Open file"
											>
												<ExternalLink className="h-4 w-4" />
											</a>
										)}
									</TableCell>
								</TableRow>
							);
						})}
						{!loading && documents.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									No documents on file yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>
		</div>
	);
}
