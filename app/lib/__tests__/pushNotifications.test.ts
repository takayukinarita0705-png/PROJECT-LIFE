import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_NOTIFICATION_PAYLOAD,
  disablePushNotifications,
  enablePushNotifications,
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
  subscription = createPushSubscription(),
}: {
  permission?: NotificationPermission;
  subscription?: PushSubscription | null;
} = {}) {
  const requestPermission = vi.fn().mockResolvedValue(permission);
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

  vi.stubGlobal("Notification", {
    permission,
    requestPermission,
  });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      register: vi.fn().mockResolvedValue(registration),
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
});
