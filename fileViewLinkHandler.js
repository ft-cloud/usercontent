const uuidGen = require('uuid');
const fileStructureHandler = require("./fileStructureHandler");

const fileViewLinkHandler = {


    generateViewLink(userUUID, fileUUID,file) {
        return new Promise(resolve => {
            const uuidBuf = Buffer.from(uuidGen.v4(), 'utf-8')
            const uuid = uuidBuf.toString('base64');
            const viewLinkCollection = global.database.collection("viewLink");

            viewLinkCollection.deleteOne({fileUUID:fileUUID}).then((res)=>{
                if(res.deletedCount>0) {
                    console.log("Cloud: ViewLink for this file has been replaced")
                }
                viewLinkCollection.insertOne({
                    linkUUID: uuid,
                    user: userUUID,
                    fileUUID: fileUUID,
                    file: file
                })

                resolve({
                    linkUUID: uuid,
                    user: userUUID,
                    fileUUID: fileUUID,
                    file: file
                })
            })


        })
    },

    getViewLinkContent(linkUUID) {

        return new Promise(resolve => {
            const viewLinkCollection = global.database.collection("viewLink");
            viewLinkCollection.findOne({linkUUID: linkUUID}).then(result=>{
                viewLinkCollection.deleteOne({linkUUID: linkUUID}).then(()=>{
                    resolve(result);
                })
            })
        })

    }


}
module.exports = fileViewLinkHandler;