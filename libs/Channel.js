const _ = require('lodash');
const connection = require('./connection');

class Channel {

    constructor (data) {
        this.key     = _.kebabCase(data.name);
        this.id      = data.id;
        this.name    = data.name;
        this.topic   = data.topic;

        this.clients   = [];
    }

    save (callback) {
        let data = [
            this.name,
            this.topic,
            this.id
        ];

        let promise = new Promise((resolve, reject) => {
            connection.query(`
                UPDATE client_channels
                SET name = ?
                    , topic = ?
                WHERE id = ?
            `, data)
                .then(result => resolve(result))
                .catch(error => reject(error));
        });
    }

    addUser (socketId) {
        if (!this.clients.includes(socketId)) {
            this.clients.push(socketId);
        }
    }

    removeUser (socketId) {
        let index = this.clients.indexOf(socketId);

        if (index > -1) {
            this.clients.splice(index, 1);
        }
    }

    static create (name) {
        let promise = new Promise((resolve, reject) => {
            connection.query(`
                INSERT into client_channels (name) VALUES (?)
            `, [name])
                .then(result => resolve(result))
                .catch(error => reject(error));
        });

        return promise;
    }

    // Preferably delete by ID
    static delete (name) {
        let promise = new Promise((resolve, reject) => {
            connection.query(`
                DELETE FROM client_channels WHERE name = ?
            `, [name])
                .then(result => resolve(result))
                .catch(error => reject(error));
        });

        return promise;
    }

    static getAll () {
        let promise = new Promise((resolve, reject) => {
            connection.query(`
                SELECT id, name, topic
                FROM client_channels
            `, [])
                .then(results => {
                    let channels = {};

                    for (let row of results) {
                        channels[_.kebabCase(row.name)] = new Channel(row);
                    }

                    resolve(channels)
                })
                .catch(error => reject(error));
        });

        return promise;
    }
}

module.exports = Channel;