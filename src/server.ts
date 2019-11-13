import { createServer } from "net";
import * as bunyan from "bunyan";
import * as fs from "fs";
import { EventEmitter } from "events";

if (!fs.existsSync("log")) {
  fs.mkdirSync("log");
}

export const logger = bunyan.createLogger({
  name: "mockup-core",
  streams: [{
    type: "rotating-file",
    period: "1d",
    count: 3,
    path: "log/mockup-core.log"
  }]
});

const cifs = {
  10001: {
    name: 'Adi',
    savings: ['1000000001', '1000000002']
  }
};

const savings = {
  1000000001: {
    balance: '10000000.05'
  },
  1000000002: {
    balance: '5000000'
  }
};

const transactions = [
  {
    ref: "0001",
    time: new Date(),
    source: '1000000001',
    target: '2000000001',
    type: 'transfer',
    amount: '5000',
    note: 'note 1'
  }, {
    ref: "0002",
    time: new Date(),
    source: '1000000001',
    target: '2000000001',
    type: 'transfer',
    amount: '5000',
    note: 'note 2'
  }, {
    ref: "0003",
    time: new Date(),
    source: '1000000001',
    target: '2000000001',
    type: 'transfer',
    amount: '5000',
    note: 'note 3'
  }, {
    ref: "0004",
    time: new Date(),
    source: '1000000001',
    target: '2000000001',
    type: 'transfer',
    amount: '5000',
    note: 'note 4'
  }
];

const events = new EventEmitter();

events.on("message", (socket, connId, req) => {
  logger.info({
    socket: {
      type: 'mockup',
      event: 'receive',
      connId,
      messageType: req.command,
      [`message_${req.command || '_unknown'}`]: req
    }
  }, "socket");
  if (req.command === 'echo') {
    socket.write(JSON.stringify(req));
    socket.write("\n");
  } else if (req.command === 'cif') {
    const cif = cifs[req.cif];
    if (cif) {
      socket.write(JSON.stringify({ ...req, ...cif }));
    } else {
      socket.write(JSON.stringify({ ...req, name: `USER ${req.cif}`, savings: [] }));
    }
    socket.write("\n");
  } else if (req.command === 'saving') {
    socket.write(JSON.stringify({
      ...req,
      ...savings[req.id],
      cif: Object.entries(cifs).map(([k, v]) => {
        if (v.savings.indexOf(req.id) >= 0) {
          return k;
        }
        return null;
      }).filter(v => v)[0]
    }));
    socket.write("\n");
  } else if (req.command === 'trx') {
    socket.write(JSON.stringify({
      ...req,
      transactions: transactions.filter(v => v.source === req.id || v.target === req.id)
    }));
    socket.write("\n");
  } else {
    logger.error({ req }, "invalid message");
    socket.end();
  }
});

export const server = createServer(socket => {
  const connId = `${socket.remoteAddress}:${socket.remotePort}-${socket.localPort}`;
  logger.info({ socket: { type: 'mockup', event: 'accept', connId } }, "socket");
  let buf = Buffer.from([]);
  socket.on('data', data => {
    logger.info({ socket: { type: 'mockup', event: 'data', connId, data: data.toString('utf8') } }, "socket");
    buf = Buffer.concat([buf, data], buf.length + data.length);
    let ix = buf.indexOf('\n');
    while (ix >= 0) {
      const msg = JSON.parse(buf.slice(0, ix).toString('utf8'));
      events.emit("message", socket, connId, msg);
      logger.info({
        socket: {
          type: 'mockup',
          event: 'receive',
          connId,
          messageType: msg.command,
          [`message_${msg.command || '_unknown'}`]: msg
        }
      }, "socket");
      buf = buf.slice(ix + 1);
      ix = buf.indexOf('\n');
    }
  });
  socket.on('close', () => {
    logger.info({ socket: { type: 'mockup', event: 'close', connId } }, "socket");
  });
}).listen(9000, "0.0.0.0");
