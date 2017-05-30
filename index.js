const Server = require('./libs/Server.js');
const config = require('./config');

class Bootstrap {
    constructor () {}

    static start () {
        Bootstrap.server = new Server();
        Bootstrap.server.listen(config.server.port);
    }
}

Bootstrap.server = null;

module.exports = Bootstrap;