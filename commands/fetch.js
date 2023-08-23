const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const fetch = require('node-fetch');
const util = require('util');

const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

const { Octokit } = require('@octokit/rest');

const REPO_IGNORES = [
  'martndemus/ember-invoke-action'
];

const NO_SPECIFIED_REPO = {
  'ember-tracked-local-storage': 'https://github.com/Leadfeeder/ember-tracked-local-storage',
  'ember-did-change-attrs': 'https://github.com/workmanw/ember-did-change-attrs',
  'ember-test-waiters': 'https://github.com/emberjs/ember-test-waiters',
  'ember-jquery-legacy': 'https://github.com/emberjs/ember-jquery-legacy'
};

const REPO_RENAMES = {
  'ember-animated/ember-animated-tools': {
    owner: 'ember-animation',
    repo: 'ember-animated-tools'
  },
  'pzuraq/tracked-toolbox': {
    owner: 'tracked-tools',
    repo: 'tracked-toolbox'
  }
};

const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');
const CACHE_DIR = '.xcache';
const CACHE_PATH = path.join(NODE_MODULES_PATH, CACHE_DIR);
const INSTALLED_ADDONS_PATH = path.join(CACHE_PATH, 'installed-addons.json');
const FETCHED_VERSIONS_DIR = path.join(CACHE_PATH, 'addons');

//const unfoundPackages = [];

module.exports = async function fetchVersions(options, command) {
  let octokit;

  if (options.token) {
    octokit = new Octokit({
      request: {
        fetch
      },
      auth: `token ${options.token}`
    });
  } else {
    octokit = new Octokit({
      request: {
        fetch
      },
    });
  }

  if (!(await exists(FETCHED_VERSIONS_DIR))) {
    await mkdir(FETCHED_VERSIONS_DIR);
  }

  let installedAddons = JSON.parse(await readFile(INSTALLED_ADDONS_PATH));

  for (let addonPath of installedAddons) {
    let pkgJsonPath = path.join(addonPath, 'package.json');

    if (!(await exists(pkgJsonPath))) {
      console.warn('No package.json found for', addonPath);
      continue;
    }

    let pkgJsonString = await readFile(pkgJsonPath, 'utf-8');
    let pkgJson = JSON.parse(pkgJsonString);

    let pkgData = normalizePackageJson(pkgJson);

    if (REPO_IGNORES.includes(`${pkgData.owner}/${pkgData.repo}`)) {
      continue;
    }

    let fetchedAddonPath = path.join(FETCHED_VERSIONS_DIR, pkgData.name, 'package.json');

    if ((await exists(fetchedAddonPath)) && !options.refreshCache) {
      //console.log(chalk.green('hit'), pkgData.name);
      continue;
    } else {
      //console.log(chalk.red('miss'), pkgData.name);

      let content;

      for (let urlPath of pkgData.paths) {
        content = await fetchPackageJson(pkgData.owner, pkgData.repo, urlPath, octokit);

        if (content) {
          break;
        }
      }

      if (!content) {
        //console.log(chalk.redBright('Could not find package.json for'), pkgData.name, pkgData.owner, pkgData.repo, pkgData.paths);
        //unfoundPackages.push(pkgData);
        continue;
      }

      let pkgCacheDir = path.join(FETCHED_VERSIONS_DIR, pkgData.name);

      if (!(await exists(pkgCacheDir))) {
        await mkdir(pkgCacheDir, { recursive: true });
      }

      await writeFile(path.join(pkgCacheDir, 'package.json'), content);
    }
  }

  //if (unfoundPackages.length > 0) {
  //  console.log('Unfound packages: ', unfoundPackages.length);
  //}

  //console.log(chalk.blue('Finished'));
};

function normalizePackageJson(pkgJson) {
  let [ownerOrig, repoOrig, url] = normalizeUrl(pkgJson);

  let { owner, repo } = REPO_RENAMES[`${ownerOrig}/${repoOrig}`] ?? { owner: ownerOrig, repo: repoOrig };

  let [org, pkg] = pkgJson.name.split('/');

  if (!pkg) {
    pkg = org;
  }

  if (org === '@ember-data' && pkg === 'record-data') {
    pkg = 'json-api';
  }

  if (org === 'ember-data' && pkg === 'ember-data') {
    pkg = '-ember-data';
  }

  if (org === 'ember-decorators' && pkg === 'ember-decorators') {
    pkg = '-ember-decorators';
  }

  let paths = [
    '/package.json',
    `/addon/package.json`,
    `/${pkg}/package.json`,
    `/packages/${pkg}/package.json`,
    `/lib/${pkg}/package.json`,
  ];

  if (org) {
    paths.push(`/packages/${org}/${pkg}/package.json`);
  }

  return {
    name: pkgJson.name,
    version: pkgJson.version,
    owner,
    repo,
    url,
    paths,
  };
}

function normalizeUrl(pkgJson) {
  let { repository } = pkgJson;

  let url;

  if (repository) {
    if (typeof repository === 'string') {
      url = repository;
    } else if (typeof repository === 'object' && repository.url) {
      url = repository.url;
    }
  } else {
    url = NO_SPECIFIED_REPO[pkgJson.name];
  }

  url = url.replace(/\.git$/, '');

  let match = url.match(/(?:github\.com[/:]|git@github\.com:)([^/]+)\/([^/]+).*/);

  if (!match) {
    match = url.match(/github[:/]?([^/]+)\/([^/]+)/);
  }

  if (!match) {
    let parts = url.split('/');
    if (parts.length === 2) {
      return [...parts, `https://github.com/${parts[0]}/${parts[1]}`];
    }

    console.warn(chalk.yellow(url));
    return;
  }

  const [ , owner, repo ] = match;

  return [owner, repo, `https://github.com/${owner}/${repo}`];
}

async function fetchPackageJson(owner, repo, urlPath, octokit) {
  try {
    let response = await octokit.repos.getContent({ owner, repo, path: urlPath });
    let pkgJsonString = Buffer.from(response.data.content, 'base64').toString();

    const parsedPkgJson = JSON.parse(pkgJsonString);

    if (parsedPkgJson.keywords && parsedPkgJson.keywords.includes('ember-addon')) {
      return pkgJsonString;
    }
  } catch (e) {
    if (e.status !== 404) {
      throw e;
    }
  }
}
