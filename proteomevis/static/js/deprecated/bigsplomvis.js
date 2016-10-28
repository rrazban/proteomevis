BigSplomVis = function (_parentElement, _eventHandler, _width, _height) {
    this.graph = _parentElement;
    this.eventHandler = _eventHandler;
    this.filter = null;

    this.margin = {
        top: 5,
        right: 10,
        bottom: 20,
        left: 20
    },
    this.width = _width - this.margin.left - this.margin.right;
    this.height = _height - this.margin.top - this.margin.bottom;

    this.initVisGraph();

}

BigSplomVis.prototype.initVisGraph = function () {
    var that = this;

    this.x = d3.scale.linear()
        .range([this.margin.left, this.width])
        .domain([0, 1]);

    this.y = d3.scale.linear()
        .range([that.height, that.margin.top])
        .domain([0,1]);

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient("bottom");

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left");

    this.graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis);

    this.graph.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + this.margin.left + ",0)")
        .call(this.yAxis);

    this.xText = this.graph.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", this.width)
        .attr("y", this.height - 6);

    this.yText = this.graph.append("text")
        .attr("class", "y label")
        .attr("y", this.margin.top)
        .attr("x", this.margin.left + 10)
        .attr("dy", ".75em");

    this.formatFloat = d3.format('.3f');

    // this.initVisBrush();
}

BigSplomVis.prototype.plot = function (thisplt,plt) {
    var that = this;

    this.x.domain(data.domains[plt.x]);
    this.y.domain(data.domains[plt.y]);

    this.graph.select(".x.axis").call(this.xAxis);
    this.graph.select(".y.axis").call(this.yAxis);

    this.data = d3.select(thisplt).selectAll("circle").data();

    var circles = this.graph.selectAll('circle')
      .data(this.data);

    circles.enter()
      .append("circle")
      .attr("r",rSV);
      
    circles
      .attr("class",function (d) { return 'p'+d[2]; })
      .attr("cx", function(d) { return that.x(d[0]); })
      .attr("cy", function(d) { return that.y(d[1]); });

    
    
    this.xText.html(attributes[plt.x].pp2);
    this.yText.html(attributes[plt.y].pp2);
}

// BigSplomVis.prototype.initVisBrush = function () {
//     var that = this;

//     this.brush = d3.svg.brush()
//         .x(this.x)
//         .y(this.y)
//         .on("brush", function () {
//             that.brushed(that,false)
//         })
//         .on("brushend", function () {
//             that.brushed(that,true)
//         });
//     this.graph.append("g")
//         .attr("class", "brush")
//         .call(this.brush);
// }

// BigSplomVis.prototype.brushed = function (that,_update) {
//     var extent = that.brush.extent();
//     TMi = this.formatFloat(extent[0][0]),
//     SIDi = this.formatFloat(extent[0][1]),
//     TMf = this.formatFloat(extent[1][0]),
//     SIDf = this.formatFloat(extent[1][1]);
//     if (_update) {
//         $(that.eventHandler).trigger("dataChanged",that.brush.empty()); 
//     }
//     $(that.eventHandler).trigger("displayData",that.brush.empty());
// }

// BigSplomVis.prototype.updateBrush = function () {
//     var extent = [[TMi,SIDi],[TMf,SIDf]];
//     d3.select(".brush").transition().call(this.brush.extent(extent)).call(this.brush.event);
// }

// BigSplomVis.prototype.updateImage = function () {
//     this.background.attr("xlink:href","img/"+species+"background.png")
// }

BigSplomVis.prototype.displayCell = function (_bool) {
    this.graph.attr("display",(_bool ? null : "none"));
}