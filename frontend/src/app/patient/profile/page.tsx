"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Gender, Lifestyle, PatientProfileIn, PatientProfileOut } from "@/types/api";
import {
  User,
  Activity,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  HeartPulse,
} from "@/components/icons";

/** Màn nhập / cập nhật hồ sơ bệnh nhân. Gọi PUT /patients/me/profile khi submit. */
export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state — khởi tạo từ profile hiện tại
  const [age, setAge] = useState<number | "">(0);
  const [gender, setGender] = useState<Gender>("female");
  const [geneticsHistory, setGeneticsHistory] = useState<string[]>([]);
  const [geneticsInput, setGeneticsInput] = useState("");
  const [lifestyle, setLifestyle] = useState<Lifestyle>({});

  useEffect(() => {
    api
      .getProfile()
      .then((p: PatientProfileOut) => {
        setAge(p.age ?? "");
        setGender(p.gender ?? "female");
        setGeneticsHistory(p.genetics_history ?? []);
        setLifestyle(p.lifestyle ?? {});
      })
      .catch(() => {
        // Hồ sơ chưa có — form trống
      })
      .finally(() => setLoading(false));
  }, []);

  function addGenetics() {
    const val = geneticsInput.trim();
    if (val && !geneticsHistory.includes(val)) {
      setGeneticsHistory([...geneticsHistory, val]);
    }
    setGeneticsInput("");
  }

  function removeGenetics(item: string) {
    setGeneticsHistory(geneticsHistory.filter((g) => g !== item));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!age || age < 18 || age > 120) {
      setError("Độ tuổi tầm soát phải từ 18 đến 120.");
      return;
    }

    let computedBmi = lifestyle.bmi;
    if (lifestyle.height_cm && lifestyle.weight_kg) {
      const h = lifestyle.height_cm / 100;
      computedBmi = Number((lifestyle.weight_kg / (h * h)).toFixed(1));
    }

    const payload: PatientProfileIn = {
      age: Number(age),
      gender,
      genetics_history: geneticsHistory,
      lifestyle: {
        ...lifestyle,
        bmi: computedBmi,
      },
    };
    try {
      setSaving(true);
      setError("");
      await api.putProfile(payload);
      setSuccess(true);
      setTimeout(() => router.push("/patient"), 1200);
    } catch {
      setError("Lưu hồ sơ thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-10 space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-96" />
        <div className="skeleton h-44 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại</span>
        </button>
        <div className="flex items-center gap-2">
          <h1 className="page-title">Hồ sơ sức khỏe cơ bản</h1>
          <span className="badge bg-teal-50 text-teal-700 border border-teal-200">
            <User className="h-3 w-3" />
            <span>Cá nhân hóa</span>
          </span>
        </div>
        <p className="page-subtitle">
          Thông tin dịch tễ và tiền sử gia đình giúp mô hình AI phân tầng nguy cơ và đề xuất đúng guideline.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ===== Thông tin cơ bản ===== */}
        <section className="card-padded space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <User className="h-4 w-4 text-teal-700" />
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Thông tin nhân khẩu học</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-age" className="label">
                Tuổi hiện tại <span className="text-red-500">*</span>
              </label>
              <input
                id="profile-age"
                type="number"
                min={18}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                className="input"
                placeholder="Ví dụ: 45"
              />
            </div>

            <div>
              <label htmlFor="profile-gender" className="label">
                Giới tính sinh học <span className="text-red-500">*</span>
              </label>
              <select
                id="profile-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="input"
              >
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
        </section>

        {/* ===== Tiền sử gia đình ===== */}
        <section className="card-padded space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <HeartPulse className="h-4 w-4 text-teal-700" />
            <div>
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Tiền sử gia đình</h2>
              <p className="text-xs text-slate-500 mt-0.5">Người thân ruột thịt (bố mẹ, anh chị em) từng mắc ung thư.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              id="profile-genetics-input"
              type="text"
              value={geneticsInput}
              onChange={(e) => setGeneticsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGenetics();
                }
              }}
              className="input flex-1"
              placeholder="Ví dụ: Mẹ ung thư vú, Bố ung thư phổi..."
            />
            <button
              type="button"
              onClick={addGenetics}
              className="btn-secondary shrink-0 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm</span>
            </button>
          </div>

          {geneticsHistory.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {geneticsHistory.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 border border-teal-200"
                >
                  <span>{g}</span>
                  <button
                    type="button"
                    onClick={() => removeGenetics(g)}
                    className="text-teal-600 hover:text-teal-900 transition-colors"
                    aria-label={`Xóa ${g}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Chưa ghi nhận tiền sử gia đình.</p>
          )}
        </section>

        {/* ===== Lối sống ===== */}
        <section className="card-padded space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Activity className="h-4 w-4 text-teal-700" />
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Lối sống & Thể trạng</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Hút thuốc */}
            <div className="sm:col-span-2">
              <p className="label">Tiền sử hút thuốc lá</p>
              <div className="mt-1 flex gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="smoking"
                    checked={lifestyle.smoking === true}
                    onChange={() => setLifestyle({ ...lifestyle, smoking: true })}
                    className="accent-teal-700"
                  />
                  <span>Có hút thuốc</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="smoking"
                    checked={lifestyle.smoking === false}
                    onChange={() => setLifestyle({ ...lifestyle, smoking: false, pack_years: undefined })}
                    className="accent-teal-700"
                  />
                  <span>Không hút thuốc</span>
                </label>
              </div>
            </div>

            {/* Số gói-năm — chỉ hiện khi có hút thuốc */}
            {lifestyle.smoking === true && (
              <div className="sm:col-span-2 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                <label htmlFor="profile-pack-years" className="label text-amber-950">
                  Số gói-năm ước tính (Số bao/ngày × số năm hút)
                </label>
                <input
                  id="profile-pack-years"
                  type="number"
                  min={0}
                  max={200}
                  value={lifestyle.pack_years ?? ""}
                  onChange={(e) =>
                    setLifestyle({ ...lifestyle, pack_years: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  className="input max-w-xs"
                  placeholder="Ví dụ: 20"
                />
              </div>
            )}

            {/* Chiều cao & Cân nặng */}
            <div>
              <label htmlFor="profile-height" className="label">
                Chiều cao (cm)
              </label>
              <input
                id="profile-height"
                type="number"
                min={50}
                max={250}
                value={lifestyle.height_cm ?? ""}
                onChange={(e) =>
                  setLifestyle({ ...lifestyle, height_cm: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                className="input"
                placeholder="Ví dụ: 165"
              />
            </div>

            <div>
              <label htmlFor="profile-weight" className="label">
                Cân nặng (kg)
              </label>
              <input
                id="profile-weight"
                type="number"
                step="0.1"
                min={10}
                max={300}
                value={lifestyle.weight_kg ?? ""}
                onChange={(e) =>
                  setLifestyle({ ...lifestyle, weight_kg: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                className="input"
                placeholder="Ví dụ: 60"
              />
            </div>

            {/* Uống rượu */}
            <div>
              <label htmlFor="profile-alcohol" className="label">
                Mức độ sử dụng rượu / bia
              </label>
              <select
                id="profile-alcohol"
                value={lifestyle.alcohol ?? ""}
                onChange={(e) =>
                  setLifestyle({ ...lifestyle, alcohol: (e.target.value || undefined) as Lifestyle["alcohol"] })
                }
                className="input"
              >
                <option value="">Chưa cung cấp</option>
                <option value="none">Không uống</option>
                <option value="light">Nhẹ (≤ 1 ly tiêu chuẩn/ngày)</option>
                <option value="heavy">Thường xuyên (≥ 2 ly/ngày)</option>
              </select>
            </div>

            {/* Vận động */}
            <div>
              <label htmlFor="profile-exercise" className="label">
                Thói quen vận động thể chất
              </label>
              <select
                id="profile-exercise"
                value={lifestyle.exercise ?? ""}
                onChange={(e) =>
                  setLifestyle({ ...lifestyle, exercise: (e.target.value || undefined) as Lifestyle["exercise"] })
                }
                className="input"
              >
                <option value="">Chưa cung cấp</option>
                <option value="none">Ít vận động</option>
                <option value="light">Nhẹ (đi bộ, &lt; 3 buổi/tuần)</option>
                <option value="regular">Đều đặn (≥ 150 phút/tuần)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Lỗi / Thành công */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Đã lưu hồ sơ sức khỏe thành công! Đang trở về trang tổng quan…</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6"
          >
            {saving ? (
              <>
                <span className="spinner h-4 w-4" />
                <span>Đang lưu hồ sơ…</span>
              </>
            ) : (
              "Lưu hồ sơ sức khỏe"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
