const bcrypt = require('bcrypt');

module.exports = {
  encryptPassword: async (plainPassword) => {
    return new Promise((resolve, reject) => {
      const salt = process.env.BCRYPT_SALT;
      bcrypt.genSalt(+salt, (err, salt) => {
        if (err) return reject(err);
        bcrypt.hash(plainPassword, salt, (err, res) => {
          (err ? reject(err) : resolve(res));
        });
      });
    });
  },
  checkPassword: async (plainPassword, hash) => {
    return new Promise((resolve, reject) => {
      bcrypt.compare(plainPassword, hash, (err, res) => {
        (err ? reject(err) : resolve(res));
      });
    });
  }
};