"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botRequest = void 0;
const worker_threads_1 = require("worker_threads");
const bot = new worker_threads_1.Worker('./lib/bot/worker.js');
const data = new Map();
let xid = 0;
bot.on('error', (err) => {
    console.error(`[bot] ${err}`);
});
bot.on('exit', () => {
    console.log('Bot exited');
});
bot.on('message', (msg) => {
    if (typeof msg === 'string') {
        console.log(`[bot] ${msg}`);
    }
    else if (typeof msg === 'object') {
        handleBot(msg);
    }
});
function handleBot(msg) {
    if (typeof msg.id !== 'undefined') {
        const request = data.get(msg.id);
        if (msg.error) {
            request === null || request === void 0 ? void 0 : request.promise.reject(msg.error);
        }
        else {
            request === null || request === void 0 ? void 0 : request.promise.resolve(msg.response);
        }
        data.delete(msg.id);
    }
}
function botRequest(req_data) {
    let pr_resolve = () => { };
    let pr_reject = () => { };
    const promise = new Promise((resolve, reject) => {
        pr_resolve = resolve;
        pr_reject = reject;
        setTimeout(reject, 500, 'Request to bot timed out.');
    });
    const seq = xid;
    xid++;
    const request = { id: seq, request: req_data };
    const pr_data = {
        promise: promise,
        resolve: pr_resolve,
        reject: pr_reject,
    };
    data.set(seq, { promise: pr_data, request: request });
    bot.postMessage(request);
    return promise;
}
exports.botRequest = botRequest;
