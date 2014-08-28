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
			
			displayTreeMap(result.treeRoot);
			updateChartLayout();
		}
	});
});

function updateChartLayout() {
	var chart = $('#chart svg');
	if (!chart.length)
		return;
	var aspect = chart.data('aspect');
	var targetWidth = chart.parent().width();
	chart.attr('width', targetWidth);
	chart.attr('height', targetWidth / aspect);
}

$(window).resize(updateChartLayout);
