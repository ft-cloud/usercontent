import express from "express";

import {v4 as uuidV4} from "uuid";

import fileUpload from "express-fileupload";

import cookieParser from "cookie-parser";

import {initHandler} from "./userContentHandler.js";

import fs from "fs";

import cors from "cors";

import {MongoClient} from "mongodb";
import rateLimit from "express-rate-limit";

export const app = express();

const uri = `mongodb://root:${process.env.MYSQL_ROOT_PASSWORD}@mongo:27017/?authSource=admin&readPreference=primary&directConnection=true&ssl=false`
const client = new MongoClient(uri);

client.connect().then(()=> {
    global.database = client.db("cloud");

})
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser())
app.use(cors());
app.disable('x-powered-by');

app.use(fileUpload({
    createParentPath: true,
    limits: {fileSize: 1024*1024*50}
}));



initHandler();


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
