import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { Atmosphere } from './components/Atmosphere';
import {
  RELEASES_PAGE,
  getDownloads,
  metadata,
  type Format,
  type System,
} from './lib/releases';
import { useRelease } from './lib/useRelease';

const systems: { key: System; name: string; icon: string }[] = [
  { key: 'windows', name: 'Windows', icon: 'windows' },
  { key: 'macos', name: 'macOS', icon: 'apple' },
  { key: 'linux', name: 'Linux', icon: 'linux' },
];
const formats: { key: Format; name: string; description: string }[] = [
  { key: 'appimage', name: 'AppImage', description: 'Archivo portátil' },
  { key: 'deb', name: 'DEB', description: 'Debian y Ubuntu' },
  {
    key: 'rpm',
    name: 'RPM',
    description: 'Fedora y distribuciones compatibles',
  },
];
const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

export default function App() {
  const { release, loading, error, retry } = useRelease();
  const [system, setSystem] = useState<System>('windows');
  const [format, setFormat] = useState<Format>('appimage');
  const panel = useRef<HTMLDivElement>(null);
  const notes = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const previous = useRef('');
  const downloads = getDownloads(release);
  const available = formats.filter((item) => downloads.linux[item.key]);
  const selectedFormat = downloads.linux[format]
    ? format
    : (available[0]?.key ?? format);
  const file =
    system === 'linux' ? downloads.linux[selectedFormat] : downloads[system];
  const selectedIndex = systems.findIndex((item) => item.key === system);
  const name = systems[selectedIndex].name;

  useEffect(() => {
    const selection = `${system}:${selectedFormat}:${release?.version ?? ''}`;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation =
      previous.current && previous.current !== selection && !reduced
        ? panel.current?.animate(
            [
              { opacity: 0.45, transform: 'translateY(4px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' },
          )
        : undefined;
    previous.current = selection;
    return () => animation?.cancel();
  }, [system, selectedFormat, release?.version]);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = (index + 1) % systems.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (index + systems.length - 1) % systems.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = systems.length - 1;
    else return;
    event.preventDefault();
    setSystem(systems[next].key);
    tabs.current[next]?.focus();
  }

  return (
    <>
      <Atmosphere />
      <a className="skip" href="#downloads">
        Ir a la descarga
      </a>
      <div className="page relative z-10 mx-auto flex min-h-svh w-full max-w-[1120px] flex-col items-center px-8 pt-12 pb-7 max-[600px]:px-5 max-[600px]:pt-7 max-[600px]:pb-[22px]">
        <main className="flex w-full max-w-[680px] flex-1 flex-col items-start justify-center py-8 max-[600px]:max-w-none">
          <h1 className="sr-only">Descargar Spektra Launcher</h1>
          <div className="identity">
            <img
              src={asset('spektra.webp')}
              alt="Spektra"
              width="96"
              height="96"
            />
          </div>
          <section
            className="downloads"
            id="downloads"
            aria-label="Descargar el launcher"
          >
            <div
              className="systems"
              role="tablist"
              aria-label="Sistema operativo"
              aria-orientation="vertical"
              style={{ '--selected-index': selectedIndex } as CSSProperties}
            >
              {systems.map((item, index) => (
                <button
                  key={item.key}
                  ref={(element) => {
                    tabs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`system-${item.key}`}
                  aria-selected={system === item.key}
                  aria-controls="download-panel"
                  tabIndex={system === item.key ? 0 : -1}
                  onClick={() => setSystem(item.key)}
                  onKeyDown={(event) => onTabKey(event, index)}
                >
                  <img src={asset(`${item.icon}.svg`)} alt="" />
                  {item.name}
                </button>
              ))}
              <span className="selection-marker" aria-hidden="true" />
            </div>
            <div
              className="download-panel"
              ref={panel}
              id="download-panel"
              role="tabpanel"
              aria-labelledby={`system-${system}`}
            >
              <div className="package-heading mb-[22px] flex items-center justify-between gap-4 text-xs text-[#9ca6b4] max-[600px]:mb-[18px] max-[600px]:gap-1.5 max-[600px]:text-[10px]">
                <span aria-live="polite" aria-atomic="true">
                  {file
                    ? metadata(file, system)
                    : loading
                      ? 'Consultando GitHub…'
                      : release
                        ? 'No disponible en esta versión'
                        : 'Sin conexión con GitHub'}
                </span>
                <span className="version text-xs whitespace-nowrap text-[#a5afbd] max-[600px]:text-[10px]">
                  {release?.version ?? '—'}
                </span>
              </div>
              {system === 'linux' && (
                <fieldset className="formats">
                  <legend className="sr-only">Formato para Linux</legend>
                  {formats.map((item) => (
                    <label
                      key={item.key}
                      title={
                        downloads.linux[item.key]
                          ? item.description
                          : 'No disponible en esta versión'
                      }
                    >
                      <input
                        type="radio"
                        name="linux-format"
                        value={item.key}
                        checked={selectedFormat === item.key}
                        disabled={!downloads.linux[item.key]}
                        onChange={() => setFormat(item.key)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              {file ? (
                <a className="download-link" href={file.url}>
                  <span>Descargar para {name}</span>
                  <img src={asset('download.svg')} alt="" />
                </a>
              ) : (
                <span
                  className="download-link unavailable"
                  aria-disabled="true"
                >
                  {loading ? 'Cargando descargas…' : 'Descarga no disponible'}
                </span>
              )}
              <details
                className="notes"
                onToggle={(event) => {
                  if (
                    event.currentTarget.open &&
                    !matchMedia('(prefers-reduced-motion: reduce)').matches
                  )
                    notes.current?.animate(
                      [
                        { opacity: 0, transform: 'translateY(-4px)' },
                        { opacity: 1, transform: 'translateY(0)' },
                      ],
                      { duration: 240, easing: 'ease-out' },
                    );
                }}
              >
                <summary>
                  Notas
                  <img src={asset('chevron.svg')} alt="" />
                </summary>
                <div className="notes-content" ref={notes}>
                  <p>
                    Para evitar interrupciones por posibles falsos positivos,
                    añade el launcher a las excepciones del antivirus o
                    desactívalo temporalmente.
                  </p>
                </div>
              </details>
            </div>
          </section>
        </main>
        <footer className="max-w-[580px] text-center text-[11px] leading-[1.8] text-[#737d8c] max-[600px]:text-[10px]">
          {error ? (
            <div className="release-warning" role="status">
              <span>
                {release
                  ? 'No se pudo comprobar si hay una versión nueva.'
                  : 'No se pudieron consultar las descargas.'}
              </span>
              <div className="release-actions">
                <button type="button" onClick={retry} disabled={loading}>
                  {loading ? 'Consultando…' : 'Reintentar'}
                </button>
                <a href={RELEASES_PAGE}>Ver en GitHub</a>
              </div>
            </div>
          ) : loading && !release ? (
            'Consultando la última versión…'
          ) : null}
        </footer>
      </div>
    </>
  );
}
