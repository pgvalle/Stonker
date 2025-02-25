const { db, queries } = require('./db')
const bot = require('./bot')
const stocks = require('./stocks')

const helps = {}
const commands = {}

helps.invest = `
/invest STOCK VALUE DIFF
\`\`\`
Simulate investment in STOCK.
VALUE must be >= 1.00.
DIFF must be > 0.00 (notification each time VALUE changes by DIFF).
STOCK must appear when you send a /stock STOCK
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
        await bot.sendMsg(user, 'Wrong command syntax.')
        return
    }

    const stockMIC = args[0].toUpperCase()
    const value = Number(args[1])
    const diff = Number(args[2])
    
    if (isNaN(value) || value < 1 || isNaN(diff) ||
        diff <= 0 || Number(diff.toFixed(2)) == 0)
    {
        await bot.sendMsg(user, 'The first value must be >= $1.00 and the second one > $0.00.')
        await bot.sendMsg(user, '*NOTE:* Only two decimals are used (e.g. 0.001 = $0.00).')
        return
    }
    
    // db.all(queries.ADD_OR_UDPATE_USER_INVESTMENT, {
    //     $user: user,
    //     $value: value,
    //     $rangeValue: diff,
    //     $stockMIC: stockMIC
    // }, async (err, result) => {
    //     console.log(result)
    //     if (!result) {
    //         stocks.addStockListener(stockMIC)
    //         const reply = `I watch stocks on demand, and I do not know ${stockMIC}.
    //                        Wait a couple seconds, then send a /stock ${stockMIC} to check if it appears.
    //                        And watch out for market hours, because`

    //         await bot.sendMsg(user, reply)
    //     } else {
    //         await bot.sendMsg(user, `You invested in ${stockMIC} stocks.`)
    //     }
    // })
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
    args.length = 8
    args = args.map((MIC) => {
        return MIC.toUpperCase()
    })

    db.each(queries.GET_USER_INVESTMENTS, {
        $user: user
    }, async (err, row) => {
        if (args.indexOf(row.stockMIC) == -1) {
            await bot.sendMsg(user, `${row.stockMIC} is not listed.`)
        } else {
            await bot.sendMsg(user, JSON.stringify(row))
        }
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
    var query = `DELETE FROM investment WHERE user = ${user} RETURNING rowid`
    var reply = 'Now all your investments are gone.'

    // delete specified investments
    if (args.length > 0) {
        const investments = `('` + args.join(`', '`).toUpperCase() + `')`
        query = `
            DELETE FROM investment WHERE stockMIC IN ${investments}
                AND user = ${user} RETURNING rowid`
        reply = 'Now those investments are gone.'
    }

    core.dbExecOrError('all', query, async (investments) => {
        if (investments.length == 0 && args.length == 0) {
            await bot.sendMsg(user, 'You have no investments to delete.')
        } else if (investments.length == 0 && args.length > 0) {
            await bot.sendMsg(user, 'You do not have those investments.')
        } else { // investments.length == args.length -> deleted all investments specified
            await bot.sendMsg(user, reply)
        }
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
    args.length = 8
    args = args.map((MIC) => {
        return MIC.toUpperCase()
    })

    db.all(queries.GET_STOCKS, async (err, rows) => {
        for (const row of rows) {
            const indexInArgs = args.indexOf(row.MIC)
            if (indexInArgs >= 0) {
                await bot.sendMsg(user, JSON.stringify(row))
                args.splice(indexInArgs, 1)
            }
        }

        args = args.join(', ')
        await bot.send
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
            await bot.sendMsg(user, help)
        }
    }
}

// exports

module.exports = commands