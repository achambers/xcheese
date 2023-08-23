const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const crawlCommand = require('./crawl');
const fetchCommand = require('./fetch');
const analyzeCommand = require('./analyze');

const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');
const CACHE_DIR = '.xcache';
const CACHE_PATH = path.join(NODE_MODULES_PATH, CACHE_DIR);
const INSTALLED_ADDONS_PATH = path.join(CACHE_PATH, 'installed-addons.json');
const FETCHED_VERSIONS_DIR = path.join(CACHE_PATH, 'addons');

module.exports = async function defaultCommand(options, command) {
  if (!fs.existsSync(NODE_MODULES_PATH)) {
    command.error(chalk.redBright('node_modules not found: Please install dependencies'));
  }

  if (fs.existsSync(CACHE_PATH) && options.cacheClean) {
    try {
      fs.rmSync(CACHE_PATH, { recursive: true });
    } catch (err) {
      command.error(`${chalk.redBright('Something went wrong when trying to delete the cache directory')}: ${err.message}`);
    }
  }

  if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH);
  }

  console.log('Crawling node_modules for installed ember addons');

  await crawlCommand(options, command);

  console.log('Fetching latest package.json files for installed ember addons');

  await fetchCommand(options, command);

  await analyzeCommand(options, command);
};
