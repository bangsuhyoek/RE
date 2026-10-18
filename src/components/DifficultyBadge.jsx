import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Flame, HelpCircle } from "lucide-react";
import { difficultyLabel, fetchDifficultyScore } from "../lib/cancelDifficulty";

/**
 * 해지 난이도 배지 컴포넌트
 * - k-익명성(5건 이상) 충족 시에만 노출 (점수 데이터 없으면 null 반환)
 * - "해지 난이도: 어려움 (72점 · 23명 참여)"
 * - 주요 특성 1~2개 ("전화 해지 비율 40%", "해지 메뉴 찾기 어려움 60%" 등)
 */
export function DifficultyBadge({ serviceId, className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!serviceId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchDifficultyScore(serviceId)
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setData(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [serviceId]);

  if (loading || !data || !data.report_count || data.report_count < 5) {
    return null;
  }

  const score = Number(data.difficulty_score) || 0;
  const label = difficultyLabel(score);
  const reportCount = Number(data.report_count);

  // 상위 특성 1~2개 추출 (비율 높은 순)
  const traits = [];
  const phoneOnlyRate = Math.round((Number(data.phone_only_rate) || 0) * 100);
  const hiddenMenuRate = Math.round((Number(data.hidden_menu_rate) || 0) * 100);
  const retentionRate = Math.round((Number(data.retention_offer_rate) || 0) * 100);
  const forcedSurveyRate = Math.round((Number(data.forced_survey_rate) || 0) * 100);
  const gaveUpRate = Math.round((Number(data.gave_up_rate) || 0) * 100);

  if (phoneOnlyRate >= 20) {
    traits.push({ label: `전화 해지 ${phoneOnlyRate}%`, rate: phoneOnlyRate });
  }
  if (hiddenMenuRate >= 25) {
    traits.push({ label: `숨은 메뉴 ${hiddenMenuRate}%`, rate: hiddenMenuRate });
  }
  if (retentionRate >= 30) {
    traits.push({ label: `만류 화면 ${retentionRate}%`, rate: retentionRate });
  }
  if (forcedSurveyRate >= 25) {
    traits.push({ label: `설문/상담 강제 ${forcedSurveyRate}%`, rate: forcedSurveyRate });
  }
  if (gaveUpRate >= 15) {
    traits.push({ label: `중도 포기 ${gaveUpRate}%`, rate: gaveUpRate });
  }

  // 비율 내림차순 정렬 후 최대 2개
  traits.sort((a, b) => b.rate - a.rate);
  const topTraits = traits.slice(0, 2);

  const getTone = (s) => {
    if (s < 30) return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-900" };
    if (s < 55) return { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-900" };
    if (s < 75) return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-900" };
    return { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-900" };
  };

  const tone = getTone(score);

  return (
    <div
      className={`rounded-2xl border p-3 ${tone.bg} ${tone.border} ${className}`}
      data-testid="difficulty-badge"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] font-bold text-[#191F28]">
            해지 난이도: <span className={`font-extrabold ${tone.text}`}>{label}</span>
          </span>
          <span className="text-[11px] text-[#6B7684]">
            ({score}점 · {reportCount}명 참여)
          </span>
        </div>
      </div>

      {topTraits.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topTraits.map((t) => (
            <span
              key={t.label}
              className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${tone.badge}`}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

