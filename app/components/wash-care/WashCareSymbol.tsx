import { getWashCareSymbol, type WashCareSymbolKey } from "@/lib/catalog/washCare";

type Props = {
  icon: WashCareSymbolKey;
  className?: string;
};

const stroke = 1.8;

const Cross = () => (
  <>
    <line x1="9" y1="9" x2="39" y2="39" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    <line x1="39" y1="9" x2="9" y2="39" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
  </>
);

const Bars = ({ count = 0 }: { count?: 0 | 1 | 2 }) => (
  <>
    {count >= 1 ? <line x1="7" y1="42" x2="41" y2="42" stroke="currentColor" strokeWidth={stroke} /> : null}
    {count >= 2 ? <line x1="7" y1="46" x2="41" y2="46" stroke="currentColor" strokeWidth={stroke} /> : null}
  </>
);

const Dots = ({ count = 0, y = 25 }: { count?: 0 | 1 | 2 | 3; y?: number }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <circle key={index} cx={24 + (index - (count - 1) / 2) * 7} cy={y} r="2.1" fill="currentColor" />
    ))}
  </>
);

export default function WashCareSymbol({ icon, className = "ss-care-svg" }: Props) {
  const spec = getWashCareSymbol(icon).render;
  let content;

  if (spec.kind === "wash") {
    content = (
      <>
        <path d="M6 15 Q8 11 12 13 Q16 15 20 13 Q24 11 28 13 Q32 15 36 13 Q40 11 42 15 L38 36 H10 Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
        {spec.temperature ? <text x="24" y="29" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="600">{spec.temperature}°</text> : null}
        {spec.hand ? <path d="M17 30 C18 25 18 19 20 18 C22 17 22 23 22 24 C22 19 24 17 25 19 V24 C25 19 28 19 28 21 V25 C29 21 31 22 31 24 V29 C31 34 27 36 23 35 C19 34 16 32 17 30 Z" stroke="currentColor" strokeWidth="1.4" /> : null}
        <Bars count={spec.bars ?? 0} />
        {spec.crossed ? <Cross /> : null}
      </>
    );
  } else if (spec.kind === "bleach") {
    content = (
      <>
        <path d="M24 6 L43 41 H5 Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
        {spec.mode === "oxygen" ? <><line x1="12" y1="36" x2="28" y2="12" stroke="currentColor" strokeWidth="1.4" /><line x1="20" y1="40" x2="34" y2="18" stroke="currentColor" strokeWidth="1.4" /></> : null}
        {spec.mode === "none" ? <Cross /> : null}
      </>
    );
  } else if (spec.kind === "tumble") {
    content = (
      <>
        <rect x="6" y="6" width="36" height="36" rx="2" stroke="currentColor" strokeWidth={stroke} />
        <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth={stroke} />
        <Dots count={spec.dots ?? 0} />
        {spec.crossed ? <Cross /> : null}
      </>
    );
  } else if (spec.kind === "natural") {
    const vertical = spec.method === "line" || spec.method === "dripLine";
    const drip = spec.method === "dripLine" || spec.method === "dripFlat";
    content = (
      <>
        <rect x="6" y="6" width="36" height="36" rx="2" stroke="currentColor" strokeWidth={stroke} />
        {vertical ? <line x1="24" y1="10" x2="24" y2="38" stroke="currentColor" strokeWidth="2.2" /> : <line x1="10" y1="25" x2="38" y2="25" stroke="currentColor" strokeWidth="2.2" />}
        {drip ? <><line x1="16" y1="10" x2="16" y2="20" stroke="currentColor" strokeWidth="1.5" /><line x1="32" y1="10" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5" /></> : null}
        {spec.shade ? <><line x1="31" y1="7" x2="41" y2="17" stroke="currentColor" strokeWidth="1.2" /><line x1="26" y1="7" x2="41" y2="22" stroke="currentColor" strokeWidth="1.2" /></> : null}
      </>
    );
  } else if (spec.kind === "iron") {
    content = (
      <>
        <path d="M6 34 L10 20 Q11 16 17 16 H36 Q42 16 43 23 L44 34 Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" />
        <Dots count={spec.dots ?? 0} y={26} />
        {spec.noSteam ? <><path d="M13 13 C10 10 16 9 13 6 M20 13 C17 10 23 9 20 6" stroke="currentColor" strokeWidth="1.4" /><line x1="8" y1="5" x2="24" y2="15" stroke="currentColor" strokeWidth="1.5" /></> : null}
        {spec.crossed ? <Cross /> : null}
      </>
    );
  } else if (spec.kind === "professional") {
    content = (
      <>
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth={stroke} />
        {spec.letter ? <text x="24" y="31" textAnchor="middle" fontSize="19" fill="currentColor" fontWeight="600">{spec.letter}</text> : null}
        <Bars count={spec.bars ?? 0} />
        {spec.crossed ? <Cross /> : null}
      </>
    );
  }

  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className} data-wash-care={icon}>
      {content}
    </svg>
  );
}
