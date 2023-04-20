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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const oauth_1 = require("../lib/oauth");
const adapter_1 = require("../lib/adapter");
const qs_1 = __importDefault(require("qs"));
const router = express_1.default.Router();
router.get('/login', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { state, code } = typeof req.query === 'string' ? qs_1.default.parse(req.query) : req.query;
    const stateParam = state
        ? Array.isArray(state)
            ? state[0]
            : state.toString()
        : '';
    const codeParam = Array.isArray(code) ? code[0] : code;
    if (stateParam) {
        if (req.session) {
            req.session.state = stateParam;
        }
        else {
            req.session = { state: stateParam };
        }
    }
    let token;
    if (stateParam && codeParam) {
        const token = yield (0, oauth_1.requestToken)(stateParam.toString(), '').catch((err) => {
            next(err);
        });
        // Cache user.
        yield (0, oauth_1.queryUser)(stateParam.toString(), token).catch((err) => {
            next(err);
        });
    }
    res.redirect('/');
}));
router.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(req.cookies);
    const state_f = (_a = req.session) === null || _a === void 0 ? void 0 : _a.state;
    console.log(state_f);
    let user = null;
    let guilds = null;
    if (state_f) {
        const token = yield (0, oauth_1.requestToken)(state_f, '').catch((err) => {
            next(err);
        });
        user = yield (0, oauth_1.queryUser)(state_f, token).catch((err) => {
            next(err);
        });
    }
    if (user) {
        guilds = yield (0, adapter_1.botRequest)({ topic: 'GetGuilds', user_id: user.id }).catch((err) => {
            next(err);
        });
        console.log(guilds);
    }
    res.render('guilds', {
        title: 'Express',
        userdata: JSON.stringify(user),
        state: state_f,
        guilds: guilds,
        authUri: (0, oauth_1.makeDiscordUrl)(),
    });
}));
router.delete('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    let result = false;
    if ((_b = req.session) === null || _b === void 0 ? void 0 : _b.state) {
        const state = req.session.state;
        yield (0, oauth_1.revokeToken)(state).catch((err) => {
            next(err);
        });
        req.session.state = undefined;
        result = true;
    }
    res.send({ result: result });
}));
exports.default = router;
