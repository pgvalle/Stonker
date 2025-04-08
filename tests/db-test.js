const db = require('../src/db')
// const stocks = require('../src/stocks')

async function main() {
    await db.init()
    await db.addStock('hello')
    var a = await db.getStocks()
    console.log(a)
    await db.delStock('hello')
    a = await db.getStocks()
    console.log(a)
}

main()
