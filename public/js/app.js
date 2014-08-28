$('#analyze-button').click(function() {
	var url = $('#url-input').val();
	$.ajax({
		url: 'analyze',
		data: {
			url: url
		},
		complete: function(response) {
			var template = $('#table-template').html();
			Mustache.parse(template);   // optional, speeds up future uses
			var result = response.responseJSON;
			result.filesize = function() {
				return function(text, render) {
					return humanFileSize(render(text), true);
				};
			};
			result.percent = function() {
				return function(text, render) {
					return (render(text) * 100).toFixed(1) + '%';
				};
			};
			
			result.files.forEach(function(file) {
				file.compressionRatio = 1 - file.generatedSize / file.originalSize;
			});
			
			var rendered = Mustache.render(template, result);
			$('#result').html(rendered);
			$('#result table').tablesorter({
				textExtraction: function(td) {
					return $(td).data('raw') || $(td).text();
				},
				sortList: [[1, 1]]
			});
		}
	});
});

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) return bytes + ' Bytes';
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
};