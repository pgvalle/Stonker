const { db, sendMessage, addStockListener, fmtInvestment } = require('./core')

async function invest(user, args) {
    if (!args || args.length !== 3) {
        sendMessage(user, 'Wrong command syntax.')
        return
    }

    // TODO: validate inputs
    const stockMIC = args[0].toUpperCase()
    const value = Number(args[1])
    const diffValue = Number(args[2])
    const action = `
        INSERT OR REPLACE INTO investment (stockMIC, user, refStockPrice, value, lowValue, highValue)
        SELECT stock.MIC, ${user}, stock.price, ${value}, ${value}, ${value}+${diffValue}
        FROM stock WHERE stock.MIC = '${stockMIC}'
        RETURNING rowid`
    
    db.get(action, async (_, result) => {
        if (result) {
            await sendMessage(user, `You invested in ${stockMIC} stocks.`)
        } else {
            addStockListener(stockMIC)
            await sendMessage(user, `I was not aware of ${stockMIC}. Try again later.`)
        }
    })
}

async function dinvest(user, args) {
    var action = `DELETE FROM investment WHERE user = ${user}`
    var reply = 'Now all your investments are gone.'

    // args mean delete specified investments
    if (args) {
        const investments = `('` + args.join(`', '`).toUpperCase() + `')`
        action = `DELETE FROM investment WHERE stockMIC IN ${investments} AND user = ${user}`
        reply = 'Now those investments are gone.'
    }

    db.exec(action, async (_) => {
        await sendMessage(user, reply)
    })
}

async function linvest(user, args) {
    var action = `SELECT investment.*, stock.price FROM investment INNER JOIN stock
                  ON investment.stockMIC = stock.MIC WHERE investment.user = ${user}`
    var reply = 'Here are all your investments\n'

    // list of investments to look for
    if (args) {
        const stockMICs = `('` + args.join(`, `).toUpperCase() + `')`
        action = `SELECT investment.*, stock.price FROM investment INNER JOIN stock
                  ON investment.stockMIC = stock.MIC
                  WHERE investment.user = ${user} AND stock.MIC IN ${stockMICs}`
        reply = 'Here are the investments you asked\n'
    }

    db.all(action, async (_, joinResult) => {
        for (const row of joinResult) {
            reply += fmtInvestment(row, row.price)
        }

        await sendMessage(user, reply)
    })
}

async function stock(user, args) {
    var action = `SELECT * FROM stock`
    var reply = 'All stocks that I am aware of```\n'

    // list of stocks to look for
    if (args) {
        const stockMICs = `('` + args.join(`, `).toUpperCase() + `')`
        action = `SELECT * FROM stock WHERE MIC IN ${stockMICs}`
        reply = 'Stocks you wanted that I am aware of```\n'
    }

    db.all(action, async (_, stocks) => {
        for (const s of stocks) {
            const fmtMIC = s.MIC.padEnd(4, ' ')
            const fmtPrice = s.price.toFixed(2)
            reply += `${fmtMIC} : $${fmtPrice}\n`
        }

        await sendMessage(user, reply + '```')
    })
}

async function help(user, args) {
    if (args) {
        await sendMessage(user, 'Wrong command syntax.')
        return
    }

    const separator = '\n '
    const cmdsFmt = Object.keys(commands).join(separator)
    await sendMessage(user, `Commands:${separator}${cmdsFmt}`)
}

// exports

module.exports = {
    COMMAND_REGEX: /^\/(?<name>\S+)(?:\s+(?<args>.+))?$/,
    commands: {
        invest, linvest, dinvest, help, stock
    }
}