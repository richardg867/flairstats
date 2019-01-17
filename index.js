var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function decimals(n) {
	var ret = '';
	var ns = n.toString();
	for (var i = 0; i < ns.length; i++) {
		if (i > 0 && i % 3 == 0)
			ret = ',' + ret;
		ret = ns.charAt(ns.length - 1 - i) + ret;
	}
	return ret;
}

function parseStats(noAnimation) {
	var result = window._stats;

	// textual stats
	var sampleSize = result['flaired'] + result['unflaired'];
	$('#stats-sample').text(decimals(sampleSize));
	$('#stats-sample-subs').text(decimals(result['subscribers']));
	$('#stats-sample-subs-pct').text(Math.round((sampleSize / result['subscribers']) * 1000) / 10);

	$('#stats-flaired').text(decimals(result['flaired']));
	$('#stats-flaired-pct').text(Math.round((result['flaired'] / sampleSize) * 1000) / 10);

	// sort flairs
	var flairs = result['flairs'];
	flairs.sort(function(a, b) {
		var diff = b['count'] - a['count'];
		if (diff != 0) return diff;
		return a['name'].localeCompare(b['name']);
	});

	// get selected category
	var categorySelect = $('#category-select');
	var category = categorySelect[0].value;

	// build category list
	categorySelect.html(new Option('Show all', ''));
	for (var idx in result.categories) {
		categorySelect.append(new Option(result.categories[idx]));
	}
	categorySelect[0].value = category;

	// get search
	var searchBox = $('.xflair-search-input');
	var search = searchBox[0].value;
	if (search)
		search = search.toLowerCase();

	// put flairs on table
	var table = $('#xflair-table');
	table.html('');

	var topFlairCount;
	var previousCount;
	var flairPosition = 0;
	var bars = [];
	var categoryCounts = {};
	for (var idx in flairs) {
		var flair = flairs[idx];

		var categoryAmount = flair['categories'].length;
		if (categoryAmount > 0) {
			var baseCategory = flair['categories'][categoryAmount - 1];
			if (categoryCounts[baseCategory] == null)
				categoryCounts[baseCategory] = flair['count'];
			else
				categoryCounts[baseCategory] += flair['count'];
		}

		// filter by category if one is set
		if (category) {
			if (flair['categories'].indexOf(category) == -1) 
				continue;
		} else if (flair['hidden']) {
			continue;
		}

		// first flair on this category should be 100% on the bar
		if (topFlairCount == null) {
			topFlairCount = flair['count'];
		}

		// ensure ties are tied
		if (previousCount != flair['count']) {
			previousCount = flair['count'];
			flairPosition++;
		}

		// filter by search if one is set
		if (search) {
			if (flair['name'].toLowerCase().indexOf(search) == -1) {
				continue;
			}
		}

		// make css class list
		var flairClasses = flair['class'];
		var cssClasses = '';
		for (var cidx in flairClasses) {
			cssClasses += ' flair-' + flairClasses[cidx];
		}

		// make table row html
		var html = '';
		html += '<tr class="xflair-tr"><td class="xflair-td">';
		var percentage = (flair['count'] / topFlairCount) * 100;
		html += '<div class="xflair-bar" style="width:' + percentage + '%" data-pct="' + percentage + '%"></div>';
		html += '<table><tr><td class="xflair-name">'
		if (cssClasses)
			html += '<div class="flair xflair' + cssClasses + '" title="' + flairClasses.join(' ') + '"></div>';
		html += '<span class="xflair-name">' + flair['name'] + '</span>';
		html += '</td><td class="xflair-numbers">';
		html += '<b>' + flair['count'] + '</b><br/><small>';
		if ('prevCount' in flair) {
			var diff = flair['count'] - flair['prevCount'];
			html += '<span class="xflair-';
			if (diff < 0)
				html += 'red">';
			else if (diff > 0)
				html += 'green">+';
			else
				html += 'blue">';
			html += diff + '</span>';
		}
		html += ' #' + flairPosition + '</small>';
		html += '</td></tr></table>'
		html += '</td></tr>';
		table.append(html);

		bars.push((flair['count'] / topFlairCount) * 100);
	}

	// plot pie chart
	var pieChartContainer = $('#stats-piechart');
	var mainWidth = $('.main').width();
	pieChartContainer.width(mainWidth).height(mainWidth * 0.5);
	var pieChartData = [];
	for (var category in categoryCounts) {
		pieChartData.push({'label': category, 'data': categoryCounts[category]});
	}
	// descending sort
	pieChartData.sort(function(a, b) {
		return b['data'] - a['data'];
	});
	$.plot(pieChartContainer, pieChartData, {
		'series': {'pie': {'show': true, 'offset': {'left': -(mainWidth / 4)}}},
		'legend': {
			'labelFormatter': function(label, series) {return label + ': ' + (Math.round(series['percent'] * 10) / 10) + '%';},
			'position': 'nw',
			'margin': [mainWidth * 0.55, 0]
		},
		'grid': {'hoverable': true},
		'tooltip': true,
		'tooltipOpts': {'content': '%s: %p.1%'}
	});

	// show stats
	$('#stats-loading').hide();
	$('#stats').show();

	// animate stats
	if (noAnimation)
		return;
	flairPosition = 0;
	var jqWindow = $(window);
	var screenBottom = jqWindow.scrollTop() + jqWindow.height();
	var bars = $('.xflair-bar');
	for (var idx in bars) {
		var bar = $(bars[idx]);
		var offset = bar.offset();
		if (offset && offset.top < screenBottom) {
			// width() returns the calculated width, which breaks things on resize
			var width = bar.attr('data-pct');
			bar.width(0);
			setTimeout(function(bar, width) {
				bar.animate({'width': width}, 1000);
			}, flairPosition++ * 100, bar, width);
		} else {
			break;
		}
	}
}

