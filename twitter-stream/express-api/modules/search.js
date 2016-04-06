var config = require('./../config');
var stringHash = require('string-hash');
var async = require('async');
var Q = require('q');

// Set up connection to Redis
var redis = require("redis").createClient(
  config.redis.port,
  config.redis.host,
  {detect_buffers: true});

if(redis.auth) {
  redis.auth(config.redis.auth, function (err) {
    if(err) {
      console.error("Redis Authentication failed");
    } else {
    }
  });
}

exports.findRecommendations = function() {
  var deferred = Q.defer();
  var rangeArgs = [ config.store.voteZset, 0, 9 ];

  redis.zrevrange(rangeArgs, function (err, response) {
    var result = [];
    if(err) {
      deferred.reject(err);
    } else {
      if (response.length === 0) {
        // No result
        deferred.resolve([]);
      } else {
        async.forEach(response, function (tweetId, callback) {
          redis.hget(config.store.tweetHash, tweetId, function (err, reply) {
            // console.log(">>",reply);
            result.push({ id: tweetId, content: reply });
            callback();
          });
        }, function (err) {
          if(err) {
            deferred.reject(err);
            return;
          }
          deferred.resolve(result);
        });
      }
    }
  });

  return deferred.promise;

};

exports.voteTweet = function(tweetId) {
  var dfd = Q.defer();
  redis.zincrby(config.store.voteZset, 1, tweetId, function (err, reply) {
    if(err) {
      dfd.reject(err);
      return;
    }
    return dfd.resolve(reply);
  });

  return dfd.promise;
};

exports.findById = function(tweetId) {
  var res = null;
  var dfd = Q.defer();
  redis.hget(config.store.tweetHash, tweetId, function (err, reply) {
    if(err) {
      dfd.reject(err);
      return;
    }
    res = (reply) ? { id: tweetId, content: reply } : reply;
    return dfd.resolve(res);
  });

  return dfd.promise;
};

exports.findByHashtag = function(hashtag) {
  var deferred = Q.defer();
  var score = stringHash(hashtag);
  var args1 = [ config.store.hashtagZset, score, score ];

  redis.zrangebyscore(args1, function (err, response) {
    var result = [];
    if(err) {
      deferred.reject(err);
    } else {
      if (response.length === 0) {
        // No result
        deferred.resolve([]);
      } else {
        //console.log('Result', response);
        async.forEach(response, function (tweetId, callback) {
          redis.hget(config.store.tweetHash, tweetId, function (err, reply) {
            // console.log(">>",reply);
            result.push({ id: tweetId, content: reply});
            callback();
          });
        }, function (err) {
          if(err) {
            deferred.reject(err);
            return;
          }
          deferred.resolve(result);
        });
      }
    }
  });

  return deferred.promise;
};
