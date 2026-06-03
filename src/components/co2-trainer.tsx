"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TrainingCalendar from "@/components/training-calendar";
import { saveSession, fetchSessions } from "@/lib/sessions";

const NUM_ROUNDS = 8;

// CO2 Table: fixed hold, decreasing rest
const CO2_HOLD = 40;
const CO2_REST_START = 120;
const CO2_REST_STEP = 15;

// O2 Table: fixed rest, increasing hold
const O2_REST = 120;
const O2_HOLD_START = 35;
const O2_HOLD_STEP = 5;

type TrainingMode = "co2" | "o2";
type TrainingStyle = "static" | "dynamic";
type Phase = "rest" | "hold";
type Status = "idle" | "running" | "paused" | "finished";

interface Round {
  rest: number;
  hold: number;
}

const TRAINING_LABELS: Record<TrainingMode, string> = {
  co2: "CO2 Tolerance Table",
  o2: "O2 Capacity Table",
};

const TIPS: Record<TrainingMode, Record<TrainingStyle, string[]>> = {
  co2: {
    static: [
      "Relax completely during rest — drop your shoulders, unclench your jaw.",
      "The urge to breathe is CO2 buildup, not lack of oxygen. You have more time than you think.",
      "Discomfort increases each round by design — that adaptation is the whole point.",
    ],
    dynamic: [
      "Walk at a slow, steady pace. Don't rush — calm movement conserves oxygen.",
      "Moving muscles burn O2 fast; expect the urge to breathe sooner than in static holds.",
      "Keep your upper body relaxed while walking. Shoulder tension costs you seconds.",
    ],
  },
  o2: {
    static: [
      "Each round is longer — take full, slow recovery breaths between holds.",
      "Push gently through the first contractions. Stop only if you feel dizzy.",
      "O2 tables build your max hold time. The discomfort near the end is the training.",
    ],
    dynamic: [
      "Start walking as soon as the hold begins — the moving body trains for real diving conditions.",
      "The later rounds will feel significantly harder. That's intentional.",
      "Focus on your footsteps, not the clock. Distraction helps you last longer.",
    ],
  },
};

