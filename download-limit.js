var Promise = require('bluebird');
var http = require('http');
var fs = require('fs');

var i = 0; // Tile counter
var incomplete = 0;
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
var tileNS = 0.04;
var tileEW = 0.02;

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
    if (!condition()) return resolver.resolve();
    return Promise.cast(action())
      .then(loop)
      .catch(resolver.reject);
  };
  process.nextTick(loop);
  return resolver.promise;
};

promiseWhile(function() {
  // Condition for stopping
  return ((tile.S > bbox.S));
}, function() {
  // The function to run, should return a promise
  return new Promise(function(resolve, reject) {
    overpassBbox = tile.W + "," + tile.S + "," + tile.E + "," + tile.N;
    url = "http://overpass-api.de/api/map?bbox=" + overpassBbox;
    dest = "./osm/map" + i + ".osm";
    var stats = fs.statSync(dest);
    var fileSizeInKB = stats["size"] / 1000.0;
    // console.log(fileSizeInKB);
    if (fileSizeInKB < 1) {
      incomplete++;
      var file = fs.createWriteStream(dest);
      var request = http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          file.close(); // close() is async, call cb after close completes.
          console.log("Done: Tile " + i);
          i++;
          updateTile();
          setTimeout(function () {
            resolve();
          },5000);
        });
      }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        console.log(err.message);
      });
    } else {
      console.log("Skipping: Tile " + i);
      i++;
      updateTile();
      resolve();
    }
  });
}).then(function() {
  //This will run after completion of the promiseWhile Promise!
  console.log("Total Tiles Downloaded: " + i);
  console.log("Initial Incomplete Tiles: " + incomplete);
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
