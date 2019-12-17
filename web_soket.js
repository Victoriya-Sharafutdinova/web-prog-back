const WebSocket = require('ws');
const wss = new WebSocket.Server({
    port: 3002,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
    }
});
let db;
module.exports = (dbIn) => {
    db = dbIn;
    updatePhotos();
};
let updatePhotos = () => {
    console.log("UPDATE");
    wss.clients.forEach(async client => {
        let photos = await db.Models.Photo.findAll();
        client.send(JSON.stringify({photos}));
    });
};

module.exports.updatePhotos = updatePhotos;