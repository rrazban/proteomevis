ForceClusterVis = function (_parentElement, _eventHandler) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;

    this.margin = {
        top: 5,
        right: 10,
        bottom: 20,
        left: 20
    },
    this.width = this.parentElement.node().clientWidth - this.margin.left - this.margin.right,
    this.height = this.parentElement.node().clientHeight - this.margin.top - this.margin.bottom;

    this.initVis();
}

ForceClusterVis.prototype.initVis = function () {
    var that = this;

    x = d3.scale.ordinal()
        .rangeRoundBands([this.margin.left, this.width],0)

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .ticks(6)
        .orient("left");

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient("bottom");

    this.svg = this.parentElement.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")");

    this.svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + this.margin.left + ",0)");

    this.svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", this.width)
        .attr("y", this.height - 6)
        .text("cluster size");

    this.force = d3.layout.force()
    	.charge(this.charge)
    	.gravity(1)
        .size([this.width, this.height])
        .on("tick", this.tick);

    this.tip = d3.tip().attr('class', 'tip').html(function(d) { return "LENGTH: "+d.length+"; ABUNDANCE: "+d.abundance; });
    this.svg.call(this.tip);

    this.updateVis();
}

ForceClusterVis.prototype.updateVis = function () {

    var that = this;

    // update the scales
    x.domain(data.cluster_frequencies.map(function (d) { return d.size; }));

    r_scale.domain([0,Math.sqrt(d3.max([d3.max(x.domain()),100]))]);

    this.force.nodes(data.clusters).start();
    nodes = this.svg.selectAll('.node').data(data.clusters);
    	
    nodes.enter()
    	.append('circle')
    	.attr("class","node");

    nodes
        .attr('r',function (d) { return r(d.cluster.length); })
        .attr("cx",function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; });

    if (dom) {
        nodes.attr('fill', function (d) { return cluster_color(d[dom])});
    } else {
        nodes.attr('fill', 'darkgrey');
    }

    nodes.on("click", this.tip.show).on("dblclick",this.tip.hide);

    
    nodes.exit().remove();
}

ForceClusterVis.prototype.tick = function (e) {
	var k = 0.5*e.alpha,
		hbw = x.rangeBand() * 0.5;
    // Push nodes toward their designated focus.
    data.clusters.forEach(function(d, i) {
        d.x += (x(d.cluster.length)+hbw - d.x) * 0.5 *e.alpha;
    });

    nodes
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
}

ForceClusterVis.prototype.charge = function(d,i) {
	return d.cluster.length > 10 ? -200 : -20;
}

ForceClusterVis.prototype.updateColor = function () {
    var that = this;

    if (dom) {
      cluster_color.domain(data.domains[dom]);
      nodes.attr('fill', function (d) { 
        return cluster_color(d[dom]); 
      });
    } else {
      nodes.attr('fill', 'darkgrey');
    }  
}
