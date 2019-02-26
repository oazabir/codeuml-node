const dotenv = require('dotenv');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const containerName = process.env.CONTAINER_NAME || "codeuml";
const port = process.env.PORT || 8080;
const azureConnection = process.env.AZURE_STORAGE_CONNECTION_STRING;
const plantUmlApiUrl = process.env.PLANTUML_API_URL;

// Initialize azure blob service
const path = require('path');
const storage = require('azure-storage');
const blobService = storage.createBlobService();


// Initiate express with view engines
const express = require("express");
const app = express();

const mustacheExpress = require("mustache-express");
app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", __dirname + "/views");

// Accept json POST 
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// Short URL random ID generator with sufficient uniqueness
const shortid = require("shortid");

// Static files come from /public folder
app.use(express.static("public"));
app.listen(port);


// Home page renders the index view
app.get("/", function(req, res) {
  res.render("index", { PLANTUML_API_URL: plantUmlApiUrl });
});

// Load a diagram content
app.get("/diagram/:id", function(req, res) {
  const blobId = req.params.id;
  downloadBlob(containerName, blobId)
    .then(response => res.json(JSON.parse(respone.text)))
    .catch(err => {
      console.log(err); 
      res.status(404).send("Cannot load diagram with ID:"+ req.params.id);
    });
  
});

// Save a new diagram which generates a new short URL
app.post("/diagram", function(req, res) {
  var body = req.body || {};
  body.id = shortid.generate();

  uploadString(containerName, body.id, JSON.stringify(body))
    .then(response => res.json(body))
    .catch(err => {
      console.log(err); 
      res.status(500).send("Cannot save diagram with ID: "+ body.id);
    });
  
});

// Update a diagram with specific ID
app.post("/diagram/:id", function(req, res) {
  var body = req.body;
  body.id = req.params.id;

  uploadString(containerName, body.id, JSON.stringify(body))
    .then(response => res.json(body))
    .catch(err => {
      console.log(err); 
      res.status(500).send("Cannot save diagram with ID: "+ body.id);
    });  
});


const createContainer = async (containerName) => {
  return new Promise((resolve, reject) => {
      blobService.createContainerIfNotExists(containerName, { publicAccessLevel: 'blob' }, err => {
          if (err) {
              reject(err);
          } else {
              resolve({ message: `Container '${containerName}' created` });
          }
      });
  });
};

// Create the container on azure blob service if it does not already exist
createContainer(containerName)
  .catch(err => console.log(err));

const uploadString = async (containerName, blobName, text) => {
  return new Promise((resolve, reject) => {
      blobService.createBlockBlobFromText(containerName, blobName, text, err => {
          if (err) {
              reject(err);
          } else {
              resolve({ message: `Text "${text}" is written to blob storage` });
          }
      });
  });
};
