// Pure, side-effect-free interest preview engine. Not wired to live ledger writes.
// Simple-interest money arithmetic uses exact decimal/rational intermediates and integer paise.
const DAY_MS = 86400000;
const DECIMAL_RE = /^([+-]?)(\\d+)(?:\\.(\\d+))?(?:e([+-]?\\d+))?$/i;
const decimalRational = (value, label) => {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError(`Invalid ${label}`);
  const raw = String(value).trim();
  const match = DECIMAL_RE.exec(raw);
  if (!match) throw new RangeError(`Invalid ${label}`);
  const sign = match[1] === '-' ? -1n : 1n;
  const integer = match[2];
  const fraction = match[3] || '';
  const exponent = Number(match[4] || '0');
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) throw new RangeError(`Invalid ${label}`);
  let numerator = BigInt((integer + fraction) || '0') * sign;
  let denominator = 10n ** BigInt(fraction.length);
  if (exponent > 0) numerator *= 10n ** BigInt(exponent);
  else if (exponent < 0) denominator *= 10n ** BigInt(-exponent);
  return {numerator, denominator};
};
const roundRational = (numerator, denominator, mode = 'half-up') => {
  if (denominator <= 0n || numerator < 0n) throw new RangeError('Rational value must be non-negative');
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (mode === 'down') return quotient;
  if (mode === 'up') return remainder === 0n ? quotient : quotient + 1n;
  if (mode !== 'half-up') throw new RangeError('Unsupported rounding mode');
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
};
const paiseToNumber = paise => {
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Money value exceeds safe numeric range');
  return Number(paise) / 100;
};
const moneyPaise = (value, mode = 'half-up') => {
  const r = decimalRational(value, 'Amount');
  if (r.numerator < 0n) throw new RangeError('Amount must be non-negative');
  return roundRational(r.numerator * 100n, r.denominator, mode);
};
const rationalMultiply = (a, b) => ({
  numerator: a.numerator * b.numerator,
  denominator: a.denominator * b.denominator
});
const percentRateRational = (rate, ratePeriod) => {
  const base = decimalRational(rate, 'ratePercent');
  if (base.numerator < 0n) throw new RangeError('Invalid ratePercent');
  if (ratePeriod === 'annual') return {numerator: base.numerator, denominator: base.denominator * 100n};
  if (ratePeriod === 'monthly') return {numerator: base.numerator * 12n, denominator: base.denominator * 100n};
  if (ratePeriod === 'daily') return {numerator: base.numerator * 365n, denominator: base.denominator * 100n};
  throw new RangeError('Unsupported rate period');
};
const parseDate = value => {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError('Invalid ISO date');
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) throw new TypeError('Date must be a valid YYYY-MM-DD ISO date');
  const d = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new TypeError('Invalid ISO date');
  return d;
};
const daysBetween = (start, end) => {
  const delta = Math.round((parseDate(end)-parseDate(start))/DAY_MS);
  if (delta < 0) throw new RangeError('End date must be on or after start date');
  return delta;
};
const european30E360Days = (startValue, endValue) => {
  const start=parseDate(startValue), end=parseDate(endValue);
  const y1=start.getUTCFullYear(), y2=end.getUTCFullYear();
  const m1=start.getUTCMonth()+1, m2=end.getUTCMonth()+1;
  const d1=Math.min(start.getUTCDate(),30), d2=Math.min(end.getUTCDate(),30);
  return Math.max(0,360*(y2-y1)+30*(m2-m1)+(d2-d1));
};
export function previewInterest({principal, ratePercent, ratePeriod='monthly', startDate, endDate, mode='simple', dayCount='ACT/365', compounding='monthly', rounding='half-up'}) {
  const principalPaise = moneyPaise(principal, rounding);
  const rateNumber = Number(ratePercent);
  if (!Number.isFinite(rateNumber) || rateNumber < 0) throw new RangeError('Invalid ratePercent');
  const days=daysBetween(startDate,endDate);
  const annualRate=ratePeriod==='annual'?rateNumber/100:ratePeriod==='monthly'?rateNumber*12/100:ratePeriod==='daily'?rateNumber*365/100:null;
  const rateRational = percentRateRational(ratePercent, ratePeriod);
  let dayFraction;
  if(dayCount==='ACT/365') dayFraction={numerator:BigInt(days),denominator:365n};
  else if(dayCount==='ACT/366') dayFraction={numerator:BigInt(days),denominator:366n};
  else if(dayCount==='ACT/360') dayFraction={numerator:BigInt(days),denominator:360n};
  else if(dayCount==='30E/360' || dayCount==='30/360') dayFraction={numerator:BigInt(european30E360Days(startDate,endDate)),denominator:360n};
  else throw new RangeError('Unsupported day-count basis');

  let principalOut = paiseToNumber(principalPaise);
  let interestPaise;
  let totalPaise;
  if(mode==='simple') {
    const interestRational = rationalMultiply({numerator: principalPaise, denominator: 1n}, rationalMultiply(rateRational, dayFraction));
    interestPaise = roundRational(interestRational.numerator, interestRational.denominator, rounding);
    totalPaise = principalPaise + interestPaise;
  } else if(mode==='compound') {
    const m=({daily:365,monthly:12,quarterly:4,semiannual:2,annual:1})[compounding];
    if(!m) throw new RangeError('Unsupported compounding frequency');
    const total=principalOut*Math.pow(1+annualRate/m,m*((dayFraction.numerator*1n).toString()/Number(dayFraction.denominator)));
    totalPaise=moneyPaise(total, rounding);
    interestPaise=totalPaise-principalPaise;
  } else throw new RangeError('Unsupported interest mode');

  return Object.freeze({
    principal:paiseToNumber(principalPaise),
    interest:paiseToNumber(interestPaise),
    total:paiseToNumber(totalPaise),
    elapsedDays:days,
    mode,
    ratePercent:rateNumber,
    ratePeriod,
    dayCount:dayCount==='30/360'?'30E/360':dayCount,
    compounding:mode==='compound'?compounding:null,
    calculationVersion:2
  });
}
