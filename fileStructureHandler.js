const path = require("path");
const fs = require('fs')
const uuidGen = require('uuid');

const fileStructureHandler = {
    folderStructureExists: function (path, userUUID) {
        return new Promise((resolve) => {
            this.getFileStructureRoot(userUUID).then(fileStructure => {
                let currentFileStructure; //current sub folder from database where we start to iterate
                let lastFolder = fileStructure; //last found folder in database
                if (fileStructure != null) { //when we dont receive folder structure from database
                    console.log(typeof path)
                    path.forEach((directory) => { //iterate over every given folder

                        let foundFolder = null; //reset found folder variable
                        if(lastFolder.files!=null) { //if the last folder does contain files
                            currentFileStructure = lastFolder.files; //get files from last found folder
                        }else{
                            resolve({result: false}); // resolve false if the folder doesnt contain folders (or other files) but we are looking for a deeper folder
                        }
                        currentFileStructure.forEach((file) => { //iterate over all existing files

                            if (file.isFolder === false) return;

                            if (file.name === directory) {
                                foundFolder = file;
                            }
                        });

                        if (foundFolder == null) {
                            resolve({result: false}); //we weren't able to find such a folder
                        }else{
                            lastFolder = foundFolder;
                        }


                    });
                    resolve({result: true,foundFolder: lastFolder});
                } else {
                    resolve({result: false});

                }
            });

        });

    },

    getFileStructureRoot: function (userUUID) {
        return new Promise((resolve) => {
            const accountCollection = global.database.collection("account");

            accountCollection.findOne({uuid: userUUID}).then(result => {
                if (result.fileCloud != null && result.fileCloud.files != null) {
                    resolve(result.fileCloud);
                } else {
                    resolve(undefined);
                }

            });
        });
    },



    parsePath: function (path) {
        const pathsArray = [];

        path.split('/').forEach(element => {
            if (element === "") return;
            pathsArray.push(element);
        });
        return pathsArray;
    },
    composePath: function (path) {
        return "/"+path.join('/');
    },

    resourceExists(pathWithoutFile, resourceName, userUUID) {

      return new Promise((resolve => {

          this.folderStructureExists(pathWithoutFile,userUUID).then((folder)=>{

              if(folder.result===true) {
                if(folder.foundFolder.files!=null) {

                    folder.foundFolder.files.forEach(resource=>{
                        if(resource.name===resourceName) {
                            resolve({result: true,file:resource})
                        }
                    })
                    resolve({result: false})


                }else{
                    resolve({result: false})
                }
              }else{
                resolve({result: false})
              }
          })

      }))
    },





    /** e.g.
     * file:
     *   {
            "isFolder": false,
            "mimeType": "image/jpeg",
            "fileUUID": "a838584-742747-345835h-sh475ng45",
            "fileSize": 7423734,
            "name": "tree.jpeg",
            "checksum": "ad3d94d103062d674d6dc738556c4c8e"
            }

        folder:
     {

     "isFolder": true,
     "name": "images",
     "files": [] (you can provide in this file array files if the user has uploaded a complete directory)

     }
     * @param path please check if folder exists
     * @param fileStructureEntry
     * @param userUUID the user you want to add the file
     */
    pushFileStructureEntry(path, fileStructureEntry, userUUID) {

        return new Promise(resolve => {
            const accountCollection = global.database.collection("account");
            let depth = ""
            const filters = [];
            for(let i=0;i<path.length;i++) {

                depth+=`.files.$[depth${i}]`
                const tempObj = {};
                tempObj[`depth${i}.name`] = path[i];
                filters.push(tempObj);
            }
            let object = {};
            object[`fileCloud${depth}.files`] = fileStructureEntry

            console.log(object);
            console.log(filters);
            accountCollection.updateOne({uuid:userUUID},{$push: object},{arrayFilters: filters}).then(()=>{
                resolve();
            });

        })


    },


    removeFileStructureEntry(path, resourceName, userUUID) {

        return new Promise(resolve => {

            this.folderStructureExists(path,userUUID).then(foundFolder=>{
                if(foundFolder.result===false) {
                    resolve({result:false})
                }else{
                    const accountCollection = global.database.collection("account");
                    let depth = ""
                    const filters = [];
                    for(let i=0;i<path.length;i++) {
                        depth+=`.files.$[depth${i}]`
                        const tempObj = {};
                        tempObj[`depth${i}.name`] = path[i];
                        filters.push(tempObj);
                    }
                    let object = {};
                    object[`fileCloud${depth}.files`] = {name:resourceName}

                    let deleteObject = foundFolder.foundFolder.files.filter(obj=>{
                        return obj.name === resourceName;
                    })[0];
                    if(deleteObject===undefined) {
                        deleteObject = {success:false}
                    }

                    accountCollection.updateOne({uuid:userUUID},{$pull: object},{arrayFilters: filters}).then((result)=>{
                        resolve(deleteObject);
                    });
                }
            })



        })


    },

    changeUsedBytes: function (delta,userUUID) {
        return new Promise(resolve => {

            const accountCollection = global.database.collection("account");
            accountCollection.updateOne({uuid:userUUID},{$inc:{"fileCloud.usedBytes": delta}}).then(()=>{
                resolve();
            })

        })
    },

    deleteRecursive: async function (structure, userUUID) {
        let savedBytes = 0;

        for (const file of structure.files) {

            if (file.isFolder === true) {
                savedBytes += await this.deleteRecursive(file, userUUID);
            } else {

                await this.deleteFilesFromDisk(userUUID, file.fileUUID)
                savedBytes += file.fileSize
            }
        }

        return savedBytes;
    },

    copyRecursive: async function (structure, userUUID) {
        let usedBytes = 0;

        for (let file of structure.files) {

            if (file.isFolder === true) {
                const result = await this.copyRecursive(file, userUUID);
                usedBytes+=result.usedBytes;
                file = result.struct;
            } else {
                const newUUID = uuidGen.v4();
                await this.copyFilesOnDisk(userUUID, file.fileUUID,newUUID)
                file.fileUUID = newUUID;
                usedBytes += file.fileSize
            }
        }

        return {
            struct: structure,
            usedBytes: usedBytes
        };
    },

    deleteFilesFromDisk: function (userUUID,fileUUID) {
        return new Promise(async resolve => {

            fs.rmSync("/usercontentdata/cloud/"+userUUID+"/"+fileUUID)
            resolve();

        })
    },

    copyFilesOnDisk(userUUID, fileUUID, newUUID) {
        return new Promise(  resolve=>{
            fs.copyFileSync("/usercontentdata/cloud/"+userUUID+"/"+fileUUID,"/usercontentdata/cloud/"+userUUID+"/"+newUUID)
            resolve();
        })
    },

    checkFileName(name) {

        const invalidCharacters = ['"',"*",":","<",">","?","\\","|","/"]

        let invalid = false;
        invalidCharacters.forEach(char=>{

           if( name.includes(char)) {
               invalid=true;
           }

        })
        console.log((!invalid)&&(name.length<256))

        return (!invalid)&&(name.length<256);


    }
};

module.exports = fileStructureHandler;