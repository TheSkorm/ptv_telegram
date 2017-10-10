/// This is a utility file to help invoke and debug the lambda function. It is not included as part of the
/// bundle upload to Lambda.
///
/// Credentials:
/// The AWS SDK for Node.js will look for credentials first in the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and then 
/// fall back to the shared credentials file. For further information about credentials read the AWS SDK for Node.js documentation
/// http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Credentials_from_the_Shared_Credentials_File_____aws_credentials_
/// 
/// TypeScript References
/// <reference path="typings/tsd.d.ts" />
// Set the region to the locations of the S3 buckets
var fs = require('fs');
var app = require('./index');
// Load the sample event to be passed to Lambda. The _sampleEvent.json file can be modified to match
// what you want Lambda to process on.
var lambdaEvent = {}
var context = {
    succeed: function (result) {
        if (result) {
            console.info(result);
        }
    },
    done: function (error, result) {
        if (error) {
            console.error(error);
        }
        if (result) {
            console.info(result);
        }
    },
    fail: function (error) {
        if (error) {
            console.error(error);
        }
    },
    getRemainingTimeInMillis: function () {
        // Mocked to be 30 seconds
        return 30000;
    }
};

function callback(err, data){
    if (err){
        console.error(err);
    } else {
        console.info(data)
    }
}
app.handler(lambdaEvent, context, callback);

//# sourceMappingURL=_testdriver.js.map