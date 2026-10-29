import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { LocalNotifications } from "@capacitor/local-notifications";
import { parseDeepLink, verifyAndConsumeNonce } from "../lib/deepLinks";
import { resolveNotificationRoute } from "../lib/notifications";
import { consumePendingShare, listenForShares } from "../lib/shareIntake";
import { supabase } from "../lib/supabase";

/**
 * 앱이 꺼져 있을 때 들어온 딥링크·공유·알림 탭을 시작 직후 처리하고,
 * 실행 중 들어오는 이벤트도 같은 최신 핸들러 ref로 연결한다.
 */
export function useAppRouting({
  detectedPaymentHandlerRef,
  renewalNotificationHandlerRef,
  cancelReminderHandlerRef,
  careNotificationHandlerRef,
  agentNotificationHandlerRef,
  usageNotificationHandlerRef,
  shareHandlerRef,
  closeNotificationCenterRef,
  navigate,
}) {
  // Deep link listener (PKCE OAuth 및 실시간 결제 감지 알림 탭 시 수신)
  useEffect(() => {
    const handleUrl = async (event) => {
      const rawUrl = event?.url;
      if (!rawUrl) return;
      try {
        const parsedLink = parseDeepLink(rawUrl);

        // 1. Native OAuth Callback: submate://auth/callback?code=xxx 인 경우만 처리
        if (parsedLink.type === "auth_callback") {
          Browser.close().catch(() => {});
          if (parsedLink.code && supabase) {
            await supabase.auth.exchangeCodeForSession(parsedLink.code).catch(console.error);
          }
          return;
        }

        // 2. Quick-Add Deep Link: submate://quick-add?nonce=...
        if (parsedLink.type === "quick_add") {
          const { nonce, quickAdd } = parsedLink;
          if (!nonce) {
            console.warn("Ignored quick-add deep link without nonce:", rawUrl);
            return;
          }
          const isValid = await verifyAndConsumeNonce(nonce);
          if (!isValid) {
            console.warn("Ignored quick-add deep link with invalid or expired nonce:", rawUrl);
            return;
          }
          detectedPaymentHandlerRef.current?.(quickAdd);
          return;
        }

        // 그 외 외부 링크는 거부 및 무시
      } catch (err) {
        console.warn("Failed to parse deep link URL:", rawUrl, err);
      }
    };

    let sub;
    if (CapApp && typeof CapApp.addListener === "function") {
      sub = CapApp.addListener("appUrlOpen", handleUrl);
      if (typeof CapApp.getLaunchUrl === "function") {
        CapApp.getLaunchUrl().then((launch) => {
          if (launch?.url) handleUrl(launch);
        });
      }
    }

    return () => {
      if (sub && typeof sub.then === "function") {
        sub.then((handle) => handle?.remove?.());
      }
    };
  }, [detectedPaymentHandlerRef]);

  // 결제·관리·에이전트·월간 알림을 누르면 종류별로 유효한 화면을 연다.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const handlePromise = LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const extra = event?.notification?.extra || {};
      const route = resolveNotificationRoute(extra);
      if (!route) return;
      if (route.kind === "agent") {
        agentNotificationHandlerRef.current?.(route.insight);
      } else if (route.kind === "cancel_reminder") {
        cancelReminderHandlerRef.current?.(route.subscriptionId);
      } else if (route.kind === "renewal") {
        renewalNotificationHandlerRef.current?.(route.subscriptionId);
      } else if (route.kind === "care_cancel" || route.kind === "care_home") {
        careNotificationHandlerRef.current?.(route);
      } else if (route.kind === "usage") {
        usageNotificationHandlerRef.current?.(route.extra, event?.actionId || "tap");
      } else if (route.kind === "home") {
        closeNotificationCenterRef.current?.();
        navigate("home");
      }
    });
    return () => {
      handlePromise.then((handle) => handle?.remove?.()).catch(() => {});
    };
  }, [
    agentNotificationHandlerRef,
    cancelReminderHandlerRef,
    careNotificationHandlerRef,
    closeNotificationCenterRef,
    navigate,
    renewalNotificationHandlerRef,
    usageNotificationHandlerRef,
  ]);

  // 다른 앱에서 '공유'로 보낸 결제 문자·영수증 캡처를 받는다.
  useEffect(() => {
    let active = true;
    consumePendingShare().then((shared) => {
      if (active && shared) shareHandlerRef.current?.(shared);
    });
    const stop = listenForShares((shared) => shareHandlerRef.current?.(shared));
    return () => {
      active = false;
      stop();
    };
  }, [shareHandlerRef]);
}
