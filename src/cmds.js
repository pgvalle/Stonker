const core = require('./core')

const helps = {}
const commands = {}

helps.start = `
/start
\`\`\`
Registers you as a user.
Takes no arguments.
\`\`\``

commands.start = async function (user, _) {
    const action = `INSERT OR REPLACE INTO user (id) SELECT ${user} 
                    WHERE NOT EXISTS (SELECT 1 FROM user WHERE id = ${user})
                    RETURNING rowid`
    
    core.dbExecOrError(action, async (inserted) => {
        if (inserted) {
            console.log(`new user ${user}`)
            await core.sendMsg(user, 'Welcome, user! Type /help to get useful info.')
        } else {
            await core.sendMsg(user, 'Bro, I already know you.')
        }
    })
}

helps.invest = `
/invest STOCK VALUE DIFF
\`\`\`
Simulate stock investment.
VALUE must be >= 1.00.
DIFF must be > 0.00 (notification each time VALUE changes by DIFF).
Reinvesting on the same stock overwrites the previous investment.
Only 2 decimals are used (e.g. 0.001 -> $0.00).
\`\`\`
Examples:
\`\`\`
/invest AMD 1 0.01
/invest AMD 1.00 1  # Overwrites previous investment
\`\`\``

commands.invest = async function (user, args) {
    if (args.length !== 3) {
        await core.sendMsg(user, 'Wrong command syntax.')
        return
    }

    await core.sendMsg(user, '*NOTE:* Only two decimal are used (e.g. 0.001 = $0.00).')

    const stockMIC = args[0].toUpperCase()
    const value = Number(args[1])
    const diff = Number(args[2])
    
    if (isNaN(value) || value < 1 || isNaN(diff) ||
        diff <= 0 || Number(diff.toFixed(2)) == 0)
    {
        await core.sendMsg(user, 'The first value must be >= $1.00 and the second one > $0.00.')
        return
    }
    
    const action = `
        INSERT OR REPLACE INTO investment (stockMIC, user, refStockPrice, value, lowValue, highValue)
        SELECT stock.MIC, ${user}, stock.price, ${value}, ${value}, ${value}+${diff}
        FROM stock WHERE stock.MIC = '${stockMIC}'
        RETURNING rowid`
    
    core.dbReturnOrError(action, async (result) => {
        if (result) {
            await core.sendMsg(user, `You invested in ${stockMIC} stocks.`)
        } else {
            core.addStockListener(stockMIC)
            await core.sendMsg(user, `I was not aware of ${stockMIC}. Try again later.`)
        }
    })
}

helps.linvest = `
/linvest \\[STOCK ...]
\`\`\`
Lists your investments in specified stocks.
If no arguments are provided, lists all investments.
\`\`\`
Examples:
\`\`\`
/linvest
/linvest AMD TSLA NVDA
\`\`\``

commands.linvest = async function (user, args) {
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

    core.dbReturnOrError(action, async (joinResult) => {
        for (const row of joinResult) {
            reply += core.fmtInvestment(row, row.price)
        }

        await core.sendMsg(user, reply)
    })
}

helps.dinvest = `
/dinvest \\[STOCK ...]
\`\`\`
Deletes your investments in specified stocks.
If no arguments are provided, deletes all investments.
\`\`\`
Examples:
\`\`\`
/dinvest
/dinvest AMD TSLA NVDA
\`\`\``

commands.dinvest = async function (user, args) {
    var action = `DELETE FROM investment WHERE user = ${user}`
    var reply = 'Now all your investments are gone.'

    // delete specified investments
    if (args.length > 0) {
        const investments = `('` + args.join(`', '`).toUpperCase() + `')`
        action = `DELETE FROM investment WHERE stockMIC IN ${investments} AND user = ${user}`
        reply = 'Now those investments are gone.'
    }

    db.exec(action, async () => {
        await core.sendMsg(user, reply)
    })
}

helps.stock = `
/stock \\[STOCK ...]
\`\`\`
Lists specified stocks and their last known prices.
If no arguments are provided, lists all tracked stocks.
I just know stocks that users have invested with /invest.
\`\`\`
Examples:
\`\`\`
/stock
/stock AMD TSLA NVDA
\`\`\``

commands.stock = async function (user, args) {
    var action = `SELECT * FROM stock`
    var reply = 'Here are all stocks that I am aware of```\n'

    // list of stocks to look for
    if (args.length > 0) {
        const stockMICs = `('` + args.join(`, `).toUpperCase() + `')`
        action = `SELECT * FROM stock WHERE MIC IN ${stockMICs}`
        reply = 'Here are the stocks you wanted to check```\n'
    }

    core.dbReturnOrError(action, async (stocks) => {
        for (const s of stocks) {
            const fmtMIC = s.MIC.padEnd(4, ' ')
            const fmtPrice = s.price.toFixed(2)
            reply += `${fmtMIC} : $${fmtPrice}\n`
        }

        await core.sendMsg(user, reply + '```')
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

commands.help = async function (user, args) {
    // if no arguments then list all commands
    if (args.length == 0) {
        args = Object.keys(commands)
    }

    for (const arg of args) {
        const help = helps[arg.toLowerCase()]
        if (help) {
            await core.sendMsg(user, help)
        }
    }
}

// exports

module.exports = commands