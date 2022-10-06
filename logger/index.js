const winston = require('winston');

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
}

const level = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction ? 'http' : 'debug';
}

// const colors = {
//     error: 'red',
//     warn: 'yellow',
//     info: 'green',
//     http: 'magenta',
//     debug: 'white',
// }
// winston.addColors(colors)

const format = winston.format.combine(
    // winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => {
            if (info.stack && info.message) {
                return `${info.level}: ${info.message} \nstack: ${info.stack}`
            } else {
                return `${info.level}: ${info.message} ${info.tags ? 'tags: [\'' + info.tags + '\']' : ''}` 
            } 
        } ,
    ),
)

const transports = [
    new winston.transports.Console(),
]

const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
})

module.exports = { logger };