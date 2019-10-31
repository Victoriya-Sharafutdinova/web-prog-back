//pg_ctl -D /postgresql/data start
module.exports = function(app, db) {
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    }),
    app.get('/testdb', async (req, res) => {
        res.send(`DB url ${process.env.DATABASE_URL}`);
    }),
    app.get('/gallery', async (req, res) => {
        let photos = await db.Models.Photo.findAll();
        res.send(photos);
    });
    app.post('/gallery/create', async (req, res) => {
        let object = convertToObj(req.body);
        if (object.URL == null || object.author == null || object.categoryName == null) return res.send(false);
        let photo = await db.Models.Photo.create({
            URL: object.URL,
            author: object.author,
            categoryName: object.categoryName
        });
        res.send(photo);
    });
    app.post('/gallery/update', async (req, res) => {
        let object = convertToObj(req.body);

        let id = parseInt(object.id);
        if (isNaN(id) || object.URL == null || object.author == null || object.categoryName == null) return res.send(false);
        let product = await db.Models.Photo.update({
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