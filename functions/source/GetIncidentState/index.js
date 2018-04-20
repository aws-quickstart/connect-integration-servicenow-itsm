var https = require('https');

exports.handler = function (contact, context, callback) {
    var params = contact.Details.Parameters;
    params.callback = callback;
    getRequestData(params);
    getRequestOptions(params);
    getData(params);
};

var getData = function (params) {

    var get_request = https.request(params.get_options, function (res) {
        var body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => params.callback(null, JSON.parse(body)));
        res.on('error', e => context.fail('error:' + e.message));
    });
    get_request.write(params.get_data);
    get_request.end();
};

var getRequestOptions = function(params){
    params.get_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: '/api/now/table/incident?sysparm_query=number%3D'+params.requestData.number+'&sysparm_fields=state',
        method: 'get',
        headers: {
            "Content-Type": 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
        }
    };
};

var getRequestData = function (params) {
    params.requestData = {
        number: params.IncidentNumber
    };
    params.get_data = JSON.stringify(params.requestData); 
};