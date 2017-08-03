const express = require('express')
const router = express.Router()
const { Pool, Client } = require('pg');

/** @const {Pool} Postgres connection pool */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/', function (req, res) {
    pool.query("SELECT fbuser FROM vragenlijsten GROUP BY fbuser UNION SELECT fbuser FROM connect_nokia", result => {
        let users = [];
        result.rows.forEach(row => {
            users.push(row.fbuser);
        })
        res.render('index', { title: 'Hey', message: 'Hello there!', users: users });
    });
});

router.post('/', (req, res) => {
    let user = req.body.user;
    res.redirect('/' + user);
});

router.get('/:user', (res, req) => {
    let user = req.params.fbuser                        
    res.render('user', { user: user });

})

module.exports = router;