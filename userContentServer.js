const express = require('express');
const app = express();
const uuidGen = require('uuid');
const fs = require('fs')
const fileUpload = require('express-fileupload');
module.exports.app = app;
const cookieParser = require('cookie-parser')


const cors = require('cors');
const { MongoClient } = require("mongodb");
const uri = `mongodb://root:${process.env.MYSQL_ROOT_PASSWORD}@mongo:27017/?authSource=admin&readPreference=primary&directConnection=true&ssl=false`
const client = new MongoClient(uri);

client.connect().then(()=> {
    global.database = client.db("cloud");

})

const userContentHandler = require('./userContentHandler');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser())

app.use(fileUpload({
    createParentPath: true,
    limits: {fileSize: 1024*1024*50}
}));

userContentHandler.init();

app.use(cors());

app.get("/api/v1/usercontent",(req, res) => {
    res.send(JSON.stringify({microService:"Usercontent"}))
})




app.listen(3000, () => {
    console.log(`Usercontent app listening at http://localhost:3000`);

});

app.use(function (err,req,res,next){
    if (res.headersSent) {
        return next(err);
    }
    console.error(err);
    res.status(500);
    res.send('Something went wrong')
})


app.use(function (req, res) {
    res.status(404).send('Something went wrong! Microservice: Usercontent');
});
