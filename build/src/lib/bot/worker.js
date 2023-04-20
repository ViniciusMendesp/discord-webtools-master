"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Require the necessary discord.js classes
const dotenv_1 = __importDefault(require("dotenv"));
const { parentPort } = require('worker_threads');
const discord_js_1 = require("discord.js");
dotenv_1.default.config();
const token = process.env.TOKEN;
const userdata = new Map();
const invalid_guilds = ([] = []);
// Create a new client instance
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildScheduledEvents,
    ],
});
// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(discord_js_1.Events.ClientReady, (c) => {
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
client.addListener(discord_js_1.Events.GuildMemberAdd, (member) => {
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
client.addListener(discord_js_1.Events.GuildMemberRemove, (member) => {
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
client.addListener(discord_js_1.Events.GuildCreate, (guild) => {
    const index = invalid_guilds.indexOf(guild.id);
    if (index > -1) {
        invalid_guilds.splice(index, 1);
    }
    else {
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
client.addListener(discord_js_1.Events.GuildDelete, (guild) => {
    invalid_guilds.push(guild.id);
});
// client.addListener(Events.Debug, (e) => {
//   parentPort.postMessage(`Debug: ${e}`);
// });
client.addListener(discord_js_1.Events.Error, (e) => {
    parentPort.postMessage(`Error: ${e}`);
});
function ready() {
    return client.isReady() && userdata.size > 0;
}
parentPort.on('message', (value) => {
    if (typeof value == 'string') {
        console.log(`[bot] ${value}`);
    }
    else if (typeof value == 'object') {
        // console.log(`[bot] ${JSON.stringify(value)}`);
        handleRequest(value);
    }
});
function getGuildData(resolve, reject, user_id) {
    var _a;
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
            roles: (_a = guild.members.cache.get(user_id)) === null || _a === void 0 ? void 0 : _a.roles.cache.keys(),
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
