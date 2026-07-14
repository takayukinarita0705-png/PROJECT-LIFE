import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_NOTIFICATION_PAYLOAD,
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationDiagnostics,
  getPushNotificationViewState,
  sendTestPushNotification,
} from "@/app/lib/pushNotifications";

const supabaseMocks = vi.hoisted(() => {
  const upsert = vi.fn();
  const eq = vi.fn();
  const deleteSubscription = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({
    delete: deleteSubscription,
    upsert,
  }));

  return {
    deleteSubscription,
    eq,
    from,
    upsert,
  };
});

vi.mock("@/app/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: supabaseMocks.from,
  }),
}));

function createPushSubscription() {
  return {
    endpoint: "https://push.example/subscription",
    toJSON: () => ({
      endpoint: "https://push.example/subscription",
      keys: {
        auth: "auth-key",
        p256dh: "p256dh-key",
      },
    }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;
}

function installPushBrowserStubs({
  permission = "granted",
  requestPermissionResult = permission,
  subscription = createPushSubscription(),
  events = [],
}: {
  events?: string[];
  permission?: NotificationPermission;
  requestPermissionResult?: NotificationPermission;
  subscription?: PushSubscription | null;
} = {}) {
  const requestPermission = vi.fn().mockImplementation(() => {
    events.push("requestPermission");
    return Promise.resolve(requestPermissionResult);
  });
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const subscribe = vi.fn().mockResolvedValue(subscription);
  const getSubscription = vi.fn().mockResolvedValue(subscription);
  const registration = {
    pushManager: {
      getSubscription,
      subscribe,
    },
    showNotification,
  };
  const register = vi.fn().mockImplementation(() => {
    events.push("registerServiceWorker");
    return Promise.resolve(registration);
  });

  vi.stubGlobal("Notification", {
    permission,
    requestPermission,
  });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
      register,
    },
  });
  vi.stubGlobal("window", {
    atob: (value: string) =>
      Buffer.from(value, "base64").toString("binary"),
    matchMedia: vi.fn().mockReturnValue({ matches: true }),
    Notification: {},
    PushManager: function PushManager() {},
  });

  return {
    getSubscription,
    registration,
    requestPermission,
    register,
    showNotification,
    subscribe,
    subscription,
  };
}

describe("Push通知設定", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "AQID";
    supabaseMocks.upsert.mockResolvedValue({ error: null });
    supabaseMocks.eq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  });

  it("未設定時に有効化ボタンが表示される", () => {
    expect(
      getPushNotificationViewState({
        hasSubscription: false,
        isInstalledPwa: true,
        permission: "default",
      }),
    ).toMatchObject({
      canEnable: true,
      canSendTest: false,
    });
  });

  it("許可済み時に購読情報を保存できる", async () => {
    const subscription = createPushSubscription();
    installPushBrowserStubs({ permission: "granted", subscription });

    await expect(enablePushNotifications()).resolves.toEqual({
      status: "subscribed",
    });
    expect(supabaseMocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: "auth-key",
        endpoint: "https://push.example/subscription",
        p256dh: "p256dh-key",
      }),
      { onConflict: "endpoint" },
    );
  });

  it("ボタン押下処理では許可要求をService Worker登録より前に行う", async () => {
    const events: string[] = [];
    installPushBrowserStubs({
      events,
      permission: "default",
      requestPermissionResult: "granted",
    });

    await expect(enablePushNotifications()).resolves.toEqual({
      status: "subscribed",
    });
    expect(events).toEqual(["requestPermission", "registerServiceWorker"]);
  });

  it("アイコン更新版のService Workerをキャッシュを使わず登録する", async () => {
    const { register } = installPushBrowserStubs({ permission: "granted" });

    await expect(enablePushNotifications()).resolves.toEqual({
      status: "subscribed",
    });
    expect(register).toHaveBeenCalledWith("/sw.js?v=20260714-1", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("無効化時に購読解除できる", async () => {
    const subscription = createPushSubscription();
    installPushBrowserStubs({ permission: "granted", subscription });

    await expect(disablePushNotifications()).resolves.toEqual({
      status: "disabled",
    });
    expect(supabaseMocks.deleteSubscription).toHaveBeenCalled();
    expect(supabaseMocks.eq).toHaveBeenCalledWith(
      "endpoint",
      "https://push.example/subscription",
    );
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it("拒否状態で自動再要求しない", async () => {
    const { requestPermission } = installPushBrowserStubs({
      permission: "denied",
    });

    await expect(enablePushNotifications()).resolves.toEqual({
      status: "denied",
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("VAPID公開鍵未設定でも許可要求後にエラーを返す", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const { requestPermission } = installPushBrowserStubs({
      permission: "default",
      requestPermissionResult: "granted",
    });

    await expect(enablePushNotifications()).resolves.toEqual({
      status: "missing-vapid-key",
    });
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it("Supabase保存失敗を画面へ返せる結果にする", async () => {
    supabaseMocks.upsert.mockResolvedValueOnce({
      error: { message: "insert failed" },
    });
    installPushBrowserStubs({ permission: "granted" });

    await expect(enablePushNotifications()).resolves.toEqual({
      status: "supabase-save-failed",
      message: "通知購読を保存できませんでした。insert failed",
    });
  });

  it("PWA以外では案内が表示される", () => {
    expect(
      getPushNotificationViewState({
        hasSubscription: false,
        isInstalledPwa: false,
        permission: "default",
      }).shouldShowPwaGuide,
    ).toBe(true);
  });

  it("テスト通知が通常の通知履歴に混ざらない", async () => {
    const { showNotification } = installPushBrowserStubs({
      permission: "granted",
    });

    await expect(sendTestPushNotification()).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledWith(
      TEST_NOTIFICATION_PAYLOAD.title,
      expect.objectContaining({
        body: TEST_NOTIFICATION_PAYLOAD.body,
        data: {
          isTest: true,
          url: "/",
        },
        tag: TEST_NOTIFICATION_PAYLOAD.tag,
      }),
    );
  });

  it("通知診断情報で実行環境を確認できる", async () => {
    installPushBrowserStubs({ permission: "granted" });

    await expect(getPushNotificationDiagnostics()).resolves.toMatchObject({
      hasNotificationApi: true,
      hasPushManager: true,
      hasServiceWorker: true,
      hasSubscription: true,
      hasVapidPublicKey: true,
      isStandaloneDisplayMode: true,
      notificationPermission: "granted",
      serviceWorkerReady: true,
      serviceWorkerScope: null,
    });
  });
});
