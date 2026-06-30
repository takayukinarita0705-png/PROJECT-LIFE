import type { ScheduleItem } from "@/app/types/calendar";

const SIZE = 44;
const CENTER = SIZE / 2;
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MINUTES_PER_DAY = 24 * 60;

type DailyProgressRingProps = {
  schedule: ScheduleItem[];
  currentTime: Date | null;
  currentScheduleEventId?: string;
};

export default function DailyProgressRing({
  schedule,
  currentTime,
  currentScheduleEventId,
}: DailyProgressRingProps) {
  const currentMinutes = currentTime
    ? currentTime.getHours() * 60 +
      currentTime.getMinutes() +
      currentTime.getSeconds() / 60
    : null;
  const currentAngle =
    currentMinutes === null
      ? null
      : (currentMinutes / MINUTES_PER_DAY) * Math.PI * 2 - Math.PI / 2;
  const arcs = [...schedule].sort(
    (a, b) =>
      Number(a.event.id === currentScheduleEventId) -
      Number(b.event.id === currentScheduleEventId),
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="今日の24時間予定リング"
      className="h-11 w-11 shrink-0"
    >
      <title>今日の24時間予定リング</title>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="3"
      />
      {arcs.map(({ event, category }) => {
        const start = Math.max(0, Math.min(MINUTES_PER_DAY, event.start));
        const end = Math.max(start, Math.min(MINUTES_PER_DAY, event.end));
        const arcLength = ((end - start) / MINUTES_PER_DAY) * CIRCUMFERENCE;
        const isCurrent = event.id === currentScheduleEventId;

        return (
          <circle
            key={event.id}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={category.color}
            strokeWidth={isCurrent ? 5.5 : 3.5}
            strokeLinecap={isCurrent ? "round" : "butt"}
            strokeDasharray={`${arcLength} ${CIRCUMFERENCE - arcLength}`}
            strokeDashoffset={-(start / MINUTES_PER_DAY) * CIRCUMFERENCE}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={
              isCurrent
                ? { filter: `drop-shadow(0 0 2px ${category.color})` }
                : undefined
            }
          />
        );
      })}
      {currentAngle !== null && (
        <circle
          cx={CENTER + RADIUS * Math.cos(currentAngle)}
          cy={CENTER + RADIUS * Math.sin(currentAngle)}
          r="2"
          fill="white"
          stroke="#475569"
          strokeWidth="0.75"
        />
      )}
    </svg>
  );
}
