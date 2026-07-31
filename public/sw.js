self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Fired by the server via Web Push (works even when app is closed)
self.addEventListener("push", (event) => {
    const data = event.data?.json() ?? {};
    event.waitUntil(
        self.registration.showNotification(data.title || "Nomads CRM", {
            body: data.body || "",
            icon: data.icon || "/icons/icon-192.png",
            badge: data.badge || "/icons/icon-192.png",
            data: { url: data.url || "/leads" },
        })
    );
});

// Fired by the client via serviceWorker.ready (when app is open/backgrounded)
self.addEventListener("message", (event) => {
    if (event.data?.type === "SHOW_NOTIFICATION") {
        const { title, body, icon } = event.data;
        event.waitUntil(
            self.registration.showNotification(title, {
                body,
                icon: icon || "/icons/icon-192.png",
                badge: "/icons/icon-192.png",
            })
        );
    }
});

// Tapping the notification focuses the app
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/leads";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            const existing = clients.find((c) => c.url.includes(self.location.origin));
            if (existing) return existing.focus().then((c) => c.navigate(url));
            return self.clients.openWindow(url);
        })
    );
});
