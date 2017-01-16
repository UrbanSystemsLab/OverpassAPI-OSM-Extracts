var Promise = require('bluebird');
var http = require('http');
var fs = require('fs');
var osmtogeojson = require('osmtogeojson');

var sh = require('shelljs');
// console.log('version ' + version);

var i = 0; // Tile counter

var files = fs.readdirSync('./osm/');
// console.log(files);

// var geojsonData = osmtogeojson(obj);
console.log("Converting...");
files.forEach(function(filename) {
  console.log(filename);
  var version = sh.exec('osmtogeojson ./osm/' + filename + ' > ./geojson/'+filename+'.geojson', {
    silent: false
  }).output;


  // console.log(obj);

  // fs.readFile('./osm-files/' + filename, 'utf8', function(err, data) {
  //   if (err) {
  //     throw err;
  //   } else {
  //     // var geojsonData = osmtogeojson(data);
  //     // var dest = './geojson-files/' + filename + '.geojson';
  //     // var output = fs.createWriteStream(dest);
  //     // geojsonData.pipe(output);
  //     // output.on('finish', function() {
  //     //   output.close(); // close() is async, call cb after close completes.
  //     //   console.log("Done: Tile " + i);
  //     // }).on('error', function(err) { // Handle errors
  //     //   fs.unlink(dest); // Delete the file async. (But we don't check the result)
  //     //   console.log(err.message);
  //     // });
  //   }
  // });
});
// var promiseWhile = function(condition, action) {
//   var resolver = Promise.defer();
//   var loop = function() {
//     if (!condition()) return resolver.resolve();
//     return Promise.cast(action())
//       .then(loop)
//       .catch(resolver.reject);
//   };
//   process.nextTick(loop);
//   return resolver.promise;
// };
//
//
//
// promiseWhile(function() {
//   // Condition for stopping
//   return ((tile.S > bbox.S));
// }, function() {
//   // The function to run, should return a promise
//   return new Promise(function(resolve, reject) {
//     overpassBbox = tile.W + "," + tile.S + "," + tile.E + "," + tile.N;
//     url = "http://overpass-api.de/api/map?bbox=" + overpassBbox;
//     dest = "./osm-files/map" + i + ".osm";
//
//     var file = fs.createWriteStream(dest);
//     var request = http.get(url, function(response) {
//       response.pipe(file);
//       file.on('finish', function() {
//         file.close(); // close() is async, call cb after close completes.
//         console.log("Done: Tile " + i);
//         i++;
//         updateTile();
//         resolve();
//       });
//     }).on('error', function(err) { // Handle errors
//       fs.unlink(dest); // Delete the file async. (But we don't check the result)
//       console.log(err.message);
//     });
//   });
// }).then(function() {
//   //This will run after completion of the promiseWhile Promise!
//   console.log("Total Tiles Downloaded: " + i);
// });
