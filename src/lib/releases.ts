import { REPOSITORY, REPOSITORY_URL } from './project';
export const RELEASES_PAGE = `${REPOSITORY_URL}/releases/latest`;
export const RELEASE_API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
export const REFRESH_INTERVAL = 5 * 60 * 1000;
export type System = 'windows' | 'macos' | 'linux';
export type Format = 'appimage' | 'deb' | 'rpm';
export type Asset = { name: string; url: string };
export type Release = {
  version: string;
  page: string;
  publishedAt: string;
  assets: Asset[];
};

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
function assetUrl(value: unknown, name: string): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      url.origin !== 'https://github.com' ||
      !url.pathname.startsWith(`/${REPOSITORY}/releases/download/`)
    )
      return null;
    if (decodeURIComponent(url.pathname.split('/').at(-1) || '') !== name)
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function parseRelease(value: unknown): Release | null {
  if (
    !object(value) ||
    value.draft !== false ||
    value.prerelease !== false ||
    typeof value.tag_name !== 'string' ||
    !Array.isArray(value.assets)
  )
    return null;
  if (!value.tag_name || value.tag_name.length > 100) return null;
  const assets: Asset[] = [];
  for (const item of value.assets) {
    if (!object(item) || typeof item.name !== 'string') continue;
    const url = assetUrl(item.browser_download_url, item.name);
    if (url) assets.push({ name: item.name, url });
  }
  if (!assets.length) return null;
  let page = RELEASES_PAGE;
  if (
    typeof value.html_url === 'string' &&
    value.html_url.startsWith(`${REPOSITORY_URL}/releases/tag/`)
  )
    page = value.html_url;
  return {
    version: value.tag_name,
    page,
    publishedAt:
      typeof value.published_at === 'string' ? value.published_at : '',
    assets,
  };
}

function preference(asset: Asset): number {
  return /universal/i.test(asset.name)
    ? 30
    : /x64|x86_64|amd64/i.test(asset.name)
      ? 20
      : /arm64|aarch64/i.test(asset.name)
        ? 5
        : 10;
}
export function getDownloads(release: Release | null) {
  const pick = (extension: string) =>
    (release?.assets ?? [])
      .filter((asset) => asset.name.toLowerCase().endsWith(extension))
      .sort((a, b) => preference(b) - preference(a))[0];
  return {
    windows: pick('.exe') ?? pick('.msi'),
    macos: pick('.dmg'),
    linux: {
      appimage: pick('.appimage'),
      deb: pick('.deb'),
      rpm: pick('.rpm'),
    },
  };
}
export function architecture(asset: Asset): string {
  if (/universal/i.test(asset.name)) return 'Universal';
  if (/arm64|aarch64/i.test(asset.name)) return 'ARM64';
  if (/x64|x86_64|amd64/i.test(asset.name)) return '64 bits';
  if (/i386|i686|ia32|x86(?!_64)/i.test(asset.name)) return '32 bits';
  return '';
}
export function metadata(asset: Asset, system: System): string {
  const arch = architecture(asset);
  if (system === 'linux') return arch || 'Linux';
  const extension = asset.name.split('.').at(-1)?.toUpperCase() || '';
  return [extension, arch].filter(Boolean).join(' · ');
}

export async function getLatestRelease(
  options: { fetcher?: typeof fetch } = {},
): Promise<Release> {
  const response = await (options.fetcher ?? fetch)(RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  const release = parseRelease(await response.json());
  if (!release) throw new Error('Release has no valid assets');
  return release;
}
