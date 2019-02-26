# CodeUML - draw UML diagram as fast as you can type

CodeUML offers a nice Web UI over PlantUML service, that helps you quickly draw UML diagrams. 

# Installation

First you have run the PlantUML service and expose it as a HTTP service to CodeUML.

Get this service and run it:
https://github.com/bitjourney/plantuml-service

Then you configure the following environment variables (probably put in an .env file): 

```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=codeuml;AccountKey=...;EndpointSuffix=core.windows.net
CONTAINER_NAME=codeuml
PLANTUML_API_URL=https://<url of the plantuml service>/svg
SUBTITLE=For internal use only
FOOTER=For internal use only
```

The important one is the PLANTUML_API_URL. This is where you specify the endpoint of the PlantUML service that you are running.

Make sure the /svg path if there. 

CodeUml uses Azure Blob Storage to save/load the UML files. You can run CodeUML without Azure. You just won't be able to save/load diagrams. 

