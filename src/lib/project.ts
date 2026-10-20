import packageInfo from '../../package.json' with { type: 'json' };

const repositoryUrl = new URL(packageInfo.repository.url);

export const REPOSITORY = repositoryUrl.pathname.replace(/^\/|\.git$/g, '');
export const REPOSITORY_NAME = REPOSITORY.split('/')[1];
export const REPOSITORY_URL = `${repositoryUrl.origin}/${REPOSITORY}`;
export const PAGES_BASE = `/${REPOSITORY_NAME}/`;
