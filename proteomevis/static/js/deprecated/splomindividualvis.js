SplomIndividualVis = function (_parentElement, _eventHandler) {
  this.parentElement = _parentElement;
  this.eventHandler = _eventHandler;
  this.filter = null;

  this.margin = {
      top: 5,
      right: 5,
      bottom: 20,
      left: 20
  },

  this.dim = 400;
  this.initVisGraph();

}

SplomIndividualVis.prototype.initVisGraph = function () {
  var that = this;

  // get the scales right
  this.y = d3.scale.pow()
      .range([this.dim, this.margin.top]);

  this.x = d3.scale.pow()
      .range([that.margin.left, that.dim]);

  // so that the axes can use the scales
  this.xAxis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom");

  this.yAxis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

  // now the physical elements of the SVG
  this.svg = this.parentElement.append("svg")
      .attr("width", this.dim + this.margin.left + this.margin.right)
      .attr("height", this.dim + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

  // AXES
  this.svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + this.dim + ")");

  this.svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + this.margin.left + ",0)");

  // LABELS!
  this.xLabel = this.svg.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .attr("x", this.dim)
      .attr("y", this.dim - 6);
      //update below.text(that.m1);

  this.yLabel = this.svg.append("text")
      .attr("class", "y label")
      .attr("y", this.margin.top + 20)
      .attr("x", this.margin.left + 10)
      .attr("dy", ".75em");
      //.text(that.m2);

  // // corelation line path
  // this.svg.append('path')
  //     .attr('class','correlation-line');

  this.line = d3.svg.line().interpolate('linear')
      .x(function (d) {
          return that.x(d.x);
      })
      .y(function (d) {
          return that.y(d.y);
      });

}

SplomIndividualVis.prototype.updateVis = function (_arg) {
  var that = this;

  this.svg.data(individual_splom);

  var plt = individual_splom;

  this.x.domain(data.domains[plt.x]);
  this.y.domain(data.domains[plt.y]);

  this.svg.select(".y.axis")
      .call(this.yAxis);

  this.svg.select(".x.axis")
      .call(this.xAxis);

  if (_arg == null) {
    this.data = cleanData(data.data[plt.x], data.data[plt.y]);
    this.points = getPoints(data.correlations[plt.i][plt.j],data.domains[plt.x],data.domains[plt.y]);
  }
  
  this.svg.select("rect")
      .attr("fill", "white");

  var circles = this.svg.selectAll('circle')
    .data(this.data);

  circles.enter()
    .append("circle")
    .attr("r",1);
    
  circles
    .attr("id",function(d,i) { return plt.x+'-'+plt.y+'-'+i})
    .transition()
    .attr("cx", function(d) { return that.x(d[0]); })
    .attr("cy", function(d) { return that.y(d[1]); });

  circles.exit().remove();

  this.svg.select('.correlation-line').datum(this.points).attr('d', this.line);

  that.xLabel.text(attributes[plt.x].pp1);
  that.yLabel.text(attributes[plt.y].pp1);

}

SplomIndividualVis.prototype.updateScales = function (_scale,_power) {
  if (_scale == 'x') {
    this.x.exponent(_power);
  } else {
    this.y.exponent(_power);
  }

  this.updateVis(false);
}