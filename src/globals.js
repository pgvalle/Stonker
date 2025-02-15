const TelegramBot = require('node-telegram-bot-api'); // https://github.com/yagop/node-telegram-bot-api
const sql = require('sqlite3')

const TELEGRAM_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'

const bot = new TelegramBot(TELEGRAM_TK, { polling: true });
const db = new sql.Database('./chats.db', sql.OPEN_READWRITE | sql.OPEN_CREATE);

const msgs = {
  DATA_SAVING_NOTICE: 'Our chat have an Id, and I saved it so that I can talk to you later',
  HELP: 'This should be the help text',
  INVALID_COMMAND: 'This command is invalid'
}

module.exports = {
  db, bot, msgs
}