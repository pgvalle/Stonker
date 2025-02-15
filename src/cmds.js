const globals = require('./globals')
const bot = globals.bot
const db = globals.db

function watch(args) {

}

function unwatch(args) {

}

function forget(args) {

}

module.exports = {
  REGEX: /^\/(\S+)(?:\s+(.+))?$/,
  COMMANDS: {
    watch, unwatch, forget
  },
}