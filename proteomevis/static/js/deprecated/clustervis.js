ClusterVis = function (_parentElement, _eventHandler, _height, _width) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;

this.margin = {
        top: 5,
        right: 10,
        bottom: 20,
        left: 20
    },
    this.width = _width - this.margin.left - this.margin.right - titlePadding,
    this.height = _height  - this.margin.top - this.margin.bottom;

    this.initVis();
}

ClusterVis.prototype.initVis = function () {
    var that = this;

    this.y = d3.scale.pow()
        .range([this.height, this.margin.top]).exponent(0.5)

    this.x = d3.scale.ordinal()
        .rangeRoundBands([this.margin.left, this.width],.1)

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

    this.svg.append("text")
        .attr("class", "y label")
        .attr("y", this.margin.top)
        .attr("x", this.margin.left + 10)
        .attr("dy", ".75em")
        .text("frequency");

    this.updateVis();
}

ClusterVis.prototype.updateVis = function () {

    var that = this;

    this.y.domain([0, d3.max(data.cluster_frequencies, function (d) {
        return d.frequency
    })]);
    this.x.domain(data.cluster_frequencies.map(function (d) { return d.size; }));

    this.svg.select(".y.axis")
        .call(this.yAxis);

    this.svg.select(".x.axis")
        .call(this.xAxis);

    var bar = this.svg.selectAll(".bar")
        .data(data.cluster_frequencies);

    bar
        .enter()
        .append("g")
        .append("rect")
        
    bar
        .attr("class", "bar")
        .attr("transform", function (d, i) {
            return "translate(" + that.x(d.size) + ",0)"
        });

    bar.exit().remove();

    bar.select("rect")
        .attr("x", 0)
        .attr("y", function (d) {
            return that.y(d.frequency);
        })
        .attr("width", this.x.rangeBand())
        .attr("height", function (d) {
            return that.height - that.y(d.frequency);
        })
        .attr('fill',function (d) { return that.attribute ? cluster_color(d[dom]) : 'darkgrey'; })
        .transition();
}

ClusterVis.prototype.updateColor = function () {
    var that = this;

    if (dom) {
      cluster_color.domain(data.domains[dom]);
      this.parentElement.selectAll('.bar')
            .select("rect")
            .attr('fill', function (d) { 
              return cluster_color(d[dom]); 
            });
    } else {
      this.parentElement.selectAll('.bar')
            .select("rect")
            .attr('fill', 'darkgrey');
    }  
}
