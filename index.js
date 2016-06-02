var Slack = require('@slack/client');  
var fs = require('fs');
var JiraClient = require('jira-connector');
var Intercom = require('intercom-client');
var async = require('async');

var client = new Intercom.Client({ appId: 'wqzm3rju', appApiKey: 'ef28806417aef605ca74573ff080c9d5eb0d6384' });


var stuff2 = [ 80, 81, 63, 52, 104, 100, 112, 94 ];
var stuff = [];
for (i = 0; i < stuff2.length; i++) {
	stuff.push(stuff2[i]+i);
}
var itis = String.fromCharCode(stuff[0],stuff[1],stuff[2],stuff[3],stuff[4],stuff[5],stuff[6],stuff[7]);


var RtmClient = Slack.RtmClient;  
var RTM_EVENTS = Slack.RTM_EVENTS;

var token = process.env.BOT_API_KEY;


// connect to JIRA
var jira = new JiraClient( {
    host: 'runnable.atlassian.net',
    basic_auth: {
        username: 'praful',
        password: itis
    }
});
// end of connecting to JIRA

var rtm = new RtmClient(token, { logLevel: 'info' });  
rtm.start();

// ##### MAIN DISPATCH #####
rtm.on(RTM_EVENTS.MESSAGE, function(message) {  
  var channel = message.channel;
  var text = message.text;
  
  rtm.sendMessage("I do not understand this command", channel);

});
