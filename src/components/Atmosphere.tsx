import { useEffect, useRef } from 'react';

export function Atmosphere() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('../lib/atmosphere')
      .then(({ createAtmosphere }) => {
        if (!cancelled && host.current)
          dispose = createAtmosphere(host.current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  return <div className="atmosphere" ref={host} aria-hidden="true" />;
}
