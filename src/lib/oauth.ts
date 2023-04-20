import { URLSearchParams } from 'url';
import { request } from 'undici';

import { setItem, getItem, remove } from './storage';
import { clientId, address } from '../../config.json';

const clientSecret = process.env.CLIENTSECRET;

interface Token {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

interface TokenWithExpires extends Token {
  expires_at: number;
}

interface OAuthData {
  token_type: string;
  access_token: string;
}

interface User {
  id: string;
  username: string;
  discriminator: string;
}

export function makeDiscordUrl(): string {
  const url = 'https://discord.com/api/oauth2/authorize?';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: address,
    response_type: 'code',
    scope: 'identify',
  }).toString();
  return url + params;
}

export function verifyToken(object: any): object is Token {
  return (
    object != null &&
    typeof object.access_token === 'string' &&
    typeof object.expires_in === 'number' &&
    typeof object.refresh_token === 'string'
  );
}

async function discordTokenRequest(
  state: string,
  req_dict: Record<string, string>,
): Promise<Token | undefined> {
  try {
    const tokenResponseData = await request(
      'https://discord.com/api/oauth2/token',
      {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret!,
          ...req_dict,
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const token = await tokenResponseData.body.json();

    if (verifyToken(token)) {
      const with_expires: TokenWithExpires = {
        ...token,
        expires_at: Math.floor(Date.now() / 1000) + token.expires_in,
      };
      setItem(state, with_expires);
      return token;
    } else {
      console.error(token);
    }
  } catch (error) {
    // NOTE: An unauthorized token will not throw an error
    // tokenResponseData.statusCode will be 401
    console.error(error);
  }
}

export async function requestToken(
  state: string,
  code: string,
): Promise<Token | undefined> {
  const token = getItem(state, 'token') as TokenWithExpires | undefined;
  if (token != null && verifyToken(token)) {
    const tomorrow = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    if (token.expires_at < tomorrow) {
      return await refreshToken(state, token.refresh_token);
    }
    return token;
  }
  if (!code) {
    return;
  }
  const req_dict = {
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: address,
    scope: 'identify',
  };
  return await discordTokenRequest(state, req_dict);
}

async function refreshToken(
  state: string,
  refresh_token: string,
): Promise<Token | undefined> {
  const req_dict = {
    grant_type: 'refresh_token',
    refresh_token: refresh_token,
  };
  return await discordTokenRequest(state, req_dict);
}

export async function revokeToken(state: string): Promise<void> {
  const token = getItem(state, 'token');
  if (!token) {
    return;
  }
  try {
    const revokeData = await request(
      'https://discord.com/api/oauth2/token/revoke',
      {
        method: 'POST',
        body: new URLSearchParams({
          client_id: clientId,
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    console.log(revokeData);
  } finally {
    remove(state);
  }
}

interface User {
  id: string;
  username: string;
  discriminator: string;
}

function verifyUser(user: User): boolean {
  // verification logic goes here
  return true;
}

export async function queryUser(
  state: string,
  token?: Token,
  oauthData?: OAuthData,
): Promise<User | undefined> {
  const cache_user = getItem(state, 'userdata') as User | null;
  if (cache_user != null && verifyUser(cache_user)) {
    return cache_user;
  }

  if (!oauthData) {
    return undefined;
  }

  try {
    const userResponseData = await request(
      'https://discord.com/api/users/@me',
      {
        headers: {
          authorization: `${oauthData.token_type} ${oauthData.access_token}`,
        },
        method: 'GET',
      },
    );
    const user = (await userResponseData.body.json()) as User;
    if (verifyUser(user)) {
      setItem(state, { userdata: user });
      return user;
    } else {
      console.error(user);
    }
  } catch (error) {
    console.error(error);
  }
}
