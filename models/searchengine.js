/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, devel:true, node:true, boss : true,
  indent:2, maxerr:50, globalstrict:true, nomen:false, white:true, newcap:true */

"use strict";

var MODEL_NAME = "SearchEngine";
var URL = require("url");
module.exports = function (mongoose) {
  var Schema = mongoose.Schema,
      SearchEngine;

/*
  {  // SEARCH ENGINE EXAMPLE
    id : "http://example.com/opensearch.xml",
    name : "Example Search",
    siteURL : "http://example.com/index.html",
    host : "http://example.com/",
    type : "suggest",  <-- legacy
    baseURL : "", <-- legacy
    queryURL: "http://example.com/search?q={searchTerms}&geo={geo:name}",
    suggestionURL : "http://example.com/suggestions?q={searchTerms}&geo={geo:name}",
    icon : "http://example.com/favicon.ico"
  }
*/
  SearchEngine = new Schema({
    name : {
      type : String,
      required : false
    },
    url : {
      type : String,
      required : true
    },
    queryURL : {
      type : String,
      required : true
    },
    queryURLHTTPS : {
      type : Boolean,
      "default": false
    },
    queryGeoLocationExtension : {
      type : Boolean,
      "default" : false
    },
    suggestionURL : {
      type : String,
      required : false
    },
    suggestionURLHTTPS : {
      type : Boolean,
      "default": false
    },
    suggestGeoLocationExtension : {
      type : Boolean,
      "default" : false
    },
    icon : {
      type : String,
      required : false
    },
    added : {
      type : Date,
      "default": Date.now,
      required : true
    },
    used_count : {
      type : Number,
      "default": 0,
      required : true
    }
  });

  SearchEngine.pre('save', function (next) {

    function hasGeoLocalExt(url) {
      var reg = /\{geo:/g;
      return reg.test(url);
    }

    this.queryGeoLocationExtension = hasGeoLocalExt(this.queryURL);
    this.suggestGeoLocationExtension = hasGeoLocalExt(this.suggestionURL);

    function isHTTPS(url) {
      return URL.parse(url).protocol === "https:";
    }

    this.queryURLHTTPS = isHTTPS(this.queryURL);
    this.suggestionURLHTTPS = isHTTPS(this.suggestionURL);

    next();
  });

  SearchEngine.methods.equalsObject = function equals(obj) {
    return ((this.url === obj.url || this.url === obj.siteURL) &&
             this.name === obj.name &&
             this.queryURL === obj.queryURL &&
             this.suggestionURL === obj.suggestionURL &&
             this.icon === obj.icon);
  };

  SearchEngine.statics.findGeoLocation = function findGeoLocation(callback) {
    return this.find({$or : [{ queryGeoLocationExtension : true }, { suggestGeoLocationExtension : true }]}).sort({used_count : -1}).exec(callback);
  };

  SearchEngine.statics.findHttps = function findHttps(callback) {
    return this.find({$or : [{ queryURLHTTPS : true }, { suggestionURLHTTPS : true }]}).sort({used_count : -1}).exec(callback);
  };

  SearchEngine.statics.create = function create(obj) {
      var Model = mongoose.model(MODEL_NAME, SearchEngine);
      var searchengine = new Model({ url : obj.id,
                                     name: obj.name,
                                     siteURL : obj.siteURL,
                                     queryURL : obj.queryURL,
                                     suggestionURL : obj.suggestionURL,
                                     icon : obj.icon
                                  });
      return searchengine;
    };

  return mongoose.model(MODEL_NAME, SearchEngine);
};
