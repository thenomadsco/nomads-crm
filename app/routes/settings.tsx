import { useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "~/components/ui/table";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useAuth, type Role } from "~/lib/auth-context";
import { useNotifications, NOTIFICATION_TYPES } from "~/lib/notifications";

const ROLE_LABELS: Record<Role, string> = {
	vedant: "Vedant (Admin)",
	kirti: "Kirti (Operations)",
	billing: "Billing Desk",
};

function Toggle({ enabled, onClick, disabled }: { enabled: boolean; onClick: () => void; disabled?: boolean }) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-pressed={enabled}
			className={cn(
				"relative h-5 w-9 rounded-full transition-colors disabled:opacity-40",
				enabled ? "bg-primary" : "bg-muted-foreground/25",
				!disabled && "cursor-pointer",
			)}
		>
			<span
				className={cn(
					"absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
					enabled ? "translate-x-4" : "translate-x-0.5",
				)}
			/>
		</button>
	);
}

async function sendNativeNotification(title: string, body: string) {
	if (typeof Notification === "undefined") return;
	if (Notification.permission !== "granted") return;
	if ("serviceWorker" in navigator) {
		try {
			const reg = await navigator.serviceWorker.ready;
			await reg.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" });
			return;
		} catch {
			// fall through to direct notification
		}
	}
	new Notification(title, { body, icon: "/icons/icon-192.png" });
}

export default function Settings() {
	const { user } = useAuth();
	const { prefs, setPref, simulateEvent } = useNotifications();
	const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
	const [requesting, setRequesting] = useState(false);

	useEffect(() => {
		if (typeof Notification !== "undefined") setPermission(Notification.permission);
	}, []);

	async function handleRequestPermission() {
		if (typeof Notification === "undefined") return;
		setRequesting(true);
		const result = await Notification.requestPermission();
		setPermission(result);
		setRequesting(false);
		if (result === "granted") {
			await sendNativeNotification("Notifications enabled!", "You'll now receive lead alerts on this device.");
		}
	}

	if (!user) return null;

	const isAdmin = user.scopes.includes("admin");
	const roles: Role[] = isAdmin ? ["vedant", "kirti", "billing"] : [user.role];

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<div>
				<h1 className="font-display text-2xl font-semibold">Settings</h1>
				<p className="text-sm text-muted-foreground">
					{isAdmin
						? "Control which notification types reach each role."
						: "Your current notification preferences (set by your admin)."}
				</p>
			</div>

			<Card className="overflow-hidden p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Notification Type</TableHead>
							{roles.map((role) => (
								<TableHead key={role} className="text-center">
									{ROLE_LABELS[role]}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{NOTIFICATION_TYPES.map((type) => (
							<TableRow key={type.id}>
								<TableCell>
									<p className="font-medium">{type.label}</p>
									<p className="text-xs text-muted-foreground">{type.description}</p>
								</TableCell>
								{roles.map((role) => (
									<TableCell key={role} className="text-center">
										<div className="flex justify-center">
											<Toggle
												enabled={prefs[role]?.[type.id] ?? false}
												disabled={!isAdmin}
												onClick={() => setPref(role, type.id, !prefs[role]?.[type.id])}
											/>
										</div>
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			<Card className="p-5 space-y-4">
				<div>
					<h2 className="mb-1 text-sm font-semibold">Push notifications</h2>
					<p className="text-xs text-muted-foreground">
						Native OS notifications delivered to this device even when the app is in the background.
					</p>
				</div>
				<div className="flex items-center justify-between rounded-md border p-3 text-sm">
					<div>
						<p className="font-medium">Permission status</p>
						<p className={cn(
							"text-xs mt-0.5",
							permission === "granted" ? "text-green-600" :
							permission === "denied" ? "text-destructive" :
							"text-muted-foreground"
						)}>
							{permission === "granted" && "Granted — notifications will appear on this device"}
							{permission === "denied" && "Blocked — go to browser/system settings to re-enable"}
							{permission === "default" && "Not yet requested"}
							{permission === "unsupported" && "Not supported on this browser"}
						</p>
					</div>
					{permission === "default" && (
						<Button size="sm" disabled={requesting} onClick={handleRequestPermission}>
							{requesting ? "Requesting…" : "Enable"}
						</Button>
					)}
					{permission === "granted" && (
						<Button size="sm" variant="outline" onClick={() => sendNativeNotification("Test notification", "Push notifications are working correctly.")}>
							Send test
						</Button>
					)}
				</div>
				{permission === "denied" && (
					<p className="text-xs text-muted-foreground">
						On iPhone: Settings → Safari → Notifications → find Nomads CRM → Allow.<br />
						On Chrome: click the lock icon in the address bar → Notifications → Allow.
					</p>
				)}
			</Card>

			<Card className="p-5">
				<h2 className="mb-1 text-sm font-semibold">Test in-app alerts</h2>
				<p className="mb-4 text-xs text-muted-foreground">
					Fire a sample notification for your own account to see how it lands (bell + toast).
				</p>
				<div className="flex flex-wrap gap-2">
					{NOTIFICATION_TYPES.map((type) => (
						<Button key={type.id} size="sm" variant="outline" onClick={() => simulateEvent(type.id)}>
							{type.label}
						</Button>
					))}
				</div>
			</Card>
		</div>
	);
}
