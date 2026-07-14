import { getSupabaseClient } from "@/app/lib/supabase";

export type PushNotificationSetupResult =
  | { status: "subscribed" }
  | {
      status: "unsupported";
      reason:
        | "notification-api-unavailable"
        | "service-worker-unavailable"
        | "push-manager-unavailable";
    }
  | { status: "denied" }
  | { status: "missing-vapid-key" }
  | { status: "service-worker-registration-failed"; message: string }
  | { status: "push-subscription-failed"; message: string }
  | { status: "supabase-save-failed"; message: string };

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

export type PushNotificationDiagnostics = {
  hasNotificationApi: boolean;
  hasPushManager: boolean;
  hasServiceWorker: boolean;
  hasSubscription: boolean;
  hasVapidPublicKey: boolean;
  isNavigatorStandalone: boolean;
  isStandaloneDisplayMode: boolean;
  notificationPermission: PushNotificationPermissionState;
  serviceWorkerReady: boolean;
  serviceWorkerScope: string | null;
  serviceWorkerScriptURL: string | null;
  serviceWorkerError: string | null;
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

function getNavigatorStandalone() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return navigatorWithStandalone.standalone === true;
}

function getStandaloneDisplayMode() {
  return window.matchMedia("(display-mode: standalone)").matches;
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

const SERVICE_WORKER_VERSION = "20260714-1";
const SERVICE_WORKER_URL = `/sw.js?v=${SERVICE_WORKER_VERSION}`;

async function getServiceWorkerRegistration() {
  let registration = await navigator.serviceWorker.getRegistration("/");
  const activeScriptURL = registration?.active?.scriptURL ?? "";
  if (
    !registration ||
    !registration.active ||
    !activeScriptURL.includes(`v=${SERVICE_WORKER_VERSION}`)
  ) {
    registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: "/",
      updateViaCache: "none",
    });
  }
  await navigator.serviceWorker.ready;
  return registration;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "不明なエラー";
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

export async function getPushNotificationDiagnostics(): Promise<PushNotificationDiagnostics> {
  const hasNotificationApi =
    typeof window !== "undefined" && "Notification" in window;
  const hasServiceWorker =
    typeof window !== "undefined" && "serviceWorker" in navigator;
  const hasPushManager =
    typeof window !== "undefined" && "PushManager" in window;
  const diagnostics: PushNotificationDiagnostics = {
    hasNotificationApi,
    hasPushManager,
    hasServiceWorker,
    hasSubscription: false,
    hasVapidPublicKey: Boolean(getVapidPublicKey()),
    isNavigatorStandalone:
      typeof window !== "undefined" ? getNavigatorStandalone() : false,
    isStandaloneDisplayMode:
      typeof window !== "undefined" ? getStandaloneDisplayMode() : false,
    notificationPermission: getPushPermissionState(),
    serviceWorkerReady: false,
    serviceWorkerScope: null,
    serviceWorkerScriptURL: null,
    serviceWorkerError: null,
  };

  if (!hasServiceWorker) return diagnostics;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription =
      (await registration?.pushManager.getSubscription()) ?? null;
    diagnostics.hasSubscription = subscription !== null;
    diagnostics.serviceWorkerScope = registration?.scope ?? null;
    diagnostics.serviceWorkerScriptURL =
      registration?.active?.scriptURL ??
      registration?.installing?.scriptURL ??
      registration?.waiting?.scriptURL ??
      null;
    const readyRegistration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), 1500),
      ),
    ]);
    diagnostics.serviceWorkerReady = readyRegistration !== null;
  } catch (error) {
    diagnostics.serviceWorkerError = toErrorMessage(error);
  }

  return diagnostics;
}

export async function enablePushNotifications(): Promise<PushNotificationSetupResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return {
      status: "unsupported",
      reason: "notification-api-unavailable",
    };
  }
  const currentPermission = getPushPermissionState();
  if (currentPermission === "denied") return { status: "denied" };

  const permission =
    currentPermission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  if (!("serviceWorker" in navigator)) {
    return {
      status: "unsupported",
      reason: "service-worker-unavailable",
    };
  }
  if (!("PushManager" in window)) {
    return {
      status: "unsupported",
      reason: "push-manager-unavailable",
    };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return { status: "missing-vapid-key" };

  let registration: ServiceWorkerRegistration;
  try {
    registration = await getServiceWorkerRegistration();
  } catch (error) {
    return {
      status: "service-worker-registration-failed",
      message: toErrorMessage(error),
    };
  }

  const currentSubscription =
    await registration.pushManager.getSubscription();
  let subscription = currentSubscription;
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    } catch (error) {
      return {
        status: "push-subscription-failed",
        message: toErrorMessage(error),
      };
    }
  }

  try {
    await savePushSubscription(subscription);
  } catch (error) {
    return {
      status: "supabase-save-failed",
      message: toErrorMessage(error),
    };
  }
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
