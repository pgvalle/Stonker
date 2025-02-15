const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api
const { Database, OPEN_READWRITE, OPEN_CREATE } = require('sqlite3')

const TELEGRAM_TK = '8075711316:AAGaVXIGrthKWKsmnbtEAa4ocdLnw-qYLRY'

const bot = new TelegramBot(TELEGRAM_TK, { polling: true });
const db = new Database('./chats.db', OPEN_READWRITE | OPEN_CREATE);

const msgs = {
  // info
  DATA_SAVING_NOTICE: 'Our chat have an Id, and I saved it so that I can talk to you later',
  HELP: 'This should be the help text.',
  BYE_BYE: 'You deleted your id and settings. We hope to see you again... Bye...',
  FORGETFUL: 'You are not registered. You will not receive any notifications.',

  // errors
  INVALID_COMMAND: 'This command is invalid',
  WRONG_SYNTAX: 'Wrong command syntax'
}

module.exports = {
  db, bot, msgs
}