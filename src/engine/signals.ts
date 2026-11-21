// A flat table of named values shared by the plant, the operator, the relay
// circuit and the PLC. Examples: "SB1" (button pressed), "SA2" ("auto"),
// "KM3" (contactor pulled in), "TK_MIX.level" (0..1), "LT101.mA".

export type Val = boolean | number | string;

export class Signals extends Map<string, Val> {
  b(key: string): boolean {
    const v = this.get(key);
    return v === true || (typeof v === 'number' && v !== 0) || v === 'on';
  }
  n(key: string, dflt = 0): number {
    const v = this.get(key);
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return dflt;
  }
  s(key: string): string {
    const v = this.get(key);
    return v === undefined ? '' : String(v);
  }
  snapshot(): Record<string, Val> {
    return Object.fromEntries(this);
  }
}
