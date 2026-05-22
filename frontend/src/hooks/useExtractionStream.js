// frontend/src/hooks/useExtractionStream.js
// Connects to the FastAPI SSE endpoint and delivers live progress events.

import { useState, useEffect, useRef, useCallback } from "react";

const STAGES = ["upload", "ocr", "llm", "structure", "save", "done"];

const STAGE_INDEX = {
  connected: 0,
  ocr: 1,
  llm: 2,
  structure: 3,
  save: 4,
  done: 5,
  error: -1,
};

/**
 * @param {string|null} taskId  — set to a task_id to start streaming, null to idle
 * @returns {{ logs, progress, stageIndex, profile, status, error }}
 */
export function useExtractionStream(taskId) {
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(-1);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | streaming | done | error
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  const reset = useCallback(() => {
    setLogs([]);
    setProgress(0);
    setStageIndex(-1);
    setProfile(null);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (!taskId) return;

    // Close any previous stream
    if (esRef.current) esRef.current.close();
    reset();
    setStatus("streaming");

    const url = `/api/biodata/stream/${taskId}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }

      const { stage, pct, log, level, profile: extractedProfile } = data;

      // Append log line
      if (log) {
        setLogs((prev) => [
          ...prev,
          { time: new Date().toLocaleTimeString(), text: log, level: level || "info" },
        ]);
      }

      // Progress bar
      if (typeof pct === "number") setProgress(pct);

      // Stage index for pipeline indicator
      const idx = STAGE_INDEX[stage];
      if (idx !== undefined && idx >= 0) setStageIndex(idx);

      // Final state
      if (stage === "done") {
        if (extractedProfile) setProfile(extractedProfile);
        setStatus("done");
        es.close();
      }

      if (stage === "error") {
        setError(log || "Extraction failed");
        setStatus("error");
        es.close();
      }
    };

    es.onerror = () => {
      setError("Stream connection lost");
      setStatus("error");
      es.close();
    };

    return () => {
      es.close();
    };
  }, [taskId, reset]);

  return { logs, progress, stageIndex, profile, status, error, stages: STAGES };
}