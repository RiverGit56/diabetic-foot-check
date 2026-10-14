"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import {
  getProfile,
  saveProfile,
  getMissingProfileFields,
  REQUIRED_PROFILE_FIELDS,
  COMORBIDITY_NONE,
  PROFILE_GATE_KEY,
  ASSESS_AUTOSTART_KEY,
  type UserProfile,
} from "@/lib/assessment";

/** i18n label for each profile field, used to list what is still missing. */
const FIELD_LABEL_KEY: Record<string, string> = {
  ageRange: "profile.ageRange",
  gender: "profile.gender",
  diabetesType: "profile.diabetesType",
  diabetesDuration: "profile.duration",
  insulinUse: "profile.insulin",
  lastHbA1c: "profile.hba1c",
  comorbidities: "profile.comorbidities",
  smoking: "profile.smoking",
  footInspection: "profile.footInspection",
  barefootFrequency: "profile.barefoot",
  footwearType: "profile.footwearType",
  priorAmputation: "profile.priorAmputation",
};

/** Age bands for this hackathon, which focuses on adults aged 60+. */
const AGE_RANGES: { value: string; labelKey: string }[] = [
  { value: "60-69", labelKey: "profile.ageRangeOpt.60to69" },
  { value: "70-79", labelKey: "profile.ageRangeOpt.70to79" },
  { value: "80-89", labelKey: "profile.ageRangeOpt.80to89" },
  { value: "89+", labelKey: "profile.ageRangeOpt.over89" },
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({});
  const [saved, setSaved] = useState(false);
  // True when the user was sent here from the assessment start gate.
  const [gateActive, setGateActive] = useState(false);

  useEffect(() => {
    setProfile(getProfile() || {});
    if (typeof window !== "undefined") {
      setGateActive(sessionStorage.getItem(PROFILE_GATE_KEY) === "1");
    }
  }, []);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleComorbidityToggle = (value: string) => {
    const current = profile.comorbidities || [];
    let updated: string[];
    if (value === COMORBIDITY_NONE) {
      // "None" is exclusive: selecting it clears any other selection.
      updated = current.includes(COMORBIDITY_NONE) ? [] : [COMORBIDITY_NONE];
    } else {
      // Picking a real condition clears the "none" sentinel.
      const withoutNone = current.filter((c) => c !== COMORBIDITY_NONE);
      updated = withoutNone.includes(value)
        ? withoutNone.filter((c) => c !== value)
        : [...withoutNone, value];
    }
    handleChange("comorbidities", updated);
  };

  /** Red asterisk — every profile field is required. */
  const reqMark = (field: keyof UserProfile) =>
    REQUIRED_PROFILE_FIELDS.includes(field) ? (
      <span className="ml-1 text-risk-high" aria-hidden="true">*</span>
    ) : null;

  // Every field is mandatory: the profile cannot be saved until it is complete.
  const missing = getMissingProfileFields(profile);
  const isComplete = missing.length === 0;
  const answeredCount = REQUIRED_PROFILE_FIELDS.length - missing.length;

  const handleSave = () => {
    if (!isComplete) return; // guard — the button is disabled while incomplete
    saveProfile(profile);
    setSaved(true);

    if (gateActive) {
      // Came from the assessment gate: return and auto-start the questionnaire.
      if (typeof window !== "undefined") {
        sessionStorage.setItem(ASSESS_AUTOSTART_KEY, "1");
        sessionStorage.removeItem(PROFILE_GATE_KEY);
      }
      router.push("/assess");
    }
  };

  return (
    <div className="py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t("profile.title")}</h1>
        <p className="text-base text-gray-600">{t("profile.subtitle")}</p>
      </div>

      {/* Gate banner — shown when arriving from the assessment "Start" button */}
      {gateActive && (
        <div className="mb-4 rounded-xl border border-primary-300 bg-primary-50 p-3" role="status">
          <div className="flex gap-2">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 16v-4M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm leading-relaxed text-primary-900 break-words">{t("profile.gateBanner")}</p>
          </div>
        </div>
      )}

      {/* Age */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.ageRange")}{reqMark("ageRange")}</label>
        <div className="grid grid-cols-2 gap-2">
          {AGE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleChange("ageRange", range.value)}
              className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
                profile.ageRange === range.value
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(range.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Gender */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.gender")}{reqMark("gender")}</label>
        <div className="grid grid-cols-3 gap-2">
          {["male", "female", "other"].map((g) => (
            <button
              key={g}
              onClick={() => handleChange("gender", g)}
              className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
                profile.gender === g
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.genderOpt.${g}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Diabetes Type */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.diabetesType")}{reqMark("diabetesType")}</label>
        <div className="grid grid-cols-1 gap-2">
          {["type2", "type1"].map((dt) => (
            <button
              key={dt}
              onClick={() => handleChange("diabetesType", dt)}
              className={`rounded-xl border px-4 py-3 text-left text-base transition-colors min-h-[3rem] ${
                profile.diabetesType === dt
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.diabetesTypeOpt.${dt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.duration")}{reqMark("diabetesDuration")}</label>
        <div className="grid grid-cols-3 gap-2">
          {["under5", "5to10", "over10"].map((d) => (
            <button
              key={d}
              onClick={() => handleChange("diabetesDuration", d)}
              className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
                profile.diabetesDuration === d
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.durationOpt.${d}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Insulin */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.insulin")}{reqMark("insulinUse")}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleChange("insulinUse", true)}
            className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
              profile.insulinUse === true
                ? "border-primary-500 bg-primary-50 text-primary-800"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
            }`}
          >
            {t("profile.yes")}
          </button>
          <button
            onClick={() => handleChange("insulinUse", false)}
            className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
              profile.insulinUse === false
                ? "border-primary-500 bg-primary-50 text-primary-800"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
            }`}
          >
            {t("profile.no")}
          </button>
        </div>
      </div>

      {/* Last HbA1c */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.hba1c")}{reqMark("lastHbA1c")}</label>
        <div className="grid grid-cols-3 gap-2">
          {["under7", "7to8", "over8", "unknown", "notTested", "recently"].map((h) => (
            <button
              key={h}
              onClick={() => handleChange("lastHbA1c", h)}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors min-h-[3rem] break-words ${
                profile.lastHbA1c === h
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.hba1cOpt.${h}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Comorbidities */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.comorbidities")}{reqMark("comorbidities")}</label>
        <div className="space-y-2">
          {["hypertension", "kidney", "eye", "heart", "cholesterol", COMORBIDITY_NONE].map((c) => {
            const selected = profile.comorbidities?.includes(c);
            return (
              <button
                key={c}
                onClick={() => handleComorbidityToggle(c)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors min-h-[3rem] ${
                  selected
                    ? "border-primary-500 bg-primary-50 text-primary-800"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
                }`}
              >
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 ${
                  selected ? "border-primary-500 bg-primary-500" : "border-gray-300"
                }`}>
                  {selected && (
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {t(`profile.comorbidityOpt.${c}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Smoking */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.smoking")}{reqMark("smoking")}</label>
        <div className="grid grid-cols-3 gap-2">
          {["never", "former", "current"].map((s) => (
            <button
              key={s}
              onClick={() => handleChange("smoking", s)}
              className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
                profile.smoking === s
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.smokingOpt.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Foot Care (formerly Q18-Q20 in assessment) ── */}
      <div className="mb-4 mt-6">
        <h2 className="text-base font-bold text-gray-900">{t("profile.footCareSection")}</h2>
        <p className="text-sm text-gray-600">{t("profile.footCareSectionDesc")}</p>
      </div>

      {/* Foot Inspection (sc1) */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.footInspection")}{reqMark("footInspection")}</label>
        <div className="grid grid-cols-2 gap-2">
          {["daily", "weekly", "rarely", "never"].map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("footInspection", opt)}
              className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
                profile.footInspection === opt
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.footInspectionOpt.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Barefoot Frequency (sc2) */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.barefoot")}{reqMark("barefootFrequency")}</label>
        <div className="grid grid-cols-3 gap-2">
          {["never", "sometimes", "often"].map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("barefootFrequency", opt)}
              className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
                profile.barefootFrequency === opt
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.barefootOpt.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Footwear Type (sc3) */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.footwearType")}{reqMark("footwearType")}</label>
        <div className="grid grid-cols-1 gap-2">
          {["closed", "sandals", "flipflops"].map((opt) => (
            <button
              key={opt}
              onClick={() => handleChange("footwearType", opt)}
              className={`rounded-xl border px-4 py-3 text-left text-base transition-colors min-h-[3rem] ${
                profile.footwearType === opt
                  ? "border-primary-500 bg-primary-50 text-primary-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
              }`}
            >
              {t(`profile.footwearOpt.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Prior Amputation (h3) */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-base font-semibold text-gray-900">{t("profile.priorAmputation")}{reqMark("priorAmputation")}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleChange("priorAmputation", false)}
            className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
              profile.priorAmputation === false
                ? "border-primary-500 bg-primary-50 text-primary-800"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
            }`}
          >
            {t("profile.no")}
          </button>
          <button
            onClick={() => handleChange("priorAmputation", true)}
            className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] ${
              profile.priorAmputation === true
                ? "border-primary-500 bg-primary-50 text-primary-800"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
            }`}
          >
            {t("profile.yes")}
          </button>
        </div>
      </div>

      {/* Everything is required — show what is still missing + progress */}
      {!isComplete && (
        <div className="mb-3 rounded-xl border border-amber-400 bg-amber-50 p-3" role="status">
          <p className="text-sm font-semibold text-amber-900">
            {t("profile.requiredHint", {
              done: answeredCount,
              total: REQUIRED_PROFILE_FIELDS.length,
            })}
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
            {missing.map((f) => (
              <li key={f}>{t(FIELD_LABEL_KEY[f])}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save — disabled until every field is answered */}
      <button
        onClick={handleSave}
        disabled={!isComplete}
        className="w-full rounded-xl bg-primary-600 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[3rem]"
      >
        {t("profile.save")}
      </button>
      {saved && (
        <p className="mt-2 text-center text-base font-semibold text-risk-low" role="status">
          {t("profile.saved")}
        </p>
      )}
    </div>
  );
}
