"use client";

import { useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationState,
  getPushNotificationViewState,
  sendTestPushNotification,
  type PushNotificationState,
  type PushNotificationSetupResult,
} from "@/app/lib/pushNotifications";

function getPermissionLabel(permission: PushNotificationState["permission"]) {
  switch (permission) {
    case "granted":
      return "許可";
    case "denied":
      return "拒否";
    case "default":
      return "未設定";
    case "unsupported":
      return "未対応";
  }
}

function getPushMessage(
  state: PushNotificationState,
  result: PushNotificationSetupResult | null,
) {
  if (state.permission === "denied") {
    return "拒否されています。端末設定から変更してください";
  }
  if (!state.isInstalledPwa) {
    return "iPhoneで通知を利用するにはホーム画面から起動してください";
  }
  if (!result) {
    return state.hasSubscription
      ? "通知は有効です"
      : "ライフログから予定化した予定だけ通知します";
  }

  switch (result.status) {
    case "subscribed":
      return "通知が有効になりました";
    case "denied":
      return "通知が拒否されています。端末設定を確認してください";
    case "missing-vapid-key":
      return "VAPID公開鍵が未設定です";
    case "unsupported":
      return "この環境では通知を利用できません";
  }
}

const initialPushState: PushNotificationState = {
  hasSubscription: false,
  isInstalledPwa: false,
  permission: "default",
};

export default function MobileSettings() {
  const [pushState, setPushState] =
    useState<PushNotificationState>(initialPushState);
  const [pushResult, setPushResult] =
    useState<PushNotificationSetupResult | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isDisablingPush, setIsDisablingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  async function refreshPushState() {
    try {
      setPushState(await getPushNotificationState());
    } catch (error) {
      console.error("通知状態の確認に失敗しました。", error);
      setPushState((current) => ({
        ...current,
        hasSubscription: false,
      }));
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refreshPushState();
    });
  }, []);

  async function enablePush() {
    setIsEnablingPush(true);
    try {
      setPushResult(await enablePushNotifications());
      await refreshPushState();
    } catch (error) {
      console.error("通知の有効化に失敗しました。", error);
      setPushResult({ status: "unsupported" });
    } finally {
      setIsEnablingPush(false);
    }
  }

  async function disablePush() {
    setIsDisablingPush(true);
    setTestMessage("");
    try {
      await disablePushNotifications();
      setPushResult(null);
      await refreshPushState();
    } catch (error) {
      console.error("通知の無効化に失敗しました。", error);
    } finally {
      setIsDisablingPush(false);
    }
  }

  async function sendTest() {
    setIsSendingTest(true);
    try {
      const sent = await sendTestPushNotification();
      setTestMessage(
        sent
          ? "テスト通知を送信しました"
          : "テスト通知を送信できませんでした",
      );
    } catch (error) {
      console.error("テスト通知の送信に失敗しました。", error);
      setTestMessage("テスト通知を送信できませんでした");
    } finally {
      setIsSendingTest(false);
    }
  }

  const canShowTestNotification =
    getPushNotificationViewState(pushState).canSendTest;
  const pushViewState = getPushNotificationViewState(pushState);

  return (
    <section className="md:hidden">
      <header className="mb-4">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
          SETTINGS
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">設定</h2>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50"
          >
            🎨
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">カテゴリ管理</p>
            <p className="text-xs text-slate-400">準備中</p>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50"
          >
            🔔
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">通知</p>
            <p className="text-xs text-slate-400">
              {getPushMessage(pushState, pushResult)}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              現在の通知権限: {getPermissionLabel(pushState.permission)}
            </p>
            {pushViewState.shouldShowPwaGuide && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-relaxed text-amber-700">
                iPhoneで通知を利用するには、SafariからProject LIFEをホーム画面へ追加して、ホーム画面のアイコンから起動してください。
              </p>
            )}
            {pushViewState.shouldShowDeniedGuide && (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-relaxed text-rose-700">
                通知が拒否されています。再要求は行わないため、端末設定から通知を許可してください。
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={enablePush}
                disabled={isEnablingPush || !pushViewState.canEnable}
                className="min-h-10 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {isEnablingPush ? "確認中" : "通知を有効にする"}
              </button>
              <button
                type="button"
                onClick={disablePush}
                disabled={isDisablingPush || !pushViewState.canDisable}
                className="min-h-10 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600 disabled:opacity-50"
              >
                {isDisablingPush ? "解除中" : "通知を無効にする"}
              </button>
              {canShowTestNotification && (
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={isSendingTest}
                  className="min-h-10 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 disabled:opacity-50"
                >
                  {isSendingTest ? "送信中" : "テスト通知を送る"}
                </button>
              )}
            </div>
            {testMessage && (
              <p className="mt-2 text-xs font-bold text-slate-500">
                {testMessage}
              </p>
            )}
          </div>
          </div>
        </div>

        <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"
          >
            🎯
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">週間目標設定</p>
            <p className="text-xs text-slate-400">準備中</p>
          </div>
        </div>

        <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50"
          >
            📋
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">テンプレート管理</p>
            <p className="text-xs text-slate-400">準備中</p>
          </div>
        </div>

        <div className="flex min-h-16 items-center gap-3 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50"
          >
            ℹ️
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">アプリ情報</p>
            <p className="text-xs text-slate-400">Project LIFE</p>
          </div>
        </div>
      </div>
    </section>
  );
}
