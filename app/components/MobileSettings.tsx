"use client";

import { useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationDiagnostics,
  getPushNotificationState,
  getPushNotificationViewState,
  sendTestPushNotification,
  type PushNotificationDiagnostics,
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
    case "service-worker-registration-failed":
      return "Service Worker登録に失敗しました";
    case "push-subscription-failed":
      return "Push購読に失敗しました";
    case "supabase-save-failed":
      return "Supabaseへの購読保存に失敗しました";
  }
}

function getPushErrorMessage(result: PushNotificationSetupResult | null) {
  if (!result) return "";
  switch (result.status) {
    case "unsupported":
      switch (result.reason) {
        case "notification-api-unavailable":
          return "Notification APIが利用できません。";
        case "service-worker-unavailable":
          return "Service Workerが利用できません。";
        case "push-manager-unavailable":
          return "PushManagerが利用できません。";
      }
    case "denied":
      return "通知許可が拒否済みです。端末設定から変更してください。";
    case "missing-vapid-key":
      return "NEXT_PUBLIC_VAPID_PUBLIC_KEY が未設定です。";
    case "service-worker-registration-failed":
      return `Service Worker登録失敗: ${result.message}`;
    case "push-subscription-failed":
      return `Push購読失敗: ${result.message}`;
    case "supabase-save-failed":
      return `Supabase保存失敗: ${result.message}`;
    case "subscribed":
      return "";
  }
}

function getBooleanLabel(value: boolean) {
  return value ? "あり" : "なし";
}

function DiagnosticsRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-200/70 py-2 last:border-b-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="max-w-[60%] break-words text-right font-bold text-slate-600 [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}

const initialPushState: PushNotificationState = {
  hasSubscription: false,
  isInstalledPwa: false,
  permission: "default",
};

const initialDiagnostics: PushNotificationDiagnostics = {
  hasNotificationApi: false,
  hasPushManager: false,
  hasServiceWorker: false,
  hasSubscription: false,
  hasVapidPublicKey: false,
  isNavigatorStandalone: false,
  isStandaloneDisplayMode: false,
  notificationPermission: "default",
  serviceWorkerReady: false,
  serviceWorkerScope: null,
  serviceWorkerScriptURL: null,
  serviceWorkerError: null,
};

export default function MobileSettings() {
  const [pushState, setPushState] =
    useState<PushNotificationState>(initialPushState);
  const [pushResult, setPushResult] =
    useState<PushNotificationSetupResult | null>(null);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isDisablingPush, setIsDisablingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState("");
  const [pushDiagnostics, setPushDiagnostics] =
    useState<PushNotificationDiagnostics>(initialDiagnostics);
  const [testMessage, setTestMessage] = useState("");

  async function refreshPushState() {
    try {
      const [nextState, nextDiagnostics] = await Promise.all([
        getPushNotificationState(),
        getPushNotificationDiagnostics(),
      ]);
      setPushState(nextState);
      setPushDiagnostics(nextDiagnostics);
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
    setLastActionMessage("通知を有効にするを押しました");
    try {
      const result = await enablePushNotifications();
      setPushResult(result);
      setLastActionMessage(
        result.status === "subscribed"
          ? "通知を有効にしました"
          : getPushErrorMessage(result),
      );
      await refreshPushState();
    } catch (error) {
      console.error("通知の有効化に失敗しました。", error);
      setPushResult({
        status: "unsupported",
        reason: "notification-api-unavailable",
      });
      setLastActionMessage("通知の有効化で予期しないエラーが発生しました。");
    } finally {
      setIsEnablingPush(false);
    }
  }

  async function disablePush() {
    setIsDisablingPush(true);
    setTestMessage("");
    setLastActionMessage("通知を無効にするを押しました");
    try {
      await disablePushNotifications();
      setPushResult(null);
      setLastActionMessage("通知を無効にしました");
      await refreshPushState();
    } catch (error) {
      console.error("通知の無効化に失敗しました。", error);
      setLastActionMessage("通知の無効化に失敗しました。");
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
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {getPushMessage(pushState, pushResult)}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              現在の通知権限: {getPermissionLabel(pushState.permission)}
            </p>
            {lastActionMessage && (
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-relaxed text-slate-600">
                {lastActionMessage}
              </p>
            )}
            {getPushErrorMessage(pushResult) && (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold leading-relaxed text-rose-700">
                {getPushErrorMessage(pushResult)}
              </p>
            )}
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
            <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <button
                type="button"
                onClick={enablePush}
                disabled={isEnablingPush || !pushViewState.canEnable}
                className="mobile-interactive min-h-11 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {isEnablingPush ? "確認中" : "通知を有効にする"}
              </button>
              <button
                type="button"
                onClick={disablePush}
                disabled={isDisablingPush || !pushViewState.canDisable}
                className="mobile-interactive min-h-11 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600 disabled:opacity-50"
              >
                {isDisablingPush ? "解除中" : "通知を無効にする"}
              </button>
              {canShowTestNotification && (
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={isSendingTest}
                  className="mobile-interactive min-h-11 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 disabled:opacity-50"
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
            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">
                通知診断情報
              </p>
              <dl className="mt-1 text-xs">
                <DiagnosticsRow
                  label="Notification API"
                  value={getBooleanLabel(pushDiagnostics.hasNotificationApi)}
                />
                <DiagnosticsRow
                  label="Service Worker"
                  value={getBooleanLabel(pushDiagnostics.hasServiceWorker)}
                />
                <DiagnosticsRow
                  label="PushManager"
                  value={getBooleanLabel(pushDiagnostics.hasPushManager)}
                />
                <DiagnosticsRow
                  label="standalone"
                  value={getBooleanLabel(
                    pushDiagnostics.isStandaloneDisplayMode,
                  )}
                />
                <DiagnosticsRow
                  label="navigator.standalone"
                  value={getBooleanLabel(
                    pushDiagnostics.isNavigatorStandalone,
                  )}
                />
                <DiagnosticsRow
                  label="permission"
                  value={getPermissionLabel(
                    pushDiagnostics.notificationPermission,
                  )}
                />
                <DiagnosticsRow
                  label="VAPID公開鍵"
                  value={getBooleanLabel(pushDiagnostics.hasVapidPublicKey)}
                />
                <DiagnosticsRow
                  label="SW ready"
                  value={getBooleanLabel(pushDiagnostics.serviceWorkerReady)}
                />
                <DiagnosticsRow
                  label="SW scope"
                  value={pushDiagnostics.serviceWorkerScope ?? "未登録"}
                />
                <DiagnosticsRow
                  label="SW script"
                  value={pushDiagnostics.serviceWorkerScriptURL ?? "未登録"}
                />
                <DiagnosticsRow
                  label="購読"
                  value={getBooleanLabel(pushDiagnostics.hasSubscription)}
                />
                {pushDiagnostics.serviceWorkerError && (
                  <DiagnosticsRow
                    label="SW error"
                    value={pushDiagnostics.serviceWorkerError}
                  />
                )}
              </dl>
            </div>
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
