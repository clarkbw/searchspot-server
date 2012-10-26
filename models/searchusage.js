/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, devel:true, node:true, boss : true,
  indent:2, maxerr:50, globalstrict:true, nomen:false, white:true, newcap:true */

"use strict";

var MODEL_NAME = "SearchUsage";
module.exports = function (mongoose, SearchEngine) {
  var Schema = mongoose.Schema,
      SearchUsage;

/*
 // SEARCH USAGE PATTERN EXAMPLE
 {"id":"http://www.linkedin.com/search/fpsearch","order":2,"suggestions":1,"index":0};
*/
  SearchUsage = new Schema({
    engine : { type: Schema.ObjectId, ref: 'SearchEngine' },
    order : {
      type : Number,
      required : true
    },
    suggestions : {
      type : Number,
      required : false
    },
    index : {
      type : Number,
      required: false
    },
    added : {
      type : Date,
      "default": Date.now,
      required : true,
      index: true
    }
  });

  SearchUsage.statics.create = function create(engine, stat, callback) {
    var SearchUsageModel = mongoose.model(MODEL_NAME, SearchUsage),
        searchusage = null;

    SearchEngine.findOneAndUpdate({'id' : engine.id },
                                  {},
                                  {upsert : true, sort : {used_count : -1}},
      function (err, engine) {
        console.log("err", err);
        console.log("engine", engine);
        var _model = { engine: engine._id };
        ["order", "suggestions", "index"].forEach(function (index) {
          if (typeof stat[index] !== "undefined") {
            _model[index] = parseInt(stat[index], 10);
          }
        });
        searchusage = new SearchUsageModel(_model);
        console.log(searchusage);
        searchusage.save(function (err) {
          callback(err, searchusage);
        });
      }
    );

  };

  return mongoose.model(MODEL_NAME, SearchUsage);
};
