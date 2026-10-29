"use client";
import { Icon } from "./icons";

import { useEffect, useState } from "react";

// Registers the service worker (production only, so it never caches stale dev builds)
// and shows a banner while the phone has no connection.
export function OfflineSupport({ bannerText }: { bannerText: string }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <p role="status" className="bg-sun-soft px-4 py-2 text-center text-sm font-semibold text-sun-ink">
      <Icon name="wifiOff" size={18} className="mr-1.5 inline align-[-3px]" /> {bannerText}
    </p>
  );
}
