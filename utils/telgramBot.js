const Telegraf = require('telegraf');
const { logger } = require('../logger/index');

const bot = new Telegraf(process.env.T_BOT_API_TOKEN);

const options = {
    parse_mode: 'Markdown',
};

function getChatId (type) {
    const chats = {
        dev: process.env.T_CHAT_DEV,
        notify: process.env.T_CHAT_NOTIFY,
    };

    if (chats[type]) {
        return chats[type];
    } else {
        // throw new Error(`No such chat type - ${type}`);
    }
}

async function sendMessage(message, chatType) {
    try {
        const chatId = getChatId(chatType);
        await bot.telegram.sendMessage(chatId, message, options);
    } catch(err) {
        logger.error(err, err.message);
        throw err;
    }
}

exports.sendMessage = sendMessage;