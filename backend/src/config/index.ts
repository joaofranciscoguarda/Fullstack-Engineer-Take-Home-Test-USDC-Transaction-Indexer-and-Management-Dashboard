import queue from './queue.config';
import staticConfig from './static.config';
import blockchain from './blockchain.config';
import worker from './worker.config';

export default async () => {
  return {
    queue: await queue(),
    static: await staticConfig(),
    blockchain: await blockchain(),
    worker: await worker(),
  };
};
