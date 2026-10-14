/**
 * Diabetes Risk Profiling — Population-Level Data
 * 
 * Provides risk factor weights and population-level statistics
 * for calibrating individual risk assessments against population baselines.
 * 
 * Data Sources:
 * - Singapore MOH National Population Health Survey (NPHS) 2022
 * - World Bank / IDF Diabetes Atlas (2024)
 * - Kaggle: Diabetes Health Indicators Dataset (BRFSS 2015 — feature engineering reference)
 * - Synthea: Synthetic patient generation for testing
 * - MIMIC-III: Clinical feature reference (ICU population)
 * 
 * NOTE: The risk multipliers below are derived from published epidemiological
 * studies. They are used to contextualize individual assessment scores
 * against population-level risk patterns — NOT to diagnose.
 */

// ═══════════════════════════════════════════════════════════════════
//  Age-Based Risk Multipliers
// ═══════════════════════════════════════════════════════════════════

export interface AgeRiskProfile {
  range: string;
  /** Risk multiplier vs. baseline (1.0 = average population risk) */
  multiplier: number;
  /** Diabetes prevalence in this age group (Singapore) */
  diabetesPrevalence: number;
  /** Diabetic foot ulcer risk in this age group */
  footUlcerRisk: number;
  /** Recommended screening frequency */
  screeningInterval: string;
}

/**
 * Age bands aligned with the profile picker (this hackathon targets adults 60+).
 *
 * `60-69` and `70-79` reuse the Singapore NPHS 2022 / MOH anchored values.
 * `80-89` and `89+` are EXTRAPOLATED placeholders (monotonic continuation) —
 * they are NOT published figures and must be replaced with real data before
 * any clinical or regulatory use. See docs/中文说明/data-sources-and-grading-zh.md.
 */
