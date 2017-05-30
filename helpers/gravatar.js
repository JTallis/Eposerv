const CryptoJS = require('crypto-js');

module.exports = (email, s = 32, d = 'mm', r = 'g') => {
    let md5 = CryptoJS.MD5(email.toLowerCase());

    return `https://gravatar.com/avatar/${md5}?s=${s}&d=${d}&r=${r}`;
}