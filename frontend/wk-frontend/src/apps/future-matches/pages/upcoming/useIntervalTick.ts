import { useEffect, useState } from "react";

export function useIntervalTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}
