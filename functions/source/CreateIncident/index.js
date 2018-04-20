var https = require('https');

exports.handler = function (contact, context, callback) {
    var params = contact.Details.Parameters;
    params.callback = callback;
    getRequestData(params);
    getPostOptions(params);
    postData(params);
};

var postData = function (params) {

    var post_request = https.request(params.post_options, function (res) {
        var body = '';

        res.on('data', chunk => body += chunk);
        res.on('end', () => params.callback(null, JSON.parse(body)));
        res.on('error', e => context.fail('error:' + e.message));
    });

    post_request.write(params.post_data);
    post_request.end();
};

var getPostOptions = function(params){
    params.post_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: '/api/now/table/incident',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
            'Content-Length': Buffer.byteLength(params.post_data)
        }
    };
};

var getRequestData = function (params) {
    params.requestData = {
        "short_description": params.Description,
        "created_by": params.Username,
        "caller_id": params.CallerID
    };
    params.post_data = JSON.stringify(params.requestData); 
};