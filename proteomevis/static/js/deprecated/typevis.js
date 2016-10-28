TypeVis = function (_parentElement, _eventHandler, _height, _width) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;
    this.filter = null;
    myGlobal = this;

    this.margin = {
        top: 5,
        right: 10,
        bottom: 25,
        left: 20
    },
    this.width = _width - this.margin.left - this.margin.right,
    this.height = _height  - this.margin.top - this.margin.bottom - titlePadding;

    this.initVisGraph();

}

TypeVis.prototype.initVisGraph = function () {
    var that = this;
    this.x = d3.scale.linear()
        .range([this.margin.left, this.width])
        .domain([0, 1])
        // .exponent(0.5);

    this.y = d3.scale.linear()
        .range([that.height, that.margin.top])
        .domain([0,1])
        // .exponent(0.5);

    this.xAxis = d3.svg.axis()
        .scale(this.x)
        .orient("bottom");

    this.yAxis = d3.svg.axis()
        .scale(this.y)
        .orient("left");
    
    this.svg = this.parentElement.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)

    this.background = this.svg.append("svg:image")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("transform", "translate("+(this.margin.left*2)+","+this.margin.top+")")
        .attr("preserveAspectRatio","none")
        .attr("xlink:href","img/"+species+"background.png");

    this.graph = this.svg.append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");


    this.graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis);

    this.graph.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + this.margin.left + ",0)")
        .call(this.yAxis);

    this.graph.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", this.width)
        .attr("y", this.height - 6)
        .text("TM");

    this.graph.append("text")
        .attr("class", "y label")
        .attr("y", this.margin.top)
        .attr("x", this.margin.left + 10)
        .attr("dy", ".75em")
        .text("SID");

    this.formatFloat = d3.format('.3f');

    this.initVisBrush();
}

TypeVis.prototype.initVisBrush = function () {
    var that = this;

    this.brush = d3.svg.brush()
        .x(this.x)
        .y(this.y)
        .on("brush", function () {
            that.brushed(that,false)
        })
        .on("brushend", function () {
            that.brushed(that,true)
        });
    this.graph.append("g")
        .attr("class", "brush")
        .call(this.brush);
}

TypeVis.prototype.brushed = function (that,_update) {
    var extent = that.brush.extent();
    TMi = this.formatFloat(extent[0][0]),
    SIDi = this.formatFloat(extent[0][1]),
    TMf = this.formatFloat(extent[1][0]),
    SIDf = this.formatFloat(extent[1][1]);
    if (_update) {
        $(that.eventHandler).trigger("dataChanged",that.brush.empty()); 
    }
    $(that.eventHandler).trigger("displayData",that.brush.empty());
}

TypeVis.prototype.updateBrush = function () {
    var extent = [[TMi,SIDi],[TMf,SIDf]];
    d3.select(".brush").transition().call(this.brush.extent(extent)).call(this.brush.event);
}

TypeVis.prototype.updateImage = function () {
    this.background.attr("xlink:href","img/"+species+"background.png")
}