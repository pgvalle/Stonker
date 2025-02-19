import { Database, OPEN_READWRITE, OPEN_CREATE } from 'sqlite3'
import { addTicker } from 'stocksocket'
import { notifyUsers } from './bot'

// creating database and tables

const db = new Database('./database.db', OPEN_READWRITE | OPEN_CREATE);

db.exec(`
        CREATE TABLE IF NOT EXISTS watcher (
                stockId      VARCHAR(8) NOT NULL,
                chat        INTEGER    NOT NULL,
                ref_price   REAL       NOT NULL,
                change      REAL       NOT NULL,
                change_step REAL       NOT NULL,
                PRIMARY KEY (stockId, chat)
        )`
)


db.exec(`
        CREATE TABLE IF NOT EXISTS stock (
                stockId VARCHAR(8) NOT NULL,
                price  REAL
        )`
)

// update respective stock watchers

function updateStockWatchers(stockId, newStockPrice) {
        const action = `
                UPDATE watcher SET change = CASE
                WHEN ?/ref_price-1 > change            THEN change+ref_change
                WHEN ?/ref_price-1 < change-ref_change THEN change-ref_change
                ELSE change
                END
                WHERE stockId == '?'
                RETURNING *`
        
        db.all(action, [newStockPrice, newStockPrice, stockId], (err, watchers) => {
                if (err) {
                        console.log(`watchers update failed. Code ${err.code}`)
                } else {
                        console.log(`watchers updated`)
                        notifyUsers(watchers, newStockPrice)
                }
        })
}

// update respective stock price

function updateStock(info) {
        const stockId = info.id
        const newStockPrice = info.price
        const action = `UPDATE stocks SET price = ? WHERE stockId = '?'`

        db.exec(action, [newStockPrice, stockId], (err) => {
                if (err) {
                        console.log(`${stockId} update failed. Code: ${err.code}`)
                } else {
                        console.log(`${stockId} updated to ${newStockPrice}`)
                        updateStockWatchers(stockId, newStockPrice)
                }
        })
}

// set stock update function for stocks that are saved in the database

const action = `SELECT stockId FROM stocks`

db.all(action, (err, rows) => {
        if (err) {
                console.log(`SQLite error with code ${err.code}`)
        } else {
                for (const { stockId } of rows) {
                        addTicker(stockId, updateStock)
                        console.log(`update callback for ${stockId} set`)
                }
        }
})

// exports

module.exports = {
        db, updateStock
}