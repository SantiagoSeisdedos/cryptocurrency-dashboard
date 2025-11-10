interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({
  data,
  color = "#34d399",
  width = 160,
  height = 48,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-slate-400">
        No data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = [
    `M 0 ${height}`,
    `L ${points.join(" L ")}`,
    `L ${width} ${height}`,
    "Z",
  ].join(" ");

  const linePath = `M ${points.join(" L ")}`;

  return (
    <svg
      className="w-full"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <path
        d={areaPath}
        fill={`${color}22`}
        stroke="none"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

