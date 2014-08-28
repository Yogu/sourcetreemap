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
	this.generatedScript = (yield HTTP.read(this.url)).toString();
	var sourceMapURL = parseSourceMappingComment(this.generatedScript);
	sourceMapURL = URL.resolve(this.url, sourceMapURL);
	
	var sourcemapContents = JSON.parse((yield HTTP.read(sourceMapURL)).toString());
	this.sourcemap = new SourceMapConsumer(sourcemapContents);
	
	this.files = yield this._getFiles();
	this.treeRoot = this._makeTree(this.files);
});

Analyzer.prototype._getFiles = Q.async(function*() {
	// Find the sizes of all files
	var files = [];
	var filesByPath = {};
	var lastFile = null;
	var lastPosition = 0;
	var walker = new FileWalker(this.generatedScript);
	var originalSizePromises = [];
	this.sourcemap.eachMapping(function(mapping) {
		walker.move(mapping.generatedLine, mapping.generatedColumn);
		if (mapping.source != lastFile) {
			if (lastFile !== null) {
				var size = walker.position - lastPosition;
				if (lastFile in filesByPath) {
					filesByPath[lastFile].generatedSize += size;
				} else {
					var file = {
						path: URL.resolve(this.url, lastFile),
						generatedSize: size
					};
					files.push(file);
					originalSizePromises.push(this._getOriginalSize(file));
					filesByPath[lastFile] = file;
				}
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

Analyzer.prototype._makeTree = function(files) {
	var root = {name: "", children: []};
	files.forEach(function(file) {
		var segments = file.path.split('/');
		var node = root;
		var lastSegment = segments.pop();
		segments.forEach(function(segment) {
			var matching = node.children.filter(function(child) {
				return child.name == segment;
			});
			if (matching.length) {
				node = matching[0];
			} else {
				var child = { name: segment, children: [] };
				node.children.push(child);
				node = child;
			}
		});
		node.children.push({ name: lastSegment, value: file.generatedSize });
	});
	
	// compress directories with one child
	function compress(node) {
		if(!node.children)
			return;
		
		node.children = node.children.map(function(child) {
			compress(child);
			if (child.children && child.children.length == 1) {
				var grandchild = child.children[0];
				return {
					name: child.name + '/' + grandchild.name,
					children: grandchild.children,
					value: grandchild.value
				};
			} else
				return child;
		});
	}
	compress(root);
	if (root.children.length == 1)
		root = root.children[0];
	
	return root;
};

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
