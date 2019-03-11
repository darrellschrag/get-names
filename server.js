var as_agent = require('bluemix-autoscaling-agent');
var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

var cloudant, mydb, uuid;

/* Endpoint to get a unique identifier of the pod and/or CF instance.
* Send a GET request to localhost:3000/api/gethost
*/
app.get("/api/gethost", function(request, response) {
   response.send(uuid);
});

/* Endpoint to greet and add a new visitor to database.
* Send a POST request to localhost:3000/api/visitors with body
* {
* 	"name": "Bob"
* }
*/
app.post("/api/visitors", function (request, response) {
  var userName = request.body.name;
  var latitude = request.body.lat;
  var longitude = request.body.long;
  var doc = { "geometry" : {
                 "coordinates" : [longitude, latitude],
                 "type": "Point"
               },
               "properties": {
                  "name": userName },
               "type": "Feature"
             }

  if(!mydb) {
    console.log(doc);
    response.send(doc);
    return;
  }
  // insert the username as a document
  mydb.insert(doc, function(err, body, header) {
    if (err) {
      console.log('[mydb.insert] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
});

/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/visitors
 * </code>
 *
 * Response:
 * [ "Bob", "Jane" ]
 * @return An array of all the visitor names
 */
app.get("/api/visitors", function (request, response) {
  var names = [];
  if(!mydb) {
    response.json(names);
    return;
  }

  // the bounded box query parameters
  var query = {
    bbox: '-180.0,-90.0,180.0,90.0',
    include_docs: true
  };

  // query the DB with the geospatial index. Boundary box is the entire world
  mydb.geo('geonames', 'geoidx', query, function(err, body) {
    if (err) {
      console.log('[get query] ', err.message);
      response.send(names);
    } else {
      //console.log('geo query response: ', body);
      body.rows.forEach(function(row) {
        if(row.doc.properties.name)
          names.push(row.doc.properties.name);
      });
      response.json(names);
    }
  });
});

// load VCAP configuration and service credentials
const appEnv = cfenv.getAppEnv();

// Load the Cloudant library.
var Cloudant = require('@cloudant/cloudant');
if (appEnv.services['cloudantNoSQLDB']) {
    // CF service named 'cloudantNoSQLDB'
    cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
    uuid = process.env.CF_INSTANCE_GUID;
} else if (process.env.CLOUDANT_URL) {
  // Use the secret environment variable of deployed on Kubernetes
  cloudant = Cloudant(process.env.CLOUDANT_URL);
  uuid = process.env.HOSTNAME;
} else if (process.env.BINDING) {
  // get the binding environment variable
  var binding = JSON.parse(process.env.BINDING);
  cloudant = Cloudant(binding.url);
  uuid = process.env.HOSTNAME;
}

if(cloudant) {
  //database name
  var dbName = process.env.DBNAME;

  // Create a new database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Get the db name variable
  mydb = cloudant.db.use(dbName);

  // geospatial indexer and ddoc
  var names_indexer = function(doc) {
    if (doc.geometry && doc.geometry.coordinates) {
      st_index(doc.geometry);
    }
  };
  var ddoc = {
    _id: '_design/geonames',
    st_indexes: {
      geoidx: {
        index: names_indexer
      }
    }
  };
  // add the geospatial index to the db
  mydb.insert(ddoc, function(err, result) {
    if (err) {
      console.log('failed to add index');
    }
  });
}

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app on port " + port);
});
