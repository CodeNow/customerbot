var Bot = require('slackbots');

// create a bot
var settings = {
    token: process.env.BOT_API_KEY,
    name: 'My Bot'
};
var bot = new Bot(settings);

bot.on('start', function() {
    bot.postMessageToChannel('some-channel-name', 'Hello channel!');
    bot.postMessageToUser('some-username', 'hello bro!');
    bot.postMessageToGroup('some-private-group', 'hello group chat!');
});
