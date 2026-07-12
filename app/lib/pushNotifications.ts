import { getSupabaseClient } from "@/app/lib/supabase";

export type PushNotificationSetupResult =
  | { status: "subscribed" }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "missing-vapid-key" };

function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function savePushSubscription(subscription: PushSubscription) {
  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("PushSubscriptionの形式が正しくありません。");
  }

  const { error } = await getSupabaseClient()
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    throw new Error(`通知購読を保存できませんでした。${error.message}`);
  }
}

export async function enablePushNotifications(): Promise<PushNotificationSetupResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return { status: "unsupported" };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return { status: "missing-vapid-key" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register("/sw.js");
  const currentSubscription =
    await registration.pushManager.getSubscription();
  const subscription =
    currentSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  await savePushSubscription(subscription);
  return { status: "subscribed" };
}
