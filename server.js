/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, devel:true, node:true, boss : true,
  indent:2, maxerr:50, globalstrict:true, nomen:false, white:true, newcap:true */

"use strict";


var mongodb_url = require("./mongodb-vcap").mongodb_url,
    mongoose = require('mongoose'),
    moment = require("moment"),
    SearchEngine = require('./models/searchengine')(mongoose),
    SearchUsage = require('./models/searchusage')(mongoose, SearchEngine);

var ONE_SECOND = 1000,
    ONE_MINUTE = ONE_SECOND * 60,
    ONE_HOUR = ONE_MINUTE * 60,
    ONE_DAY = ONE_HOUR * 24,
    ONE_YEAR = ONE_DAY * 365;

mongoose.connect(mongodb_url);

var express = require('express'),
    app = express();

app.configure(function () {
  app.use(express.bodyParser());
  //app.use(express.logger());
  app.set('view engine', 'ejs');
  app.set("view options", { layout: false });
  app.set("port", process.env.VCAP_APP_PORT || 8080);
});

// set this with NODE_ENV="development"
app.configure('development', function () {
  app.use(express['static'](__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// set this with NODE_ENV="production" or vmc env-add appname NODE_ENV="production"
app.configure('production', function () {
  app.use(express['static'](__dirname + '/public', { maxAge: ONE_YEAR }));
  app.use(express.errorHandler());
});

app.get('/', function (req, res) {
  SearchEngine.find({ used_count : { $gt : 0 } }).sort({used_count : -1}).exec(function (err, docs) {
    //console.log("err", err);
    //console.log("docs", docs);
    res.render('index.ejs', { thetopengines : JSON.stringify(docs) });
  });
});

app.get('/engine/id/:id', function (req, res) {
  res.contentType('json');
  var id = req.param("id");
  if (id) {
    SearchEngine.findOne({ "_id" : id }).sort({used_count : -1}).exec(function (err, docs) {
      res.json(docs);
    });
  }
});

// looks for an array of comma separated ids 
app.get('/engine/ids/:ids', function (req, res) {
  res.contentType('json');
  var ids = req.param("ids").split(",");
  if (ids) {
    SearchEngine.find({}).or(ids.map(function (id) { return { _id : id }; })).exec(function (err, docs) {
      res.json(docs);
    });
  }
});

app.get('/engine/url/:url', function (req, res) {
  res.contentType('json');
  var url = req.param("url");
  if (url) {
    SearchEngine.find({ "url" : url }).sort({used_count : -1}).exec(function (err, docs) {
      res.json(docs);
    });
  }
});

/**
 * Sends pushes out all engines, this will get expensive as the number of engines
 * increases.  It's unlikely we'll keep this call around
 * @returns {Object} engines : {Array} of engines, success : true
 */
app.get('/engines', function (req, res) {
  res.contentType('json');
  SearchEngine.find({}).sort({used_count : -1}).exec(function (err, docs) {
    //console.log("err", err);
    //console.log("docs", docs);
    res.json(docs);
  });
});

app.get('/top-engines', function (req, res) {
  res.contentType('json');
  SearchEngine.find({used_count : {$gt : 0}}).sort({used_count : -1}).exec(function (err, docs) {
    //console.log("err", err);
    //console.log("docs", docs);
    res.json(docs);
  });
});

app.get('/engines/https', function (req, res) {
  res.contentType('json');
  SearchEngine.findHttps(function (err, docs) {
    //console.log("err", err);
    //console.log("docs", docs);
    res.json(docs);
  });
});

app.get('/engines/geo', function (req, res) {
  res.contentType('json');
  SearchEngine.findGeoLocation(function (err, docs) {
    //console.log("err", err);
    //console.log("docs", docs);
    res.json(docs);
  });
});

app.get('/usage', function (req, res) {
  res.contentType('json');
  // we could also send down all the engines related
  //  SearchUsage.find({}).populate('engine').exec(function(err, docs) {
  var start = moment().subtract('days', 7), end = new Date();
  SearchUsage.find({ "added" : { $gte : start, $lte : end } }).exec(function (err, docs) {
    //console.log("err", err);
    console.log("docs", docs.length);
    res.json(docs);
  });
});

app.post('/service', function (req, res) {
  //console.dir(decodeURIComponent(req.body.data));
  var items = null;
  try {
    items = JSON.parse(decodeURIComponent(req.body.data));
    console.dir(items);
    items.data.forEach(function (item) {
      var action = item.action,
          engine = JSON.parse(item.engine),
          stats = null,
          create = function (err, usage) { };

      //console.log("action", JSON.stringify(action));
      //console.log("data", JSON.stringify(data));
      if (engine) {
        if (action === "use") {
          stats = JSON.parse(item.stats);

          if (stats) {
            // stats is an object of objects { id : { id: id, order : #, suggestions : #, index? : # }}
            for (var i = 0, stat; stat = stats[i]; i++) {
              if (stats.hasOwnProperty(i)) {
              //console.log("stats", i, JSON.stringify(stats[i]));
                SearchUsage.create(engine, stats[i], create);
              }
            }
          }
        }

        SearchEngine.findOneAndUpdate({'id' : engine.id },
                                      {$set: {$inc: {used_count: 1}}},
                                      {upsert : true, sort : {used_count : -1}}
                                      );

        res.send(JSON.stringify({ success : true }));
      } else {
        res.send(JSON.stringify({ success : false }));
      }
    });

  } catch (e) {
    console.log("e", e);
    console.log(JSON.stringify(items));
    //console.log("req.body", req.body);
    //console.log("req.body.data", req.body.data);
    res.send(JSON.stringify({ success : false, error : e }));
  }

});


app.listen(app.settings.port);
