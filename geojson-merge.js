var StreamConcat = require('stream-concat');
var geojsonStream = require('geojson-stream');
var glob = require('glob');
var fs = require('fs');
var log = require('single-line-log').stderr;
var through2 = require('through2');

var geoParse = geojsonStream.parse();
var geoStringify = geojsonStream.stringify();
var w = fs.createWriteStream('./mbtiles/output.geojson');

var results = 0;
var c = through2({
  objectMode: true
}, function(result, enc, callback) {
  results++;
  log('Processing result: ' + results);
  this.push(result);
  callback();
});

glob('./geojson/*.geojson', function(er, files) {
  var streams = files.map(file => {
    return fs.createReadStream(file);
  });
  var streamIndex = 0;
  var nextStream = function() {
    if (streamIndex === streams.length) {
      return null;
    }
    return streams[streamIndex++];
  };

  var combinedStream = new StreamConcat(nextStream, {
    objectMode: true
  });

  combinedStream.pipe(geoParse).pipe(c).pipe(geoStringify).pipe(w);
});
