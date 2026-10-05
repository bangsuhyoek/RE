import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Repeat } from "lucide-react";
import { BottomSheet, Button } from "./ui";
import { formatWon } from "../lib/dates";
import { buildRotationPlan, getRotationCandidates } from "../lib/rotationPlanner";
import { rotationSnapshot } from "../lib/careFeed";

const CATEGORIES = ["OTT", "음악", "도서/웹툰", "게임/엔터", "SaaS", "교육/어학", "쇼핑", "생활/모빌리티", "소프트웨어"];
const idOf = (subscription) => subscription.subscriptionId || subscription.id;
const shortDate = (date) => (date.getMonth() + 1) + "/" + date.getDate();

// 구독 순환 플래너: 같은 카테고리 구독을 한 달에 하나만 유지하도록 해지·재가입 날짜를 짠다. 해지·가입은 사용자가 직접 한다.
export function RotationSheet({ subscriptions = [], saved = null, onSave, onClear, onClose }) {
  const available = useMemo(
    () => CATEGORIES.map((category) => ({
      category,
      candidates: getRotationCandidates(subscriptions, category).filter((item) => !item.isTrial && item.status !== "trial"),
    })).filter((entry) => entry.candidates.length >= 2),
    [subscriptions]
  );
  const [category, setCategory] = useState(saved?.category || available[0]?.category || "");
  const candidates = available.find((entry) => entry.category === category)?.candidates || [];
  const [order, setOrder] = useState(() => (saved?.category === category && saved?.order) || []);

  const ordered = useMemo(() => {
    const byId = new Map(candidates.map((item) => [idOf(item), item]));
    const picked = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
    const rest = candidates.filter((item) => !order.includes(idOf(item))).sort((a, b) => a.amount - b.amount);
    return [...picked, ...rest];
  }, [candidates, order]);

  const plan = useMemo(
    () => (ordered.length >= 2 ? buildRotationPlan({ subscriptions: ordered, order: ordered.map(idOf), months: 6 }) : null),
    [ordered]
  );

  const move = (index, delta) => {
    const ids = ordered.map(idOf);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setOrder(ids);
  };

  if (available.length === 0) {
    return (
      <BottomSheet onClose={onClose} label="구독 순환 계획">
        <h2 className="text-[20px] font-extrabold text-[#191F28]">구독 순환 계획</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6B7684]">같은 분야의 매월 구독이 2개 이상일 때 만들 수 있어요.</p>
        <Button size="large" fullWidth className="mt-5" onClick={onClose}>닫기</Button>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet onClose={onClose} label="구독 순환 계획">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E8F7EE] text-[#1A7F45]"><Repeat size={17} /></span>
        <h2 className="text-[20px] font-extrabold tracking-tight text-[#191F28]">한 달에 하나만 구독하기</h2>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[#6B7684]">
        차례가 끝난 구독은 결제일 전날 해지하고, 다음 차례를 그날 가입해요. 날짜마다 꾸독이 알려드리고, 해지·가입은 직접 해요.
      </p>

      {available.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="분야 선택">
          {available.map((entry) => (
            <button
              key={entry.category}
              type="button"
              aria-pressed={category === entry.category}
              onClick={() => { setCategory(entry.category); setOrder([]); }}
              className={"rounded-full border px-3 py-1.5 text-[12px] font-bold " + (category === entry.category ? "border-[#191F28] bg-[#191F28] text-white" : "border-[#E5E8EB] text-[#4E5968]")}
            >
              {entry.category} {entry.candidates.length}개
            </button>
          ))}
        </div>
      )}

      <h3 className="mt-5 text-[13px] font-bold text-[#8B95A1]">순서</h3>
      <ol className="mt-2 space-y-1.5">
        {ordered.map((item, index) => (
          <li key={idOf(item)} className="flex items-center gap-2 rounded-xl border border-[#E5E8EB] px-3 py-2">
            <span className="w-5 text-[12px] font-bold text-[#8B95A1]">{index + 1}</span>
            <span className="flex-1 text-[14px] font-bold text-[#191F28]">{item.name}</span>
            <span className="text-[12px] text-[#6B7684]">{formatWon(item.amount)}</span>
            <button type="button" aria-label={item.name + " 위로"} onClick={() => move(index, -1)} className="rounded-lg p-1 text-[#6B7684] disabled:opacity-30" disabled={index === 0}><ArrowUp size={15} /></button>
            <button type="button" aria-label={item.name + " 아래로"} onClick={() => move(index, 1)} className="rounded-lg p-1 text-[#6B7684] disabled:opacity-30" disabled={index === ordered.length - 1}><ArrowDown size={15} /></button>
          </li>
        ))}
      </ol>

      {plan?.ok && (
        <>
          <div className="mt-4 rounded-2xl bg-[#F2F8FF] px-4 py-3">
            <p className="text-[13px] font-bold text-[#1B64DA]">매달 {formatWon(plan.monthlySaving)}, 1년이면 {formatWon(plan.yearlySaving)} 아껴요</p>
            <p className="mt-0.5 text-[12px] text-[#4E5968]">지금 매달 {formatWon(plan.currentMonthly)} → 순환하면 평균 {formatWon(plan.plannedMonthly)}</p>
          </div>
          <h3 className="mt-5 text-[13px] font-bold text-[#8B95A1]">앞으로 4달</h3>
          <ul className="mt-2 space-y-1.5">
            {plan.months.slice(0, 4).map((month) => (
              <li key={month.index} className="rounded-xl bg-[#F9FAFB] px-3 py-2 text-[12.5px] leading-relaxed text-[#4E5968]">
                <span className="font-bold text-[#191F28]">{month.label}</span> · {month.active.name} 보기
                {month.cancel.map((item) => <span key={"c" + item.subscriptionId}> · {item.name} {shortDate(item.cancelBy)}까지 해지</span>)}
                {month.resume.map((item) => <span key={"r" + item.subscriptionId}> · {item.name} {shortDate(item.startOn)} 가입</span>)}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 space-y-2">
        <Button
          size="large"
          fullWidth
          disabled={!plan?.ok}
          onClick={() => onSave?.({ category, order: ordered.map(idOf), createdAt: new Date().toISOString(), months: 6, services: ordered.map(rotationSnapshot) })}
        >
          {saved ? "이 순서로 계획 바꾸기" : "이 계획으로 알림 받기"}
        </Button>
        {saved && (
          <Button size="large" fullWidth variant="secondary" onClick={onClear}>계획 끄기</Button>
        )}
      </div>
    </BottomSheet>
  );
}
