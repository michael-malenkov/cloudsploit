var async = require('async');

module.exports = function(collection, reliesOn, callback) {
    if (!reliesOn['storageAccounts.listKeys']) return callback();

    var azureStorage = require('@azure/storage-queue');

    if (!collection['queueService']['getProperties']) collection['queueService']['getProperties'] = {};

    // Loop through regions and properties in reliesOn
    async.eachOf(reliesOn['storageAccounts.listKeys'], function(regionObj, region, cb) {
        collection['queueService']['getProperties'][region] = {};

        async.eachOfLimit(regionObj, 5, async function(subObj, resourceId, sCb) {
            collection['queueService']['getProperties'][region][resourceId] = {};

            if (subObj && subObj.data && subObj.data.keys && subObj.data.keys[0] && subObj.data.keys[0].value) {

                try {
                    const storageAccountName = resourceId.substring(resourceId.lastIndexOf('/') + 1);
                    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${subObj.data.keys[0].value};EndpointSuffix=core.windows.net`;
                    const storageService = azureStorage.QueueServiceClient.fromConnectionString(connectionString);
                    const properties = await storageService.getProperties();
                    if (properties) {
                        collection['queueService']['getProperties'][region][resourceId].data = properties;
                    } else {
                        collection['queueService']['getProperties'][region][resourceId].data = {};
                    }

                } catch (exception) {
                    collection['queueService']['getProperties'][region][resourceId].err = exception.message;
                }
                sCb();
            } else {
                sCb();
            }
        }, function() {
            cb();
        });
    }, function() {
        callback();
    });
};