# Overpass API: OSM Extracts
*Steps to download OSM data using Overpass API*


This method simplifies the downloading process of very large OSM data through Overpass API in form of multiple small `.osm` files.

OSM extracts from Overpass API may be preferred because it returns higher level of detail for building geometries in data rich cities like NYC. Otherwise, there are other sources to download the OSM data like through [Geofabrik Service](http://download.geofabrik.de/). Steps for that are documented [here](https://github.com/UrbanSystemsLab/Geofabrik-OSM-Extracts).

## Directory Structure
```sh 
Root
|--osm        				# Download directory for .osm files
|--geojson    				# Directory for .osm => .geojson files
|--geojson-merged     # Directory for single merged .geojson
|--mbtiles 						# Directory for merged .geojson file => .mbtiles
|
|--download.js            # Download .osm tiles from Overpass-API
|--osm-to-geojson.js      # convert .osm to .geojson files
|--geojson-merge.js       # Merge .geojson files into single file
|
|--config.json 						# Configuration parameters (Modify these)
```

## Steps
- Clone this repository
- Download OSM Tiles via Overpass API
- Convert OSM files to GeoJSON format
- Merge GeoJSON files to a single file
- Import to mongoDB
- Aggregate buildings in MongoDB
- Export Buildings
- Convert to JSON to GeoJSON
- Convert to GeoJSON to SHP File
- Convert GeoJSON to MBTiles

## Requirements

Clone this repository to obtain the necessary scripts. 

```sh 
git clone https://github.com/UrbanSystemsLab/OverpassAPI-OSM-Extracts.git .
cd OverpassAPI-OSM-Extracts
npm install -g osmtogeojson
```

**NOTE**: Before running this script please install osmtogeojson npm module globally if you do not have one. Use command `npm install -g osmtogeojson`

## Process

### 1. Download OSM Tiles
Update `config.json` with bounding box of the OSM area needed to be downloaded. Several `.osm` may be downloaded, proportional to the size of the bounding box.

```sh 
node download.js
```
If you are still hitting the rate limit, you can increase the retry interval in `download.js` 

```js
async.retry({ times: 10, interval: function(retryCount) { return 20 * 1000 * Math.pow(2, retryCount) } }, function(cb, results) {...})

```

### 2. Convert OSM tiles to GeoJSON tiles
This will convert all the `.osm` files to `.geojson` format

```sh
node osm-to-geojson.js
```

### 3. Merge GeoJSON tiles to a single file
This script combines the `.geojson` files into a single file.

```sh
node geojson-merge.js
```

### 4. Import to mongoDB
Import all the features in the merged GeoJSON file to a MongoDB collection.

```sh
 jq  ".features" --compact-output output.geojson > features.json
 mongoimport --db databaseName -c features --file "features.json" --jsonArray
```

### 5. Aggregate buildings in MongoDB
Run the mongo shell using mongod. In another shell run mongo command to perform the following to inspect and aggregate the necessary data.

```sh
# Count the number of features that have height (Building & Building Parts)
db.features.find({'properties.height': {$exists : 'true'}}).count()

# Export all buildings to 'buildings' collection
db.features.aggregate([{ $match: {'properties.height': {$exists : 'true'}} },{ $out: "buildings" }])

```

### 6. Export Buildings

Export the collection that contains the needed data out to a JSON Array

```sh
mongoexport --db databaseName -c buildings --out "building_export.json" --jsonArray 
```

### 7. Convert to JSON to GeoJSON
```sh
# Input: building_export.json 
# Output: buildings.geojson

echo '{ "type": "FeatureCollection","features":'  >> buildings.geojson ; cat  building_export.json >> buildings.geojson ; echo '}' >> buildings.geojson
```

### 8. Convert to GeoJSON to SHP File
Create a ESRI Shapefile from the exported GeoJSON data.

```sh
ogr2ogr -f "ESRI Shapefile" data.shp "buildings.geojson" -skipfailures
```

### 9. Convert GeoJSON to MBTiles
Use [tippecanoe](https://github.com/mapbox/tippecanoe) to convert the merged GeoJSON file to a MBTiles

```sh
tippecanoe -pd -z 14 -n buildings -f -o buildings.mbtiles buildings.geojson
```

These tiles can ber served locally using [tileserver-gl](https://github.com/klokantech/tileserver-gl)

### Tile Downloader Process
Just a visual reference of how sequence of how tiles are downloaded
![tile-download.png](img/tile-download.png)