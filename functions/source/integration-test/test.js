var https = require('https');
exports.handler = function (contact, context) {
    var params = {
        phone: "123123123"
    };

    getProcessFunctions(params);

    getPhoneRequestData(params);
    getPhoneRequestOptions(params);
    getData(params, "returnToConnect");
};

var getProcessFunctions = function (params) {
    params.execute = function (key, params, body) {
        params.funcs[key](params, body);
    };
    params.funcs = {
        "returnToConnect": function (params, body) {
            send(contact, context, "SUCCEED", {}, '');
        }
    };
};
var getData = function (params, key) {
    var get_request = https.request(params.get_options, function (res) {
        var body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => params.execute(key, params, body));
        res.on('error', e => send(contact, context, "FAILED", {}, ''));
    });
    get_request.write(params.get_data);
    get_request.end();
};


var getPhoneRequestOptions = function (params) {
    params.get_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: `/api/now/table/sys_user?sysparm_query=phone%3D${params.requestData.Phone}&sysparm_fields=user_name,sys_id`,
        method: 'get',
        headers: {
            "Content-Type": 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
        }
    };
};

var getPhoneRequestData = function (params) {
    params.requestData = {
        Phone: (params.Parameters.Phone ? params.Parameters.Phone : params.ContactData.CustomerEndpoint.Address.substring(2)),
    };
    params.get_data = JSON.stringify(params.requestData);
};
var send = function (event, context, responseStatus, responseData, physicalResourceId) {

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
    }
};