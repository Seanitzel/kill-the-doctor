// Round once before splitting minutes/seconds; never display 09:60.
export function clockText(seconds, roundUp = false, padMinutes = 1) {
  const value = Number.isFinite(seconds)
    ? Math.max(0, roundUp ? Math.ceil(seconds) : Math.floor(seconds))
    : 0;
  return `${String(Math.floor(value / 60)).padStart(padMinutes, "0")}:${String(value % 60).padStart(2, "0")}`;
}
