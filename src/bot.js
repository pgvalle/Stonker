const TelegramBot = require('node-telegram-bot-api') // https://github.com/yagop/node-telegram-bot-api

const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, {
    polling: true
})

var user = undefined

// send message with markdown formatting
function sendMsg(str) {
    bot.sendMessage(user, str, {
        parse_mode: 'Markdown'
    })
}

function setResponses(cmds) {
    // Only answer to one user
    bot.on('message', (msg, _) => {
        const newUser = msg.chat.id

        if (!user) {
            user = newUser
            sendMsg('Mommyyyyyyyyyyyyyyy.')
        } else if (user != newUser) {
            sendMsg('Mommy! A stranger tried to talk to me.')
        }
    })

    // if the message is not a command, send it back
    bot.onText(/^(?!\/\S).+/s, (msg, _) => {
        sendMsg(msg.text)
    })

    // Respond to given commands
    bot.onText(/^\/(\S+)(?:\s+(.+))?$/, (msg, match) => {
        const name = match[1]
        const args = match[2]?.split(' ') || []
        const cmd = cmds[name]

        if (cmd) {
            cmd(args)
        } else {
            sendMsg('I dont know that command')
        }
    })
}

module.exports = {
    sendMsg, setResponses
}