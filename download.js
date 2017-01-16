/*jshint esversion: 6 */
var Promise = require('bluebird');
var http = require('http');
var fs = require('fs');

var i = 0; // Tile counter
var overpassBbox, url, dest;

//NYC Bounding Box NSEW
//North Latitude:40.917577 South Latitude: 40.477399 East Longitude: -73.700272 West Longitude: -74.259090
var bbox = {
  N: 40.917577,
  S: 40.477399,
  E: -73.700272,
  W: -74.259090
};

/*
Origin is top right
Move left till bbox.W.
Go one tile down and start from the right.
Move towards left at each iteration
startTile is the first rightmost tile in each row.
*/

//Approximate TileSize
var tileNS = 0.04; // Tile height
var tileEW = 0.02; // Tile width

//First tile
var startTile = {
  N: 40.917577,
  E: -73.700272
};

startTile.S = startTile.N - tileNS;
startTile.W = startTile.E - tileNS;
var tile = JSON.parse(JSON.stringify(startTile));


var promiseWhile = function(condition, action) {
  var resolver = Promise.defer();
  var loop = function() {
    if (!condition()) return resolver.resolve();  // Resolving escapes the loop
    return Promise.cast(action())
      .then(loop)
      .catch(resolver.reject);
  };
  process.nextTick(loop);
  return resolver.promise;
};

// promiseWhile loop credits: https://gist.github.com/victorquinn/8030190
promiseWhile(() => {
  // Condition for stopping
  return ((tile.S > bbox.S));
}, () => {
  // The function to run, should return a promise
  return new Promise(function(resolve, reject) {
    overpassBbox = tile.W + "," + tile.S + "," + tile.E + "," + tile.N;
    url = "http://overpass-api.de/api/map?bbox=" + overpassBbox;
    dest = "./osm/map" + i + ".osm";

    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(); // close() is async, call cb after close completes.
        console.log("Done: Tile " + i);
        i++;
        updateTile();
        resolve();
      });
    }).on('error', function(err) { // Handle errors
      fs.unlink(dest); // Delete the file async. (But we don't check the result)
      console.log(err.message);
    });
  });
}).then(function() {
  //This will run after completion of the promiseWhile Promise!
  console.log("Total Tiles Downloaded: " + i);
});

function updateTile() {
  if (tile.W > bbox.W) {
    // Shift Left
    tile.E = tile.E - tileEW;
    tile.W = tile.W - tileEW;
  } else {
    // Shift Down from startTile
    tile = JSON.parse(JSON.stringify(startTile));
    tile.N = startTile.N - tileNS;
    tile.S = startTile.S - tileNS;

    //reset startTile
    startTile = JSON.parse(JSON.stringify(tile));
  }
}
