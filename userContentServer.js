const express = require('express');
const app = express();
const fs = require('fs')
const fileUpload = require('express-fileupload');
const session = require('sessionlib/session.js')
module.exports.app = app;

const cors = require('cors');
const { MongoClient } = require("mongodb");
const uri = `mongodb://root:${process.env.MYSQL_ROOT_PASSWORD}@mongo:27017/?authSource=admin&readPreference=primary&directConnection=true&ssl=false`
const client = new MongoClient(uri);

client.connect().then(()=> {
    global.database = client.db("cloud");

})



app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(fileUpload({
    createParentPath: true,
    limits: {fileSize: 1024*1024*50}
}));
app.use(cors());

app.get("/api/v1/usercontent",(req, res) => {
    res.send(JSON.stringify({microService:"Usercontent"}))
})

app.get("/api/v1/usercontent/profilePicture",(req,res)=>{
    if(req.query.user!=null) {
        try {
            if(fs.existsSync("/usercontentdata/" + req.query.user.toString() + ".jpg")) {
                res.sendFile("/usercontentdata/" + req.query.user.toString() + ".jpg")
            }else{
                res.sendFile("/src/defaultAvatar.jpg")
            }
        }catch (e) {
            res.sendFile("/src/defaultAvatar.jpg")
        }
    }else{
        res.json({"error":"No user uuid given","errorcode":"001"});

    }


})


app.post("/api/v1/usercontent/profilePicture",(req,res)=>{
    session.transformSecurelySessionToUserUUID(res,req).then(uuid=>{

        if(uuid!=null) {

            if(!req.files||!req.files.profilePicture) {
                res.json({"error":"No file given","errorcode":"001"});
            }else{
                let avatar = req.files.profilePicture;
                if(avatar.mimetype==="image/jpeg") {

                }else{
                    res.json({"error":"Invalid File Type","errorcode":"001"});

                }

                avatar.mv('/usercontentdata/'+uuid+'.jpg')

                res.json({
                    status: true,
                    message: 'File is uploaded',
                    data: {
                        name: avatar.name,
                        mimetype: avatar.mimetype,
                        size: avatar.size
                    }
                });

            }

        }

    })
})

app.listen(3000, () => {
    console.log(`Usercontent app listening at http://localhost:3000`);

});

app.use(function (err,req,res,next){
    if (res.headersSent) {
        return next(err);
    }
    res.status(500);
    res.send('Something went wrong')
})


app.use(function (req, res) {
    res.status(404).send('Something went wrong! Microservice: Usercontent');
});
