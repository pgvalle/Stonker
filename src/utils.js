const globals = require('./globals')
const db = globals.db

function chatQueryCallback(id, callback) {
  db.get(`SELECT * FROM chat WHERE id == ${id}`, callback)
}

module.exports = {
  chatQueryCallback
}