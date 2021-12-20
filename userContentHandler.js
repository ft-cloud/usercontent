import {app} from "./userContentServer.js";

import fs from "fs";

import {v4 as uuidV4} from "uuid";

import {session} from "sessionlib/session.js";

import {fileStructureHandler} from "./fileStructureHandler.js";

import {fileViewLinkHandler} from "./fileViewLinkHandler.js";

export function initHandler() {

    app.get("/api/v1/usercontent/profilePicture", (req, res) => {
        if (req.query.user != null) {
            try {
                if (fs.existsSync("/usercontentdata/userProfile/" + req.query.user.toString() + ".jpg")) {
                    res.sendFile("/usercontentdata/userProfile/" + req.query.user.toString() + ".jpg")
                } else {
                    res.sendFile("/src/defaultAvatar.jpg")
                }
            } catch (e) {
                res.sendFile("/src/defaultAvatar.jpg")
            }
        } else {

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {
                if (uuid != null) {
                    try {
                        if (fs.existsSync("/usercontentdata/userProfile/" + uuid.toString() + ".jpg")) {
                            res.sendFile("/usercontentdata/userProfile/" + uuid.toString() + ".jpg")
                        } else {
                            res.sendFile("/src/defaultAvatar.jpg")
                        }
                    } catch (e) {
                        res.sendFile("/src/defaultAvatar.jpg")
                    }
                }
            })


        }


    })


    app.post("/api/v1/usercontent/profilePicture", (req, res) => {
        session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

            if (uuid != null) {

                if (!req.files || !req.files.profilePicture) {
                    res.json({"error": "No file given", "errorcode": "001"});
                } else {
                    let avatar = req.files.profilePicture;
                    if (!avatar.mimetype === "image/jpeg") {
                        res.json({"error": "Invalid File Type", "errorcode": "001"});
                    } else {
                        avatar.mv('/usercontentdata/userProfile/' + uuid + '.jpg')

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


    app.put("/api/v1/usercontent/cloud/resource", (req, res) => {
        if (req.body.absolutePath != null) {
            // e.g. /photos/media/2020/05/02/


            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]/;
            if (!regex.test(req.body.absolutePath.toString()) && !(req.body.absolutePath.toString() === "/")) {

                res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {


                    if (!req.files || !req.files.file) {
                        res.json({"error": "No file given", "errorcode": "001"});
                    } else {
                        let file = req.files.file;

                        fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absolutePath.toString()), uuid).then(() => {
                            fileStructureHandler.resourceExists(fileStructureHandler.parsePath(req.body.absolutePath.toString()),file.name,uuid).then(result=>{
                                if(result.result){
                                    res.status(400).json({"error": "File already exists", "errorcode": "017"});
                                }else{
                                    const fileUUID = uuidGen.v4();

                                    fileStructureHandler.pushFileStructureEntry(fileStructureHandler.parsePath(req.body.absolutePath.toString()), {
                                        "isFolder": false,
                                        "mimeType": file.mimetype,
                                        "fileUUID": fileUUID,
                                        "fileSize": file.size,
                                        "name": file.name,
                                        "checksum": file.md5
                                    }, uuid).then(() => {
                                        file.mv(`/usercontentdata/cloud/${uuid}/${fileUUID}`)
                                        fileStructureHandler.changeUsedBytes(file.size, uuid);

                                        res.json({
                                            status: true,
                                            message: 'File has been uploaded uploaded',
                                            file: {
                                                name: file.name,
                                                mimetype: file.mimetype,
                                                size: file.size
                                            }
                                        });


                                    })
                                }
                            })



                        })


                    }
                }

            })
        }
    })


    app.delete("/api/v1/usercontent/cloud/resource", (req, res) => {
        if (req.body.absolutePath != null && req.body.resourceName != null) {
            // e.g. /photos/media/2020/05/02/

            if (!fileStructureHandler.checkFileName(req.body.resourceName.toString())) {
                res.status(400).json({"error": "No valid name", "errorcode": "001"});
                return;
            }

            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]/;
            if (!regex.test(req.body.absolutePath.toString()) && !(req.body.absolutePath.toString() === "/")) {
                res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absolutePath.toString()), uuid).then(temp => {
                        // console.log(temp);

                        fileStructureHandler.removeFileStructureEntry(fileStructureHandler.parsePath(req.body.absolutePath.toString()), req.body.resourceName.toString(), uuid).then((result) => {
                            console.log(result);
                            if (result != null) {
                                if (result.isFolder === true) {
                                    fileStructureHandler.deleteRecursive(result, uuid).then(savedBytes => {
                                        fileStructureHandler.changeUsedBytes(-savedBytes, uuid).then(() => {
                                            res.json({success:true});
                                        });
                                    })
                                } else {
                                    fileStructureHandler.deleteFilesFromDisk(uuid, result.fileUUID).then(() => {
                                        fileStructureHandler.changeUsedBytes(-result.fileSize, uuid).then(() => {
                                            res.json({success:true});
                                        });
                                    })
                                }
                            }


                        })

                    })


                }

            })
        }
    })

    app.get("/api/v1/usercontent/cloud/folder", (req, res) => {
        if (req.query.absolutePath != null) {
            // e.g. /photos/media/2020/05/02/


            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]/;
            if (!regex.test(req.query.absolutePath.toString()) && !(req.query.absolutePath.toString() === "/")) {
                res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.query.absolutePath.toString()), uuid).then(path => {
                        // console.log(temp);
                        if (path.foundFolder != null) {
                            path.foundFolder.files.forEach(file => delete file.files)
                        }
                        res.json(path)

                    })


                }

            })
        } else {
            res.status(400).json({"error": "Please provide path", "errorcode": "001"});

        }
    })


    app.put("/api/v1/usercontent/cloud/folder", (req, res) => {
        if (req.body.absolutePath != null && req.body.folderName != null) {
            // e.g. /photos/media/2020/05/02/


            if (!fileStructureHandler.checkFileName(req.body.folderName.toString())) {
                res.status(400).json({"error": "No valid name", "errorcode": "001"});
                return;
            }
            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]/;
            if (!regex.test(req.body.absolutePath.toString()) && !(req.body.absolutePath.toString() === "/")) {
               res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absolutePath.toString()), uuid).then(folder => {
                        fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absolutePath.toString()+"/"+req.body.folderName.toString()), uuid).then(newFolder => {
                            if (folder.result === true) {
                                // console.log(temp);
                                if (newFolder.result !== true) {

                                    fileStructureHandler.pushFileStructureEntry(fileStructureHandler.parsePath(req.body.absolutePath.toString()), {
                                        isFolder: true,
                                        name: req.body.folderName.toString(),
                                        files: []
                                    }, uuid)
                                    res.json({success:true});
                                }else{
                                    res.status(400).json({"error": "Folder already exists", "errorcode": "017"});

                                }

                            } else {
                                res.status(400).json({"error": "Invalid path", "errorcode": "001"});

                            }

                        })
                    })


                }

            })
        }
    })


    app.get("/api/v1/usercontent/cloud/file", (req, res) => {

        if (req.query.absolutePath != null && req.query.fileName != null) {
            // e.g. /photos/media/2020/05/02/
            if (!fileStructureHandler.checkFileName(req.body.fileName.toString())) {
                res.status(400).json({"error": "No valid name", "errorcode": "001"});
                return;
            }

            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]/;
            if (!regex.test(req.query.absolutePath.toString()) && !(req.query.absolutePath.toString() === "/")) {
                res.status(400).json({"error": "No valid path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.query.absolutePath.toString()), uuid).then(folder => {
                        fileStructureHandler.resourceExists(fileStructureHandler.parsePath(req.query.absolutePath.toString()), req.query.fileName.toString(), uuid).then(foundFile => {

                            if (foundFile.result === true) {

                                fileViewLinkHandler.generateViewLink(uuid, foundFile.file.fileUUID, foundFile.file).then(link => {
                                    res.json({
                                        success: true,
                                        linkUUID: link.linkUUID,
                                        mimeType: link.file.mimeType,
                                        size: link.file.fileSize
                                    })
                                })
                            } else {
                                res.status(404).json({"error": "Resource not found", "errorcode": "015"});
                            }
                        })
                    })

                }

            })
        } else {
            res.status(400).json({"error": "Please provide absolutePath and fileName", "errorcode": "017"});

        }
    })

    app.get("/api/v1/usercontent/cloud/fileViewLink", (req, res) => {
        if (req.query.link != null) {

            fileViewLinkHandler.getViewLinkContent(req.query.link).then(file => {
                if (file != null) {

                    //TODO check for checksum
                    if (fs.existsSync("/usercontentdata/cloud/" + file.user + "/" + file.fileUUID)) {
                        res.download("/usercontentdata/cloud/" + file.user + "/" + file.fileUUID, file.file.name);

                    } else {
                        res.status(404).json({"error": "Resource not found", "errorcode": "015"});

                    }


                } else {
                    res.status(404).json({"error": "Link not found", "errorcode": "015"});

                }


            })

        } else {
            res.status(400).json({"error": "Please provide link", "errorcode": "001"});

        }
    })

    app.patch("/api/v1/usercontent/cloud/moveResource", (req, res) => {
        if (req.body.absoluteSourcePath != null && req.body.resourceName != null && req.body.absoluteTargetPath) {
            // e.g. /photos/media/2020/05/02/
            if (req.body.absoluteSourcePath === req.body.absoluteTargetPath) {
                res.json({success:true});
                return;
            }

            if (!fileStructureHandler.checkFileName(req.body.resourceName.toString())) {
                res.status(400).json({"error": "No valid name", "errorcode": "001"});
                return;
            }


            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]/;
            if (!regex.test(req.body.absoluteSourcePath.toString()) && !(req.body.absoluteSourcePath.toString() === "/")) {
                res.status(400).json({"error": "No valid source path", "errorcode": "001"});
                return;
            }

            if (!regex.test(req.body.absoluteTargetPath.toString()) && !(req.body.absoluteTargetPath.toString() === "/")) {
                res.status(400).json({"error": "No valid target path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    //TODO build methode of this
                    fileStructureHandler.resourceExists(fileStructureHandler.parsePath(req.body.absoluteTargetPath.toString()), req.body.resourceName.toString(), uuid).then(alreadyExist => {
                        if (alreadyExist.result === true) {
                            if (req.body.force) {
                                if (alreadyExist.file.isFolder === true) {
                                    fileStructureHandler.deleteRecursive(alreadyExist.file, uuid).then(savedBytes => {
                                        fileStructureHandler.changeUsedBytes(-savedBytes, uuid).then(() => {
                                            executeMove();

                                        });
                                    })
                                } else {
                                    fileStructureHandler.deleteFilesFromDisk(uuid, alreadyExist.file.fileUUID).then(() => {
                                        fileStructureHandler.changeUsedBytes(-alreadyExist.file.fileSize, uuid).then(() => {
                                            executeMove();

                                        });
                                    })
                                }
                            } else {
                                res.status(400).json({
                                    "error": "File already exist (use force to override)",
                                    "errorcode": "001"
                                });

                            }
                        } else {
                            executeMove();
                        }
                    });

                    function executeMove() {
                        const sourceFileExistPromise = fileStructureHandler.resourceExists(fileStructureHandler.parsePath(req.body.absoluteSourcePath.toString()), req.body.resourceName.toString(), uuid);
                        const sourceExistPromise = fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absoluteSourcePath.toString()), uuid);
                        const targetExistPromise = fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absoluteTargetPath.toString()), uuid);

                        Promise.all([sourceFileExistPromise, sourceExistPromise, targetExistPromise]).then(result => {
                            if (result[0].result === true && result[1].result === true && result[2].result === true) {

                                fileStructureHandler.removeFileStructureEntry(fileStructureHandler.parsePath(req.body.absoluteSourcePath.toString()), req.body.resourceName.toString(), uuid).then(result => {
                                    fileStructureHandler.pushFileStructureEntry(fileStructureHandler.parsePath(req.body.absoluteTargetPath.toString()), result, uuid).then(() => {
                                        res.json({success:true});
                                    })
                                })

                            } else {
                                res.status(400).json({"error": "No valid paths", "errorcode": "001"});
                            }
                        })

                    }


                }

            })
        } else {
            res.status(400).json({"error": "Please provide required attributes", "errorcode": "001"});

        }

    })


    app.patch("/api/v1/usercontent/cloud/copyResource", (req, res) => {
        if (req.body.absoluteSourcePath != null && req.body.resourceName != null && req.body.absoluteTargetPath != null && req.body.newResourceName != null) {
            // e.g. /photos/media/2020/05/02/
            if (!fileStructureHandler.checkFileName(req.body.resourceName.toString())) {
                res.status(400).json({"error": "No valid name", "errorcode": "001"});
                return;
            }
            if (!fileStructureHandler.checkFileName(req.body.newResourceName.toString())) {
                res.status(400).json({"error": "No valid name", "errorcode": "001"});
                return;
            }
            const regex = /[a-zA-Z0-9\\s_@-^!#$%&+={}\[\]]$/;
            if (!regex.test(req.body.absoluteSourcePath.toString()) && !(req.body.absoluteSourcePath.toString() === "/")) {
                res.status(400).json({"error": "No valid source path", "errorcode": "001"});
                return;
            }

            if (!regex.test(req.body.absoluteTargetPath.toString()) && !(req.body.absoluteTargetPath.toString() === "/")) {
                res.status(400).json({"error": "No valid target path", "errorcode": "001"});
                return;
            }

            session.transformSecurelySessionToUserUUID(res, req).then(uuid => {

                if (uuid != null) {
                    //TODO build methode of this
                    //TODO prevent moving folder in it self
                    fileStructureHandler.resourceExists(fileStructureHandler.parsePath(req.body.absoluteTargetPath.toString()), req.body.newResourceName.toString(), uuid).then(alreadyExist => {
                        if (alreadyExist.result === true) {
                            if (req.body.force) {
                                if (alreadyExist.file.isFolder === true) {
                                    fileStructureHandler.deleteRecursive(alreadyExist.file, uuid).then(savedBytes => {
                                        fileStructureHandler.changeUsedBytes(-savedBytes, uuid).then(() => {
                                            executeCopy();
                                        });
                                    })
                                } else {
                                    fileStructureHandler.deleteFilesFromDisk(uuid, alreadyExist.file.fileUUID).then(() => {
                                        fileStructureHandler.changeUsedBytes(-alreadyExist.file.fileSize, uuid).then(() => {
                                            executeCopy();

                                        });
                                    })
                                }
                            } else {
                                res.status(400).json({
                                    "error": "File already exist (use force to override)",
                                    "errorcode": "017"
                                });

                            }

                        } else {
                            executeCopy();
                        }
                    });

                    function executeCopy() {
                        const sourceFileExistPromise = fileStructureHandler.resourceExists(fileStructureHandler.parsePath(req.body.absoluteSourcePath.toString()), req.body.resourceName.toString(), uuid);
                        const sourceExistPromise = fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absoluteSourcePath.toString()), uuid);
                        const targetExistPromise = fileStructureHandler.folderStructureExists(fileStructureHandler.parsePath(req.body.absoluteTargetPath.toString()), uuid);

                        Promise.all([sourceFileExistPromise, sourceExistPromise, targetExistPromise]).then(result => {
                            if (result[0].result === true && result[1].result === true && result[2].result === true) {

                                fileStructureHandler.copyRecursive({files: [result[0].file]}, uuid).then(newFileStruct => {
                                    newFileStruct.struct.files[0].name = req.body.newResourceName.toString();
                                    fileStructureHandler.pushFileStructureEntry(fileStructureHandler.parsePath(req.body.absoluteTargetPath.toString()), newFileStruct.struct.files[0], uuid).then(() => {
                                        fileStructureHandler.changeUsedBytes(newFileStruct.usedBytes, uuid).then(() => {
                                            res.json({success:true});
                                        })
                                    });

                                })

                            } else {
                                res.status(400).json({"error": "No valid paths", "errorcode": "001"});
                            }
                        })
                    }


                }

            })
        } else {
            res.status(400).json({"error": "Please provide required attributes", "errorcode": "001"});

        }
    })


}