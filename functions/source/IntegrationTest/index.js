var https = require('https');
var SUCCESS = "SUCCESS";
var FAILED = "FAILED";

exports.handle = (event, context, callback) => {
    console.log("event: " + JSON.stringify(event));
    console.log("context: " + JSON.stringify(context));

    try {
        if (event.hasOwnProperty("keepwarm") || event["RequestType"] === "Delete") {
            console.log("Received keep warm or delete event");
            send(event, context, SUCCESS);
            return;
        }

        exports.handler(event, context);

    } catch (error) {
        console.log(error);
        send(event, context, FAILED);
    }

};

exports.handler = function (event, context) {
    var params = {
        phone: "123123123",
        sNowHost: event["ResourceProperties"]["SNOW_HOST"],
        sNowPassword: event["ResourceProperties"]["SNOW_PASSWORD"],
        sNowUserName: event["ResourceProperties"]["SNOW_USERNAME"],
        execute: function (key, params, body) {
            params.funcs[key](params, body);
        },
        funcs: {
            "reportSuccessToCfn": function (params, body) {
                var obj = JSON.parse(body);

                send(event, context, !obj.result ? FAILED : SUCCESS);
                console.log(!obj.result ? "failed" : "succeed");
            },
            "reportFailureToCfn": function (params, body) {
                send(event, context, FAILED);
                console.log("failed");
            }
        }
    };

    params.get_options = {
        host: params.sNowHost,
        port: '443',
        path: `/api/now/table/sys_user?sysparm_query=phone%3D${params.phone}&sysparm_fields=user_name,sys_id`,
        method: 'get',
        headers: {
            "Content-Type": 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + Buffer.from(params.sNowUserName + ":" + params.sNowPassword).toString('base64'),
        }
    };

    params.requestData = {
        Phone: params.phone
    };

    urlExists(params.sNowHost, (itDoes) => {
        console.log(itDoes);
        if (itDoes) {
            params.get_data = JSON.stringify(params.requestData);
            getData(params);
        } else {
            params.funcs.reportFailureToCfn(params, null);
        }
    });

};

var getData =  function (params) {
    try {

        var get_request = https.request(params.get_options, function (res) {
            var body = '';
            res.on('data', processData);

            function processData(chunk) {
                console.log("data: " + chunk);
                return body += chunk;
            }

            res.on('end', processSuccess);

            function processSuccess() {
                console.log("On success body: " + body);
                return params.execute("reportSuccessToCfn", params, body);
            }

            res.on('error', processFailure);

            function processFailure(e) {
                console.log("On error body: " + body);
                return params.execute("reportFailureToCfn", params, body);
            }
        });
        get_request.write(params.get_data);
        get_request.end();

    } catch (err) {
        console.log(err);
        params.funcs.reportFailureToCfn(params, null);
    }
};


var send = function (event, context, responseStatus, responseData, physicalResourceId) {

    if (!event.StackId) return;

    var responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: physicalResourceId || context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData
    });

    console.log("Response body:\n", responseBody);

    var https = require("https");
    var url = require("url");

    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };

    var request = https.request(options, function (response) {
        console.log("Status code: " + response.statusCode);
        console.log("Status message: " + response.statusMessage);
        context.done();
    });

    request.on("error", function (error) {
        console.log("send(..) failed executing https.request(..): " + error);
        context.done();
    });

    request.write(responseBody);
    request.end();
};

var urlExists = function (url, callback) {
    var http = require('https'),
        options = {
            method: 'HEAD',
            host: url,
            path: '/'
        },
        req = http.request(options, function (r) {
            callback(r.statusCode === 200);
        });
    req.on("error", function (error) {
        callback(false);
    });
    req.end();
};