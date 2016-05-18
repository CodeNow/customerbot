var Slack = require('@slack/client');  
var RtmClient = Slack.RtmClient;  
var RTM_EVENTS = Slack.RTM_EVENTS;

var token = process.env.BOT_API_KEY;

var rtm = new RtmClient(token, { logLevel: 'info' });  
rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, function(message) {  
  var channel = message.channel;
  var text = message.text;

  if (text == "tags") {
    setTimeout(1000, function (){
      rtm.sendMessage("these are all the tags from intercom", channel);
    });
  } else  {
    rtm.sendMessage("I do not understand this command", channel);
  }

});
