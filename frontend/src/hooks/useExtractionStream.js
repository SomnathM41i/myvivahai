// frontend/src/hooks/useExtractionStream.js
//
// Opens an EventSource to GET /api/biodata/stream/{taskId} and
// returns live state: logs, progress %, pipeline stage index, and
// the final extracted profile once the "done" event arrives.

import { useState, useEffect, useRef, useCallback } from "react";

// Maps backend stage names → index in the pipeline array
const STAGE_INDEX = {
  connected: 0,
  ocr:       1,
  llm:       2,
  structure: 3,
  save:      4,
  done:      5,
};

/**
 * @param {string|null} taskId  Pass a task_id string to start streaming, null to stay idle.
 * @returns {{ logs, progress, stageIndex, profile, status, error, reset }}
 *
 * status: "idle" | "streaming" | "done" | "error"
 */
export function useExtractionStream(taskId) {
  const [logs,        setLogs]       = useState([]);
  const [progress,    setProgress]   = useState(0);
  const [stageIndex,  setStageIndex] = useState(0);
  const [profile,     setProfile]    = useState(null);
  const [status,      setStatus]     = useState("idle");
  const [error,       setError]      = useState(null);
  const esRef = useRef(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    setLogs([]);
    setProgress(0);
    setStageIndex(0);
    setProfile(null);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (!taskId) return;

    esRef.current?.close();
    // Reset state for new task but keep status as streaming
    setLogs([]);
    setProgress(0);
    setStageIndex(0);
    setProfile(null);
    setError(null);
    setStatus("streaming");

    const es = new EventSource(`/api/biodata/stream/${taskId}`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }

      const { stage, pct, log, level, profile: extractedProfile } = data;

      if (log) {
        setLogs((prev) => [
          ...prev,
          {
            time:  new Date().toLocaleTimeString(),
            text:  log,
            level: level ?? "info",
          },
        ]);
      }

      if (typeof pct === "number") setProgress(pct);

      const idx = STAGE_INDEX[stage];
      if (idx !== undefined) setStageIndex(idx);

      if (stage === "done") {
        if (extractedProfile) setProfile(extractedProfile);
        setStatus("done");
        es.close();
      }

      if (stage === "error") {
        setError(log ?? "Extraction failed");
        setStatus("error");
        es.close();
      }
    };

    es.onerror = () => {
      // Only flag as error if we haven't already finished successfully
      setStatus((prev) => {
        if (prev === "done") return prev;
        setError("Stream connection lost — check that the backend is running.");
        return "error";
      });
      es.close();
    };

    return () => es.close();
  }, [taskId]);

  return { logs, progress, stageIndex, profile, status, error, reset };
}