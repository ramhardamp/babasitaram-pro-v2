// Pure, side-effect-free interest preview engine. Not wired to live ledger writes.
const DAY_MS = 86400000;
const roundPaise = (amount, mode = 'half-up') => {
  const scaled = amount * 100;
  if (!Number.isFinite(scaled)) throw new TypeError('Amount must be finite');
  if (mode === 'down') return Math.floor(scaled + 1e-9) / 100;
  if (mode === 'up') return Math.ceil(scaled - 1e-9) / 100;
  if (mode !== 'half-up') throw new RangeError('Unsupported rounding mode');
  return Math.round(scaled + Number.EPSILON) / 100;
};
const parseDate = value => {
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) throw new TypeError('Invalid ISO date');
  return d;
};
const daysBetween = (start, end) => Math.max(0, Math.round((parseDate(end)-parseDate(start))/DAY_MS));
export function previewInterest({principal, ratePercent, ratePeriod='monthly', startDate, endDate, mode='simple', dayCount='ACT/365', compounding='monthly', rounding='half-up'}) {
  for (const [k,v] of Object.entries({principal,ratePercent})) if (!Number.isFinite(Number(v)) || Number(v)<0) throw new RangeError(`Invalid ${k}`);
  const p=Number(principal), rate=Number(ratePercent), days=daysBetween(startDate,endDate);
  const annualRate=ratePeriod==='annual'?rate/100:ratePeriod==='monthly'?rate*12/100:ratePeriod==='daily'?rate*365/100:null;
  if (annualRate===null) throw new RangeError('Unsupported rate period');
  let yearFraction;
  if(dayCount==='ACT/365') yearFraction=days/365;
  else if(dayCount==='ACT/366') yearFraction=days/366;
  else if(dayCount==='ACT/360') yearFraction=days/360;
  else if(dayCount==='30/360') yearFraction=days/360;
  else throw new RangeError('Unsupported day-count basis');
  let total;
  if(mode==='simple') total=p*(1+annualRate*yearFraction);
  else if(mode==='compound') {
    const m=({daily:365,monthly:12,quarterly:4,semiannual:2,annual:1})[compounding];
    if(!m) throw new RangeError('Unsupported compounding frequency');
    total=p*Math.pow(1+annualRate/m,m*yearFraction);
  } else throw new RangeError('Unsupported interest mode');
  return Object.freeze({principal:roundPaise(p,rounding),interest:roundPaise(total-p,rounding),total:roundPaise(total,rounding),elapsedDays:days,mode,ratePercent:rate,ratePeriod,dayCount,compounding:mode==='compound'?compounding:null,calculationVersion:1});
}
