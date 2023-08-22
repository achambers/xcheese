const renames = {
  'ember-animated/ember-animated-tools': {
    owner: 'ember-animation',
    repo: 'ember-animated-tools'
  },
  'pzuraq/tracked-toolbox': {
    owner: 'tracked-tools',
    repo: 'tracked-toolbox'
  }
};

const repoIgnores = [
  'intercom/embercom-prosemirror-composer',
  'intercom/intersection',
  'intercom/pulse',
  'intercom/ember-cli-deploy-embercom',
  'intercom/embercom-composer',
  'martndemus/ember-invoke-action' //doesn't exist anymore (dep of ember-sortable)
];

const addonIgnores = [
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

const noRepo = {
  'ember-tracked-local-storage': 'https://github.com/Leadfeeder/ember-tracked-local-storage',
  'ember-did-change-attrs': 'https://github.com/workmanw/ember-did-change-attrs',
  'ember-test-waiters': 'https://github.com/emberjs/ember-test-waiters',
  'ember-jquery-legacy': 'https://github.com/emberjs/ember-jquery-legacy'
};

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

const octokit = new Octokit({
  auth: `token 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`
});

(async () => {
  try {
    const addonsFilePath = path.join(__dirname, 'addons.txt');
    const addons = fs.readFileSync(addonsFilePath, 'utf-8').split('\n');

    let noMatches = [];
    for (const addon of addons) {
      if (addon.includes('ember-decorators/')) {
        console.log('FFFFFFF', addon);
      }
      if (addonIgnores.some(ignore => addon.startsWith(ignore))) {
        continue;
      }

//      console.log('11111', addon);
      if (!addon.trim()) {
        continue;
      }
//      console.log('2222');
      const packageJsonPath = path.join(__dirname, '../embercom', addon);

      if (fs.existsSync(packageJsonPath)) {
//      console.log('3333');
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        const parsedPackageJson = JSON.parse(packageJsonContent);

        let repoUrl;
        if (parsedPackageJson.repository) {
          if (typeof parsedPackageJson.repository === 'string') {
            repoUrl = parsedPackageJson.repository.replace(/\.git$/, '');
          } else if (typeof parsedPackageJson.repository === 'object' && parsedPackageJson.repository.url) {
            repoUrl = parsedPackageJson.repository.url.replace(/\.git$/, '');
          }
        } else {
          repoUrl = noRepo[parsedPackageJson.name];
        }

        if (!repoUrl) {
          console.log('No repo', addon);
        }

        if (repoUrl) {
          let repos = [
            'machty/ember-concurrency-decorators',
            'buschtoens/ember-event-helpers',
            'lifeart/ember-ref-bucket',
            'ember-cli/ember-try',
            'salsify/ember-cli-dependency-lint',
            'buschtoens/ember-on-helper',
            'typed-ember/ember-cli-typescript-blueprints'
          ];

          if (repos.includes(repoUrl)) {
            repoUrl = `https://github.com/${repoUrl.trim()}`
          }
          let match = repoUrl.match(/(?:github\.com[/:]|git@github\.com:)([^/]+)\/([^/]+)/);
          if (!match) {
            match = repoUrl.match(/github[:/]?([^/]+)\/([^/]+)/);
          }

          if (!match) {
            noMatches.push(repoUrl);
            continue;
          }

          //console.log(repoUrl, match);
          const [ , ownerOrig, repoOrig ] = match;

          const ownerRepo = `${ownerOrig}/${repoOrig}`;

          const { owner, repo } = renames[ownerRepo] ?? { owner: ownerOrig, repo: repoOrig };

          const cacheDir = 'cache';
          const repoDir = path.join(cacheDir, repo);
          const packageJsonCachePath = path.join(repoDir, 'package.json');

          let fetchedPackageJsonContent;

          if (fs.existsSync(packageJsonCachePath)) {
            fetchedPackageJsonContent = fs.readFileSync(packageJsonCachePath, 'utf-8');
            //console.log('From cache', `${owner}/${repo}`);
          } else {
            if (repoIgnores.includes(ownerRepo)) {
              //console.log('Ignoring', `${owner}/${repo}`);
              continue;
            }
            console.log('Fetching', ownerRepo);
            let response = await octokit.repos.getContent({ owner, repo, path: 'package.json' });
            fetchedPackageJsonContent = Buffer.from(response.data.content, 'base64').toString();

            let test = JSON.parse(fetchedPackageJsonContent);

            if (!test.keywords || !test.keywords.includes('ember-addon')) {
              console.log('XXXXXXXXXXXXXXXX');
              try {
                let response = await octokit.repos.getContent({ owner, repo, path: 'addon/package.json' });
                fetchedPackageJsonContent = Buffer.from(response.data.content, 'base64').toString();
              } catch (e) {
                if (e.status !== 404) {
                  throw e;
                }
              }
            }

            test = JSON.parse(fetchedPackageJsonContent);

            if (!test.keywords || !test.keywords.includes('ember-addon')) {
              console.log('YYYYYYY', ownerRepo);

              try {
                let response = await octokit.repos.getContent({ owner, repo, path: `packages/${repo}/package.json` });
                fetchedPackageJsonContent = Buffer.from(response.data.content, 'base64').toString();
              } catch (e) {
                if (e.status !== 404) {
                  throw e;
                }
              }
            }

            test = JSON.parse(fetchedPackageJsonContent);

            if (!test.keywords || !test.keywords.includes('ember-addon')) {
              console.log('ZZZZZ', ownerRepo);

              try {
                let response = await octokit.repos.getContent({ owner, repo, path: `${repo}/package.json` });
                fetchedPackageJsonContent = Buffer.from(response.data.content, 'base64').toString();
              } catch (e) {
                if (e.status !== 404) {
                  throw e;
                }
              }
            }

            test = JSON.parse(fetchedPackageJsonContent);

            if (!test.keywords || !test.keywords.includes('ember-addon')) {
              throw new Error('No package.json: ' + ownerRepo);
            }

            if (!fs.existsSync(cacheDir)) {
              fs.mkdirSync(cacheDir);
            }

            if (!fs.existsSync(repoDir)) {
              fs.mkdirSync(repoDir);
            }

            fs.writeFileSync(packageJsonCachePath, fetchedPackageJsonContent);
          }

          const parsedFetchedPackageJson = JSON.parse(fetchedPackageJsonContent);

          //console.log(`Repo: ${repo}, Package.json:`, parsedFetchedPackageJson);
        }
      }
    }

    if (noMatches.length) {
      console.log('No matches:', noMatches);
    }
  } catch (error) {
    console.error('Error fetching package.json:', error);
  }
})();

