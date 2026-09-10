"use client";

export default function OptionCard({
  label,
  name,
  selected,
  onSelect,
}: {
  label: string;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`option-card focus-ring flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150 sm:py-3.5 ${
        selected
          ? "border-plum-600 bg-plum-50 shadow-soft"
          : "border-plum-100 bg-white hover:border-plum-300 hover:bg-plum-50/40"
      }`}
    >
      <input
        type="radio"
        name={name}
        className="option-radio"
        checked={selected}
        onChange={onSelect}
      />
      <span
        className={`option-card-text text-[15px] leading-snug sm:text-base ${
          selected ? "text-plum-700" : "text-ink"
        }`}
      >
        {label}
      </span>
    </label>
  );
}
