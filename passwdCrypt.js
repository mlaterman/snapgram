var crypto = require('crypto');

var key = '38#*1fGr'; // the private key for encrypt/decrypt
var algorithm = 'aes-256-cbc'; // the encrypt and decrypt algorithm

//take a plaintext passwd and return an encrypted string
function encrypt(passwd) {
    var cipher = crypto.createCipher(algorithm, key);
    var crypted = cipher.update(passwd, 'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}
//take a encrypted string and return a passwd
function decrypt(crypted) {
    var decipher = crypto.createDecipher(algorithm, key);
    var passwd = decipher.update(crypted, 'hex','utf8');
    passwd += decipher.final('utf8');
    return passwd;
}

module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
