import { useEffect, useRef, useState, useCallback } from "react";

// 人混みレベルの騒音しきい値（dBFS）
const VOLUME_THRESHOLD_DB = -30;
// しきい値を超える音量が継続した場合に終演と判定する時間（ミリ秒）
const SUSTAINED_DURATION_MS = 2000;

function getCurrentJSTMinutes() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 9 * 3600000);
  return jst.getHours() * 60 + jst.getMinutes();
}

function parseTimeStr(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(":").map(Number);
  if (parts.some(isNaN)) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * 終演時刻以降にマイク入力を監視し、人混みレベルの騒音が継続したら終演と判定する。
 * @param {object} event - Event エンティティ（time_end を参照）
 * @returns {{ micState, isEnded, currentLevel, resetDetection }}
 */
export function useEndShowDetection({ event }) {
  const [micState, setMicState] = useState("idle"); // idle | granted | denied | error
  const [isEnded, setIsEnded] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(-100);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const sustainedRef = useRef(null);
  const isEndedRef = useRef(false);

  const endMinutes = parseTimeStr(event?.time_end);

  const isPastEndTime = useCallback(() => {
    if (endMinutes === null) return false;
    return getCurrentJSTMinutes() >= endMinutes;
  }, [endMinutes]);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    sustainedRef.current = null;
  }, []);

  const startDetection = useCallback(async () => {
    if (isEndedRef.current) return;
    cleanupAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicState("granted");

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (isEndedRef.current || !analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : -100;
        setCurrentLevel(db);

        if (isPastEndTime() && db > VOLUME_THRESHOLD_DB) {
          if (sustainedRef.current === null) {
            sustainedRef.current = Date.now();
          } else if (Date.now() - sustainedRef.current >= SUSTAINED_DURATION_MS) {
            isEndedRef.current = true;
            setIsEnded(true);
            cleanupAudio();
            return;
          }
        } else {
          sustainedRef.current = null;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      setMicState(err?.name === "NotAllowedError" ? "denied" : "error");
    }
  }, [cleanupAudio, isPastEndTime]);

  useEffect(() => {
    startDetection();
    return cleanupAudio;
  }, [startDetection, cleanupAudio]);

  const resetDetection = useCallback(() => {
    isEndedRef.current = false;
    sustainedRef.current = null;
    setIsEnded(false);
    startDetection();
  }, [startDetection]);

  return { micState, isEnded, currentLevel, resetDetection };
}