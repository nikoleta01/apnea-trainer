"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TrainingCalendar from "@/components/training-calendar";
import { saveSession, getSessionCount, formatDate } from "@/lib/sessions";

// CO2 Table config
const BREATH_HOLD_SECONDS = 30;
const INITIAL_REST_SECONDS = 120; // 2 minutes
const REST_DECREASE_SECONDS = 15;
const NUM_ROUNDS = 8;

type Phase = "rest" | "hold";
type Status = "idle" | "running" | "paused" | "finished";

interface Round {
  rest: number;
  hold: number;
}

function generateCO2Table(): Round[] {
  return Array.from({ length: NUM_ROUNDS }, (_, i) => ({
    rest: INITIAL_REST_SECONDS - i * REST_DECREASE_SECONDS,
    hold: BREATH_HOLD_SECONDS,
  }));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CO2Trainer() {
  const table = generateCO2Table();

  const [status, setStatus] = useState<Status>("idle");
  const [currentRound, setCurrentRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("rest");
  const [timeLeft, setTimeLeft] = useState(table[0].rest);
  const [sessionCount, setSessionCount] = useState(() =>
    typeof window !== "undefined" ? getSessionCount() : 0
  );
  const [calendarKey, setCalendarKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((frequency: number, duration: number) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
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
          date: formatDate(new Date()),
          type: "co2",
          rounds: NUM_ROUNDS,
          holdTime: totalHold,
          breatheTime: totalBreathe,
          completed: true,
        });
        setSessionCount(getSessionCount());
        setCalendarKey((k) => k + 1);
        clearTimer();
        playFinish();
      } else {
        setCurrentRound(nextRound);
        setPhase("rest");
        setTimeLeft(table[nextRound].rest);
        playPhaseChange();
      }
    }
  }, [phase, currentRound, table, playPhaseChange, playFinish, clearTimer]);

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
        if (prev <= 4) {
          playCountdown();
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [status, advancePhase, clearTimer, playCountdown]);

  const start = () => {
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
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

  const currentPhaseDuration =
    phase === "rest" ? table[currentRound]?.rest : table[currentRound]?.hold;

  const totalTime = table.reduce((sum, r) => sum + r.rest + r.hold, 0);
  const elapsedTime =
    table.slice(0, currentRound).reduce((sum, r) => sum + r.rest + r.hold, 0) +
    (phase === "hold" ? (table[currentRound]?.rest ?? 0) : 0) +
    (currentPhaseDuration ? currentPhaseDuration - timeLeft : 0);

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center justify-center p-5 gap-6">
      <div className="w-full max-w-[520px] space-y-5">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="font-heading text-[32px] font-normal tracking-tight text-[#d6eef7]">
            Apnea Trainer
          </h1>
          <p className="text-[13px] font-light tracking-[2.5px] uppercase text-[rgba(180,220,240,0.55)]">
            CO2 Tolerance Table
          </p>
          {sessionCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {sessionCount} session{sessionCount !== 1 ? "s" : ""} completed
            </p>
          )}
        </div>

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
                {phase === "hold" ? "Hold Breath" : "Breathe"}
              </div>
            )}

            {status === "finished" ? (
              <div className="space-y-2">
                <div className="font-heading text-5xl text-[rgba(100,190,230,0.8)]">
                  Done!
                </div>
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
                {formatTime(timeLeft)}
              </div>
            )}

            {status !== "idle" && status !== "finished" && (
              <>
                <div className="text-[13px] font-light text-[rgba(100,190,230,0.7)] tracking-wider uppercase">
                  Round {currentRound + 1} of {NUM_ROUNDS}
                </div>
                {/* Progress dots */}
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
                      {isDone ? "\u2713" : `${i + 1}`}
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
          Hold: {formatTime(BREATH_HOLD_SECONDS)} (constant) &middot; Rest starts at{" "}
          {formatTime(INITIAL_REST_SECONDS)}, decreases by {REST_DECREASE_SECONDS}s
        </div>

        {/* Calendar & Streaks */}
        <TrainingCalendar key={calendarKey} />
      </div>
    </div>
  );
}
