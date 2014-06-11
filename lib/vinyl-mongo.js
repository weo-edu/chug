module.exports = function(mongoUrl) {
  /**
   * Module dependencies.
   */

  var stream = require('stream')
    , db = require('./db')(mongoUrl)
    , parse = require('./parse')
    , clean = require('./clean-object')
    , _ = require('lodash')
    , es = require('event-stream')
    , VinylMongo = {};

  /**
   * Select which documents to apply migrate.
   * @param  {string} collection name of the collection in mongo
   * @param  {object} query      mongo query
   * @return {Stream}            a stream of documents
   */
  VinylMongo.src = function(collection, query) {
    collection = db.get(collection);
    var rs = new stream.Readable({objectMode: true});
    query = collection.find(query, {stream: true})
      .each(function(doc) {
        rs.push(doc);
      })
      .success(function() {
        rs.push(null);
      })
    rs._read = function() {
      if (query) return;

    }
    return rs;
  };


  /**
   * Select which collection to write the documents to.
   * @param  {string} collection collection name
   * @param  {number} concurrent number of concurrent writes
   * @return {stream}
   */
  VinylMongo.dest = function(collection, concurrent) {
    collection = db.get(collection);

    var ws = stream.Writable({objectMode: true});
    var active = 0;
    var end = false;
    return es.through(function(doc) {
      var id = doc._id;
      delete doc._id;
      active++;
      var self = this;
      collection.update({_id: id}, {$set: doc}, {upsert: true}, function(err) {
        if (err) return self.emit('error', err);
        active--;
        if (active <= concurrent) self.resume();
        if (end && !active) {
          self.emit('end');
        }
      });
      if (active > concurrent) {
        this.pause();
      }

    }, function() {
      end = true;
    });

  };



  /**
   * Transform documents using mapping.
   * @param  {object} map map of old keys to new keys
   * @return {stream}    readable/writeable stream
   */
  VinylMongo.transform = function(map) {
    var parsers = [];
    _.each(map, function(val, key) {
      parsers.push({
        from: parse(key),
        to: parse(val)
      });
    });
    return es.through(function(doc) {
      _.each(parsers, function(parser) {
        var val = parser.from(doc);
        parser.from.assign(doc, undefined);
        parser.to.assign(doc, val);
      });
      clean(doc);
      this.emit('data', doc);
    }, function() {
      this.emit('end');
    });
  };

  VinylMongo.db = db;
  return VinylMongo;
};