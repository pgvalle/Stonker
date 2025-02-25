const { db, queries } = require('../src/db')
const stocks = require('../src/stocks')

db.serialize(() => {
    db.run(queries.CREATE_TABLES)

    db.each(queries.GET_STOCKS, (err, row) => {
        console.log(row)
    })
})