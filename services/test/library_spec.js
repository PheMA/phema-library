'use strict';

/* globals it, describe, expect, beforeEach, afterEach, spyOn, runs, waitsFor */

var DatabaseCleaner = require('database-cleaner');
var databaseCleaner = new DatabaseCleaner('mongodb');
var connect = require('mongodb').connect;
process.env.MONGO_CONNECTION = 'mongodb://localhost/sophe-library-test';
var library = require('../routes/library.js');

var cleaned = false;
var resetDatabase = function() {
  connect(process.env.MONGO_CONNECTION, function(err, db) {
    databaseCleaner.clean(db, function() {
      db.close();
      cleaned = true;
    });
  });
};
resetDatabase();

var request = {};
var response = {};

var sendWait = function() {
  return (response.send.callCount > 0);
};

var initialize = function() {
  request = {};
  response = {
    data: {},
    send: function(data) { this.data = data; }
  };
  spyOn(response, 'send').andCallThrough();
};

describe('library', function () {
  beforeEach(function() {
    initialize();
  });

  afterEach(function() {
    resetDatabase();
    waitsFor(function() { return cleaned; }, 3000);
    cleaned = false;
  });

  describe('index', function() {
    it('returns an empty collection when there are no items', function() {
      runs(function() {
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.statusCode).toEqual(200);
        expect(response.data).toEqual({});
      });
    });

    // We supplement other index tests below, such as with calling index after
    // adding an item.
  });

  describe('add', function() {
    it('creates a new item', function() {
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test', createdBy: 'User'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(200);
        expect(response.data.name).toEqual('Test');

        initialize();
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.data.length).toEqual(1);
        expect(response.data[0].name).toEqual('Test');
        expect(response.data[0].description).toEqual('Test');
        expect(response.data[0].definition).toEqual('test');
        expect(response.data[0].created).toNotEqual(undefined);
        expect(response.data[0].createdBy).toEqual('User');
        expect(response.data[0].modified).toEqual(undefined);
        expect(response.data[0].modifiedBy).toEqual(undefined);
        expect(response.data[0].deleted).toEqual(undefined);
        expect(response.data[0].deletedBy).toEqual(undefined);
      });
    });

    it('rejects an empty item', function() {
      runs(function() {
        request.body = {};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(400);
        expect(response.data.error.message).toEqual('Validation failed');

        initialize();
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.data).toEqual({});
      });
    });
  });

  describe('details', function() {
    it('retrieves the appropriate item', function() {
      var itemId = null;
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test', createdBy: 'User'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        itemId = response.data.id;
        initialize();
        request.params = {id: itemId};
        library.details(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(200);
        expect(response.data.id).toEqual(itemId);
        expect(response.data.name).toEqual('Test');
        expect(response.data.description).toEqual('Test');
        expect(response.data.definition).toEqual('test');
        expect(response.data.createdBy).toEqual('User');

        initialize();
        request.body = {name: 'Test 2', description: 'Test 2', definition: 'test 2', createdBy: 'User 2'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        itemId = response.data.id;
        initialize();
        request.params = {id: itemId};
        library.details(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.statusCode).toEqual(200);
        expect(response.data.id).toEqual(itemId);
        expect(response.data.name).toEqual('Test 2');
        expect(response.data.description).toEqual('Test 2');
        expect(response.data.definition).toEqual('test 2');
        expect(response.data.createdBy).toEqual('User 2');
      });
    });

    it('returns an error for an unknown item', function() {
      runs(function() {
        initialize();
        request.params = {id: 'thisisinvalid'};
        library.details(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.statusCode).toEqual(404);
      });
    });
  });

  describe('update', function() {
    it('updates an existing item', function() {
      var itemId = '';
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        itemId = response.data.id;
        initialize();
        request.params = {id: itemId};
        request.body = {name: 'Test - update', modifiedBy: 'User'};
        library.update(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(200);

        initialize();
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.data[0].name).toEqual('Test - update');
        expect(response.data[0].description).toEqual('Test');
        expect(response.data[0].definition).toEqual('test');
        expect(response.data[0].modified).toNotEqual(undefined);
        expect(response.data[0].modifiedBy).toEqual('User');
        expect(response.data[0].deleted).toEqual(undefined);
        expect(response.data[0].deletedBy).toEqual(undefined);
      });
    });

    it('defaults modifiedBy if not specified', function() {
      var itemId = '';
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        itemId = response.data.id;
        initialize();
        request.params = {id: itemId};
        request.body = {name: 'Test - update'};
        library.update(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(200);

        initialize();
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.data[0].modifiedBy).toEqual('(Unknown)');
      });
    });

    it('rejects updating an invalid item', function() {
      var itemId = '';
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        itemId = response.data.id;
        initialize();
        request.params = {id: itemId};
        request.body = {name: 'T'};
        library.update(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(400);

        initialize();
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.data[0].name).toEqual('Test');
        expect(response.data[0].description).toEqual('Test');
      });
    });

    it('returns an error for an unknown item', function() {
      runs(function() {
        initialize();
        request.params = {id: 'thisisinvalid'};
        request.body = {name: 'T'};
        library.update(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.statusCode).toEqual(404);
      });
    });
  });

  describe('delete', function() {
    it('removes an existing item', function() {
      var itemId = '';
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        itemId = response.data.id;
        initialize();
        request.body = {};
        request.params = {id: itemId};
        library.delete(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(204);

        initialize();
        library.index(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.data.length).toEqual(0);
      });
    });

    it('returns an error for an unknown item', function() {
      runs(function() {
        initialize();
        request.params = {id: 'thisisinvalid'};
        request.body = {};
        library.delete(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.statusCode).toEqual(404);
      });
    });

    it('handles a double delete without error', function() {
      var itemId = '';
      runs(function(){
        request.body = {name: 'Test', description: 'Test', definition: 'test'};
        library.add(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        itemId = response.data.id;
        initialize();
        request.body = {};
        request.params = {id: itemId};
        library.delete(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function() {
        expect(response.statusCode).toEqual(204);

        initialize();
        request.body = {};
        request.params = {id: itemId};
        library.delete(request, response);
      });
      waitsFor(sendWait, 1000);
      runs(function(){
        expect(response.statusCode).toEqual(204);
      });
    });
  });
});