$(document).ready(function() {
	// get subreddit and snapshot from the query string
	var params = new URLSearchParams(document.location.search);
	var urlSubreddit = params.get('subreddit');
	var urlSnapshot = params.get('snapshot');
	if (urlSubreddit && urlSnapshot) {
		// add subreddit css
		var css = document.createElement('link');
		css.id = 'subreddit-stylesheet';
		css.rel = 'stylesheet';
		css.href = 'stats/' + urlSubreddit + '/' + urlSnapshot + '/stylesheet.css';
		document.head.appendChild(css);

		// load stats for this subreddit
		$('#stats-loading').show();
		$.getJSON('stats/' + urlSubreddit + '/' + urlSnapshot + '/stats.json', function(result) {
			// parse stats
			window._stats = result;
			parseStats();
		});
	}

	// add event handlers
	$('#subreddit-select').change(function(evt) {
		var snapshotSelect = $('#snapshot-select');
		var opt = new Option('Select a month...', '', true, true);
		opt.disabled = true;
		snapshotSelect.html(opt);

		var snapshots = window._available_snapshots[this.value];
		for (var idx in snapshots) {
			var snapshot = snapshots[idx];

			snapshotSelect.append(new Option(months[parseInt(snapshot.substr(4)) - 1] + ' ' + snapshot.substr(0, 4), snapshot))
		}

		if (evt.isTrigger && urlSnapshot) {
			snapshotSelect[0].value = urlSnapshot;
		}

		$('#snapshot-label').show();
		$('#snapshot-content').show();
	});

	$('#snapshot-select').change(function() {
		document.location.search = 'subreddit=' + encodeURIComponent($('#subreddit-select')[0].value) + '&snapshot=' + encodeURIComponent(this.value);
	});

	$('#category-select').change(function() {
		parseStats();
	});

	$('#stats-piechart-show').click(function() {
		// toggle pie chart visibility
		var pieChartContainer = $('#stats-piechart').toggle();

		// resize pie chart container in case the legend is bigger
		var tableHeight = $('div.legend > table').height();
		if (tableHeight > pieChartContainer.height()) {
			pieChartContainer.height(tableHeight);
		}

		// toggle link text
		var pieChartLink = $('#stats-piechart-show');
		var html = pieChartLink.html();
		pieChartLink.html(pieChartLink.attr('data-toggle'));
		pieChartLink.attr('data-toggle', html);
	});

	$('.xflair-search-input').on('keyup', function() {
		var searchBox = $('.xflair-search-input');
		// has it changed, or are we just pressing something like shift?
		if (searchBox[0].value != searchBox.attr('data-prev-value')) {
			// show loading spinner
			var loading = $('#xflair-search-loading');
			loading.show();

			// save previous value
			searchBox.attr('data-prev-value', searchBox[0].value);

			// use an immediate timeout to let the browser finish layouting the load spinner
			setTimeout(function(loading) {
				parseStats(true);
				loading.hide();
			}, 0, loading);
		}
	})

	// load available snapshots
	$.getJSON('available.json', function(result) {
		window._available_snapshots = {};

		var subredditSelect = $('#subreddit-select');
		var opt = new Option('Select a subreddit...', '', true, true);
		opt.disabled = true;
		subredditSelect.html(opt);
		for (var subreddit in result) {
			var lowercaseName = subreddit.toLowerCase();
			subredditSelect.append(new Option('/r/' + subreddit, lowercaseName));
			window._available_snapshots[lowercaseName] = result[subreddit];
		}
		subredditSelect.prop('disabled', false);

		if (urlSubreddit) {
			subredditSelect[0].value = urlSubreddit;
			subredditSelect.trigger('change');
		}
	});
});
