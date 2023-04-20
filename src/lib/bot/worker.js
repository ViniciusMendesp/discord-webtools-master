// Require the necessary discord.js classes
import doteenv from 'dotenv';
const { parentPort } = require('worker_threads');
const { Client, Events, GatewayIntentBits } = require('discord.js');

doteenv.config()
const token = process.env.TOKEN;

const userdata = new Map();
const invalid_guilds = [];
// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
  ],
});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, (c) => {
  parentPort.postMessage(`Ready! Logged in as ${c.user.tag}`);

  c.guilds
    .fetch()
    .then((oauthGuilds) => {
      const promises = [];
      for (const oauthGuild of oauthGuilds.values()) {
        promises.push(oauthGuild.fetch());
      }
      return Promise.allSettled(promises);
    })
    .then((guild_promises) => {
      const guilds = [];
      for (const result of guild_promises.values()) {
        if (result.status == 'rejected') {
          continue;
        }
        guilds.push(result.value);
      }
      return guilds;
    })
    .then((guilds) => {
      const promises = [];
      for (const guild of guilds) {
        promises.push(guild.members.fetch());
      }
      return Promise.allSettled(promises);
    })
    .then((member_promises) => {
      for (const result of member_promises.values()) {
        if (result.status == 'rejected') {
          continue;
        }
        for (const member of result.value.values()) {
          if (!userdata.has(member.id)) {
            userdata.set(member.id, []);
          }
          userdata.get(member.id).push(member.guild.id);
        }
      }
    })
    .then(() => {
      parentPort.postMessage('Debug: Checking users');
      parentPort.postMessage(`${userdata.size} entries`);
      for (const [uid, sid] of userdata.entries()) {
        parentPort.postMessage(`uid: [${uid}] in ${sid}`);
      }
    })
    .finally(() => {
      parentPort.postMessage('Done with startup!');
    });
});

// guildMemberAdd
/* Emitted whenever a user joins a guild.
PARAMETER     TYPE               DESCRIPTION
member        GuildMember        The member that has joined a guild    */
client.addListener(Events.GuildMemberAdd, (member) => {
  const m_id = member.id;
  const g_id = member.guild.id;
  if (!userdata.has(m_id)) {
    userdata.set(m_id, []);
  }
  if (!userdata.get(m_id).includes(g_id)) {
    userdata.get(m_id).push(g_id);
  }
});

// guildMemberRemove
/* Emitted whenever a member leaves a guild, or is kicked.
PARAMETER     TYPE               DESCRIPTION
member        GuildMember        The member that has left/been kicked from the guild    */
client.addListener(Events.GuildMemberRemove, (member) => {
  const m_id = member.id;
  const g_id = member.guild.id;
  const guilds = userdata.get(m_id);
  if (guilds) {
    const index = guilds.indexOf(g_id);
    if (index > -1) {
      guilds.splice(index, 1);
    }
  }
});

// guildCreate
/* Emitted whenever the client joins a guild.
PARAMETER    TYPE         DESCRIPTION
guild        Guild        The created guild    */
client.addListener(Events.GuildCreate, (guild) => {
  const index = invalid_guilds.indexOf(guild.id);
  if (index > -1) {
    invalid_guilds.splice(index, 1);
  } else {
    client.guilds
      .fetch(guild.id)
      .then((fetch_guild) => {
        return fetch_guild.members.fetch();
      })
      .then((members) => {
        for (const member of members.values()) {
          if (!userdata.has(member.id)) {
            userdata.set(member.id, []);
          }
          userdata.get(member.id).push(member.guild.id);
        }
      });
  }
});

// guildDelete
/* Emitted whenever a guild is deleted/left.
PARAMETER    TYPE         DESCRIPTION
guild        Guild        The guild that was deleted    */
client.addListener(Events.GuildDelete, (guild) => {
  invalid_guilds.push(guild.id);
});

// client.addListener(Events.Debug, (e) => {
//   parentPort.postMessage(`Debug: ${e}`);
// });

client.addListener(Events.Error, (e) => {
  parentPort.postMessage(`Error: ${e}`);
});

function ready() {
  return client.isReady() && userdata.size > 0;
}

parentPort.on('message', (value) => {
  if (typeof value == 'string') {
    console.log(`[bot] ${value}`);
  } else if (typeof value == 'object') {
    // console.log(`[bot] ${JSON.stringify(value)}`);
    handleRequest(value);
  }
});

function getGuildData(resolve, reject, user_id) {
  const guilds = userdata.get(user_id);
  if (!guilds) {
    return reject('user is not in any valid guilds');
  }
  const guild_map = new Map();
  for (const guild_id of guilds) {
    if (invalid_guilds.includes(guild_id)) {
      continue;
    }
    const guild = client.guilds.cache.get(guild_id);
    if (!guild) {
      return reject(`cache error: Missing data for ${guild_id}`);
    }

    const guild_data = {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      banner: guild.banner,
      roles: guild.members.cache.get(user_id)?.roles.cache.keys(),
    };
    guild_map.set(guild_id, guild_data);
  }
  return resolve(guild_map);
}

function handleRequest(msg) {
  if (typeof msg.id == 'undefined') {
    return;
  }
  const promise = new Promise((resolve, reject) => {
    if (!ready()) {
      reject('client not ready');
    }
    const request = msg.request;
    switch (request.topic) {
      case 'GetGuilds':
        return resolve(userdata.get(request.user_id));
      case 'GetGuildData':
        return getGuildData(resolve, reject, request.user_id);
    }
    reject('Unknown API command');
  });
  promise
    .then((result) => {
      parentPort.postMessage({ id: msg.id, response: result });
    })
    .catch((reason) => {
      parentPort.postMessage({ id: msg.id, error: reason });
    });
}

client.login(token);
