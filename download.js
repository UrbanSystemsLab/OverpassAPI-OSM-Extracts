// Overpass API Status: http://overpass-api.de/api/status

var http = require('http')
var async = require('async')
var fs = require('fs')
var osmDirectory = './osm'
var geoJsonDirectory = './geojson'

// Settings
var config = require('./config.json')
var bbox = config.bbox
var tileSize = config.tileSize

var tileCount = 0 // Tile counter
var overpassBbox, url, dest, tile, startTile, stats, file, fileSizeInKB

// Create output directories
if (!fs.existsSync(osmDirectory)) {
	fs.mkdirSync(osmDirectory)
}
if (!fs.existsSync(geoJsonDirectory)) {
	fs.mkdirSync(geoJsonDirectory)
}

// First tile: Top-Right Corner 
startTile = {
	N: bbox.N,
	E: bbox.E,
	S: bbox.N - tileSize,
	W: bbox.E - tileSize
}

// Create a queue object with concurrency 1
var q = async.queue(function(tile, queueCallback) {
	overpassBbox = tile.W + ',' + tile.S + ',' + tile.E + ',' + tile.N
	url = 'http://overpass-api.de/api/map?bbox=' + overpassBbox
	dest = './osm/map' + tileCount + '.osm'

	async.retry({ times: 10, interval: function(retryCount) { return 20 * 1000 * Math.pow(2, retryCount) } }, function(cb, results) {
		http.get(url, (response) => {
			file = fs.createWriteStream(dest)
			response.pipe(file)

			file.on('finish', function() {
				stats = fs.statSync(dest)
				fileSizeInKB = stats['size'] / 1000.0

				// Check if rate limit was hit, in which case HTML response is send back instead of OSM data
				if (fileSizeInKB > 1) {
					tileCount++
					file.close(() => {
						cb(null, fileSizeInKB)
					})
				} else {
					// Check if file is HTML
					file.close(() => {
						fs.readFile(dest, 'utf8', function(err, data) {
							if (err) {
								return console.error(err)
							}
							if (data.search('text/html') !== -1) {
								// If yes then error due to rate limit
								cb(new Error('Filesize too low. Probably hit rate limit')) // Async Retry in this case
							} else {
								// No Features: Filesize might be small because there were no features
								tileCount++
								cb(null, fileSizeInKB)
							}
						})
					}) // End of file close
				}
			}) // End of file finish
		}).on('error', function(err) { // Handle errors
			fs.unlink(dest) // Delete the file async. (But we don't check the result)
			console.error(err.message)
		}) // End of HTTP GET Request
	}, function(err, fileSizeInKB) {
		if (err) console.error(err)
		else console.log(`Tile ${tileCount} size: ${fileSizeInKB}KB`)
		queueCallback() // Process next tile in queue
	})
}, 1) // Limit concurrency to 1

q.drain = function() {
	console.log('All items have been downloaded')
}

downloadTiles(bbox, tileSize, startTile)

function downloadTiles(bbox, tileSize, startTile) {
	tile = JSON.parse(JSON.stringify(startTile))
	// Add to Async Queue
	q.push(tile, (err) => {
		if (err) console.error(err)
		else console.log(`Downloaded tile ${tileCount} ` + JSON.stringify(tile))
		addNext()
	})

	function addNext() {
		if (tile.S < bbox.S) {
			console.log('End of all tiles')
			// End of tiles
			return null
		} else {
			if (tile.W > bbox.W) {
				// Shift Left
				tile.E = tile.E - tileSize
				tile.W = tile.W - tileSize

				// Add to Async Queue
				q.push(tile, (err) => {
					if (err) console.error(err)
					else console.log(`Downloaded tile ${tileCount} ` + JSON.stringify(tile))
					addNext()
				})
			} else {
				// Shift Down from startTile
				tile = JSON.parse(JSON.stringify(startTile))
				tile.N = startTile.N - tileSize
				tile.S = startTile.S - tileSize

				// reset startTile
				startTile = JSON.parse(JSON.stringify(tile))
				
				// Add to Async Queue
				q.push(startTile, (err) => {
					if (err) console.error(err)
					else console.log(`Downloaded tile ${tileCount} ` + JSON.stringify(startTile))
					addNext()
				})
			}
		}
	}
}