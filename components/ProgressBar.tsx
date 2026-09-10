export default function ProgressBar({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-plum-500">
        <span>
          Question {step} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-plum-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-plum-600 to-berry transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
