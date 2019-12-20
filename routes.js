//pg_ctl -D /postgresql/data start
let jwt = require('jsonwebtoken');
const secretKey = "myTestSecretKey";
const fileLoad = require('./files');
const path = require('path');
const fs = require('fs');

const WebSocketClient  = require('websocket').client;

module.exports = function(app, db) {
    app.use(function(req, res, next) {
       // if(process.env.DATABASE_URL){
            res.header("Access-Control-Allow-Origin", "https://photogalleryvika.herokuapp.com");
        // }
        // else{           
        //      res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        // }
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Athorization");
        if (['/gallery/create', '/gallery/update', '/gallery/delete'].includes(req.originalUrl)) {
            let object = convertToObj(req.body);
            
            console.log(req.body);
            jwt.verify(object.token, secretKey, async function(err, decoded) {
                if (err) return res.send(false);
                if (!decoded.isAdmin) return res.send(false);
                next();
            });
        }
        else {
            next();
        }
    });

    app.get('/test', (req, res) => {
        res.send(process.env.DATABASE_URL);
    });

    app.post('/gallery', async (req, res) => {       
        console.log("gallery");
        let object = convertToObj(req.body);
        object = object.data;
        if (object == null || object.findText == null) object = {findText: ''};
        let photos = await db.sequelize.query(`SELECT * FROM searchInPhotos('${object.findText}');`);
        res.send(photos[0]);
    });
    
    app.post('/author', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        if (object == null || object.findText == null) object = {findText: ''};
        let photos = await db.sequelize.query(`SELECT * FROM searchInPhotos('${object.findText}');`);
        res.send(photos[0]);
    });

    app.post('/login', async (req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                login: object.login,
                password: object.password
            }
        });
        if (user != null) {
            let token = jwt.sign({ login: object.login, isAdmin: user.isAdmin }, secretKey);
            res.send({
                login: user.login,
                isAdmin: user.isAdmin,
                token: token
            });
        }
        else {
            res.send(false);
        } 
    });

    app.post('/loginVk', async(req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                token: object.oAuthToken
            }
        });
        if (user == null) {
            user = await db.Models.User.create({
                login: object.login,
                isAdmin: false,
                token: object.oAuthToken
            });
        }
        let token = jwt.sign({ login: user.login, isAdmin: user.isAdmin }, secretKey);
        res.send({
            login: user.login,
            isAdmin: user.isAdmin,
            token: token
        });
    })

    app.post('/gallery/create', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        if (object.URL == null || object.author == null || object.categoryName == null) return res.send(false);
        let photo = await db.Models.Photo.create({
            URL: object.URL,
            author: object.author,
            categoryName: object.categoryName,
            description: object.description
        });
        res.send(photo);
        updatePhotos(db);
    });

    app.post('/reg', async (req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                login: object.login
            }
        });
        if (user == null) {
            let newUser = await db.Models.User.create({
                login: object.login,
                password: object.password,
                isAdmin: false,
            });
            res.send({
                login: newUser.login,
                isAdmin: newUser.isAdmin,
                token: jwt.sign({
                    login: object.login,
                    isAdmin: false
                }, secretKey)
            });
        }
        else {
            res.send(false);
        }
    });

    app.post('/gallery/update', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);
        console.log(object);
        if (isNaN(id) || object.URL == null || object.author == null || object.categoryName == null) return res.send(false);
        let photos = await db.Models.Photo.update({
            URL: object.URL,
            author: object.author,
            categoryName: object.categoryName,
            description: object.description
        }, {
            where: {
                id: id,
            } 
        });
        res.send(object);
        updatePhotos(db);
    });

    app.post('/gallery/delete', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);

        if (isNaN(id)) return res.send(false);
        await db.Models.Photo.destroy({
            where: {
                id: id,
            } 
        });
        res.send(true);
        updatePhotos(db);
    });

    app.post('/upload', fileLoad.upload.single('file'), (req, res) => {
        const { file } = req;

        if(!file){
            console.log('File null');
            return res.send(false);
        }
        console.log("__________________________PATH 1");
        console.log(path.resolve('/', file.originalname));
        console.log("__________________________PATH 2");
        console.log(file.originalname);
        console.log("__________________________PATH 3");
        console.log(fileLoad.PATH);
        dropbox({
            resource: 'files/upload',
            parameters:{
                path: '/' + file.originalname
            },
            readStream: fs.createReadStream(path.resolve(fileLoad.PATH, file.originalname))
        }, (err, result, response) =>{
            if (err) return console.log(err);
    
            console.log('uploaded dropbox');
            res.send(true);
        });
    });


    app.post('/vkcallback', (req, res) => {
        console.log("VK message" + req.body);
        if (req.body.type == "confirmation") {
            if (req.body.group_id === 190006284) {
                res.send("419e6d63");
                return;
            }
        }
        const client = new WebSocketClient();

        client.on('connectFailed', (error) => {
            console.log('Connect Error: ' + error.toString());
        });

        client.on('connect', async (connection) => {
            console.log('WebSocket Client Connected');
            connection.on('error', (error) => {
                console.log("Connection Error: " + error.toString());
            });
            connection.on('close', () => {
                console.log('echo-protocol Connection Closed');
            });
            if (connection.connected) {
                connection.sendUTF(JSON.stringify({
                    data: req.body,
                    type: "updateText"
                }));
            }
            connection.close();
        });
        client.connect('wss://photogalleryws.herokuapp.com', 'echo-protocol');
        res.send('ok');
    });
};
 
let convertToObj = function(obj) {
    console.log(obj.data);
    return JSON.parse(obj.data);
    
}

let updatePhotos = (db) => {
    const client = new WebSocketClient();

    client.on('connectFailed', (error) => {
        console.log('Connect Error (connectFailed): ' + error.toString());
    });

    client.on('connect', async (connection) => {
        console.log('WebSocket Client Connected');
        connection.on('error', (error) => {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', () => {
            console.log('echo-protocol Connection Closed');
        });

        let photos = await db.Models.Photo.findAll();
        if (connection.connected) {
            connection.sendUTF(JSON.stringify({
                data: photos,
                type: "updatePhotos"
            }));
        }

        connection.close();
    });

    client.connect('wss://photogalleryws.herokuapp.com', 'echo-protocol');
};