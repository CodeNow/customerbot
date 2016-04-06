var Bot = require('slackbots');

// create a bot
var settings = {
    token: process.env.BOT_API_KEY,
    name: 'My Bot'
};
var bot = new Bot(settings);

bot.on('start', function() {
    bot.postMessageToUser('praful', 'hello bro!');
});

bot.on('message', function(data) {
    // all ingoing events https://api.slack.com/rtm 
    bot.postMessageToUser(data.user, 'hi', function(data) {/* ... */});
    console.log(data);
});
