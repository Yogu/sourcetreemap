var Q = require('q');
var fs = require('q-io/fs');
var express = require('express');
var analyzer = require('./lib/sourcetreemap/analyzer.js');

Q.longStackSupport = true;

var app = express();

app.use(express.static('public'));

app.get('/analyze', function(req, res) {
	analyzer.analyze(req.query.url).then(function(analyzer) {
		res.send({ files: analyzer.files, treeRoot: analyzer.treeRoot });
		res.end();
	}).catch(function(error) {
		console.error(error.stack);
		res.send(error);
		res.end(500);
	});
});

var server = app.listen(process.env.PORT || 8888, function() {
    console.log('Listening on port %d', server.address().port);
});
