const _       = require('lodash');
const Engine  = require('engine.io');

const Client  = require('./Client.js');
const Channel = require('./Channel.js');

class Server {

    constructor () {
        this.listener = null;
        this.clients  = {};
        this.channels = {}

        this.channelUpdateTimeout = null;

        Channel.getAll()
            .then(it => this.channels = it)
            .catch(error => {
                console.log('ERROR: Unable to get channels.');
                console.log(error);
            });
    }

    listen (port) {
        this.listener = Engine.listen(port);
        this.bindEvents();

        console.log('listening on ' + port + '...');

        this.updateChannelLists();
    }

    bindEvents () {
        this.listener.on('connection', (socket) => {
            this.clients[socket.id] = new Client(this, socket);
        });
    }

    broadcast (data, omit = null) {
        if (omit !== null && typeof omit === 'string') {
            omit = [omit];
        }

        for (let [id, client] of Object.entries(this.clients)) {
            if (omit !== null && omit.includes(id)) {
                continue;
            }

            client.send(data);
        }
    }

    broadcastToChannel (channel, data, omit = null) {
        if (!(channel in this.channels)) {
            console.log(`Error: #${channel} does not exist.`);
            return;
        }

        if (omit !== null && typeof omit === 'string') {
            omit = [omit];
        }

        for (let id of this.channels[channel].clients) {
            if (omit !== null && omit.includes(id)) {
                continue;
            }

            if (id in this.clients) {
                this.clients[id].send(data);
            }
        }
    }

    broadcastToSelection (selection, data) {
        for (let id of selection) {
            if (id in this.clients) {
                this.clients[id].send(data);
            }
        }
    }

    // This is sent every 5 minutes to update
    // channel lists for everyone
    updateChannelLists () {
        clearTimeout(this.channelUpdateTimeout);

        this.broadcast({
            type: 'channels',
            channels: _.map(this.channels, (v) => {
                return {
                    id    : v.id,
                    name  : v.name,
                    count : v.clients.length
                }
            })
        });

        this.channelUpdateTimeout = setTimeout(
            () => this.updateChannelLists(),
            5 * 60 * 1000
        );
    }

    findClientBy (field, value) {
        for (let [id, client] of Object.entries(this.clients)) {
            if (client[field] === value) {
                return client;
            }
        }

        return null;
    }

    findClientById (userId) {
        return this.findClientBy('id', userId);
    }

    findClientByUsername (username) {
        return this.findClientBy('username', username);
    }
}

module.exports = Server;