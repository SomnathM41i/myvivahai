// frontend/src/components/BiodataExtractor.jsx
// Full upload + real-time extraction UI for myvivahai.

import { useState, useRef } from "react";
import { useExtractionStream } from "../hooks/useExtractionStream";

const PIPELINE = [
  { key: "ocr",       label: "OCR / Parse",   icon: "📄" },
  { key: "llm",       label: "Groq LLM",       icon: "🧠" },
  { key: "structure", label: "Structuring",    icon: "🗂️" },
  { key: "save",      label: "Saving",         icon: "💾" },
  { key: "done",      label: "Complete",       icon: "✅" },
];

const LOG_COLORS = {
  ok:    "text-green-600",
  error: "text-red-500",
  ai:    "text-pink-600",
  info:  "text-blue-500",
};

export default function BiodataExtractor() {
  const [taskId, setTaskId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef();
  const logBoxRef = useRef();

  const { logs, progress, stageIndex, profile, status, error } =
    useExtractionStream(taskId);

  // ── Upload ──────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/biodata/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const { task_id } = await res.json();
      setTaskId(task_id);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e) {
    handleFile(e.target.files?.[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function reset() {
    setTaskId(null);
    setFileName(null);
  }

  // Keep log box scrolled to bottom
  if (logBoxRef.current) {
    logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }

  const isDone    = status === "done";
  const isRunning = status === "streaming" || uploading;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center text-white text-sm">
            💍
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">myvivahai</h1>
            <p className="text-xs text-gray-400">Biodata AI extraction</p>
          </div>
        </div>
        <StatusBadge status={status} uploading={uploading} />
      </div>

      {/* ── Upload zone ── */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragOver ? "border-pink-400 bg-pink-50" : "border-gray-200 hover:border-pink-300 hover:bg-pink-50/40"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isRunning && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,image/*"
          className="hidden"
          onChange={onInputChange}
        />
        <div className="text-3xl mb-2">📤</div>
        <p className="text-sm font-medium text-gray-700">
          {fileName ?? "Drop biodata here or click to upload"}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF · DOCX · JPG · PNG · WebP — OCR supported</p>
        {isRunning && (
          <p className="text-xs text-pink-500 mt-2 animate-pulse">Processing…</p>
        )}
      </div>

      {/* ── Pipeline ── */}
      {taskId && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Pipeline
          </p>
          <div className="flex items-center gap-0">
            {PIPELINE.map((s, i) => {
              const done    = stageIndex > i;
              const running = stageIndex === i;
              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border transition-all duration-300
                      ${done    ? "bg-green-50 border-green-400 text-green-700"
                      : running ? "bg-pink-50 border-pink-400 text-pink-600 animate-pulse"
                      :           "bg-white border-gray-200 text-gray-300"}`}>
                      {done ? "✓" : s.icon}
                    </div>
                    <span className={`text-[10px] mt-1 text-center
                      ${done ? "text-green-600" : running ? "text-pink-500 font-medium" : "text-gray-300"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className={`h-px flex-1 mx-1 mb-4 transition-colors duration-500
                      ${stageIndex > i ? "bg-green-300" : "bg-gray-100"}`} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Live log ── */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Live log
          </p>
          <div
            ref={logBoxRef}
            className="bg-gray-50 border border-gray-100 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[11px] space-y-0.5"
          >
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-300 shrink-0">{l.time}</span>
                <span className={LOG_COLORS[l.level] ?? "text-gray-500"}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Extracted profile ── */}
      {taskId && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Extracted profile
          </p>
          <ProfileCard profile={profile} loading={!isDone && !error} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          disabled={!isDone}
          className="flex-1 py-2 px-4 bg-pink-500 text-white text-sm font-medium rounded-lg
            disabled:opacity-30 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
        >
          💞 Find matches
        </button>
        <button
          disabled={!isDone}
          className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm rounded-lg
            disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          ⬇ Export PDF
        </button>
        <button
          onClick={reset}
          className="py-2 px-3 border border-gray-200 text-gray-400 text-sm rounded-lg hover:bg-gray-50"
          title="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );
}


// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, uploading }) {
  if (uploading || status === "streaming") {
    return (
      <span className="text-xs px-3 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-200 animate-pulse">
        Extracting
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
        Complete ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
        Error
      </span>
    );
  }
  return (
    <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
      Idle
    </span>
  );
}


function ProfileCard({ profile, loading }) {
  const fields = [
    { label: "Age",        key: "age",          icon: "🎂" },
    { label: "Location",   key: "city",         icon: "📍" },
    { label: "Education",  key: "education",    icon: "🎓" },
    { label: "Profession", key: "occupation",   icon: "💼" },
    { label: "Religion",   key: "religion",     icon: "☀️"  },
    { label: "Community",  key: "caste",        icon: "👥" },
    { label: "Height",     key: "height",       icon: "📏" },
    { label: "Income",     key: "annual_income",icon: "💰" },
  ];

  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  const confidence = profile?.confidence
    ? Math.round(profile.confidence * 100) + "%"
    : null;

  return (
    <div className="border border-gray-100 rounded-xl p-5 bg-white">
      {/* Profile header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 font-semibold text-sm">
          {initials}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">
            {profile?.name ?? <Skeleton w="w-32" />}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {profile
              ? `${profile.age ?? "—"} · ${profile.gender ?? "—"} · ${profile.marital_status ?? "—"}`
              : <Skeleton w="w-44" />}
          </p>
        </div>
        {confidence && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
            {confidence} confidence
          </span>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {fields.map((f) => (
          <div key={f.key} className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-[10px] text-gray-400 mb-1">{f.icon} {f.label}</p>
            {loading && !profile
              ? <Skeleton w="w-full" />
              : <p className="text-xs font-medium text-gray-800 truncate">
                  {profile?.[f.key] ?? "—"}
                </p>
            }
          </div>
        ))}
      </div>

      {/* About */}
      {profile?.about && (
        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
          {profile.about}
        </p>
      )}
    </div>
  );
}


function Skeleton({ w = "w-24" }) {
  return (
    <div className={`h-3 ${w} bg-gray-200 rounded animate-pulse`} />
  );
}