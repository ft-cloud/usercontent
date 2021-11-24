const path = require("path");
const fileStructureHandler = {
    folderStructureExists: function (path, userUUID) {
        return new Promise((resolve) => {
            this.getFileStructure(userUUID).then(fileStructure => {
                let currentFileStructure; //current sub folder from database where we start to iterate
                let lastFolder = fileStructure; //last found folder in database
                if (fileStructure != null) { //when we dont receive folder structure from database
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

    getFileStructure: function (userUUID) {
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

    fileExists(pathToFile,userUUID) {

      return new Promise((resolve => {

          let pathWithoutFile = [...pathToFile]
          const file = pathWithoutFile.pop();

          this.folderStructureExists(pathWithoutFile,userUUID).then((folder)=>{

              if(folder.result===true) {
                if(folder.foundFolder.files!=null) {

                    folder.foundFolder.files.forEach(folderFile=>{
                        if(folderFile.name===file) {
                            resolve({result: true,file:folderFile})
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

    /**
     * file:
     *   {
            "isFolder": false,
            "mimeType": "image/jpeg",
            "fileUUID": "a838584-742747-345835h-sh475ng45",
            "fileSize": 7423734,
            "name": "tree.jpeg"
            }
     * @param path please check if folder exists
     * @param file
     * @param userUUID the user you want to add the file
     */
    pushFile(path,file,userUUID) {
        const accountCollection = global.database.collection("account");
        //https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/#mongodb-update-up.---identifier--
       // { arrayFilters: [ { "t.type": "quiz" } , { "score": { $gte: 8 } } ], multi: true}

    }
};

module.exports = fileStructureHandler;