function minisvg () {
	var height = 10,
		width = 50,
		scale = d3.scale.linear().range([0,width]).domain(data.domains[(dom ? dom : "length")]);
	d3.select(".panel-collapse.collapse.in").selectAll('.info').select(".dom-details")[0].forEach(function (d) {
		var dom_data = parseFloat(d.innerText);

		if (d.innerText) {
			var dom_svg = d3.select(d3.select(d).node().parentNode.parentNode).select('.dom-svg').selectAll('svg').data([dom_data]);
				
			var dom_svgEnter = dom_svg.enter().append("svg")
				.attr("height",height)
				.attr("width",width)
				
			dom_svgEnter.append("g")
				.append('rect')
				.attr("fill","lightblue")
				.attr("x",0)
				.attr("y",0)
				.attr('height',height)
				.attr('width',width);

			dom_svgEnter.append('g')
				.append('rect')
				.attr("fill",'red')
				.attr("x",0)
				.attr("y",0)
				.attr('height',height)
				.attr("class","foreground-bar");

			dom_svg.select(".foreground-bar")
				.attr("width",function (d) { return scale(d); });

			dom_svg.exit().remove();
		}
		
	})
}