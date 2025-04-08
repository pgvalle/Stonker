const { db, queries } = require('../src/db')
// const stocks = require('../src/stocks')

db.serialize(() => {
    db.run(queries.ADD_STOCK, { $MIC: "Hello" })
})
