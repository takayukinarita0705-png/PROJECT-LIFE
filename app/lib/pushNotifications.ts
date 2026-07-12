import { getSupabaseClient } from "@/app/lib/supabase";

export type PushNotificationSetupResult =
  | { status: "subscribed" }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "missing-vapid-key" };

export type PushNotificationDisableResult =
  | { status: "disabled" }
  | { status: "unsupported" };

export type PushNotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export type PushNotificationState = {
  hasSubscription: boolean;
  isInstalledPwa: boolean;
  permission: PushNotificationPermissionState;
};

export const TEST_NOTIFICATION_PAYLOAD = {
  title: "Project LIFE",
  body: "通知の準備ができました。",
  tag: "project-life-test-notification",
} as const;

export function getPushNotificationViewState(
  state: PushNotificationState,
) {
  return {
    canEnable: state.permission !== "denied",
    canDisable: state.hasSubscription,
    canSendTest:
      state.permission === "granted" && state.hasSubscription,
    shouldShowDeniedGuide: state.permission === "denied",
    shouldShowPwaGuide: !state.isInstalledPwa,
  };
}

function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

export function getPushPermissionState(): PushNotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function isRunningAsInstalledPwa() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getServiceWorkerRegistration() {
  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.register("/sw.js"));
  return registration;
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

async function deletePushSubscription(endpoint: string) {
  const { error } = await getSupabaseClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) {
    throw new Error(`通知購読を削除できませんでした。${error.message}`);
  }
}

export async function getPushNotificationState(): Promise<PushNotificationState> {
  const permission = getPushPermissionState();
  if (!isPushSupported()) {
    return {
      hasSubscription: false,
      isInstalledPwa: isRunningAsInstalledPwa(),
      permission,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription =
    (await registration?.pushManager.getSubscription()) ?? null;

  return {
    hasSubscription: subscription !== null,
    isInstalledPwa: isRunningAsInstalledPwa(),
    permission,
  };
}

export async function enablePushNotifications(): Promise<PushNotificationSetupResult> {
  if (!isPushSupported()) {
    return { status: "unsupported" };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return { status: "missing-vapid-key" };

  const currentPermission = getPushPermissionState();
  if (currentPermission === "denied") return { status: "denied" };

  const permission =
    currentPermission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await getServiceWorkerRegistration();
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

export async function disablePushNotifications(): Promise<PushNotificationDisableResult> {
  if (!isPushSupported()) return { status: "unsupported" };

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription =
    (await registration?.pushManager.getSubscription()) ?? null;
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }

  return { status: "disabled" };
}

export async function sendTestPushNotification() {
  if (!isPushSupported() || getPushPermissionState() !== "granted") {
    return false;
  }

  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  await registration.showNotification(TEST_NOTIFICATION_PAYLOAD.title, {
    body: TEST_NOTIFICATION_PAYLOAD.body,
    data: {
      url: "/",
      isTest: true,
    },
    tag: TEST_NOTIFICATION_PAYLOAD.tag,
  });
  return true;
}
