const TelegramBot = require('node-telegram-bot-api'); // https://github.com/yagop/node-telegram-bot-api
const stonks = require('stocksocket') // https://github.com/gregtuc/StockSocket
const sqlite = require('sqlite3');

// create database file and table
const db = new sqlite.Database('./chats.db', sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE);
db.exec(`
  CREATE TABLE IF NOT EXISTS chat (
    id INT PRIMARY KEY NOT NULL
  )`
)

function checkAndSaveChat(chat, bot) {
  db.get(`SELECT * FROM chat WHERE id = ${chat.id}`, (error, row) => {
    // chat not saved, then save it
    if (row == undefined) {
      db.exec(`INSERT INTO chat (id) VALUES (${chat.id})`)
      bot.sendMessage(chat.id, 'Your Id was saved so that i can send you messages later');
    }
  })
}

// create telegram bot
const TELEGRAM_TK = ''
const bot = new TelegramBot(TELEGRAM_TK, { polling: true });

// configure bot
bot.on('message', (msg) => {
  checkAndSaveChat(msg.chat, bot)
});



/*

const bot = new TelegramBot(TELEGRAM_TK, { polling: true });
let chatId = -1




stonks.addTicker('TSLA', (data) => {
  const jsonText = JSON.stringify(data);
  bot.sendMessage(TELEGRAM_CHAT_ID, jsonText)
});
*/