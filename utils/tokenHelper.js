const jwt = require('jsonwebtoken');

module.exports = {
    createToken: async (data, isAdmin) => {
        const expiresIn = process.env.TOKEN_EXPIRES;
        const sesseionLifetime = isAdmin ? +expiresIn * 10 : +expiresIn;
        return await {
            token: jwt.sign(data, process.env.JWT_KEY, { expiresIn: sesseionLifetime }),
            expiresIn: sesseionLifetime
        }
        
    },
    createInfiniteToken: async (data) => {
        return await jwt.sign(data, process.env.JWT_KEY);
    },
    verifyToken: async (token) => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
                if (err) {
                    reject(err);
                }
                resolve(decoded);
            });
        });
    }
};