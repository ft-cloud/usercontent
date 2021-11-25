const app = require("./userContentServer").app;
const fs = require('fs')
const session = require('sessionlib/session.js')
const fileStructureHandler = require("./fileStructureHandler");
module.exports.init = function initHandler() {

    app.get("/api/v1/usercontent/profilePicture",(req,res)=>{
        if(req.query.user!=null) {
            try {
                if(fs.existsSync("/usercontentdata/userProfile/" + req.query.user.toString() + ".jpg")) {
                    res.sendFile("/usercontentdata/userProfile/" + req.query.user.toString() + ".jpg")
                }else{
                    res.sendFile("/src/defaultAvatar.jpg")
                }
            }catch (e) {
                res.sendFile("/src/defaultAvatar.jpg")
            }
        }else{

            session.transformSecurelySessionToUserUUID(res,req).then(uuid => {
                if(uuid!=null) {
                    try {
                        if(fs.existsSync("/usercontentdata/userProfile/" + uuid.toString() + ".jpg")) {
                            res.sendFile("/usercontentdata/userProfile/" + uuid.toString() + ".jpg")
                        }else{
                            res.sendFile("/src/defaultAvatar.jpg")
                        }
                    }catch (e) {
                        res.sendFile("/src/defaultAvatar.jpg")
                    }
                }
            })


        }


    })


    app.post("/api/v1/usercontent/profilePicture",(req,res)=>{
        console.log(req.body)
        session.transformSecurelySessionToUserUUID(res,req).then(uuid=>{

            if(uuid!=null) {

                if(!req.files||!req.files.profilePicture) {
                    res.json({"error":"No file given","errorcode":"001"});
                }else{
                    let avatar = req.files.profilePicture;
                    if(!avatar.mimetype==="image/jpeg") {
                        res.json({"error":"Invalid File Type","errorcode":"001"});
                    }else{
                        avatar.mv('/usercontentdata/userProfile/'+uuid+'.jpg')

                        res.json({
                            status: true,
                            message: 'File has been uploaded',
                            data: {
                                name: avatar.name,
                                mimetype: avatar.mimetype,
                                size: avatar.size
                            }
                        });
                    }



                }
            }

        })
    })

    app.put("/api/v1/usercontent/cloud/resource",(req,res)=>{
        if(req.body.absolutePath!=null) {
            // e.g. /photos/media/2020/05/02/


            const regex = /\/[a-zA-Z0-9_\/-]*[^\/]$/;
            if(!regex.test(req.body.absolutePath.toString())) {

                console.log("test")
                res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    fileStructureHandler.folderStructureExists( fileStructureHandler.parsePath(req.body.absolutePath.toString()),uuid).then(temp=>{
                        console.log(temp);

                        fileStructureHandler.pushFileStructureEntry(fileStructureHandler.parsePath(req.body.absolutePath.toString()),{
                            "isFolder": false,
                            "mimeType": "image/jpeg",
                            "fileUUID": "a838584-742747-345835h-sh475ng45",
                            "fileSize": 7423734,
                            "name": "testupload.jpeg"
                        },uuid).then(()=>{
                            console.log("done");
                        })

                    })



                    if (!req.files || !req.files.file) {
                        res.json({"error": "No file given", "errorcode": "001"});
                    } else {
                        let file = req.files.file;
                        const fileUUID = uuidGen.v4();
                        file.mv(`/usercontentdata/cloud/${uuid}/${fileUUID}`)

                        res.json({
                            status: true,
                            message: 'File has been uploaded uploaded',
                            data: {
                                name: file.name,
                                mimetype: file.mimetype,
                                size: file.size
                            }
                        });


                    }
                }

            })
        }
    })


    app.delete("/api/v1/usercontent/cloud/resource",(req,res)=>{
        if(req.body.absolutePath!=null&&req.body.resourceName!=null) {
            // e.g. /photos/media/2020/05/02/


            const regex = /\/[a-zA-Z0-9_\/-]*[^\/]$/;
            if(!regex.test(req.body.absolutePath.toString())) {
                res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    fileStructureHandler.folderStructureExists( fileStructureHandler.parsePath(req.body.absolutePath.toString()),uuid).then(temp=>{
                       // console.log(temp);

                        fileStructureHandler.removeFileStructureEntry(fileStructureHandler.parsePath(req.body.absolutePath.toString()),req.body.resourceName.toString(),uuid).then((result)=>{
                            console.log(result);
                        })

                    })



                    if (!req.files || !req.files.file) {
                        res.json({"error": "No file given", "errorcode": "001"});
                    } else {
                        let file = req.files.file;
                        const fileUUID = uuidGen.v4();
                        file.mv(`/usercontentdata/cloud/${uuid}/${fileUUID}`)

                        res.json({
                            status: true,
                            message: 'File has been uploaded uploaded',
                            data: {
                                name: file.name,
                                mimetype: file.mimetype,
                                size: file.size
                            }
                        });


                    }
                }

            })
        }
    })


}