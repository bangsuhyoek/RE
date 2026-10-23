import { useState } from "react";
import { Camera, Check, Clock, ShieldCheck, X } from "lucide-react";
import { Button } from "./ui";
import { formatKSTDateTime } from "../lib/complaintDrafts";
import { resizeImageFile, saveCancelProof } from "../lib/cancelProof";

/**
 * 해지 완료 시점에 사용자가 기기에 해지 증빙(완료 캡처 및 시각)을 남길 수 있는 컴포넌트
 * - 이미지는 서버로 전송되지 않고 로컬 IndexedDB에만 저장됨.
 *
 * @param {Object} props
 * @param {Object} props.record
 * @param {string} [props.record.recordId]
 * @param {string} [props.record.subscriptionId]
 * @param {string} props.record.serviceName
 * @param {number} [props.record.amount]
 * @param {string|Date} [props.record.cancelledAt]
 * @param {Function} [props.onSaved]
 */
export function CancelProofCapture({ record, onSaved }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [note] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  if (!record) return null;

  const cancelledAt = record.cancelledAt || new Date().toISOString();
  const timeFormatted = formatKSTDateTime(cancelledAt);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImageFile(file, { maxSize: 1600, quality: 0.85 });
      setImagePreview(dataUrl);
    } catch {
      // 이미지 리사이즈/불러오기 실패 시 사용자 안내 표시
      setError("이미지를 불러오지 못했어요. 다시 시도해 주세요.");
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const proof = await saveCancelProof({
        recordId: record.recordId || record.id || null,
        subscriptionId: record.subscriptionId || null,
        serviceId: record.serviceId || null,
        serviceName: record.serviceName || record.name || "",
        amount: record.amount || 0,
        cancelledAt: cancelledAt,
        imageDataUrl: imagePreview,
        note: note.trim() || null,
      });
      setSaved(true);
      onSaved?.(proof);
    } catch {
      // 증빙 IndexedDB 저장 실패 시 사용자 안내 표시
      setError("증빙을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="mt-4 w-full rounded-2xl border border-[#E5E8EB] bg-[#F9FAFB] p-4 text-left">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[#20C997]">
          <ShieldCheck size={18} />
          <span>해지 증빙이 안전하게 저장되었어요</span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#6B7684]">
          해지 일시({timeFormatted})와 캡처 기록은 휴대폰(기기)에만 보관되며, 서버로 전송되지 않아요. 혹시 나중에 결제되면 언제든 증빙서류로 꺼내 쓸 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full rounded-2xl border border-[#E5E8EB] bg-white p-4 text-left shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-[#3182F6]" />
          <h3 className="text-[14px] font-bold text-[#191F28]">해지 증명 남겨두기</h3>
        </div>
        <span className="text-[11px] font-medium text-[#8B95A1]">기기 전용 보관</span>
      </div>

      <p className="mt-1 text-[12px] leading-relaxed text-[#6B7684]">
        해지 후 나중에 다시 결제되는 피해를 막기 위해 해지 완료 시각과 완료 화면을 기기에만 저장해 두세요.
      </p>

      {/* 해지 기록 시간 정보 */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F2F4F6] px-3 py-2 text-[12px] text-[#4E5968]">
        <Clock size={14} className="shrink-0 text-[#8B95A1]" />
        <span>해지 완료 시각: <strong className="text-[#191F28]">{timeFormatted}</strong></span>
      </div>

      {/* 이미지 첨부 영역 */}
      <div className="mt-3">
        {imagePreview ? (
          <div className="relative mt-2 overflow-hidden rounded-xl border border-[#E5E8EB] bg-[#F9FAFB]">
            <img
              src={imagePreview}
              alt="해지 완료 캡처 미리보기"
              className="max-h-48 w-full object-contain"
            />
            <button
              type="button"
              onClick={removeImage}
              aria-label="캡처 삭제"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D1D6DB] bg-[#F9FAFB] p-3.5 text-[12px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6] transition">
            <Camera size={16} className="text-[#8B95A1]" />
            <span>해지 완료 화면 첨부 (선택)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      {/* 오류 메시지 */}
      {error && (
        <p className="mt-2 text-[11px] font-medium text-[#F04452]">{error}</p>
      )}

      {/* 저장 버튼 */}
      <div className="mt-3.5">
        <Button
          size="compact"
          variant="secondary"
          fullWidth
          disabled={saving}
          onClick={handleSave}
          prefixIcon={saving ? null : <Check size={14} />}
        >
          {saving ? "저장하는 중..." : "해지 증명 저장하기"}
        </Button>
        <p className="mt-1.5 text-center text-[11px] text-[#8B95A1]">
          첨부한 사진은 어디에도 업로드되지 않고 내 폰에만 남아요.
        </p>
      </div>
    </div>
  );
}
