const mysql  = require('mysql');
const config = require('../config');

let pool = mysql.createPool({
    host     : config.db.host,
    user     : config.db.user,
    password : config.db.password,
    database : config.db.database,
    port     : config.db.port
});

module.exports = {
    query() {
        let query_string = arguments[0];
        let params       = Array.prototype.slice.call(arguments, 1);

        let promise = new Promise((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    console.log(err);
                    return reject(new Error(err));
                }

                connection.query(query_string, params, (err, results) => {
                    connection.release();

                    if (err) {
                        console.log(err);
                        return reject(new Error(err));
                    }

                    return resolve(results);
                });
            });
        });

        return promise;
    }
}