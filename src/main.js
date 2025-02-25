const { db, queries } = require('./db')
const bot = require('./bot')
const cmds = require('./cmds')

bot.onCmd(async (msg, match) => {
    const user = msg.chat.id
    const name = match.groups.name.toLocaleLowerCase()
    const args = match.groups.args?.split(' ') || []
    const cmd = cmds[name]
    
    if (cmd) {
        await cmd(user, args)
    } else {
        await bot.sendMsg(user, `What the heck is ${name}? Send a /help bro.`)
    }
})

bot.onPlainMsg(async (msg) => {
    await bot.sendMsg(msg.chat.id, msg.text)
})