function generateTable(mode: TrainingMode): Round[] {
  return Array.from({ length: NUM_ROUNDS }, (_, i) => ({
    rest: mode === "co2" ? CO2_REST_START - i * CO2_REST_STEP : O2_REST,
    hold: mode === "co2" ? CO2_HOLD : O2_HOLD_START + i * O2_HOLD_STEP,
  }));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CO2Trainer() {
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("co2");
  const [trainingStyle, setTrainingStyle] = useState<TrainingStyle>("static");
  const [status, setStatus] = useState<Status>("idle");
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("rest");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [calendarKey, setCalendarKey] = useState(0);

  const table = useMemo(() => generateTable(trainingMode), [trainingMode]);

  useEffect(() => {
    fetchSessions().then((s) => setSessionCount(s.length));
  }, [calendarKey]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((frequency: number, duration: number) => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }, []);

  const playPhaseChange = useCallback(() => {
    playBeep(880, 0.15);
    setTimeout(() => playBeep(880, 0.15), 200);
    setTimeout(() => playBeep(1100, 0.3), 400);
  }, [playBeep]);

  const playCountdown = useCallback(() => {
    playBeep(660, 0.1);
  }, [playBeep]);

  const playFinish = useCallback(() => {
    playBeep(1100, 0.2);
    setTimeout(() => playBeep(1320, 0.2), 250);
    setTimeout(() => playBeep(1540, 0.4), 500);
  }, [playBeep]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const advancePhase = useCallback(() => {
    if (phase === "rest") {
      setPhase("hold");
      setTimeLeft(table[currentRound].hold);
      playPhaseChange();
    } else {
      const nextRound = currentRound + 1;
      if (nextRound >= NUM_ROUNDS) {
        setStatus("finished");
        const totalHold = table.reduce((sum, r) => sum + r.hold, 0);
        const totalBreathe = table.reduce((sum, r) => sum + r.rest, 0);
        saveSession({
          type: trainingMode,
          rounds: NUM_ROUNDS,
          holdTime: totalHold,
          breatheTime: totalBreathe,
          completed: true,
        }).then(() => setCalendarKey((k) => k + 1));
        clearTimer();
        playFinish();
      } else {
        setCurrentRound(nextRound);
        setPhase("rest");
        setTimeLeft(table[nextRound].rest);
        playPhaseChange();
      }
    }
  }, [phase, currentRound, table, trainingMode, playPhaseChange, playFinish, clearTimer]);

  useEffect(() => {
    if (status !== "running") {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          advancePhase();
          return 0;
        }
        if (prev <= 4) playCountdown();
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [status, advancePhase, clearTimer, playCountdown]);

  const start = () => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    setCurrentRound(0);
    setPhase("rest");
    setTimeLeft(table[0].rest);
    setStatus("running");
  };

  const pause = () => setStatus("paused");
  const resume = () => setStatus("running");

  const reset = () => {
    clearTimer();
    setStatus("idle");
    setCurrentRound(0);
    setPhase("rest");
    setTimeLeft(table[0].rest);
  };

  const displayTime = status === "idle" ? table[0].rest : timeLeft;

  const currentPhaseDuration =
    phase === "rest" ? table[currentRound]?.rest : table[currentRound]?.hold;

  const totalTime = table.reduce((sum, r) => sum + r.rest + r.hold, 0);
  const elapsedTime =
    table.slice(0, currentRound).reduce((sum, r) => sum + r.rest + r.hold, 0) +
    (phase === "hold" ? (table[currentRound]?.rest ?? 0) : 0) +
    (currentPhaseDuration ? currentPhaseDuration - timeLeft : 0);

  const tips = TIPS[trainingMode][trainingStyle];

  const holdLabel =
    trainingStyle === "dynamic" && phase === "hold" ? "Hold · Keep Walking" : "Hold Breath";

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center justify-center p-5 gap-6">
      <div className="w-full max-w-[520px] space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="font-heading text-[32px] font-normal tracking-tight text-[#d6eef7]">
            Apnea Trainer
          </h1>
          <p className="text-[13px] font-light tracking-[2.5px] uppercase text-[rgba(180,220,240,0.55)]">
            {TRAINING_LABELS[trainingMode]}
            {" · "}
            {trainingStyle === "dynamic" ? "Dynamic" : "Static"}
          </p>
          {sessionCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {sessionCount} session{sessionCount !== 1 ? "s" : ""} completed
            </p>
          )}
        </div>

        {/* Mode + Style selectors — idle only */}
        {status === "idle" && (
          <div className="space-y-3">
            <div className="text-[11px] tracking-[3px] uppercase text-[rgba(180,220,240,0.38)] font-light text-center">
              Table Type
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["co2", "o2"] as TrainingMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTrainingMode(mode)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    trainingMode === mode
                      ? "border-[rgba(100,190,230,0.45)] bg-[rgba(14,127,190,0.18)] text-[#d6eef7]"
                      : "border-white/10 bg-white/[0.04] text-[rgba(180,220,240,0.5)] hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-medium">
                    {mode === "co2" ? "CO2 Table" : "O2 Table"}
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-60">
                    {mode === "co2"
                      ? `Fixed ${formatTime(CO2_HOLD)} hold · Shrinking rest`
                      : `Fixed ${formatTime(O2_REST)} rest · Growing holds`}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-[11px] tracking-[3px] uppercase text-[rgba(180,220,240,0.38)] font-light text-center pt-1">
              Style
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["static", "dynamic"] as TrainingStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => setTrainingStyle(style)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    trainingStyle === style
                      ? "border-[rgba(100,190,230,0.45)] bg-[rgba(14,127,190,0.18)] text-[#d6eef7]"
                      : "border-white/10 bg-white/[0.04] text-[rgba(180,220,240,0.5)] hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-medium capitalize">{style}</div>
                  <div className="text-[11px] mt-0.5 opacity-60">
                    {style === "static"
                      ? "Sit or lie still during holds"
                      : "Walk slowly during holds"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timer Display */}
        <Card
          className={`glass-strong relative overflow-hidden transition-all duration-500 ${
            status === "running" && phase === "hold"
              ? "border-red-500/20"
              : status === "running" && phase === "rest"
                ? "border-[rgba(100,190,230,0.25)]"
                : ""
          }`}
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 0%, rgba(14,127,190,0.18) 0%, transparent 70%)",
          }}
        >
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {status !== "idle" && status !== "finished" && (
              <div className="text-[11px] tracking-[3px] uppercase text-muted-foreground font-light">
                {phase === "hold" ? holdLabel : "Breathe"}
              </div>
            )}

            {status === "finished" ? (
              <div className="space-y-2">
                <div className="font-heading text-5xl text-[rgba(100,190,230,0.8)]">Done!</div>
                <p className="text-muted-foreground text-sm">
                  All {NUM_ROUNDS} rounds completed
                </p>
              </div>
            ) : (
              <div
                className={`font-heading text-[80px] leading-none tracking-tight ${
                  status === "running" && phase === "hold"
                    ? "text-[rgba(210,100,100,0.9)]"
                    : "text-[#e8f4f8]"
                }`}
              >
                {formatTime(displayTime)}
              </div>
            )}

            {status !== "idle" && status !== "finished" && (
              <>
                <div className="text-[13px] font-light text-[rgba(100,190,230,0.7)] tracking-wider uppercase">
                  Round {currentRound + 1} of {NUM_ROUNDS}
                </div>
                <div className="flex justify-center gap-1.5 pt-1">
                  {table.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i < currentRound
                          ? "bg-[rgba(100,190,230,0.35)]"
                          : i === currentRound
                            ? "bg-[rgba(100,190,230,0.8)]"
                            : "bg-[rgba(255,255,255,0.15)]"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {status === "idle" && (
            <Button onClick={start} size="lg" className="w-full py-4">
              Start Training
            </Button>
          )}
          {status === "running" && (
            <>
              <Button onClick={pause} variant="secondary" size="lg" className="flex-1">
                Pause
              </Button>
              <Button onClick={reset} variant="outline" size="lg" className="flex-1">
                Reset
              </Button>
            </>
          )}
          {status === "paused" && (
            <>
              <Button onClick={resume} size="lg" className="flex-1">
                Resume
              </Button>
              <Button onClick={reset} variant="outline" size="lg" className="flex-1">
                Reset
              </Button>
            </>
          )}
          {status === "finished" && (
            <Button onClick={reset} size="lg" className="w-full py-4">
              Start Again
            </Button>
          )}
        </div>

        {/* Overall Progress */}
        {status !== "idle" && status !== "finished" && (
          <div className="text-center text-sm text-muted-foreground">
            Total: {formatTime(Math.round(elapsedTime))} / {formatTime(totalTime)}
          </div>
        )}

        {/* Tips */}
        <div className="space-y-2">
          <div className="text-[11px] tracking-[3px] uppercase text-[rgba(180,220,240,0.38)] font-light ml-1">
            Tips
          </div>
          <Card>
            <CardContent className="py-3 px-4 space-y-2.5">
              {tips.map((tip, i) => (
                <div key={i} className="flex gap-2.5 text-[13px] text-[rgba(180,220,240,0.65)] font-light leading-relaxed">
                  <span className="text-[rgba(100,190,230,0.4)] mt-px shrink-0">·</span>
                  <span>{tip}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Section label */}
        <div className="text-[11px] tracking-[3px] uppercase text-[rgba(180,220,240,0.38)] font-light ml-1">
          Rounds
        </div>

        {/* Table Overview */}
        <Card>
          <CardContent className="py-2">
            <div className="divide-y divide-white/5">
              {table.map((round, i) => {
                const isActive =
                  status !== "idle" && status !== "finished" && i === currentRound;
                const isDone =
                  status !== "idle" && (i < currentRound || status === "finished");

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-3 text-sm transition-colors rounded-lg ${
                      isActive
                        ? "bg-[rgba(14,127,190,0.12)]"
                        : isDone
                          ? "opacity-30"
                          : ""
                    }`}
                  >
                    <span className="text-xs text-[rgba(180,220,240,0.3)] w-6 font-light">
                      {isDone ? "✓" : `${i + 1}`}
                    </span>
                    <span className="flex-1 text-[rgba(130,200,240,0.8)]">
                      Rest {formatTime(round.rest)}
                    </span>
                    <span className="text-[rgba(180,220,240,0.5)] font-medium tracking-wide">
                      Hold {formatTime(round.hold)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-xs font-light text-[rgba(180,220,240,0.28)] tracking-wide">
          {trainingMode === "co2"
            ? `Hold: ${formatTime(CO2_HOLD)} (constant) · Rest starts at ${formatTime(CO2_REST_START)}, decreases by ${CO2_REST_STEP}s`
            : `Rest: ${formatTime(O2_REST)} (constant) · Holds start at ${formatTime(O2_HOLD_START)}, increase by ${O2_HOLD_STEP}s`}
        </div>

        {/* Calendar & Streaks */}
        <TrainingCalendar key={calendarKey} />
      </div>
    </div>
  );
}
