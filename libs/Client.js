const _        = require('lodash');
const handlers = require('./handlers.js');

// Helpers
const gravatar = require('../helpers/gravatar.js');

class Client {

    constructor (server, socket) {
        this.server = server;
        this.socket = socket;

        console.log(`${this.socket.id} connected.`);

        // Every client is a guest by default
        this.isGuest         = true;
        // To distinguish those who are authenticated
        this.isAuthenticated = false;
        // Client info
        this.username        = null;

        // Array of channels joined (by key)
        this.channels  = [];

        this.bindEvents();
    }

    bindEvents () {
        this.socket
            .on('message', (d) => this.onMessage(d))
            .on('error', (e) => this.onError(e))
            .on('close', () => this.onClose());
    }

    onMessage (message) {
        console.log(`${this.socket.id} message: ${message}`);

        let data = JSON.parse(message);

        if (data.type && handlers.hasOwnProperty(data.type)) {
            handlers[data.type](this, data);
        } else {
            this.sendError('Invalid message type.');
        }
    }

    onError (error) {
        console.log(`${this.socket.id} error: ${error.message}`)
    }

    onClose () {
        console.log(`${this.socket.id} disconnected.`);

        for (let channel of this.channels.slice(0)) {
            this.partChannel(channel);
        }

        delete this.server.clients[this.socket.id];
    }

    kill (msg = null) {
        this.resetUser();

        this.send({
            type: 'kill',
            msg: msg
        });

        this.socket.close();
    }

    send (data) {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }

        this.socket.send(data);
    }

    sendError (error) {
        handlers.error(this, {
            message: error
        });
    }

    joinChannel (channel) {
        if (!(channel in this.server.channels)) {
            this.sendError('Cannot join #${channel}.');
            return false;
        }

        if (this.channels.includes(channel)) {
            this.sendError('You are already in #${channel}.');
            return false;
        }

        this.server.channels[channel].addClient(this.socket.id);
        this.channels.push(channel);

        this.server.broadcastToChannel(channel, {
            type: 'join',
            channel: {
                key  : channel,
                name : this.server.channels[channel].name
            },
            client: {
                isGuest  : this.isGuest,
                username : this.username,
            }
        });

        this.send({
            type: 'clients',
            channel: channel,
            clients: _.map(this.server.channels[channel].clients, id => {
                let client = this.server.clients[id];

                return {
                    isGuest  : client.isGuest,
                    username : client.username,
                }
            })
        });

        return true;
    }

    partChannel (channel) {
        if (!this.channels.includes(channel)) {
            this.sendError('You are not in #${channel}.');
            return false;
        }

        this.server.channels[channel].removeClient(this.socket.id);
        this.channels.splice(this.channels.indexOf(channel), 1);

        let obj = {
            type: 'part',
            channel: {
                key: channel,
                name: this.server.channels[channel].name
            },
            client: {
                isGuest  : this.isGuest,
                username : this.username
            }
        };

        this.server.broadcastToChannel(channel, obj);
        this.send(obj);

        return true;
    }

    setGuest (data) {
        this.isGuest         = true;
        this.isAuthenticated = true;
        this.username        = data.username;

        this.send({
            type     : 'authenticated',
            isGuest  : this.isGuest,
            username : this.username
        });

        console.log(`${this.socket.id} authenticated as ${this.username}`);
    }

    setUser (data) {
        this.isGuest         = false;
        this.isAuthenticated = true;
        this.username        = data.username;

        this.send({
            type     : 'authenticated',
            isGuest  : this.isGuest,
            username : this.username
        });

        console.log(`${this.socket.id} authenticated as ${this.username}`);
    }

    resetUser () {
        for (let channel of this.channels.slice(0)) {
            this.partChannel(channel);
        }

        this.isGuest         = true;
        this.isAuthenticated = false;
    }
}

module.exports = Client;