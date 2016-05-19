var Slack = require('@slack/client');  
var fs = require('fs');

var RtmClient = Slack.RtmClient;  
var RTM_EVENTS = Slack.RTM_EVENTS;

var token = process.env.BOT_API_KEY;

var rtm = new RtmClient(token, { logLevel: 'info' });  
rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, function(message) {  
  var channel = message.channel;
  var text = message.text;

  if (text == "tags") {
    fs.readFile("/database/currentDB.csv", function read (err, data) {
      if (err) {
        throw err;
      } 
      console.log(err);
      console.log(data);
      rtm.sendMessage(data, channel);
    });
     
  } else  {
    rtm.sendMessage("I do not understand this command", channel);
  }

});
