const _          = require('lodash');
const Bluebird   = require('bluebird');
const Joi        = require('joi');

Joi.validate = Bluebird.promisify(Joi.validate, Joi);

const connection = require('./connection');
const server     = require('../index.js').server;

console.dir(server.start);

module.exports = {

    authenticate (sender, data) {
        if (sender.authenticated === true) {
            return sender.sendError('You are already authenticated.');
        }

        let schema = Joi.object().keys({
            type     : 'authenticate',
            username : Joi.string(),
            token    : Joi.string().regex(/^[\d]+:[^\W_]+$/i),
        });

        Joi.validate(data, schema).then(value => {
            if (data.hasOwnProperty('username')) {
                let username = `guest_${data.username}`;

                if (server.findClientByUsername(username) === null) {
                    sender.setGuest({
                        username : username
                    });

                    sender.send({
                        type: 'channels',
                        channels: _.map(server.channels, (v) => {
                            return {
                                id    : v.id,
                                name  : v.name,
                                count : v.users.length
                            }
                        })
                    });
                }
                else {
                    sender.sendError('Username is not available.');
                }
            }
            else if (data.hasOwnProperty('token')) {
                [id, token] = data.token.split(':');

                sender.sendError('Token authentication not implemented.');

                /*connection.query(`
                    SELECT id,
                        username,
                        email,
                    FROM users
                    WHERE id = ?
                        AND chat_token = ?
                        AND active = 1
                    LIMIT 1
                `, [parseInt(id), token]).then(results => {
                    if (results.length === 0) {
                        return sender.sendError('Invalid authentication token.');
                    }

                    if (client = server.findClientById(results[0].id)) {
                        client.kill('You have authenticated with another client.');
                    }

                    sender.setUser(results[0]);

                    sender.send({
                        type: 'channels',
                        channels: _.map(server.channels, (v) => {
                            return {
                                id    : v.id,
                                name  : v.name,
                                count : v.users.length
                            }
                        })
                    });
                });*/
            }
            else {
                sender.sendError('Invalid authentication method.');
            }
        }).catch(err => {
            console.dir(err);
            sender.sendError('Insufficient parameters.');
        });
    },

    join (sender, data) {
        if (sender.isAuthenticated === false) {
            return sender.sendError('You are not authenticated.');
        }

        let schema = Joi.object().keys({
            type: 'join',
            channel: Joi.string().required()
        });

        Joi.validate(data, schema).then(val => {
            sender.joinChannel(data.channel);
        }).catch(err => {
            sender.sendError('Insufficient parameters.');
        });
    },

    part (sender, data) {
        if (sender.isAuthenticated === false) {
            return sender.sendError('You are not authenticated.');
        }

        let schema = Joi.object().keys({
            type: 'part',
            channel: Joi.string().required()
        });

        Joi.validate(data, schema).then(val => {
            sender.partChannel(data.channel);
        }).catch(err => {
            sender.sendError('Insufficient parameters.');
        });
    },

    message (sender, data) {
        if (sender.isAuthenticated === false) {
            return sender.sendError('You are not authenticated.');
        }

        let schema = Joi.object().keys({
            type: 'message',
            channel: Joi.string().required(),
            message: Joi.string().required()
        });

        Joi.validate(data, schema).then(val => {
            if (sender.channels.includes(data.channel) === false) {
                sender.sendError(`You are not in #${data.channel}.`);
            } else {
                sender.server.broadcastToChannel(data.channel, {
                    type    : 'message',
                    channel : data.channel,
                    user    : {
                        isGuest  : sender.isGuest,
                        username : sender.username,
                    },
                    message : data.message
                });
            }
        }).catch(err => {
            sender.sendError('Insufficient parameters.');
        });
    },

    error (sender, data) {
        sender.send(Object.assign(data, {type: 'error'}));
    }
}