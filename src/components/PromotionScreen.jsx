import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "./ui";

export function PromotionScreen({ subscriptions, promotions, onOpenPromotion }) {
  const eligible = (promotions || []).filter((p) => p.sourceServiceIds?.some((id) => subscriptions.some((s) => s.id === id)));
  return <main className="px-6 pb-28 pt-6"><p className="re-eyebrow">BENEFITS</p><h1 className="mt-1 text-[24px] font-extrabold text-[#1B2A8C]">받을 수 있는 혜택</h1><p className="mt-2 text-[13px] leading-5 text-[#9099CA]">구독 중인 서비스와 관련된 혜택만 보여드려요.</p>{eligible.length ? <div className="mt-6 space-y-3">{eligible.map((p) => <article key={p.id} className="re-dashboard-card rounded-[20px] p-5"><div className="flex items-center gap-2 text-[#475FAC]"><Sparkles size={16} /><span className="text-[11px] font-bold">RE. BENEFIT</span></div><h2 className="mt-3 text-[16px] font-extrabold text-[#1B2A8C]">{p.title}</h2><p className="mt-2 text-[12px] leading-5 text-[#7E8AC0]">{p.description}</p><Button size="compact" className="mt-4" onClick={() => onOpenPromotion(p)}>혜택 보기 <ArrowRight size={14} /></Button></article>)}</div> : <div className="re-dashboard-card mt-10 rounded-[20px] p-6 text-center"><p className="text-[13px] text-[#7E8AC0]">현재 구독과 연결된 유효한 혜택이 없어요.</p></div>}</main>;
}
