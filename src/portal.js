const express = require('express')
const router = express.Router()
const { Pool, Client } = require('pg');

/** @const {Pool} Postgres connection pool */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/', function (req, res) {
    try {
        pool.query("SELECT fbuser FROM vragenlijsten GROUP BY fbuser UNION SELECT fbuser FROM connect_nokia").then(result => {
            let users = [];
            result.rows.forEach(row => {
                users.push(row.fbuser);
            })
            res.render('index', { title: 'Hey', message: 'Hello there!', users: users });
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }
});

router.post('/', (req, res) => {
    try {
        let user = req.body.user;
        res.redirect('/portal/' + user);
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }
});

router.get('/:user', (req, res) => {
    try {
        res.render('user');
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }
})

router.get('/:user/data', (req, res) => {
    let user = req.params.user;
    let userData = {};
    pool.query('SELECT *, (SELECT SUM(waarde) FROM antwoorden WHERE antwoorden.vragenlijst = vragenlijsten.id) FROM vragenlijsten WHERE fbuser = $1', [user]).then(result => {
        console.log(result);
        userData.lists = [];
        result.rows.forEach((row) => { userData.lists.push({x: row.gestart, y: row.sum}) });
        res.status(200).json(userData);
    });
});

module.exports = router;