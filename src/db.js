import { Database, OPEN_READWRITE, OPEN_CREATE } from 'sqlite3'
import { addTicker } from 'stocksocket'

// creating database and tables

const db = new Database('./database.db', OPEN_READWRITE | OPEN_CREATE);

db.exec(`
        CREATE TABLE IF NOT EXISTS watcher (
                ticker      VARCHAR(8) NOT NULL,
                chat        INTEGER    NOT NULL,
                ref_price   REAL       NOT NULL,
                change      REAL       NOT NULL,
                change_step REAL       NOT NULL,
                PRIMARY KEY (ticker, chat)
        )`
)


db.exec(`
        CREATE TABLE IF NOT EXISTS stock (
                ticker VARCHAR(8) NOT NULL,
                price  REAL
        )`
)

// update respective stock watchers

function updateStockWatchers(stockId, newPrice, watchersUpdatedCallback) {
        const action = `
                UPDATE watcher SET change = CASE
                WHEN ?/ref_price-1 > change            THEN change+ref_change
                WHEN ?/ref_price-1 < change-ref_change THEN change-ref_change
                ELSE change
                END
                WHERE ticker == '?'
                RETURNING ticker, chat`
        
        db.all(action, [newPrice, newPrice, stockId], (err, watchers) => {
                if (err) {
                        console.log(`watchers update failed. Code ${err.code}`)
                } else {
                        console.log(`watchers updated`)
                        watchersUpdatedCallback(watchers) // TODO: where to pass this??? Where to place it???
                }
        })
        db.run()
}

// update respective stock price

function updateStock(info) {
        const { id, price } = info
        const action = `UPDATE stocks SET price = ? WHERE ticker = '?'`

        db.exec(action, [price, id], (err) => {
                if (err) {
                        console.log(`${id} update failed. Code: ${err.code}`)
                } else {
                        console.log(`${id} updated to ${price}`)
                        updateStockWatchers(id, price)
                }
        })
}

// set stock update function for stocks that are saved in the database

const action = `SELECT ticker FROM stocks`

db.all(action, (err, rows) => {
        if (err) {
                console.log(`SQLite error with code ${err.code}`)
        } else {
                for (const row of rows) {
                        addTicker(row.ticker, updateStock)
                        console.log(`${row.ticker} update callback set`)
                }
        }
})

// exports

module.exports = {
        db, updateStock
}