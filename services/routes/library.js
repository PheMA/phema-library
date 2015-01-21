var request = require('request');
var Library = require('../lib/library');

exports.index = function(req, res){
  console.log("GET - /library");
  var result = Library.index();
  if (result && result.success) {
    return res.status(200).send(result.list);
  }
  else {
    return res.status(500).send({ error: 'Server error' });
  }
};

/**
 * Finds a library item by its ID
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.details = function(req, res){
  console.log("GET - /library/:id");
  var result = Library.details(req.params.id);
  if (result.success) {
    if (result.item) {
      return res.status(200).send(result.item);
    }
    else {
      return res.status(404).send({error: 'Not found'});
    }
  }
  else {
    return res.status(500).send({ error: 'Server error' });
  }
};

/**
 * Adds a library item
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.add = function(req, res) {
  console.log('POST - /library');
  var result = Library.add(req.body);
  if (result.success) {
    return res.send(result.item);
  }
  else {
    return res.status(500).send({ error: 'Server error' });
  }
};

/**
 * Update a library item by its ID
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.update = function(req, res) {
  console.log("PUT - /library/:id");
  var result = Library.add(req.body);
  if (result.success) {
    if (result.item) {
      return res.status(200).send(result.item);
    }
    else {
      return res.status(404).send({error: 'Not found'});
    }
  }
  else {
    return res.status(500).send({ error: 'Server error' });
  }
};

exports.delete = function(req, res) {
  return LibraryRepository.findById(req.params.id, function(err, item) {
    if (!item) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }

    item.deleted = true;

    return item.save(function(err) {
      if(!err) {
        console.log('Deleted');
        return res.send({ status: 'OK' });
      } else {
        if(err.name == 'ValidationError') {
          res.statusCode = 400;
          return res.send({ error: 'Validation error' });
        } else {
          res.statusCode = 500;
          return res.send({ error: 'Server error' });
        }
        console.log('Internal error(%d): %s',res.statusCode,err.message);
      }
      res.send({});
    });
  });
};