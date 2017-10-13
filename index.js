const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: false });
const request = require('request');
const AWS = require('aws-sdk');
const simpledb = new AWS.SimpleDB();
const _ = require("lodash");
const Q = require("q");

types = {
    "general": "🏢🌳",
    "metro_train": "🏢🚄",
    "metro_tram": "🏢🚊",
    "metro_bus": "🏢🚌",
    "regional_train": "🌳🚂",
    "regional_coach": "🌳🚌",
    "regional_bus": "🌳🚌"
}
function getDisruptions() {
    var deferred = Q.defer();
    request.get(process.env.DISRUPTIONS_URL, function (error, response, body) {
        if (error) {
            deferred.reject(error)
            return
        }
        deferred.resolve(body);
    });
    return deferred.promise
}

function processDisruptions(body) {
    var promiseArray = [];
    var disruptions = JSON.parse(body);
    for (var mode in types) {
        var mode_disruptions = disruptions['disruptions'][mode];
        for (var value = 0; value < mode_disruptions.length; value++) {
            promiseArray.push(checkDisruptionsStatus(mode_disruptions[value], mode))
        }
    }
    return Q.all(promiseArray);
}

function checkDisruptionsStatus(value,mode) {
    var deferred = Q.defer();
    console.log("Checking - " + value.title)
    if (value.disruption_status == "Current") {
        var params = {
            DomainName: process.env.SIMPLEDB_DB,
            ItemName: value.disruption_id.toString(),
            AttributeNames: [
                'last_updated'
            ],
            ConsistentRead: true
        };
        simpledb.getAttributes(params, function (err, data) {
            if (err) {
                sendMessage(value,mode).then(updateSimpleDB).then(function () {
                    console.log("resolving send message1")
                    deferred.resolve()
                })
                console.log(err, err.stack);

            } else {
                console.log(data);
                if (!("Attributes" in data)) sendMessage(value,mode).then(updateSimpleDB).then(function () {
                    console.log("resolving send message2")
                    deferred.resolve(value)
                })
                db_result = _.keyBy(data['Attributes'], 'Name');
                if ("last_updated" in db_result && db_result["last_updated"]["Value"] != value.last_updated) {
                    sendMessage(value,mode).then(updateSimpleDB).then(function () {
                        console.log("resolving send message3")
                        deferred.resolve(value)
                    })
                } else {
                    deferred.resolve(value,mode)
                    console.log("don't need to send update for " + value.disruption_id)
                }
            }
        });

    } else {
        deferred.resolve(value)
    }
    return deferred.promise
}

function sendMessage(value, mode) {
    console.log("sending message for - " + value.disruption_id)
    var deferred = Q.defer();
    var message = ""
    if (value.title.toLowerCase().indexOf("car park") != -1 || value.title.toLowerCase().indexOf("carpark") != -1 || value.title.toLowerCase().indexOf("minor") != -1 || value.disruption_type.toLowerCase().indexOf("planned") != -1) {
        deferred.resolve(value)
        return deferred.promise
    }
    if (value.description.toLowerCase().indexOf("fire") != -1) message += "🔥"
    if (value.description.toLowerCase().indexOf("police") != -1) message += "🚓"
    if (value.description.toLowerCase().indexOf("suicide") != -1) message += "⚰️"
    if (value.description.toLowerCase().indexOf("signal") != -1) message += "🚥"
    message += types[mode] + " <b>" + value.title + "</b>\n"
    message += " <a href=\"" + value.url + "\">"
    message += value.description + "\n"
    message += "</a>"
    bot.sendMessage(process.env.CHANNEL, message, { "parse_mode": "HTML" }).then(
        function (data) {
            console.log("resolving bot send for " + value.disruption_id)
            deferred.resolve(value)
        }
    );
    return deferred.promise
}

function updateSimpleDB(value) {
    var deferred = Q.defer();
    var params = {
        Attributes: [
            {
                Name: 'last_updated',
                Value: value.last_updated,
                Replace: true
            }
        ],
        DomainName: process.env.SIMPLEDB_DB,
        ItemName: value.disruption_id.toString()
    };
    simpledb.putAttributes(params, function (err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            deferred.reject(err)
        }
        else {
            console.log(data);           // successful response
            deferred.resolve(value);
        }
    });

    return deferred.promise
}


// getDisruptions().then(processDisruptions).then(function () {
//     console.log("done")
// })
exports.handler = function (event, context, callback) {
    getDisruptions().then(processDisruptions).then(function () {
        callback(null, {})
    });
}