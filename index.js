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



/// UTILITY FUNCTIONS ------------------------------------------------------------
var getTagCount = function (tag_id, cb) {
	client.companies.listBy({ tag_id: tag_id }, function (err, res) {
		if (err) {
			console.log("somethign went wrong trying to find this tag ", tag_id, err.error);
			cb(-1);
		} else {
			cb(res.body.total_count);
		}
	});	
}

var generateTagsTable = function (cb) {
	var r = {};

	client.tags.list( function (err, list) {
		async.forEachSeries(list.body.tags, function (e,icb) {
		   if (e.name.indexOf("SAN-") >= 0) {
		   		getTagCount(e.id, function (count) {
					r[e.name] = count;
				   	icb();
					// console.log(r);
		   		});
		   } else {
		   		icb();
		   }
		}, function (err) {
		    // console.log(r);
		    if (err)
		    	cb(err, null);

		    console.log("done");
		    cb(null, r);
		});
	});
}

var getIssueTable = function (issues, cb) {
	var results = {};
	results["problem"] = [];
	results["feedback"] = [];
	results["support"] = [];

	generateTagsTable(function (err, tags_intercom) {
		if(err)
			cb(err, null);

		issues.issues.forEach(function (issue) {
			if (tags_intercom[issue.key]) {
				if (issue.fields.labels.indexOf("problem") > -1) {
					results["problem"].push({
						"key" : issue.key,
						"title": issue.fields.summary,
						"count": tags_intercom[issue.key], 
					});
				} else if (issue.fields.labels.indexOf("support") > -1) {
					results["support"].push({
						"key" : issue.key,
						"title": issue.fields.summary,
						"count": tags_intercom[issue.key], 
					});
				} else {
					results["feedback"].push({
						"key" : issue.key,
						"title": issue.fields.summary,
						"count": tags_intercom[issue.key], 
					});
				}
			}
		});

		results["feedback"].sort(function(a,b) {
			return b.count - a.count;
		});

		results["support"].sort(function(a,b) {
			return b.count - a.count;
		});

		results["problem"].sort(function(a,b) {
			return b.count - a.count;
		});


		cb(null, results);
	});
}

/// UTILITY FUNCTIONS ------------------------------------------------------------

// ##### MAIN DISPATCH #####

// var rtm = new RtmClient(token, { logLevel: 'info' });  
// rtm.start();

// rtm.on(RTM_EVENTS.MESSAGE, function(message) {  
//   var channel = message.channel;
//   var text = message.text;

//   if (text == "feedback") {
//   	rtm.sendMessage("Sending current problems... hang tight.", channel);
// 	jira.search.search({
// 	    jql: 'type = feedback',
// 	    maxResults: '1000'
// 	}, function(error, issue) {
// 	    if (error) {
// 	    	// send error message
// 	    } else {
// 	    	getIssueTable(issue, function (err, results){
// 	    		console.log(results);
// 	    		rtm.sendMessage(results, channel);
// 	    	});
// 	    }
// 	});
	
//   } else  {
//     rtm.sendMessage("I do not understand this command", channel);
//   }

// });
///--------- new attempt below

var SlackBot = require('slackbots');
 
// create a bot 
var bot = new SlackBot({
    token: process.env.BOT_API_KEY, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Customer Bot'
});


bot.on('message', function(data) {
   if (data) {
    console.log("here is the datum", data);
    console.log(data.type);
    console.log(data.text);
    
    //if (data.type == "message" && data.text == "feedback") {
	   // 	bot.postMessageToUser(data.user, 'Sending you current problems...', function (data) {
	   // 		console.log(data);
	   // 	});
   	// }   	
   }
});
