var mysql = require('mysql');
var express = require('express');
var app = express();
var multer  = require('multer');
var fs = require('fs');
var randtoken = require('rand-token');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
var upload = multer({ storage: storage});
app.listen(7331);

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'dnnet'
});

connection.connect();

app.post('/upload', upload.single('file'), function (req, res) {
    if((req.header('dnKey') || req.file.originalname || req.body.target) == undefined) { // todo: does not work
        res.send('error');
    } else {
        var token = req.header('dnKey');
        var file = req.file.originalname;
        var target = req.body.target;
        addFile(token,file,target);
        res.send('ok');
    }
});

app.get('/register', function (req, res) {
    var username = req.query.username;
    userExists(username, function (result) {
       if(result) {
            res.send('username already taken.');
       } else {
            register(username,function (result) {
                res.send(result);
            });
       }
    });
});

app.get('/getFiles', function (req, res) {
    if((req.header('dnKey') || req.query.target) == undefined) { // todo: does not work
        res.send('error');
    } else {
        var target = req.query.target;
        getFiles(target, function (result) {
            res.send(result);
        });
    }
});

app.get('/download', function (req, res) {
    if((req.header('dnKey') || req.query.file) == undefined) { // todo: does not work
        res.send('error');
    } else {
        var file = req.query.file;
        res.sendFile(__dirname + '/uploads/' + file);
    }
});

function getUser(token, callback) {
    connection.query("SELECT * FROM users WHERE token='" + token + "';", function (error, results) {
        if(error) throw error;
        if(results == null)
            callback(null);
        var user = [];
        for(var i = 0; i < results.length; i++) {
            if(results[i].file != null) // todo: extract files to own table
                user.push({username:results[i].username,token:results[i].token,file:results[i].file,target:results[i].target});
        }
        callback(user);
    });
}

function addFile(token, file, target) {
    getUser(token, function (result) {
       if(result != null) {
           connection.query("INSERT INTO users (username,token,file,target) VALUES ('" + result.username + "', '" + token + "', '" + file + "','"+target + "');", function (error) {
               if(error) throw error;
           });
       }
    });
}

function userExists(username, callback) {
    connection.query("SELECT * FROM users WHERE username='" + username + "';", function (error, results) {
        if(error) throw error;
        if(results[0] != undefined) {
            callback(true);
        } else {
            callback(false);
        }
    });
}

function register(username, callback) {
    var token = randtoken.generate(16);
    connection.query("INSERT INTO users (username,token) VALUES ('"+username+"', '"+token+"');", function (error) {
        if(error) throw error;
        callback(token);
    });
}

function getFiles(target, callback) {
    connection.query("SELECT file FROM users WHERE target='"+target+"';", function (error, results) {
        if(error) throw error;
        var json = [];
        for(var i = 0; i < results.length; i++) {
            json.push(results[i].file);
        }
        callback(json);
    });
}