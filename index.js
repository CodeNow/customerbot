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
	results += "*Here are the problems that we have no work around for*\n";

	table["problem"].forEach(function (problem) {
		// console.log(problem);
		results += "<https://runnable.atlassian.net/browse/" + problem["key"] + "|" + problem["key"] + ">" + "\t" + 
			problem["title"] + "\t" +
			problem["count"] + " companies\n";
	});

	results += "\n\n*Here are the onboarding roblems that support had to help with*\n";

	table["support"].forEach(function (problem) {
		// console.log(problem);
		results += "<https://runnable.atlassian.net/browse/" + problem["key"] + "|" + problem["key"] + ">" + "\t" +
			problem["title"] + "\t" +
			problem["count"] + " companies\n";
	});

	results += "\n\n*Here is the feedback users have been giving us*\n";

	table["feedback"].forEach(function (problem) {
		console.log(problem);
		results += "<https://runnable.atlassian.net/browse/" + problem["key"] + "|" + problem["key"] + ">" + "\t" +
			problem["title"] + "\t" +
			problem["count"] + " companies\n";
	});

	return results;
}

var getCompanyFromName = function (company_name, cb) {

	var companyList = [];


	var recursiveFetchCompaines = function (err, results) {
		if (err)
			console.log(err);

		if (!results || results.body.pages.page > results.body.pages.total_pages) {

			var found = false;

			companyList.forEach(function (company){
				if (company.name == company_name) {
					found = true;
					cb(company);
				}
			});
			if (found == false) {
				cb(null);
			}
			
			
		} else {
			results.body.companies.forEach(function (company) {
				companyList.push(company);
			});

			client.nextPage(results.body.pages, recursiveFetchCompaines);
		}
	}


	client.companies.list(function (err, results) {
		var ctr = 0;
		var maxPage = 0;

		var maxPage = results.body.pages.total_pages;

		if (err)
			console.log(err);

		results.body.companies.forEach(function (company) {
			companyList.push(company);
		});

		client.nextPage(results.body.pages, recursiveFetchCompaines);
	});	
}

var addNote = function (message, companyName, cb) {
	client.users.find({ user_id: 'navi-' + companyName }, function (err, res) {
		if (err) {
			// navi user does not exist; skipping notes.
			cb('navi user does not exist, skipping');
		} else {
			// Create a note
			var note = {
			  admin_id: 22382,
			  body: message,
			  id: res.body.id
			};

			client.notes.create(note, function (err1, res) {
				if (err1) {
					cb('ran into an error adding the note' + JSON.stringify(err1));
				} else {
					cb('successfully added note');
				}
			});
		}
	});
}

var findUserById = function (id, cb) {
	bot.getUsers().then(function (data){
		var found = false;

		data.members.forEach(function (member) {
			if (id == member.id) {
				found = true;
				cb(member.name);
			}
		});
		if (!found)
			cb(null);
	});
}


/// UTILITY FUNCTIONS ------------------------------------------------------------

 
// create a bot 
var bot = new SlackBot({
    token: process.env.BOT_API_KEEY, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Customer Bot'
});


var LogChannel = "#intercom";

bot.on('message', function(data) {
   if (data && data.user && data.text) {
	console.log(data);
	
	if (data.text == "feedback") {
		bot.postMessage(data.channel, 'Sending you current problems hang tight...').fail(function(err) {
	    		console.log(err);
		});			
		
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
		
	} else if (data.text.indexOf("tag") == 0) {
		// bot.postMessage(data.channel, 'trying to tag').fail(function (errr) {console.log(errr.toString);});
		
		//process tag args
		var split = data.text.split(' ');
		
		var companyName = split[1];
		
		var JIRA = split[2];
		
		// if no notes
		if (!split[3]) {
			bot.postMessage(data.channel, 'No notes detected; format for tagging = tag <company name> <SAN number> <notes>').fail(function (errr) {console.log(errr.toString);});
		} else {
			var i = 3;
			var notes = "";
			
			for (i = 3; i < split.length; i++) {
				notes += split[i] + " ";
			}
			
			jira.issue.getIssue({ issueKey: JIRA}, function (err, issue) {
				if (!issue) {
					bot.postMessage(data.channel, 'Issue is not Filed on Jira; format for tagging = tag <company name> <SAN number> <notes>').fail(function (errr) {console.log(errr.toString);});
				} else {
					getCompanyFromName(companyName, function (company) {
						if (!company) {
							bot.postMessage(data.channel, 'Company does not exist in Intercom; format for tagging = tag <company name> <SAN number> <notes>').fail(function (errr) {console.log(errr.toString);});
						} else {
							client.tags.tag({ name: JIRA, companies: [{ id: company.id }] }, function (err, res) {
								if (err){
									console.log(err);
									console.log(company);
									bot.postMessage(data.channel, 'there was an error tagging this company').fail(function (errr) {console.log(errr.toString);});
								}
								else {
									
									findUserById (data.user, function (username) {
										// add a note to the navi user (since we can't add notes to Companies) 
										addNote(username + " tagged this company with  " + JIRA + " because " + notes, companyName, function (message) {
											bot.postMessage(data.channel, username + ' tagged ' + companyName + " with " + JIRA).fail(function (errr) {console.log(errr.toString);});
											bot.postMessage(LogChannel, username + ' tagged ' + companyName + " with " + JIRA + " because " + notes).fail(function (errr) {console.log(errr.toString);});
										});										
									});

								}
									
							});
						}
					})
				}
			})
			
		}
		
	} else if (data.text == "help") {
		bot.postMessage(data.channel, 'I only got 2 commands that I listen to: `tag` and `feedback`').fail(function (errr) {console.log(errr.toString);});
	}
	else {
		// bot.postMessage(data.channel, 'I do not understand this command').fail(function(data) {
	 //   		console.log(data);
		// });		
	}
   }
});
