import Promise from 'bluebird';
import nconf from 'nconf';

import commands from './commands';
import logger from './logger';

const request = Promise.promisify(require('request'));

function getGuildCount(client) {
  if (nconf.get('SHARDING')) return commands.servercount(client, {}, '', '')
    .then(res => Number(res.match(/\d+/g)[0]));
  return Promise.resolve(client.Guilds.length);
}

function carbon(client) {
  if (nconf.get('CARBON_KEY')) {
    logger.info('Submitting to carbon');
    return getGuildCount(client)
      .then(count => request({
        url: 'https://www.carbonitex.net/discord/data/botdata.php',
        headers: {'content-type': 'application/json'},
        json: {
          key: nconf.get('CARBON_KEY'),
          servercount: count
        }
      }))
      .catch(console.log);
  }
}

function dbots(client) {
  if (nconf.get('DBOTS_KEY')) {
    logger.info('Submitting to dbots');
    console.log(getGuildCount(client));
    return getGuildCount(client)
      .then(count => request({
        method: 'POST',
        url: `https://bots.discord.pw/api/bots/${client.User.id}/stats`,
        headers: {
          Authorization: nconf.get('DBOTS_KEY'),
          'Content-Type': 'application/json'
        },
        json: {
          'server_count': count
        }
      }))
      .catch(console.log);
  }
}

export function startPortalIntervals(client) {
  setInterval(() => carbon(client), 3600000);
  setInterval(() => dbots(client), 3600000);
}

export function startPortalTimeouts(client, time = 30000) {
  setTimeout(() => carbon(client), time);
  setTimeout(() => dbots(client), time);
}
