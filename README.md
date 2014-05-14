# Gulp

Streaming migrates for mongo.

## Usage
```javascript
var test = chug.db.get('test');
test.insert({test: 1});
test.insert({test: 2});
test.insert({test: 3});


chug.src('test', {$exists: 'test'})
  .pipe(chug.transform({test: 'test.a'}))
  .pipe(chug.dest('test', 1))
  .on('end', function() {
    test.find({}, {stream: true})
      .each(function(doc) {
        console.log(doc)
      })
      .success(function() {
        test.remove({});
        chug.db.close();
      })
  });

// Output:
// {test: {a: 1}}
// {test: {a: 2}}
// {test: {a: 3}}
```
## Api

### .src(collection, query)

Creates readable stream of documents from the query.

### .dest(collection)

Writes documents back to database at specified collection.

### .transform(map)

Transforms document according to map. Values at `key` are set at `value` and old key is deleted.

### .db

Mongo connection at `MONGO_URL`

