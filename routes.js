//pg_ctl -D /postgresql/data start
let jwt = require('jsonwebtoken');
const secretKey = "myTestSecretKey";
const easyvk = require('easyvk');

module.exports = function(app, db) {
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Athorization");
        if (['/gallery', '/gallery/create', '/gallery/update', '/gallery/delete'].includes(req.originalUrl)) {
            let object = convertToObj(req.body);
            if (req.originalUrl === '/gallery' && object.pageName !== "admin") {
                return next();
            }
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
    app.get('/testdb', async (req, res) => {
        res.send(`DB url ${process.env.DATABASE_URL}`);
    });

    app.post('/gallery', async (req, res) => {       
        let photos = await db.Models.Photo.findAll();
        res.send(photos);
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
            user.token = jwt.sign({ login: object.login, isAdmin: user.isAdmin }, secretKey);
            await user.save();
            res.send({
                login: user.login,
                isAdmin: user.isAdmin,
                token: user.token
            });
        }
        else {
            if(object.isOAuth){
                easyvk({
                    username: object.login,
                    password: object.password,
                  }).then(async vk => {
                    let newUser = await db.Models.User.create({
                        login: object.login,
                        password: object.password,
                        isAdmin: false,
                        token: jwt.sign({
                            login: object.login,
                            isAdmin: false
                        }, secretKey)
                    });
                    res.send({
                        login:newUser.login,
                        isAdmin:newUser.isAdmin,
                        token:newUser.token
                    });
                  }).catch(err => {
                    res.send(false);
                  });              
            }
            else{
                res.send(false);
            }
        }
     
       
    });

    app.post('/gallery/create', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        if (object.URL == null || object.author == null || object.categoryName == null) return res.send(false);
        let photo = await db.Models.Photo.create({
            URL: object.URL,
            author: object.author,
            categoryName: object.categoryName
        });
        res.send(photo);
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
                token: jwt.sign({
                    login: object.login,
                    isAdmin: false
                }, secretKey)
            });
            res.send(true);
        }
        else {
            res.send(false);
        }
    });

    app.post('/gallery/update', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);
       
        if (isNaN(id) || object.URL == null || object.author == null || object.categoryName == null) return res.send(false);
        let photos = await db.Models.Photo.update({
            URL: object.URL,
            author: object.author,
            categoryName: object.categoryName
        }, {
            where: {
                id: id,
            } 
        });
        res.send(object);
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
    });
};
let convertToObj = function(obj) {
    for (const key in obj) {
        return JSON.parse(key);
    }
}