export const AGE_RISK_PROFILES: AgeRiskProfile[] = [
  {
    range: "60-69",
    multiplier: 1.6,
    diabetesPrevalence: 25.4,
    footUlcerRisk: 14.2,
    screeningInterval: "6 months",
  },
  {
    range: "70-79",
    multiplier: 2.0,
    diabetesPrevalence: 24.2,
    footUlcerRisk: 22.0,
    screeningInterval: "3 months",
  },
  {
    // EXTRAPOLATED — placeholder, pending real data
    range: "80-89",
    multiplier: 2.4,
    diabetesPrevalence: 22.0,
    footUlcerRisk: 30.0,
    screeningInterval: "3 months",
  },
  {
    // EXTRAPOLATED — placeholder, pending real data
    range: "89+",
    multiplier: 2.8,
    diabetesPrevalence: 20.0,
    footUlcerRisk: 38.0,
    screeningInterval: "3 months",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Comorbidity Risk Weights
// ═══════════════════════════════════════════════════════════════════

export interface ComorbidityRiskWeight {
  id: string;
  label: string;
  /** Relative risk increase for diabetic foot complications */
  riskMultiplier: number;
  /** Mechanism by which it increases foot risk */
  mechanism: string;
}

export const COMORBIDITY_WEIGHTS: ComorbidityRiskWeight[] = [
  {
    id: "hypertension",
    label: "Hypertension",
    riskMultiplier: 1.4,
    mechanism:
      "Accelerates atherosclerosis and PAD, reducing peripheral perfusion and impairing wound healing.",
  },
  {
    id: "kidney",
    label: "Chronic Kidney Disease",
    riskMultiplier: 2.1,
    mechanism:
      "Uremia impairs wound healing. Dialysis patients have 2x higher amputation risk. Peripheral edema increases skin breakdown risk.",
  },
  {
    id: "eye",
    label: "Diabetic Retinopathy",
    riskMultiplier: 1.5,
    mechanism:
      "Marker of microvascular damage. Correlates with neuropathy severity. Visual impairment reduces self-inspection ability.",
  },
  {
    id: "heart",
    label: "Cardiovascular Disease",
    riskMultiplier: 1.8,
    mechanism:
      "Indicates systemic vascular disease. Peripheral circulation impaired. Wound healing capacity reduced.",
  },
  {
    id: "cholesterol",
    label: "Hyperlipidemia",
    riskMultiplier: 1.3,
    mechanism:
      "Contributes to PAD progression. Impairs microcirculation and tissue oxygenation.",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Diabetes Duration Risk
// ═══════════════════════════════════════════════════════════════════

export const DIABETES_DURATION_RISK = [
  {
    range: "under5",
    label: "Less than 5 years",
    multiplier: 1.0,
    footUlcerRisk: 3.5,
  },
  {
    range: "5to10",
    label: "5-10 years",
    multiplier: 1.5,
    footUlcerRisk: 7.2,
  },
  {
    range: "over10",
    label: "More than 10 years",
    multiplier: 2.3,
    footUlcerRisk: 16.8,
  },
];

// ═══════════════════════════════════════════════════════════════════
//  HbA1c Risk Tiers
// ═══════════════════════════════════════════════════════════════════

export const HBA1C_RISK_TIERS = [
  {
    range: "under7",
    label: "Below 7% (53 mmol/mol)",
    tier: "good",
    multiplier: 0.8,
    note: "Well-controlled. Lowest risk of complications.",
  },
  {
    range: "7to8",
    label: "7-8% (53-64 mmol/mol)",
    tier: "moderate",
    multiplier: 1.2,
    note: "Moderate control. Discuss optimization with endocrinologist.",
  },
  {
    range: "over8",
    label: "Above 8% (64 mmol/mol)",
    tier: "high",
    multiplier: 1.8,
    note: "Poor control. Significantly increased risk of neuropathy and foot complications.",
  },
  {
    range: "unknown",
    label: "Unknown / Not tested",
    tier: "unknown",
    multiplier: 1.0,
    note: "HbA1c unknown. Recommend testing as soon as possible.",
  },
  {
    range: "notTested",
    label: "Not tested recently",
    tier: "unknown",
    multiplier: 1.1,
    note: "HbA1c not tested recently. Recommend retesting.",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Smoking Risk
// ═══════════════════════════════════════════════════════════════════

export const SMOKING_RISK = [
  {
    id: "never",
    label: "Never smoked",
    multiplier: 1.0,
    note: "No additional risk from smoking.",
  },
  {
    id: "former",
    label: "Former smoker",
    multiplier: 1.2,
    note: "Residual cardiovascular risk. PAD risk partially reversible after quitting.",
  },
  {
    id: "current",
    label: "Current smoker",
    multiplier: 2.1,
    note: "Major risk for PAD, neuropathy progression, and impaired wound healing. Quitting is the single most impactful intervention.",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Risk Profile Calculation
// ═══════════════════════════════════════════════════════════════════

export interface UserProfileData {
  ageRange?: string;
  gender?: string;
  diabetesType?: string;
  diabetesDuration?: string;
  insulinUse?: boolean;
  lastHbA1c?: string;
  comorbidities?: string[];
  smoking?: string;
}

export interface RiskProfileResult {
  /** Overall population-level risk multiplier */
  populationRiskMultiplier: number;
  /** Estimated diabetic foot ulcer probability (population baseline) */
  estimatedFootUlcerProbability: number;
  /** Key risk factors identified */
  keyRiskFactors: { factor: string; weight: number; note: string }[];
  /** Population comparison percentile */
  populationPercentile: number;
  /** Recommended screening interval based on profile */
  recommendedScreeningInterval: string;
}

/**
 * Calculate a population-level risk profile from user profile data.
 * This contextualizes the individual assessment against population statistics.
 * 
 * NOTE: This is NOT a diagnosis. It uses published epidemiological data
 * to estimate relative risk and guide screening frequency.
 */
export function calculatePopulationRisk(
  profile: UserProfileData
): RiskProfileResult {
  let multiplier = 1.0;
  const keyRiskFactors: { factor: string; weight: number; note: string }[] = [];
  let baseFootUlcerRisk = 8.0; // Singapore population baseline

  // Age
  const ageProfile = AGE_RISK_PROFILES.find((a) => a.range === profile.ageRange);
  if (ageProfile) {
    multiplier *= ageProfile.multiplier;
    baseFootUlcerRisk = ageProfile.footUlcerRisk;
    if (ageProfile.multiplier > 1.0) {
      keyRiskFactors.push({
        factor: `Age ${ageProfile.range}`,
        weight: ageProfile.multiplier,
        note: `${ageProfile.footUlcerRisk}% baseline foot ulcer risk in this age group`,
      });
    }
  }

  // Diabetes duration
  const durationProfile = DIABETES_DURATION_RISK.find(
    (d) => d.range === profile.diabetesDuration
  );
  if (durationProfile) {
    multiplier *= durationProfile.multiplier;
    if (durationProfile.multiplier > 1.0) {
      keyRiskFactors.push({
        factor: `Diabetes for ${durationProfile.label.toLowerCase()}`,
        weight: durationProfile.multiplier,
        note: `${durationProfile.footUlcerRisk}% foot ulcer risk at this duration`,
      });
    }
  }

  // HbA1c
  const hba1cProfile = HBA1C_RISK_TIERS.find(
    (h) => h.range === profile.lastHbA1c
  );
  if (hba1cProfile) {
    multiplier *= hba1cProfile.multiplier;
    if (hba1cProfile.multiplier > 1.0) {
      keyRiskFactors.push({
        factor: `HbA1c ${hba1cProfile.label}`,
        weight: hba1cProfile.multiplier,
        note: hba1cProfile.note,
      });
    }
  }

  // Comorbidities
  for (const comorbidityId of profile.comorbidities ?? []) {
    const comorbidity = COMORBIDITY_WEIGHTS.find(
      (c) => c.id === comorbidityId
    );
    if (comorbidity && comorbidity.riskMultiplier > 1.0) {
      multiplier *= comorbidity.riskMultiplier;
      keyRiskFactors.push({
        factor: comorbidity.label,
        weight: comorbidity.riskMultiplier,
        note: comorbidity.mechanism,
      });
    }
  }

  // Smoking
  const smokingProfile = SMOKING_RISK.find((s) => s.id === profile.smoking);
  if (smokingProfile && smokingProfile.multiplier > 1.0) {
    multiplier *= smokingProfile.multiplier;
    keyRiskFactors.push({
      factor: smokingProfile.label,
      weight: smokingProfile.multiplier,
      note: smokingProfile.note,
    });
  }

  // Insulin use (marker of more advanced diabetes)
  if (profile.insulinUse) {
    multiplier *= 1.3;
    keyRiskFactors.push({
      factor: "Insulin use",
      weight: 1.3,
      note: "Insulin-dependent diabetes indicates more advanced disease with higher complication risk.",
    });
  }

  // Calculate estimated probability (capped at 80%)
  const estimatedProbability = Math.min(
    Math.round(baseFootUlcerRisk * multiplier),
    80
  );

  // Sort risk factors by weight (highest first)
  keyRiskFactors.sort((a, b) => b.weight - a.weight);

  // Population percentile (rough estimate based on multiplier)
  // Multiplier of 1.0 ≈ median, 2.0 ≈ 75th percentile, 3.0+ ≈ 90th+
  const percentile = Math.min(
    Math.round(50 + (multiplier - 1.0) * 30),
    99
  );

  // Recommended screening interval
  let interval = "12 months";
  if (multiplier >= 2.5) interval = "3 months";
  else if (multiplier >= 1.8) interval = "6 months";
  else if (multiplier >= 1.3) interval = "12 months";

  return {
    populationRiskMultiplier: Math.round(multiplier * 10) / 10,
    estimatedFootUlcerProbability: estimatedProbability,
    keyRiskFactors: keyRiskFactors.slice(0, 5), // Top 5
    populationPercentile: percentile,
    recommendedScreeningInterval: interval,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Kaggle — Diabetes Health Indicators Dataset Feature Reference
// ═══════════════════════════════════════════════════════════════════

/**
 * Reference features from the Kaggle "Diabetes Health Indicators" dataset
 * (derived from CDC BRFSS 2015; 253,680 survey responses, 21 features).
 * Used for feature engineering comparison — NOT for diagnosis.
 *
 * The dataset contains 21 features; the ones most relevant to diabetic-foot
 * risk profiling are:
 *  - HighBP              : high blood pressure (hypertension)
 *  - HighChol            : high cholesterol
 *  - BMI                 : body mass index (obesity → neuropathy, poor healing)
 *  - Smoker              : smoking history (PAD, impaired wound healing)
 *  - Stroke              : history of stroke (systemic vascular disease)
 *  - HeartDiseaseorAttack: coronary disease / MI (systemic vascular disease)
 *  - DiffWalk            : difficulty walking (mobility / neuropathy proxy)
 *  - GenHlth / PhysHlth  : self-rated general / physical health
 *  - Age, Sex, Income, Education (demographic + social determinants)
 *
 * Target column: Diabetes_012 (0 = no diabetes, 1 = prediabetes, 2 = diabetes)
 *
 * NOTE: The dataset is a US survey sample (BRFSS) and may not directly
 * generalize to Singapore's multi-ethnic population. It is used here as a
 * feature engineering reference only.
 */
export const KAGGLE_FEATURE_REFERENCE = {
  dataset: "Diabetes Health Indicators Dataset (Kaggle / CDC BRFSS 2015)",
  source: "CDC Behavioral Risk Factor Surveillance System (BRFSS) 2015",
  rows: 253680,
  target: "Diabetes_012 (0 = no diabetes, 1 = prediabetes, 2 = diabetes)",
  features: [
    { name: "HighBP", type: "binary", unit: "0/1", clinicalUse: "Hypertension — accelerates PAD and impairs wound healing" },
    { name: "HighChol", type: "binary", unit: "0/1", clinicalUse: "Hyperlipidemia — contributes to PAD progression" },
    { name: "BMI", type: "numeric", unit: "kg/m²", clinicalUse: "Obesity — risk factor for neuropathy and delayed healing" },
    { name: "Smoker", type: "binary", unit: "0/1", clinicalUse: "Smoking — major PAD and wound-healing risk" },
    { name: "Stroke", type: "binary", unit: "0/1", clinicalUse: "Systemic vascular disease marker" },
    { name: "HeartDiseaseorAttack", type: "binary", unit: "0/1", clinicalUse: "Coronary disease — systemic vascular involvement" },
    { name: "DiffWalk", type: "binary", unit: "0/1", clinicalUse: "Difficulty walking — mobility / neuropathy proxy" },
    { name: "GenHlth", type: "ordinal", unit: "1-5", clinicalUse: "Self-rated general health" },
    { name: "PhysHlth", type: "numeric", unit: "days", clinicalUse: "Days of poor physical health (past 30 days)" },
    { name: "Age", type: "ordinal", unit: "13 bands", clinicalUse: "Primary risk factor — used in age risk profiles" },
    { name: "Sex", type: "binary", unit: "0/1", clinicalUse: "Demographic factor" },
    { name: "Income / Education", type: "ordinal", unit: "bands", clinicalUse: "Social determinants of health (fairness analysis)" },
  ],
  modelPerformance: {
    note:
      "The dataset is widely used for diabetes risk modelling (published accuracies ~0.75-0.85 depending on model). Foot-ulcer prediction requires different clinical features and is not covered by this dataset.",
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Synthea Synthetic Patient Test Data
// ═══════════════════════════════════════════════════════════════════

/**
 * Synthea generates synthetic but realistic patient records for testing.
 * 
 * Integration plan:
 * 1. Generate synthetic diabetic patients using Synthea CLI
 *    `java -jar synthea-with-dependencies.jar -p 100 --config '{"module":"diabetes"}'`
 * 2. Import the generated FHIR R4 JSON into test fixtures
 * 3. Use these fixtures to validate the assessment engine across diverse profiles
 * 
 * The test profiles below are hand-crafted examples representing
 * the 4 IWGDF risk categories for frontend testing.
 */
export const SYNTHEA_TEST_PROFILES = [
  {
    name: "Low Risk Test Profile",
    profileId: "synthea-low-001",
    age: 45,
    gender: "M",
    diabetesDuration: "3 years",
    hba1c: 6.8,
    comorbidities: [],
    smoking: "never",
    expectedIWGDF: 0,
    expectedRiskLevel: "low",
  },
  {
    name: "Moderate Risk Test Profile",
    profileId: "synthea-moderate-001",
    age: 55,
    gender: "F",
    diabetesDuration: "8 years",
    hba1c: 7.5,
    comorbidities: ["hypertension"],
    smoking: "former",
    expectedIWGDF: 1,
    expectedRiskLevel: "moderate",
  },
  {
    name: "High Risk Test Profile",
    profileId: "synthea-high-001",
    age: 62,
    gender: "M",
    diabetesDuration: "12 years",
    hba1c: 8.4,
    comorbidities: ["hypertension", "cholesterol"],
    smoking: "current",
    expectedIWGDF: 2,
    expectedRiskLevel: "high",
  },
  {
    name: "Urgent Risk Test Profile",
    profileId: "synthea-urgent-001",
    age: 70,
    gender: "F",
    diabetesDuration: "20 years",
    hba1c: 9.2,
    comorbidities: ["kidney", "eye", "heart", "hypertension"],
    smoking: "former",
    expectedIWGDF: 3,
    expectedRiskLevel: "urgent",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  MIMIC-III Clinical Feature Reference
// ═══════════════════════════════════════════════════════════════════

/**
 * MIMIC-III (Medical Information Mart for Intensive Care) reference.
 * 
 * MIMIC-III contains de-identified health records of ~40,000 ICU patients.
 * For diabetic foot assessment, relevant features include:
 * 
 * - ICD-9 diagnosis codes for diabetes-related conditions:
 *   250.40-250.43: Diabetes with neurological manifestations (neuropathy)
 *   250.50-250.53: Diabetes with circulatory disorders (PAD, gangrene)
 *   250.60-250.63: Diabetes with other specified manifestations
 *   250.80-250.83: Diabetes with other specified manifestations, type II
 *   707.1x: Ulcer of lower limbs
 *   729.2: Neuropathy / nerve disorder
 *   440.20-440.24: Atherosclerosis of extremities (PAD)
 *   84.0x-84.9x: Amputation procedures
 * 
 * NOTE: MIMIC-III is an ICU population — risk profiles are higher than general
 * diabetes population. Used here for feature validation only.
 */
export const MIMIC_III_REFERENCE = {
  dataset: "MIMIC-III Clinical Database v1.4",
  source: "MIT Laboratory for Computational Physiology",
  relevantDiagnosisCodes: {
    diabeticNeuropathy: ["250.40", "250.41", "250.42", "250.43"],
    diabeticCirculatory: ["250.50", "250.51", "250.52", "250.53"],
    diabeticFoot: ["250.80", "250.81", "250.82", "250.83"],
    lowerLimbUlcer: ["707.10", "707.12", "707.13", "707.14", "707.15", "707.19"],
    peripheralNeuropathy: ["729.2"],
    peripheralArteryDisease: ["440.20", "440.21", "440.22", "440.23", "440.24"],
    amputation: ["840.0", "840.1", "841.0", "841.1", "841.2", "84.91", "84.93", "84.94", "84.95", "84.96"],
  },
  populationNotes:
    "MIMIC-III represents ICU patients — risk profiles are significantly higher than general outpatient diabetes population. Use for feature engineering validation only, not for risk calibration.",
  citation: "Johnson AEW, et al. MIMIC-III, a freely accessible critical care database. Sci Data. 2016.",
};
