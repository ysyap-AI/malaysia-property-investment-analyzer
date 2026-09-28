// Shared numerical policy for Engine A. Amounts are RM; percentages are in
// percentage points. Reject values outside safe integer-cent representation.
export function isSafeFinancialNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
    && Math.abs(value) <= Number.MAX_SAFE_INTEGER / 100;
}

// Keep base-10 inputs exact through +, -, *, / until the result is rounded.
// Rounding only a binary intermediate cannot fix e.g. 0.57 * 10.5 = 5.985.
// This internal rational representation adds no dependency or persisted type.
class Decimal {
  constructor(private readonly numerator: bigint, private readonly denominator = 1n) {}

  add(other: Decimal): Decimal {
    return new Decimal(this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator);
  }

  subtract(other: Decimal): Decimal {
    return this.add(new Decimal(-other.numerator, other.denominator));
  }

  multiply(other: Decimal): Decimal {
    return new Decimal(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  divide(other: Decimal): Decimal {
    return new Decimal(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  round(): number {
    if (this.denominator === 0n) return Number.NaN;
    const negative = (this.numerator < 0n) !== (this.denominator < 0n);
    const n = (this.numerator < 0n ? -this.numerator : this.numerator) * 100n;
    const d = this.denominator < 0n ? -this.denominator : this.denominator;
    const cents = n / d + (2n * (n % d) >= d ? 1n : 0n);
    if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return Number.NaN;
    const signedCents = negative ? -cents : cents;
    const result = cents === 0n ? 0 : Number(signedCents) / 100;
    // At very large magnitudes a JS number cannot represent every sen even
    // when integer cents are safe. Refuse a result that changes on conversion.
    const represented = decimal(result);
    return represented.denominator !== 0n
      && represented.numerator * 100n === signedCents * represented.denominator
      ? result : Number.NaN;
  }
}

/** Convert an input's decimal representation; invalid values stay invalid. */
export function decimal(value: number): Decimal {
  if (!isSafeFinancialNumber(value)) return new Decimal(0n, 0n);
  const [coefficient = "0", exponent = "0"] = value.toString().split("e");
  const scale = (coefficient.split(".")[1]?.length ?? 0) - Number(exponent);
  const digits = BigInt(coefficient.replace(".", ""));
  return scale >= 0
    ? new Decimal(digits, 10n ** BigInt(scale))
    : new Decimal(digits * 10n ** BigInt(-scale));
}

/** Round results to two decimals, with decimal ties away from zero. */
export function roundToTwo(value: number): number {
  return decimal(value).round();
}
