import Promise from 'bluebird';
import didyoumean from 'didyoumean';
import nconf from 'nconf';
import R from 'ramda';
import _request from 'request';
import SuperError from 'super-error';

import { getNSFWChannel } from '../../redis';

const request = Promise.promisify(_request);

// Setup and makes request to e621 API
function _makeRequest(options) {
  let default_options = {
    json: true,
    headers: {
      'User-Agent' : 'FurBot/1.0 (Phun @ e621)'
    }
  };

  if (options.qs) options.qs = R.merge(default_options.qs, options.qs);
  return request(R.merge(default_options, options, true))
    .tap(res => {
      if (res.statusCode === 521) throw new ApiDown();
    })
    .then(R.prop('body'))
    .tap(body => {
      //if (body.error) throw new Error(body.error);
    });
}

function tags(client, evt, suffix) {
  const channel_id = evt.message.channel_id;
  return getNSFWChannel(channel_id).then(value => {
    if (value === 'false') return Promise.resolve(`\u26A0  |  Please use this command in a NSFW channel. Admins can enable NSFW with the command \`!setnsfw\``);
    let query;
    let array = suffix.split(' ');
    let lastTag = Number.parseInt(array[array.length-1]);
    let count = 1;
    if (suffix && Number.isInteger(lastTag)) {
      count = lastTag;
      if (count > 15) count = 10;
      if (count < 0) count = 1;
      let removeCount = R.slice(0, -1, array);
      let cleanSuffix = R.join(' ', removeCount);
      query = cleanSuffix.toLowerCase().replace('tags ', '');
    } else {
      query = suffix.toLowerCase().replace('tags ', '');
    }

    if (query == '') return Promise.resolve(`\u26A0  |  No tags were supplied`);
    let checkLength = query.split(' ');
    if (checkLength.length > 6) return Promise.resolve(`\u26A0  |  You can only search up to 6 tags`);

    const options = {
      url: `https://e621.net/post/index.json?tags=${query}`,
      qs: {
        limit: 300
      }
    };

    return Promise.resolve(R.repeat('tags', count))
      .map(() => {
    return _makeRequest(options)
      .then(body => {
        if (!body || typeof body === 'undefined' || body.length == 0) return Promise.resolve(`\u26A0  |  No results for: \`${query}\``);
        // Do some math
        let randomid = Math.floor(Math.random() * body.length);
        // Grab the data
        let id = body[randomid].id;
        let file = body[randomid].file_url;
        let artist = body[randomid].artist.join(', ');
        if (body[randomid].artist.length === 0) artist = 'Unknown';
        if (artist.length >= 40) artist = artist.substring(0, 40);
        if (artist.length >= 40) artist += '-...';
        let height = body[randomid].height;
        let width = body[randomid].width;
        let score = body[randomid].score;
        let embed = {
          color: 77399,
          author: {
            name: 'Searched: ' + query,
            icon_url: evt.message.author.avatarURL
          },
          url: 'https://e621.net/post/show/' + id,
          description: `**Artist(s):** ${artist}\n**Score:** ${score} | **Resolution: ** ${width} x ${height}`,
          image: { url: file }
        }
        return evt.message.channel.sendMessage('', false, embed);
      })
    })
  })
}

export default {
  e6: (client, evt, suffix, lang) => {
    const command = suffix.toLowerCase().split(' ')[0];
    /*if (command === 'latest') return latest(client, evt, suffix);*/
    if (command === 'tags') return tags(client, evt, suffix);
    if (command !== 'tags' || command !== 'latest') return tags(client, evt, suffix);
  }
};

export const help = {
  e6: {parameters: ['tags', 'number']}
};