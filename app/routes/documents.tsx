import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { FileText, BookImage, Receipt, IdCard, ExternalLink, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useData } from "~/lib/data-context";

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

type TypeFilter = "All" | string;

export default function Documents() {
	const { documents, loading } = useData();
	const [query, setQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");

	const docTypes = useMemo(() => {
		const seen = new Set<string>();
		const types: string[] = [];
		for (const d of documents) {
			if (!seen.has(d.document_type)) {
				seen.add(d.document_type);
				types.push(d.document_type);
			}
		}
		return types.sort();
	}, [documents]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return documents.filter((d) => {
			const matchesType = typeFilter === "All" || d.document_type === typeFilter;
			const travelerName = d.travelers?.name ?? "";
			const clientName = d.booked_trips?.leads?.name ?? "";
			const dest = d.booked_trips?.destination ?? "";
			const matchesQuery =
				!q ||
				travelerName.toLowerCase().includes(q) ||
				clientName.toLowerCase().includes(q) ||
				dest.toLowerCase().includes(q) ||
				d.document_type.toLowerCase().includes(q);
			return matchesType && matchesQuery;
		});
	}, [documents, query, typeFilter]);

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-2xl font-semibold">Documents</h1>
					<p className="text-sm text-muted-foreground">
						{loading ? "Loading…" : `${filtered.length}${query || typeFilter !== "All" ? ` of ${documents.length}` : ""} documents on file`}
					</p>
				</div>
				<div className="relative w-full sm:w-64">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search traveler, client, type…"
						className="pl-8"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</div>

			{docTypes.length > 0 && (
				<Tabs value={typeFilter} onValueChange={setTypeFilter}>
					<TabsList className="h-auto flex-wrap justify-start">
						<TabsTrigger value="All">All</TabsTrigger>
						{docTypes.map((t) => (
							<TabsTrigger key={t} value={t}>{t}</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			)}

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
						{!loading && filtered.map((d) => {
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
						{!loading && filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
									{query || typeFilter !== "All" ? "No documents match your search." : "No documents on file yet."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</motion.div>
		</div>
	);
}
