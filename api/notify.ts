import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
	"mailto:info@thenomadsco.com",
	process.env.VAPID_PUBLIC_KEY!,
	process.env.VAPID_PRIVATE_KEY!,
);

const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") return res.status(405).end("Method not allowed");

	const secret = req.headers["x-webhook-secret"];
	if (secret !== process.env.WEBHOOK_SECRET) return res.status(401).end("Unauthorized");

	const { record: lead, type } = req.body ?? {};
	if (type !== "INSERT" || !lead) return res.status(200).end("Skipped");
	if (lead.is_test || lead.deleted_at) return res.status(200).end("Skipped");

	const name = lead.name || "Unknown";
	const dest = [lead.destination, lead.trip_category].filter(Boolean).join(" · ");
	const score = lead.lead_score ?? 0;
	const title = score >= 75 ? `Hot lead: ${name}` : `New lead: ${name}`;
	const body = `Scored ${score}${dest ? ` · ${dest}` : ""}`;

	const { data: subscriptions } = await supabase
		.from("push_subscriptions")
		.select("id, endpoint, p256dh, auth");

	if (!subscriptions?.length) return res.status(200).json({ sent: 0 });

	const staleIds: string[] = [];

	await Promise.allSettled(
		subscriptions.map(async (sub) => {
			try {
				await webpush.sendNotification(
					{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
					JSON.stringify({ title, body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", url: "/leads" }),
				);
			} catch (err: unknown) {
				const statusCode = (err as { statusCode?: number }).statusCode;
				if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
			}
		}),
	);

	if (staleIds.length) {
		await supabase.from("push_subscriptions").delete().in("id", staleIds);
	}

	return res.status(200).json({ sent: subscriptions.length - staleIds.length, removed: staleIds.length });
}
