import { BellRing, CircleUserRound, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "./ui";

const permissionLabel = (permission, enabled) => {
  if (permission === "unsupported") return "이 브라우저에서는 기기 알림을 지원하지 않아요.";
  if (permission === "denied") return "브라우저에서 알림 권한이 차단되어 있어요.";
  if (permission !== "granted") return "브라우저 알림 권한을 아직 허용하지 않았어요.";
  return enabled ? "결제 전 알림을 사용하고 있어요." : "RE. 안에서 결제 전 알림을 꺼둔 상태예요.";
};

export function SettingsScreen({
  profile,
  notificationPermission,
  notificationsEnabled,
  onToggleNotifications,
  onReplayIntro,
}) {
  return (
    <main className="re-settings-page">
      <header className="re-section-heading">
        <div>
          <p className="re-eyebrow">SETTINGS</p>
          <h1>설정</h1>
          <p>현재 사용 중인 기능과 안내 방식을 편하게 확인하고 바꿀 수 있어요.</p>
        </div>
      </header>

      <section className="re-settings-grid">
        <article className="re-settings-card">
          <span className="re-settings-card__icon"><CircleUserRound size={20} /></span>
          <div className="re-settings-card__body">
            <span className="re-settings-card__label">계정</span>
            <strong>{profile?.nickname || "RE. 사용자"}</strong>
            <p>{profile?.guest ? "둘러보기 모드" : `${profile?.provider || "RE."} 로그인`}</p>
          </div>
        </article>

        <article className="re-settings-card">
          <span className="re-settings-card__icon"><BellRing size={20} /></span>
          <div className="re-settings-card__body">
            <span className="re-settings-card__label">결제 전 알림</span>
            <strong>{notificationsEnabled ? "켜짐" : "꺼짐"}</strong>
            <p>{permissionLabel(notificationPermission, notificationsEnabled)}</p>
            <Button className="mt-4" size="compact" variant={notificationsEnabled ? "secondary" : "primary"} onClick={onToggleNotifications}>
              {notificationsEnabled ? "알림 끄기" : "알림 켜기"}
            </Button>
          </div>
        </article>

        <article className="re-settings-card">
          <span className="re-settings-card__icon"><RotateCcw size={20} /></span>
          <div className="re-settings-card__body">
            <span className="re-settings-card__label">서비스 소개</span>
            <strong>소개 화면 다시 보기</strong>
            <p>처음 만났을 때의 RE. 소개 화면을 원할 때 다시 확인할 수 있어요.</p>
            <Button className="mt-4" size="compact" variant="secondary" onClick={onReplayIntro}>다시 보기</Button>
          </div>
        </article>

        <article className="re-settings-card">
          <span className="re-settings-card__icon"><ShieldCheck size={20} /></span>
          <div className="re-settings-card__body">
            <span className="re-settings-card__label">데이터 및 개인정보</span>
            <strong>내가 확인한 구독 정보를 기준으로 관리해요</strong>
            <p>RE.는 사용자가 등록하거나 확인한 구독 정보를 바탕으로 일정과 관리 기능을 보여드려요.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
