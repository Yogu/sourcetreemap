/**
 * Navigates to line/column positions in a text file
 * @param contents the file contents
 */
function FileWalker(contents) {
	this.position = 0;
	this.contents = contents;
	this.line = 1;
	this.column = 0;
}

/**
 * Moves forward to the specified position and returns the resulting file offset
 */
FileWalker.prototype.move = function(line, column) {
	if (line < this.line || line == this.line && column < this.column) {
		throw new Error('Can not move backwards (' + this.line + ':' + this.column + ' to ' +
			line + ':' + column + ')');
	}
	
	while (line > this.line || line == this.line && column > this.column) {
		this.position++;
		this.column++;
		var char = this.contents[this.position];
		if (char == '\n') {
			this.line++;
			this.column = 0;
		}
	}
	
	return this.position;
};

module.exports = FileWalker;
