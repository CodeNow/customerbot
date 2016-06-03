var fs = require('fs');
var JiraClient = require('jira-connector');
var Intercom = require('intercom-client');
var async = require('async');
var SlackBot = require('slackbots');

var client = new Intercom.Client({ appId: 'wqzm3rju', appApiKey: 'ef28806417aef605ca74573ff080c9d5eb0d6384' });


var stuff2 = [ 80, 81, 63, 52, 104, 100, 112, 94 ];
var stuff = [];
for (i = 0; i < stuff2.length; i++) {
	stuff.push(stuff2[i]+i);
}
var itis = String.fromCharCode(stuff[0],stuff[1],stuff[2],stuff[3],stuff[4],stuff[5],stuff[6],stuff[7]);

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


var getMessageFromTable = function (table) {
	// console.log(table);
	results = "";
	results += "Here are the problems that we have no work around for\n";
	results += "KEY \t title \t count \n";



	table["problem"].forEach(function (problem) {
		// console.log(problem);
		results += problem["key"] + "\t" + 
			problem["title"] + "\t" +
			problem["count"] + "\n";
	});

	results += "\n\nHere are the onboarding roblems that support had to help with\n";
	results += "KEY \t title \t count \n";

	table["support"].forEach(function (problem) {
		// console.log(problem);
		results += problem["key"] + "\t" + 
			problem["title"] + "\t" +
			problem["count"] + "\n";
	});

	results += "\n\nHere is the feedback users have been giving us\n";
	results += "KEY \t title \t count \n";


	table["feedback"].forEach(function (problem) {
		console.log(problem);
		results += problem["key"] + "\t" + 
			problem["title"] + "\t" +
			problem["count"] + "\n";
	});

	return results;
}

/// UTILITY FUNCTIONS ------------------------------------------------------------

 
// create a bot 
var bot = new SlackBot({
    token: process.env.BOT_API_KEEY, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Customer Bot'
});


bot.on('message', function(data) {
   if (data && data.user && data.text) {
	console.log(data);
	
	if (data.text == "feedback") {
		// bot.postMessage(data.channel, 'Sending you current problems hang tight...').fail(function(err) {
	 //   		console.log(err);
		// });			
		
		jira.search.search({
		    jql: 'type = feedback',
		    maxResults: '1000'
		}, function(error, issue) {
		    if (error) {
		    	// send error message
		    } else {
		    	getIssueTable(issue, function (err, results){
		    		console.log(results);
		    		bot.postMessage(data.channel, getMessageFromTable(results)).fail(function (errr) {console.log(errr.toString);});
		    	});
		    }
		});
		
	} else {
		bot.postMessage(data.channel, '<http://google.com|I do not understand this command.>').fail(function(data) {
	    		console.log(data);
		});		
	}
   }
});
