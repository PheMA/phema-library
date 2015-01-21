# sophe-library

This is a simple, lightweight storage system (using MongoDB) that conforms to the PhEMA Library interface specification.  This is useful for implementations that just want a lightweight, local storage.

## Configuration
Currently the MongoDB connection URL is managed through the MONGOLAB_URI environment variable.  It doesn't require use of MongoLab however - any valid MongoDB connection will work.
