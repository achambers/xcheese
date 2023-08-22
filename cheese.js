const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({
  auth: `token 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`
});

const ADDON_IGNORES = [
  'node_modules/ember-cli/blueprints/',
  'node_modules/ember-cli/lib/tasks/server/middleware',
  'node_modules/ember-cli/lib/tasks',
  'node_modules/ember-route-action-helper/.node_modules.ember-try',
  'node_modules/ember-cli-dependency-lint/tests-node',
  'node_modules/ember-one-way-controls/.node_modules.ember-try',
  'node_modules/ember-cli-typescript-blueprints/blueprints/in-repo-addon/files',
  'node_modules/@ember-data/canary-features',
  'node_modules/@ember-data/private-build-infra',
  'node_modules/tracked-built-ins/node_modules/ember-cli-typescript/test-skeleton-app',
  'node_modules/ember-decorators/'
];

const NO_SPECIFIED_REPO = {
  'ember-tracked-local-storage': 'https://github.com/Leadfeeder/ember-tracked-local-storage',
  'ember-did-change-attrs': 'https://github.com/workmanw/ember-did-change-attrs',
  'ember-test-waiters': 'https://github.com/emberjs/ember-test-waiters',
  'ember-jquery-legacy': 'https://github.com/emberjs/ember-jquery-legacy'
};


let data = [];

function normalizeRepoUrl(url) {
  url = url.replace(/\.git$/, '');

  let repos = [
    'machty/ember-concurrency-decorators',
    'buschtoens/ember-event-helpers',
    'lifeart/ember-ref-bucket',
    'ember-cli/ember-try',
    'salsify/ember-cli-dependency-lint',
    'buschtoens/ember-on-helper',
    'typed-ember/ember-cli-typescript-blueprints'
  ];

  if (repos.includes(url)) {
    return `https://github.com/${url.trim()}`
  }

  let match = url.match(/(?:github\.com[/:]|git@github\.com:)([^/]+)\/([^/]+)/);

  if (!match) {
    match = url.match(/github[:/]?([^/]+)\/([^/]+)/);
  }

  if (!match) {
    return;
  }

  const [ , owner, repo ] = match;

  return `https://github.com/${owner}/${repo}`;
}

function debug(...args) {
  if (process.env.DEBUG) {
    console.log(...args);
  }
}

async function fetchPackageJson(d, path) {
  console.log('Fetching', `${d.url}/${path}`);

  try {
    let response = await octokit.repos.getContent({ owner: d.owner, repo: d.repo, path });
    return Buffer.from(response.data.content, 'base64').toString();
  } catch (e) {
    if (e.status !== 404) {
      throw e;
    }
  }
}

(async () => {
  try {
    const addonsFilePath = path.join(__dirname, 'addons.txt');
    const addons = fs.readFileSync(addonsFilePath, 'utf-8').split('\n');

    for (const addon of addons) {
      if (!addon.trim()) {
        continue;
      }

      if (ADDON_IGNORES.some(ignore => addon.startsWith(ignore))) {
        debug('Ignoring', addon);
        continue;
      }

      const packageJsonPath = path.join(__dirname, '../embercom', addon);

      if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(packageJsonContent);

        const name = pkg.name;

        let url;
        if (pkg.repository) {
          if (typeof pkg.repository === 'string') {
            url = pkg.repository;
          } else if (typeof pkg.repository === 'object' && pkg.repository.url) {
            url = pkg.repository.url;
          }
        } else {
          url = NO_SPECIFIED_REPO[pkg.name];
        }

        if (url) {
          url = normalizeRepoUrl(url);

          let [, owner, repo] = url.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)/);

          if (url) {
            data.push({
              name,
              owner,
              repo,
              url
            });
          } else {
            debug('Could not normalize repo url for', addon);
            continue;
          }
        } else  {
          debug('No known repo url for', addon);
          continue;
        }
      } else {
        debug('No package.json found for', addon);
        continue;
      }
    }
  } catch (error) {
    debug('Error fetching package.json:', error);
  }

  const cacheDir = 'cache';

  for (const d of data) {
    const repoDir = path.join(cacheDir, d.name);
    const pkgJsonCachePath = path.join(repoDir, 'package.json');

    let pkgJsonContent;

    console.log('Checking', pkgJsonCachePath);
    if (fs.existsSync(pkgJsonCachePath)) {
      pkgJsonContent = fs.readFileSync(pkgJsonCachePath, 'utf-8');
      //console.log('hit', pkgJsonCachePath);
    } else {
      if (d.name === 'ember-invoke-action') {
        continue; // Doesn't exist anymore
      }

      console.log('miss', pkgJsonCachePath);

      pkgJsonContent = await fetchPackageJson(d, 'package.json');
      pkgJsonContent = pkgJsonContent || await fetchPackageJson(d, `addon/package.json`);
      pkgJsonContent = pkgJsonContent || await fetchPackageJson(d, `${d.name}/package.json`);
      pkgJsonContent = pkgJsonContent || await fetchPackageJson(d, `packages/${d.name}/package.json`);

      if (!pkgJsonContent) {
        console.log('No package.json found for', d.name);
        continue;
      }

      const parsedPkgJson = JSON.parse(pkgJsonContent);

      if (parsedPkgJson.workspaces || !parsedPkgJson.keywords || !parsedPkgJson.keywords.includes('ember-addon')) {
        console.log('Wrong package.json', d.name, parsedPkgJson.name);
      }


      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }

      if (!fs.existsSync(repoDir)) {
        fs.mkdirSync(repoDir);
      }

      fs.writeFileSync(pkgJsonCachePath, pkgJsonContent);

      //console.log('11111', pkgJsonContent);
    }
  }

  debug(data.length);
})();
