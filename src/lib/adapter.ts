import { Worker } from 'worker_threads';

interface RequestData {
  id: number;
  request: any;
}

interface PromiseData {
  promise: Promise<any>;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

const bot: Worker = new Worker('./lib/bot/worker.js');

const data: Map<number, { promise: PromiseData; request: RequestData }> =
  new Map();
let xid = 0;

bot.on('error', (err: Error) => {
  console.error(`[bot] ${err}`);
});

bot.on('exit', () => {
  console.log('Bot exited');
});

bot.on(
  'message',
  (msg: string | { id: number; error?: Error; response?: any }) => {
    if (typeof msg === 'string') {
      console.log(`[bot] ${msg}`);
    } else if (typeof msg === 'object') {
      handleBot(msg);
    }
  },
);

function handleBot(msg: { id: number; error?: Error; response?: any }): void {
  if (typeof msg.id !== 'undefined') {
    const request = data.get(msg.id);
    if (msg.error) {
      request?.promise.reject(msg.error);
    } else {
      request?.promise.resolve(msg.response);
    }
    data.delete(msg.id);
  }
}

export function botRequest(req_data: any): Promise<any> {
  let pr_resolve: (value?: any) => void = () => {};
  let pr_reject: (value?: any) => void = () => {};

  const promise = new Promise((resolve, reject) => {
    pr_resolve = resolve;
    pr_reject = reject;
    setTimeout(reject, 500, 'Request to bot timed out.');
  });
  const seq = xid;
  xid++;
  const request: RequestData = { id: seq, request: req_data };
  const pr_data: PromiseData = {
    promise: promise,
    resolve: pr_resolve,
    reject: pr_reject,
  };
  data.set(seq, { promise: pr_data, request: request });
  bot.postMessage(request);
  return promise;
}
