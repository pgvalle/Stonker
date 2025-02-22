const { db, sendMessage, addStockListener, fmtInvestment } = require('./core')

const helps = {}

helps.invest = `
/invest STOCK VALUE DIFF
\`\`\`
Simulate stock investment.
VALUE must be >= 1.00.
DIFF must be > 0.00.
DIFF is the gain/loss that triggers a notification.
Only 2 decimals are used (e.g. 0.001 = $0.00).
\`\`\`
Examples:
\`\`\`
  /invest AMD 1 1 # notify at $2.00 or $0.00
  /invest NVDA 3.00 0.01 # notify at $3.01 or $2.99
\`\`\``

async function invest(user, args) {
    if (args.length !== 3) {
        await sendMessage(user, 'Wrong command syntax.')
        return
    }

    await sendMessage(user, '*NOTE:* Only two decimal are used (e.g. 0.001 = $0.00).')

    const stockMIC = args[0].toUpperCase()
    const value = Number(args[1])
    const diff = Number(args[2])
    
    if (isNaN(value) || value < 1 || isNaN(diff) ||
        diff <= 0 || Number(diff.toFixed(2)) == 0)
    {
        await sendMessage(user, 'The first value must be >= $1.00 and the second one > $0.00.')
        return
    }
    
    const action = `
        INSERT OR REPLACE INTO investment (stockMIC, user, refStockPrice, value, lowValue, highValue)
        SELECT stock.MIC, ${user}, stock.price, ${value}, ${value}, ${value}+${diff}
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

helps.linvest = `
/linvest \\[STOCK ...]
\`\`\`
List your investments on specified stocks.
Zero arguments lists all investments.
\`\`\`
Examples:
\`\`\`
  /linvest
  /linvest AMD TSLA NVDA
\`\`\``

async function linvest(user, args) {
    var action = `SELECT investment.*, stock.price FROM investment INNER JOIN stock
                  ON investment.stockMIC = stock.MIC WHERE investment.user = ${user}`
    var reply = 'Here are all your investments\n'

    // list of investments to look for
    if (args.length > 0) {
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

helps.dinvest = `
/dinvest \\[STOCK ...]
\`\`\`
Delete your investments on specified stocks.
Zero arguments deletes all investments.
\`\`\`
Examples:
\`\`\`
  /dinvest
  /dinvest AMD TSLA NVDA
\`\`\``

async function dinvest(user, args) {
    var action = `DELETE FROM investment WHERE user = ${user}`
    var reply = 'Now all your investments are gone.'

    // delete specified investments
    if (args.length > 0) {
        const investments = `('` + args.join(`', '`).toUpperCase() + `')`
        action = `DELETE FROM investment WHERE stockMIC IN ${investments} AND user = ${user}`
        reply = 'Now those investments are gone.'
    }

    db.exec(action, async (_) => {
        await sendMessage(user, reply)
    })
}

helps.stock = `
/stock \\[STOCK ...]
\`\`\`
List specified stocks and their last known price.
Zero arguments lists all stocks.
I just know stocks that users have invested with /invest.
\`\`\`
Examples:
\`\`\`
  /stock
  /stock AMD TSLA NVDA
\`\`\``

async function stock(user, args) {
    var action = `SELECT * FROM stock`
    var reply = 'All stocks that I am aware of```\n'

    // list of stocks to look for
    if (args.length > 0) {
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

helps.help = + `
/help \\[COMMAND ...]
\`\`\`
Show help for specified commands.
Zero arguments shows all helps.
\`\`\`
Examples:
\`\`\`
  /help
  /help help stock
\`\`\``

async function help(user, args) {
    // if no arguments then list all commands
    if (args.length == 0) {
        args = Object.keys(commands)
    }

    for (const arg of args) {
        const help = helps[arg.toLowerCase()]
        if (help) {
            await sendMessage(user, help)
        }
    }
}

const commands = {
    invest, linvest, dinvest, stock, help
}

// exports

module.exports = commands