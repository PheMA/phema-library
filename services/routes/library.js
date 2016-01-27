/*
Test sending items via:

var xmlhttp = new XMLHttpRequest();
xmlhttp.open("POST", "/api/library");
xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
xmlhttp.send(JSON.stringify({name:"Test", description:"Test item"}));

var xmlhttp = new XMLHttpRequest();
xmlhttp.open("DELETE", "/api/library/54bd1c12f22d3d5b00e437d1");
xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
xmlhttp.send();
*/

var mongoose = require('mongoose');

var MONGO_CONNECTION = 'mongodb://localhost/phema-library';

var Schema = mongoose.Schema;
var request = require('request');

function nameValidator (v) {
  if (!v || typeof v === 'undefined') {
    return false;
  }

  return v.length >= 4;
}

var LibraryItem = new Schema({
  name: {
    type: String,
    require: true,
    validate: [nameValidator, 'The name must be at least 4 characters long']
  },
  description: {
    type: String
  },
  definition: {
    type: Schema.Types.Mixed
  },
  created: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String
  },
  modified: {
    type: Date
  },
  modifiedBy: {
    type: String
  },
  deleted: {
    type: Date
  },
  deletedBy: {
    type: String
  },
  phekb: {
    type: Boolean
  }
});

function formatItemForReturn(item) {
  return {
    id: item._id.toHexString(),
    name: item.name,
    description: item.description,
    definition: item.definition,
    created: item.created,
    createdBy: item.createdBy,
    modified: item.modified,
    modifiedBy: item.modifiedBy,
    deleted: item.deleted,
    deletedBy: item.deletedBy,
    phekb: item.phekb
  };
}

var LibraryRepository = mongoose.model('LibraryItem', LibraryItem);

// MongoDB configuration
mongoose.connect(MONGO_CONNECTION, function(err) {
  if(err) {
    console.log('error connecting to MongoDB Database. ' + err);
  } else {
    console.log('Connected to Database');
  }
});

function saveToPhekb(item)
{
  // If phekb save to phekb 
  if (item.phekb)
  {
    var id = 0;
    var phekb_url = 'http://local.phekb.org/phema-author/ws/save';
    if (item._id)
    {
      id = item._id.toHexString();
    }
    // It is possible that phekb initiated the authoring , in which case , we will have an nid in the item
    // We need to send this back to phekb so it can update 
    var nid = 0; // phekb's id 
    if (item.nid ) { nid = item.nid; }
    var phekb_data = {name: item.name, description: item.description, definition: item.definition, id: id , nid: nid};
  
    request.post({url: phekb_url, formData:phekb_data }, function (error, response, body) {
      //console.log(response);
      if (!error && response.statusCode == 200) {
        console.log(body) // Show the json returned
      }
    });
  }
}

exports.index = function(req, res){
  LibraryRepository.find({deleted: undefined }, function(err, items) {
    if (!err) {
      var formattedList = [];
      for (var index = 0; index < items.length; index++) {
        formattedList.push(formatItemForReturn(items[index]));
      }
      res.statusCode = 200;
      return res.send(formattedList);
    } else {
      res.statusCode = 500;
      console.log('Internal error(%d): %s',res.statusCode,err.message);
    return res.send({ error: 'Server error' });
    }
  });
};

/**
 * Finds a library item by its ID
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.details = function(req, res){
  console.log("GET - /library/:id");
  return LibraryRepository.findOne({_id: req.params.id, deleted: undefined }, function(err, item) {
    if(!item) {
      console.log('Not found');
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }

    if (!err) {
      console.log('Found');
      res.statusCode = 200;
      return res.send(formatItemForReturn(item));
    }
    else {
      res.statusCode = 500;
      console.log('Internal error(%d): %s', res.statusCode, err.message);
      return res.send({ error: 'Server error' });
    }
  });
};

/**
 * Adds a library item
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.add = function(req, res) {
  console.log('POST - /library');

  console.log(req.body);
  console.log(req.body.phekb);
  var item = new LibraryRepository({
    name: req.body.name,
    description: req.body.description,
    definition: req.body.definition,
    phekb: req.body.phekb
    
  });
  if (req.body.createdBy !== null && (typeof req.body.createdBy) !== 'undefined') {
    item.createdBy = req.body.createdBy;
  }
  else {
    item.createdBy = '(Unknown)';
  }


  item.save(function(err) {
    if (err) {
      console.log('Error while saving library item: ' + err);
      res.statusCode = 400;
      res.send({ error:err });
      return;
    }
    else {
      console.log("Library item created");
      // If phekb save to phekb 
      if (item.phekb)
      {
        saveToPhekb(item);
      }

      res.statusCode = 200;
      return res.send(formatItemForReturn(item));
    }
  });
};

/**
 * Update a library item by its ID
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.update = function(req, res) {
  console.log("PUT - /library/:id");
  return LibraryRepository.findById(req.params.id, function(err, item) {
    if (!item) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }

    if (req.body.name !== null && (typeof req.body.name) !== 'undefined') {
      item.name = req.body.name;
    }
    if (req.body.description !== null && (typeof req.body.description) !== 'undefined') {
      item.description = req.body.description;
    }
    if (req.body.definition !== null && (typeof req.body.definition) !== 'undefined') {
      item.definition = req.body.definition;
    }
    if (req.body.modifiedBy !== null && (typeof req.body.modifiedBy) !== 'undefined') {
      item.modifiedBy = req.body.modifiedBy;
    }
    else {
      item.modifiedBy = '(Unknown)';
    }
    item.modified = Date.now();

    return item.save(function(err) {
      if(!err) {
        console.log('Updated');
         // If phekb save to phekb 
        if (item.phekb)
        {
          saveToPhekb(item);
        }
        res.statusCode = 200;
        return res.send(formatItemForReturn(item));
      } else {
        console.log('Internal error(%d): %s',res.statusCode,err.message);

        if(err.name === 'ValidationError') {
          res.statusCode = 400;
          return res.send({ error: 'Validation error' });
        } else {
          res.statusCode = 500;
          return res.send({ error: 'Server error' });
        }
      }
    });
  });
};

exports.delete = function(req, res) {
  console.log("DELETE - /library/:id");
  return LibraryRepository.findById(req.params.id, function(err, item) {
    if (!item) {
      res.statusCode = 404;
      return res.send({ error: 'Not found' });
    }

    item.deleted = Date.now();
    if (req.body.deletedBy !== null && (typeof req.body.deletedBy) !== 'undefined') {
      item.deletedBy = req.body.deletedBy;
    }
    else {
      item.deletedBy = '(Unknown)';
    }

    return item.save(function(err) {
      if(!err) {
        console.log('Deleted');
        res.statusCode = 204;
        return res.send({ status: 'OK' });
      } else {
        if(err.name === 'ValidationError') {
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
exports.repositories = function(req, res){
  var repos = { phekb: 'Save to PheKB.org phenotype', mycustom: "Some other Custom Repo" };
  res.send(repos);  
};

/* new_from_phekb -- If editing your phenotype on phekb, You may want to launch the other tool to author it
 * So we have to save it and then return id for phekb 
 */
