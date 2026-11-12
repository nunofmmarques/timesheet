import { useId, useMemo, type MouseEvent, type MouseEventHandler } from 'react';
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { TeamworkLogo } from '@/components/timesheet/teamwork-logo';
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { formatDuration, todayInLisbon } from '@/lib/timesheet';
import type { TimesheetDay } from '@/types/timesheet';

const FULL_DAY = 8 * 60;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

const chartConfig = {
    minutes: {
        label: 'Logged',
        color: 'var(--color-tw-pink)',
    },
} satisfies ChartConfig;

type ChartPoint = {
    date: string;
    label: string;
    weekday: string;
    day: string;
    month: string;
    minutes: number;
    billable: number;
    nonBillable: number;
    weekend: boolean;
    today: boolean;
};

type ColumnShapeProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    payload?: ChartPoint;
    background?: { x?: number; y?: number; width?: number; height?: number };
    patternId: string;
    onMouseEnter?: MouseEventHandler<SVGElement>;
    onMouseLeave?: MouseEventHandler<SVGElement>;
    onClick?: MouseEventHandler<SVGElement>;
};

export function LoggedChart({
    days,
    from,
    to,
}: {
    days: TimesheetDay[];
    from: string;
    to: string;
}) {
    const patternId = `weekend-${useId().replaceAll(':', '')}`;
    const points = useMemo(() => chartPoints(days, from, to), [days, from, to]);
    const byDate = useMemo(
        () => new Map(points.map((day) => [day.date, day])),
        [points],
    );
    const total = points.reduce((sum, day) => sum + day.minutes, 0);
    const scale = Math.max(FULL_DAY, ...points.map((day) => day.minutes), 0);
    const compact = points.length > 14;

    return (
        <Card size="sm">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <TeamworkLogo />
                    Logged
                </CardTitle>
                <CardAction className="font-medium tabular-nums">
                    {formatDuration(total)}
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm bg-tw-pink" />
                        Billable
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm bg-tw-indigo" />
                        Non-billable
                    </span>
                </div>
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-60 w-full"
                >
                        <BarChart
                            accessibilityLayer
                            data={points}
                            margin={{ top: 16, right: 28, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <pattern
                                    id={patternId}
                                    width="8"
                                    height="8"
                                    patternUnits="userSpaceOnUse"
                                    patternTransform="rotate(45)"
                                >
                                    <rect
                                        width="8"
                                        height="8"
                                        fill="var(--muted)"
                                    />
                                    <line
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="8"
                                        stroke="var(--muted-foreground)"
                                        strokeOpacity="0.45"
                                        strokeWidth="3"
                                    />
                                </pattern>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={6}
                                interval={0}
                                height={compact ? 46 : 40}
                                tick={(props) => (
                                    <DayTick
                                        x={props.x}
                                        y={props.y}
                                        compact={compact}
                                        point={byDate.get(
                                            String(props.payload.value),
                                        )}
                                        onSelect={scrollToDay}
                                    />
                                )}
                            />
                            <YAxis hide domain={[0, scale]} width={0} />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(_label, payload) => {
                                            const row = payload?.[0]?.payload as
                                                | ChartPoint
                                                | undefined;

                                            return row?.label ?? '';
                                        }}
                                        formatter={(_value, _name, item) => {
                                            const row = item.payload as
                                                | ChartPoint
                                                | undefined;
                                            const nonBillable =
                                                row?.nonBillable ?? 0;

                                            return (
                                                <span className="font-medium tabular-nums">
                                                    {formatDuration(
                                                        row?.minutes ??
                                                            Number(_value),
                                                    )}
                                                    {nonBillable > 0
                                                        ? ` · ${formatDuration(nonBillable)} non-billable`
                                                        : ''}
                                                </span>
                                            );
                                        }}
                                    />
                                }
                            />
                            <ReferenceLine
                                y={FULL_DAY}
                                stroke="var(--border)"
                                strokeDasharray="4 4"
                                label={{
                                    value: '8h',
                                    position: 'right',
                                    fontSize: 10,
                                    fill: 'var(--muted-foreground)',
                                }}
                            />
                            <Bar
                                dataKey="minutes"
                                shape={(props: ColumnShapeProps) => (
                                    <ColumnShape
                                        {...props}
                                        patternId={patternId}
                                    />
                                )}
                            />
                        </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

function chartPoints(
    days: TimesheetDay[],
    from: string,
    to: string,
): ChartPoint[] {
    const logged = new Map(days.map((day) => [day.date, splitLogged(day)]));
    const dates = eachDate(from, to);

    if (dates.length === 0) {
        return [...days].reverse().map((day) => point(day.date, splitLogged(day)));
    }

    return dates.map((date) => point(date, logged.get(date) ?? emptyLogged()));
}

function splitLogged(day: TimesheetDay): LoggedSplit {
    let billable = 0;
    let nonBillable = 0;

    for (const entry of day.logged) {
        if (entry.billable) {
            billable += entry.minutes;
        } else {
            nonBillable += entry.minutes;
        }
    }

    return { minutes: billable + nonBillable, billable, nonBillable };
}

function emptyLogged(): LoggedSplit {
    return { minutes: 0, billable: 0, nonBillable: 0 };
}

function point(date: string, logged: LoggedSplit): ChartPoint {
    const parsed = localDate(date);
    const weekday = WEEKDAYS[parsed.getDay()];
    const day = String(parsed.getDate());
    const month = MONTHS[parsed.getMonth()];

    return {
        date,
        label: `${weekday} ${day} ${month}`,
        weekday,
        day,
        month,
        minutes: logged.minutes,
        billable: logged.billable,
        nonBillable: logged.nonBillable,
        weekend: parsed.getDay() === 0 || parsed.getDay() === 6,
        today: date === todayInLisbon(),
    };
}

function eachDate(from: string, to: string): string[] {
    if (!isIsoDate(from) || !isIsoDate(to)) {
        return [];
    }

    const dates: string[] = [];
    const cursor = localDate(from);
    const end = localDate(to).getTime();

    while (cursor.getTime() <= end) {
        dates.push(isoDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
}

function isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function localDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function isoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function scrollToDay(date: string | undefined): void {
    if (date === undefined) {
        return;
    }

    document.getElementById(`day-${date}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
    });
}

type LoggedSplit = {
    minutes: number;
    billable: number;
    nonBillable: number;
};

function ColumnShape({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    background,
    patternId,
    onMouseEnter,
    onMouseLeave,
    onClick,
}: ColumnShapeProps) {
    const select = (event: MouseEvent<SVGElement>) => {
        onClick?.(event);
        scrollToDay(payload?.date);
    };
    const events = {
        onMouseEnter,
        onMouseLeave,
        onClick: select,
    };
    const minutes = payload?.minutes ?? 0;
    const nonBillable = payload?.nonBillable ?? 0;
    const nonBillableHeight =
        minutes > 0 ? (height * nonBillable) / minutes : 0;
    const billableHeight = Math.max(0, height - nonBillableHeight);
    const billableFill = 'var(--color-tw-pink)';
    const slot =
        background?.width && background.height
            ? {
                  x: background.x,
                  y: background.y,
                  width: background.width,
                  height: background.height,
              }
            : null;
    const weekend = payload?.weekend && slot;
    const today = payload?.today === true;

    return (
        <g className="cursor-pointer">
            {slot ? (
                <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.width}
                    height={slot.height}
                    fill="transparent"
                    onClick={select}
                />
            ) : null}
            {today && slot && (
                <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.width}
                    height={slot.height}
                    rx={6}
                    fill="color-mix(in oklab, var(--color-tw-orange) 16%, transparent)"
                    pointerEvents="none"
                />
            )}
            {weekend && (
                <rect
                    x={background.x}
                    y={background.y}
                    width={background.width}
                    height={background.height}
                    rx={6}
                    fill={`url(#${patternId})`}
                    {...events}
                />
            )}
            {billableHeight > 0 &&
                (nonBillableHeight > 0 ? (
                    <rect
                        x={x}
                        y={y + nonBillableHeight}
                        width={width}
                        height={billableHeight}
                        fill={billableFill}
                        {...events}
                    />
                ) : (
                    <TopBar
                        x={x}
                        y={y}
                        width={width}
                        height={billableHeight}
                        fill={billableFill}
                        {...events}
                    />
                ))}
            {nonBillableHeight > 0 && (
                <TopBar
                    x={x}
                    y={y}
                    width={width}
                    height={nonBillableHeight}
                    fill="var(--color-tw-indigo)"
                    {...events}
                />
            )}
            {today && slot && (
                <rect
                    x={slot.x}
                    y={slot.y}
                    width={slot.width}
                    height={slot.height}
                    rx={6}
                    fill="none"
                    stroke="var(--color-tw-orange)"
                    strokeWidth={1.5}
                    pointerEvents="none"
                />
            )}
        </g>
    );
}

function TopBar({
    x,
    y,
    width,
    height,
    fill,
    onMouseEnter,
    onMouseLeave,
    onClick,
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    onMouseEnter?: MouseEventHandler<SVGElement>;
    onMouseLeave?: MouseEventHandler<SVGElement>;
    onClick?: MouseEventHandler<SVGElement>;
}) {
    const radius = Math.min(6, width / 2, height);
    const path = [
        `M ${x} ${y + height}`,
        `L ${x} ${y + radius}`,
        `Q ${x} ${y} ${x + radius} ${y}`,
        `L ${x + width - radius} ${y}`,
        `Q ${x + width} ${y} ${x + width} ${y + radius}`,
        `L ${x + width} ${y + height}`,
        'Z',
    ].join(' ');

    return (
        <path
            d={path}
            fill={fill}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
        />
    );
}

function DayTick({
    x = 0,
    y = 0,
    point,
    compact = false,
    onSelect,
}: {
    x?: number | string;
    y?: number | string;
    point?: ChartPoint;
    compact?: boolean;
    onSelect: (date: string) => void;
}) {
    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            className={
                point?.today
                    ? 'cursor-pointer fill-tw-orange text-[10px] font-medium'
                    : 'cursor-pointer fill-muted-foreground text-[10px]'
            }
            onClick={() => {
                if (point !== undefined) {
                    onSelect(point.date);
                }
            }}
        >
            <tspan x={x} dy={11} className="font-medium">
                {point?.weekday}
            </tspan>
            {compact ? (
                <>
                    <tspan x={x} dy={11}>
                        {point?.day}
                    </tspan>
                    <tspan x={x} dy={11}>
                        {point?.month}
                    </tspan>
                </>
            ) : (
                <tspan x={x} dy={12}>
                    {point ? `${point.day} ${point.month}` : ''}
                </tspan>
            )}
        </text>
    );
}
