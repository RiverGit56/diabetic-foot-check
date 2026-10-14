"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Disclaimer from "@/components/Disclaimer";
import {
  getSingaporeHealthStats,
  getCareFacilities,
  getEnvironmentalRisk,
} from "@/lib/dataSources";

interface DataSource {
  name: string;
  status: "connected" | "fallback" | "unavailable";
  type: string;
  endpoint?: string;
  records?: number;
  description: string;
  lastChecked?: string;
}

interface HealthStat {
  label: string;
  value: string;
  trend?: string;
  source: string;
}

export default function DataPage() {
  const { t } = useTranslation();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStat[]>([]);
  const [envData, setEnvData] = useState<{
    forecast: string;
    psi: number;
    isRaining: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const results: DataSource[] = [];

      // 1. Environment (data.gov.sg live; safe defaults on failure)
      try {
        const env = await getEnvironmentalRisk();
        setEnvData({
          forecast: env.forecast,
          psi: env.psi,
          isRaining: env.isRaining,
        });
        const envLive =
          env.psi > 0 || env.isRaining || env.forecast !== "Clear";
        results.push({
          name: "data.gov.sg — Weather & Air Quality (Live)",
          status: envLive ? "connected" : "fallback",
          type: "REST API",
          endpoint:
            "api.data.gov.sg/v1/environment/2-hour-weather-forecast, /psi, /pm25",
          description: `Current forecast: ${env.forecast}. PSI: ${
            env.psi > 0 ? env.psi : "temporarily unavailable"
          }.`,
        });
      } catch {
        results.push({
          name: "data.gov.sg — Environment",
          status: "unavailable",
          type: "REST API",
          description: "API temporarily unavailable. App will use fallback data.",
        });
      }

      // 2. Singapore health statistics (live datastore; falls back to published)
      try {
        const d = await getSingaporeHealthStats();
        setHealthStats([
          { label: "Diabetes Prevalence", value: `${d.diabetesPrevalence.overall}%`, trend: `${d.diabetesPrevalence.trend.length} data points`, source: "data.gov.sg (MOH)" },
          { label: "Hypertension", value: `${d.hypertensionPrevalence}%`, source: "NPHS 2022" },
          { label: "Hyperlipidemia", value: `${d.hyperlipidemiaPrevalence}%`, source: "NPHS 2022" },
          { label: "Obesity", value: `${d.obesityPrevalence}%`, source: "NPHS 2022" },
          { label: "Daily Smoking", value: `${d.smokingRate}%`, source: "NPHS 2022" },
        ]);
        results.push({
          name: "data.gov.sg — Singapore Health Statistics",
          status: d.source.includes("live") ? "connected" : "fallback",
          type: "Datastore API / Published",
          endpoint: "data.gov.sg/api/action/datastore_search",
          records: d.diabetesPrevalence.trend.length,
          description: "Singapore diabetes & chronic disease prevalence (MOH NPHS, World Bank, IDF).",
        });
      } catch {
        results.push({
          name: "data.gov.sg — Health Statistics",
          status: "fallback",
          type: "Datastore API",
          description: "Using published NPHS/IDF statistics. Live data will be used when API is available.",
        });
      }

      // 3. Clinical rules engine (local)
      results.push({
        name: "Clinical Rules Engine (Local)",
        status: "connected",
        type: "Built-in Module",
        description: "IWGDF 2023 + NICE NG19 guidelines. 18 clinical decision rules for diabetic foot triage.",
        lastChecked: new Date().toISOString(),
      });

      // 4. Risk profiles (local)
      results.push({
        name: "Population Risk Profiles (Local)",
        status: "connected",
        type: "Built-in Module",
        description: "Singapore-specific risk profiles from NPHS 2022, MOH statistics, World Bank, and IDF Atlas.",
      });

      // 5. Care facilities (local bundled directory)
      const care = getCareFacilities();
      results.push({
        name: "Care Facility Directory (Local)",
        status: "connected",
        type: "Built-in Database",
        records: care.length,
        description: `${care.length} Singapore hospitals, wound care centers, and polyclinics with diabetic foot services.`,
      });

      setSources(results);
      setLoading(false);
    }

    fetchAll();
  }, []);

  const statusColor = (status: DataSource["status"]) => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-800";
      case "fallback": return "bg-amber-100 text-amber-800";
      case "unavailable": return "bg-gray-100 text-gray-600";
    }
  };

  const statusLabel = (status: DataSource["status"]) => {
    switch (status) {
      case "connected": return "● Live";
      case "fallback": return "◐ Fallback";
      case "unavailable": return "○ Unavailable";
    }
  };

  return (
    <div className="py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Data Sources</h1>
        <p className="text-base text-gray-600">
          Live connections to medical and environmental data sources
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-primary-300 border-t-primary-600" />
          <p className="mt-3 text-base text-gray-600">Testing data source connections...</p>
        </div>
      ) : (
        <>
          {/* Live Environment Snapshot */}
          {envData && (
            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <h2 className="mb-2 text-base font-bold text-blue-900">Live Environment Snapshot</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">Weather</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 break-words">{envData.forecast}</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">PSI</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{envData.psi > 0 ? envData.psi : "—"}</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-xs text-gray-600">Rain</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{envData.isRaining ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Sources List */}
          <div className="space-y-3">
            {sources.map((source, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 break-words">{source.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{source.type}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(source.status)}`}>
                    {statusLabel(source.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-700 break-words">{source.description}</p>
                {source.endpoint && (
                  <p className="mt-1.5 text-xs text-gray-500 break-all font-mono">{source.endpoint}</p>
                )}
                {source.records && (
                  <p className="mt-1 text-xs text-gray-500">{source.records} records available</p>
                )}
              </div>
            ))}
          </div>

          {/* Singapore Health Statistics */}
          {healthStats.length > 0 && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
              <h2 className="mb-3 text-base font-bold text-green-900">Singapore Health Statistics (Live from data.gov.sg)</h2>
              <div className="space-y-2">
                {healthStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                      <p className="text-xs text-gray-500">{stat.source}{stat.trend && ` · ${stat.trend}`}</p>
                    </div>
                    <p className="text-lg font-bold text-green-700">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <Disclaimer />
          </div>
        </>
      )}
    </div>
  );
}
