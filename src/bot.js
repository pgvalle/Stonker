const TelegramBot = require('node-telegram-bot-api'); // https://github.com/yagop/node-telegram-bot-api
const sock = require('stocksocket'); // https://github.com/gregtuc/StockSocket
const db = require('./db');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

var user = null;

// send message to user with markdown formatting
async function sendMsg(str) {
    await bot.sendMessage(user, str, { parse_mode: 'Markdown' });
}

// commands

const cmds = {};

cmds.a = (args) => {
    sendMsg("Not implemented yet");
}

cmds.d = (args) => {
    sendMsg("Not implemented yet");
}

cmds.l = (args) => {
    sendMsg("Not implemented yet");
}

cmds.i = (args) => {
    sendMsg("Not implemented yet");
}

// responding user

const MSG_REGEX = /^(?!\/\S).+/s;
const CMD_REGEX = /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/;

// respond to plain messages. Just repeat what the user says.
bot.onText(MSG_REGEX, (msg) => {
    if (!user) user = msg.chat.id;
    if (user != msg.chat.id) return;
    console.log('hello')
    sendMsg(msg.text);
});

// respond to commands defined
bot.onText(CMD_REGEX, (msg, match) => {
    if (!user) user = msg.chat.id;
    if (user != msg.chat.id) return;

    const cmdName = match.groups.name;
    const cmdArgs = match.groups.args?.split(' ') || [];
    const cmd = cmds[cmdName];

    if (cmd) {
        cmd(cmdArgs);
    } else {
        sendMsg(`What is ${cmdName}?`);
    }
});

(async () => {
    await db.init()

    // get all stocks stored in db and add their tickers
    const stocks = await db.getStocks();
    for (const stock in stocks) {
        sock.addTicker(stock.stockMIC, db.updateStock);
    }
})();
