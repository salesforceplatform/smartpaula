
const express = require('express')
const router = express.Router()
const { Pool, Client } = require('pg');

const Facebook = require('./facebook');

const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

/** @const {Pool} Postgres connection pool */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** @const {Facebook} Facebook API interface */
const facebook = new Facebook(FB_VERIFY_TOKEN, FB_PAGE_ACCESS_TOKEN);

function getUser(rows, callback, onComplete) {
    console.log(rows, rows.length);
    if (rows.length) {
        let user = rows.shift();
        facebook.getProfile(user.fbuser, (profile) => { profile.id = user.fbuser; callback(profile); getUser(rows, callback, onComplete) });
    } else {
        onComplete()
    }
}

function getAllUsers(callback) {
    pool.query("SELECT fbuser FROM vragenlijsten GROUP BY fbuser UNION SELECT fbuser FROM connect_nokia UNION SELECT fbuser FROM connect_wunderlist")
        .then(result => {
            let users = [];
            getUser(result.rows,
                (profile) => {
                    console.log(profile);
                    users.push({ id: profile.id, name: profile.first_name + ' ' + profile.last_name });
                },
                () => {
                    callback(users)
                });
        });
}

router.get('/', function (req, res) {
    try {
        getAllUsers((users) => {
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
    pool.query('SELECT *, to_char(timezone(\'zulu\', to_timestamp(date_part(\'epoch\', vragenlijsten.gestart))),\'YYYY-MM-DDThh24:MI:SSZ\') as date, (SELECT SUM(waarde) FROM antwoorden WHERE antwoorden.vragenlijst = vragenlijsten.id) FROM vragenlijsten WHERE fbuser = $1', [user]).then(result => {
        console.log(result);
        userData.lists = { data: [] };
        result.rows.forEach((row) => {
            if (row.date && row.sum) {
                userData.lists.data.push({ x: row.date, y: row.sum })
            }
        });
        pool.query('SELECT *, to_char(timezone(\'zulu\', to_timestamp(date_part(\'epoch\', antwoorden.antwoord_op))),\'YYYY-MM-DDThh24:MI:SSZ\') as date FROM antwoorden LEFT JOIN vragenlijsten ON antwoorden.vragenlijst = vragenlijsten.id WHERE vragenlijsten.fbuser = $1 ORDER BY antwoorden.antwoord_op ASC', [user]).then(result => {
            userData.questions = { data: [] };
            result.rows.forEach((row) => {
                if (!(row.vraag in userData.questions.data)) {
                    userData.questions.data[row.vraag] = {
                        data: [],
                        label: row.vraag
                    }
                }

                userData.questions.data[row.vraag].data.push({ x: row.date, y: row.waarde })

            });

            userData.questions.data = Object.keys(userData.questions.data).map(function (key) { return userData.questions.data[key] })

            pool.query('SELECT *, to_char(timezone(\'zulu\', to_timestamp(date_part(\'epoch\', measure_blood.measure_date))),\'YYYY-MM-DDThh24:MI:SSZ\') as date FROM measure_blood WHERE fbuser = $1 ORDER BY measure_date ASC', [user]).then((result) => {
                userData.blood = {};
                userData.blood.systolic = [];
                userData.blood.diastolic = [];
                userData.blood.pulse = [];
                result.rows.forEach(row => {
                    if (row.systolic) {
                        userData.blood.systolic.push({ x: row.date, y: row.systolic });
                    }
                    if (row.diastolic) {
                        userData.blood.diastolic.push({ x: row.date, y: row.diastolic });
                    }
                    if (row.pulse) {
                        userData.blood.pulse.push({ x: row.date, y: row.pulse });
                    }
                });
                pool.query('SELECT *, to_char(timezone(\'zulu\', to_timestamp(date_part(\'epoch\', measure_weight.measure_date))),\'YYYY-MM-DDThh24:MI:SSZ\') as date FROM measure_weight WHERE fbuser = $1 ORDER BY measure_date ASC', [user]).then(result => {
                    userData.weight = { data: [] };
                    result.rows.forEach(row => {
                        if (row.weight) {
                            userData.weight.data.push({ x: row.date, y: row.weight });
                        }
                    })
                    res.status(200).json(userData);
                });
            });
        });

    });
});

module.exports = router;