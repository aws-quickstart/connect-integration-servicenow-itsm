var https = require('https');
exports.handler = function (contact, context, callback) {
    if (!contact.Details || !contact.Details.Parameters) return;
    var params = contact.Details.Parameters;
    params.ANI = contact.Details.ContactData.CustomerEndpoint.Address;
    params.callback = callback;
    getProcessFunctions(params);
   
    getPhoneRequestData(params);
    getPhoneRequestOptions(params);
    getData(params, "processUserName");
};

var getProcessFunctions = function(params){
    params.execute = function(key, params, body){
            params.funcs[key](params, body);
    };
    params.funcs = {
        "returnToConnect" :  function(params, body){
            var states = ["New","Active","Awaiting Problem", "Awaiting User Info", "Awaiting Evidence", "Resolved", "Closed"];
            var responseObj = JSON.parse(body);
            if(responseObj.result){
                responseObj.result[0].state = states[parseInt(responseObj.result[0].state) - 1];
                params.callback(null, responseObj.result[0]);
            }
            else{
                params.callback(null,JSON.parse('{"Error": "No incidents related"}'));
            }
        },
        "processUserName" : function (params, body){
            var userObj = JSON.parse(body);
            if(userObj.result[0]){
                params.sys_id = userObj.result[0].sys_id;
                getRequestOptions(params, `/api/now/table/incident?sysparm_query=caller_id%3D${params.sys_id}^ORDERBYDESCnumber&sysparm_fields=number,state&sysparm_limit=1`);
                getData(params, "returnToConnect");
            }
            else{
                params.execute("returnToConnect",params,'""');
            }
        }
    };
}


var getData = function (params, key) {    
    var get_request = https.request(params.get_options, function (res) {
        var body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => params.execute(key, params, body));
        res.on('error', e => context.fail('error:' + e.message));
    });    
    get_request.write(params.get_data);
    get_request.end();
};

var getRequestOptions = function(params, path){
    params.get_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: path,
        method: 'get',
        headers: {
            "Content-Type": 'application/json',
            Accept: 'application/json',
            Authorization: 'Basic ' + Buffer.from(process.env.SERVICENOW_USERNAME + ":" + process.env.SERVICENOW_PASSWORD).toString('base64'),
        }
    };
};

var getPhoneRequestOptions = function(params){
    params.get_options = {
        host: process.env.SERVICENOW_HOST,
        port: '443',
        path: `/api/now/table/sys_user?sysparm_query=phone%3D${params.requestData.Phone}^ORmobile_phone%3D${params.requestData.Phone}&sysparm_fields=user_name,sys_id&sysparm_limit=1`,
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
        Phone: (params.Phone?params.Phone:params.ANI.substring(2))
    };
    params.get_data = JSON.stringify(params.requestData); 
};