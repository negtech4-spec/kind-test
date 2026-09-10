import Image from "next/image";

export default function BrandHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`brand-header flex items-center justify-center gap-4 sm:gap-6 ${className}`}>
      <Image
        src="/images/kindredpath-logo-wordmark.png"
        alt="Kindred Path"
        width={168}
        height={110}
        priority
        className="h-10 w-auto sm:h-12"
      />
      <span className="text-lg font-light text-plum-200 sm:text-xl" aria-hidden="true">
        ×
      </span>
      <Image
        src="/images/lasuth-logo.png"
        alt="Lagos State University Teaching Hospital"
        width={110}
        height={110}
        className="h-10 w-auto sm:h-12"
      />
    </div>
  );
}
