nodeColorBar = function (_parentElement,_domain) {

	var height = 15,
		width = 2 * height,
	    svg = _parentElement.append("svg").attr("id","colorbar").style({"height":2*height,"width":6*width});

	var legend = svg.append('g')
		.attr('id', 'legend')
		.attr("transform",'translate(10,2)');

	var color = ['white','lightgrey','darkgrey','grey','black'];

	legend.selectAll('.colorbar')
		.data(d3.range(5))
		.enter().append('svg:rect')
		.attr('x', function(d) { return d * width + 'px'; })
		.attr('height', height+'px')
		.attr('width', width+'px')
		.attr('y', '0px')
		.attr("fill",function (d) { return color[d];})
		.attr('stroke', 'none');

	legendScale = d3.scale.linear()
		.domain(_domain)
		.range([0, 5 * width]);

	legendAxis = d3.svg.axis()
		.scale(legendScale)
		.orient('bottom')
		.tickSize(2)
		.ticks(3)
		.tickFormat(d3.format('s'));       

	legendLabels = svg.append('g')
		.attr('transform', 'translate(10,'+(height+2)+')')
		.attr('class', 'x axis')
		.call(legendAxis);

	this.updateDomain = function (domain) {
		legendScale.domain(domain);

		legendLabels.call(legendAxis);
	}

	_parentElement.select("path.domain").style("display",'none');

}
