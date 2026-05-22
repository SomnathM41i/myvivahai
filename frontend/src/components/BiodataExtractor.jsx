// frontend/src/components/BiodataExtractor.jsx
//
// Upload form + real-time pipeline + profile card.
// Uses useExtractionStream() to connect to the SSE endpoint.
// Drop <BiodataExtractor /> anywhere in your router pages.

import { useState, useRef } from "react";
import { useExtractionStream } from "../hooks/useExtractionStream";

// Pipeline stages in order (must match STAGE_INDEX in the hook)
const PIPELINE = [
  { key: "ocr",       label: "OCR / Parse"  },
  { key: "llm",       label: "Groq LLM"     },
  { key: "structure", label: "Structuring"  },
  { key: "save",      label: "Saving"       },
  { key: "done",      label: "Complete"     },
];

const LOG_CLASS = {
  ok:    "text-green-600 dark:text-green-400",
  error: "text-red-500",
  ai:    "text-pink-500",
  info:  "text-blue-500 dark:text-blue-400",
};

export default function BiodataExtractor() {
  const [taskId,    setTaskId]    = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileName,  setFileName]  = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef  = useRef();
  const logRef   = useRef();

  const { logs, progress, stageIndex, profile, status, error, reset } =
    useExtractionStream(taskId);

  // Auto-scroll log box
  if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;

  const isDone    = status === "done";
  const isRunning = uploading || status === "streaming";

  // ── Upload ──────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file || isRunning) return;
    setFileName(file.name);
    setUploading(true);
    reset();  // clear any previous run

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/biodata/upload", {
        method:      "POST",
        body:        fd,
        credentials: "include",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      const { task_id } = await res.json();
      setTaskId(task_id);
    } catch (err) {
      alert("Upload failed: " + err.message);
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  function handleReset() {
    reset();
    setTaskId(null);
    setFileName(null);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-white text-sm font-bold">
            💍
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Biodata Extraction
            </p>
            <p className="text-xs text-gray-400">AI-powered · real-time</p>
          </div>
        </div>
        <StatusBadge status={status} uploading={uploading} />
      </div>

      {/* ── Drop zone ── */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragOver || isRunning
            ? "border-pink-400 bg-pink-50 dark:bg-pink-950/20"
            : "border-gray-200 dark:border-gray-700 hover:border-pink-300 hover:bg-pink-50/40"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => !isRunning && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="text-3xl mb-2">📤</div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {fileName ?? "Drop biodata here, or click to browse"}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF · DOCX · JPG · PNG · WebP</p>
        {isRunning && (
          <p className="text-xs text-pink-500 mt-2 animate-pulse">Processing…</p>
        )}
      </div>

      {/* ── Pipeline ── */}
      {taskId && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
            Pipeline
          </p>
          <div className="flex items-start">
            {PIPELINE.map((step, i) => {
              const done    = stageIndex > i + 1;   // +1 because stageIndex 0 = "connected"
              const running = stageIndex === i + 1;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs
                      transition-all duration-300
                      ${done    ? "border-green-400 bg-green-50  text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : running ? "border-pink-400  bg-pink-50   text-pink-600  dark:bg-pink-900/30  dark:text-pink-400 animate-pulse"
                      :           "border-gray-200  bg-white     text-gray-300  dark:bg-gray-800     dark:border-gray-700"}`}>
                      {done ? "✓" : running ? "●" : "○"}
                    </div>
                    <span className={`text-[10px] mt-1 text-center leading-tight truncate w-full px-0.5
                      ${done ? "text-green-600 dark:text-green-400"
                      : running ? "text-pink-500 font-medium"
                      : "text-gray-300 dark:text-gray-600"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className={`h-px w-4 shrink-0 mx-0.5 mb-5 transition-colors duration-500
                      ${stageIndex > i + 1 ? "bg-green-300" : "bg-gray-100 dark:bg-gray-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-gray-400 mt-0.5">{progress}%</p>
        </div>
      )}

      {/* ── Live log ── */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
            Live log
          </p>
          <div
            ref={logRef}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800
              rounded-lg p-3 h-36 overflow-y-auto font-mono text-[11px] space-y-0.5"
          >
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-300 dark:text-gray-600 shrink-0">{l.time}</span>
                <span className={LOG_CLASS[l.level] ?? "text-gray-500"}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800
          rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* ── Extracted profile ── */}
      {taskId && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
            Extracted profile
          </p>
          <ProfileCard profile={profile} loading={!isDone && status !== "error"} />
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          disabled={!isDone}
          className="flex-1 py-2 text-sm font-medium rounded-lg bg-pink-500 text-white
            hover:bg-pink-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          💞 Find matches
        </button>
        <button
          disabled={!isDone}
          className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
            text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ⬇ Export PDF
        </button>
        <button
          onClick={handleReset}
          title="Reset"
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
            text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ↺
        </button>
      </div>
    </div>
  );
}


// ── StatusBadge ──────────────────────────────────────────────────────────

function StatusBadge({ status, uploading }) {
  if (uploading || status === "streaming")
    return <span className="text-xs px-3 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-200 animate-pulse">Extracting</span>;
  if (status === "done")
    return <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Complete ✓</span>;
  if (status === "error")
    return <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">Error</span>;
  return <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">Idle</span>;
}


// ── ProfileCard ──────────────────────────────────────────────────────────

const FIELDS = [
  { label: "Age",        key: "age"          },
  { label: "Location",   key: "city"         },
  { label: "Education",  key: "education"    },
  { label: "Profession", key: "occupation"   },
  { label: "Religion",   key: "religion"     },
  { label: "Community",  key: "caste"        },
  { label: "Height",     key: "height"       },
  { label: "Income",     key: "annual_income"},
];

function ProfileCard({ profile, loading }) {
  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "—";

  const confidence = profile?.confidence != null
    ? Math.round(Number(profile.confidence) * 100) + "%"
    : null;

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-11 h-11 rounded-full bg-pink-50 dark:bg-pink-900/30
          flex items-center justify-center text-pink-600 font-semibold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {loading && !profile ? <Skeleton w="w-32" /> : (profile?.name ?? "—")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {loading && !profile
              ? <Skeleton w="w-44" />
              : profile
                ? `${profile.age ?? "—"} · ${profile.gender ?? "—"} · ${profile.marital_status ?? "—"}`
                : "Run extraction to see results"}
          </p>
        </div>
        {confidence && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0">
            {confidence} conf.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
            <p className="text-[10px] text-gray-400 mb-1">{f.label}</p>
            {loading && !profile
              ? <Skeleton w="w-full" />
              : <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                  {profile?.[f.key] ?? "—"}
                </p>
            }
          </div>
        ))}
      </div>

      {profile?.about && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3
          border-t border-gray-100 dark:border-gray-800 leading-relaxed">
          {profile.about}
        </p>
      )}
    </div>
  );
}

function Skeleton({ w = "w-24" }) {
  return <div className={`h-3 ${w} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} />;
}