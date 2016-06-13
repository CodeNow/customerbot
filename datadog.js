var dogapi = require('dogapi');
var options = {
  api_key: 'c9171c92f8cdebf81d51191d6523d65a',
  app_key: '54a74a9c827bd7792f238f55cf3e1979d32065e6'
};
dogapi.initialize(options);

/**
 * queries datadog for cost metrics for an org
 * @param  {String}   orgId  github org id of the org
 * @param  {Function} cb    (err, costInDollers)
 */
function getCostForOrg (orgId, cb) {
  var now = parseInt(new Date().getTime() / 1000);
  var then = now - 3600; // one hour ago
  var query = '((sum:system.mem.total{org:'+orgId+',role:dock,env:production-delta} * 10.8) / 1046347776) + ((sum:system.disk.total{org:'+orgId+',role:dock,env:production-delta} * 0.1) / 1072073362.9217391)';
  dogapi.metric.query(then, now, query, function(err, res){
    console.log('getCostForOrg', res);
    cb(err, res.value)
  });
}

function setUserCountForOrg (orgId, numUsers) {
  dogapi.metric.send('user.count', parseInt(numUsers), {
    tags: ['org:' + orgId],
    type: 'gauge'
  }, function(err, results){
    console.log('setUserCountForOrg', orgId, numUsers, err, results);
  });
}

module.exports.getCostForOrg = getCostForOrg;
module.exports.setUserCountForOrg = setUserCountForOrg;