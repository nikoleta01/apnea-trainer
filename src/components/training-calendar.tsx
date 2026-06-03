"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchSessions,
  getMonthSessions,
  getCurrentStreak,
  getLongestStreak,
  getSessionDates,
  sessionDay,
} from "@/lib/sessions";
import { ChevronLeft, ChevronRight, Flame, Trophy, Calendar, Droplet } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DbSession {
  id: string;
  date: string;
  type: string;
  rounds: number;
  holdTime: number;
  breatheTime: number;
  completed: boolean;
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

  return days;
}

export default function TrainingCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<DbSession[]>([]);

  useEffect(() => {
    fetchSessions().then(setSessions);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const sessionDates = useMemo(() => getSessionDates(sessions), [sessions]);
  const streak = useMemo(() => getCurrentStreak(sessions), [sessions]);
  const longestStreak = useMemo(() => getLongestStreak(sessions), [sessions]);
  const totalSessions = sessions.length;

  const monthSessions = useMemo(
    () => getMonthSessions(sessions, year, month),
    [sessions, year, month]
  );

  const monthSessionDays = useMemo(
    () => new Set(monthSessions.map((s) => new Date(sessionDay(s)).getDate())),
    [monthSessions]
  );

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-4">
      <div className="text-[11px] tracking-[3px] uppercase text-[rgba(180,220,240,0.38)] font-light ml-1">
        Progress
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <Flame className="h-7 w-7 mx-auto mb-2 text-orange-400/60" />
            <div className="font-heading text-[26px] text-[#d0ecf8]">{streak}</div>
            <div className="text-[11px] font-light text-[rgba(180,220,240,0.38)] tracking-[1.5px] uppercase mt-1">
              Streak
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <Trophy className="h-7 w-7 mx-auto mb-2 text-yellow-400/60" />
            <div className="font-heading text-[26px] text-[#d0ecf8]">{longestStreak}</div>
            <div className="text-[11px] font-light text-[rgba(180,220,240,0.38)] tracking-[1.5px] uppercase mt-1">
              Best
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <Calendar className="h-7 w-7 mx-auto mb-2 text-[rgba(100,190,230,0.6)]" />
            <div className="font-heading text-[26px] text-[#d0ecf8]">{totalSessions}</div>
            <div className="text-[11px] font-light text-[rgba(180,220,240,0.38)] tracking-[1.5px] uppercase mt-1">
              Total
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4 text-[rgba(180,220,240,0.4)]" />
            </Button>
            <CardTitle className="text-sm font-medium text-[rgba(200,230,245,0.8)] tracking-wide">
              {monthName}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4 text-[rgba(180,220,240,0.4)]" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-light text-[rgba(180,220,240,0.3)] tracking-[1px] uppercase py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((day, i) => {
              if (day === null) {
                return <div key={`blank-${i}`} className="aspect-square" />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasSession = sessionDates.has(dateStr);
              const isToday = isCurrentMonth && day === today.getDate();
              const isFuture = new Date(year, month, day) > today;

              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center rounded-lg text-[13px] relative cursor-default transition-colors
                    ${isFuture ? "text-[rgba(200,230,245,0.15)]" : "text-[rgba(200,230,245,0.5)]"}
                    ${isToday ? "bg-[rgba(14,127,190,0.3)] border border-[rgba(100,190,230,0.3)] text-[#a8d8f0] font-medium" : ""}
                    ${hasSession && !isToday ? "text-[#d0ecf8] font-medium" : ""}
                    ${!isToday && !isFuture ? "hover:bg-[rgba(255,255,255,0.05)]" : ""}
                  `}
                >
                  {hasSession && (
                    <Droplet
                      className="absolute inset-0 w-full h-full text-[rgba(100,190,230,0.5)]"
                      fill="rgba(14,127,190,0.25)"
                      strokeWidth={1.5}
                    />
                  )}
                  <span className="relative z-10">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-center text-xs font-light text-[rgba(180,220,240,0.3)] tracking-wide">
            {monthSessionDays.size} training day{monthSessionDays.size !== 1 ? "s" : ""} this month
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
