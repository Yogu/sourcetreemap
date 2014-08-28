var Q = require('q');
var FS = require('q-io/fs');
var HTTP = require('q-io/http');
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var FileWalker = require('./fileWalker.js');
var URL = require('url');

function Analyzer(url) {
	this.url = url;
}

Analyzer.prototype.run = Q.async(function*() {
	console.log(this.url);
	this.generatedScript = (yield HTTP.read(this.url)).toString();
	var sourceMapURL = parseSourceMappingComment(this.generatedScript);
	sourceMapURL = URL.resolve(this.url, sourceMapURL);
	console.log(sourceMapURL);
	
	var sourcemapContents = JSON.parse((yield HTTP.read(sourceMapURL)).toString());
	this.sourcemap = new SourceMapConsumer(sourcemapContents);
	
	this.files = yield this._getFiles();
	
});

Analyzer.prototype._getFiles = Q.async(function*() {
	// Find the sizes of all files
	var files = [];
	var lastFile = null;
	var lastPosition = 0;
	var walker = new FileWalker(this.generatedScript);
	var originalSizePromises = [];
	this.sourcemap.eachMapping(function(mapping) {
		walker.move(mapping.generatedLine, mapping.generatedColumn);
		if (mapping.source != lastFile) {
			if (lastFile !== null) {
				var file = {
					path: URL.resolve(this.url, lastFile),
					generatedSize: walker.position - lastPosition
				};
				files.push(file);
				
				originalSizePromises.push(this._getOriginalSize(file));
			}
			lastFile = mapping.source;
			lastPosition = walker.position;
		}
	}.bind(this));
	
	yield Q.all(originalSizePromises);
	
	return files;
});

Analyzer.prototype._getOriginalSize = Q.async(function*(file) {
	var buffer = yield HTTP.read(file.path);
	file.originalSize = buffer.length;
});

function parseSourceMappingComment(scriptContents) {
	var matches = scriptContents.match(/\/\/# sourceMappingURL=(.*)/);
	if (!matches)
		throw new Error('The generated script does not specify the sourceMappingURL');
	return matches[1];
}

exports.analyze = function(url) {
	var analyzer = new Analyzer(url);
	return analyzer.run().then(function() { return analyzer; });
};

exports.Analyzer = Analyzer;
