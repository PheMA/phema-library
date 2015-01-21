//var gzippo = require('gzippo');
var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var library = require('./services/routes/library');

module.exports = app;

app.use(logger());

// parse application/json
app.use(bodyParser.json());

// Routing examples at: https://github.com/strongloop/express/tree/master/examples/route-separation
app.get('/library', library.index);
app.get('/library/:id', library.details);
app.post('/library', library.add);
app.put('/library/:id', library.update);
app.del('/library/:id', library.delete);

app.listen(process.env.PORT || 5100);