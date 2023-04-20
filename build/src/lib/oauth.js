"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryUser = exports.revokeToken = exports.requestToken = exports.verifyToken = exports.makeDiscordUrl = void 0;
const url_1 = require("url");
const undici_1 = require("undici");
const storage_1 = require("./storage");
const config_json_1 = require("../../config.json");
const clientSecret = process.env.CLIENTSECRET;
function makeDiscordUrl() {
    const url = 'https://discord.com/api/oauth2/authorize?';
    const params = new url_1.URLSearchParams({
        client_id: config_json_1.clientId,
        redirect_uri: config_json_1.address,
        response_type: 'code',
        scope: 'identify',
    }).toString();
    return url + params;
}
exports.makeDiscordUrl = makeDiscordUrl;
function verifyToken(object) {
    return (object != null &&
        typeof object.access_token === 'string' &&
        typeof object.expires_in === 'number' &&
        typeof object.refresh_token === 'string');
}
exports.verifyToken = verifyToken;
function discordTokenRequest(state, req_dict) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokenResponseData = yield (0, undici_1.request)('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new url_1.URLSearchParams(Object.assign({ client_id: config_json_1.clientId, client_secret: clientSecret }, req_dict)).toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const token = yield tokenResponseData.body.json();
            if (verifyToken(token)) {
                const with_expires = Object.assign(Object.assign({}, token), { expires_at: Math.floor(Date.now() / 1000) + token.expires_in });
                (0, storage_1.setItem)(state, with_expires);
                return token;
            }
            else {
                console.error(token);
            }
        }
        catch (error) {
            // NOTE: An unauthorized token will not throw an error
            // tokenResponseData.statusCode will be 401
            console.error(error);
        }
    });
}
function requestToken(state, code) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = (0, storage_1.getItem)(state, 'token');
        if (token != null && verifyToken(token)) {
            const tomorrow = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
            if (token.expires_at < tomorrow) {
                return yield refreshToken(state, token.refresh_token);
            }
            return token;
        }
        if (!code) {
            return;
        }
        const req_dict = {
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: config_json_1.address,
            scope: 'identify',
        };
        return yield discordTokenRequest(state, req_dict);
    });
}
exports.requestToken = requestToken;
function refreshToken(state, refresh_token) {
    return __awaiter(this, void 0, void 0, function* () {
        const req_dict = {
            grant_type: 'refresh_token',
            refresh_token: refresh_token,
        };
        return yield discordTokenRequest(state, req_dict);
    });
}
function revokeToken(state) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = (0, storage_1.getItem)(state, 'token');
        if (!token) {
            return;
        }
        try {
            const revokeData = yield (0, undici_1.request)('https://discord.com/api/oauth2/token/revoke', {
                method: 'POST',
                body: new url_1.URLSearchParams({
                    client_id: config_json_1.clientId,
                }).toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            console.log(revokeData);
        }
        finally {
            (0, storage_1.remove)(state);
        }
    });
}
exports.revokeToken = revokeToken;
function verifyUser(user) {
    // verification logic goes here
    return true;
}
function queryUser(state, token, oauthData) {
    return __awaiter(this, void 0, void 0, function* () {
        const cache_user = (0, storage_1.getItem)(state, 'userdata');
        if (cache_user != null && verifyUser(cache_user)) {
            return cache_user;
        }
        if (!oauthData) {
            return undefined;
        }
        try {
            const userResponseData = yield (0, undici_1.request)('https://discord.com/api/users/@me', {
                headers: {
                    authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                },
                method: 'GET',
            });
            const user = (yield userResponseData.body.json());
            if (verifyUser(user)) {
                (0, storage_1.setItem)(state, { userdata: user });
                return user;
            }
            else {
                console.error(user);
            }
        }
        catch (error) {
            console.error(error);
        }
    });
}
exports.queryUser = queryUser;
