var fs = require('fs')
var sh = require('shelljs')
var config = require('./config.json')

var files = fs.readdirSync(`${config.osmDirectory}/`)

console.log('Converting...')
files.forEach(function(filename) {
	console.log(filename)
	sh.exec('osmtogeojson ./osm/' + filename + ' > ./geojson/' + filename + '.geojson', { silent: false })
})