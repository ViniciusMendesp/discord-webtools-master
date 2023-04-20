import express, { Request, Response, NextFunction, Router } from 'express';
import {
  queryUser,
  requestToken,
  revokeToken,
  makeDiscordUrl,
} from '../lib/oauth';
import { botRequest } from '../lib/adapter';
import qs from 'qs';

const router: Router = express.Router();

type Token = any;

router.get(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    const { state, code } =
      typeof req.query === 'string' ? qs.parse(req.query) : req.query;
    const stateParam = state
      ? Array.isArray(state)
        ? state[0]
        : state.toString()
      : '';
    const codeParam = Array.isArray(code) ? code[0] : code;

    if (stateParam) {
      if (req.session) {
        req.session.state = stateParam;
      } else {
        req.session = { state: stateParam };
      }
    }

    let token: Token | undefined;
    if (stateParam && codeParam) {
      const token = await requestToken(stateParam.toString(), '').catch(
        (err: Error) => {
          next(err);
        },
      );
      // Cache user.
      await queryUser(stateParam.toString(), token as Token | undefined).catch(
        (err: Error) => {
          next(err);
        },
      );
    }
    res.redirect('/');
  },
);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  console.log(req.cookies);

  const state_f = req.session?.state;
  console.log(state_f);

  let user: any = null;
  let guilds: any = null;
  if (state_f) {
    const token = await requestToken(state_f, '').catch((err: Error) => {
      next(err);
    });
    user = await queryUser(state_f, token as Token | undefined).catch(
      (err: Error) => {
        next(err);
      },
    );
  }
  if (user) {
    guilds = await botRequest({ topic: 'GetGuilds', user_id: user.id }).catch(
      (err: Error) => {
        next(err);
      },
    );
    console.log(guilds);
  }

  res.render('guilds', {
    title: 'Express',
    userdata: JSON.stringify(user),
    state: state_f,
    guilds: guilds,
    authUri: makeDiscordUrl(),
  });
});

router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  let result = false;
  if (req.session?.state) {
    const state = req.session.state;
    await revokeToken(state).catch((err: Error) => {
      next(err);
    });
    req.session.state = undefined;
    result = true;
  }
  res.send({ result: result });
});

export default router;
