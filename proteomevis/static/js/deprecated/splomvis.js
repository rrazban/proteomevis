SplomVis = function(_parentElement, _eventHandler, _height, _width) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;
    this.filter = null;

	var dim = d3.min([_height, _width]);
	console.log(dim);

    this.margin = {
            inside: 5,
            outside: 10
        },

    this.dim = dim - 2 * this.margin.outside,
    this.num_splot = attribute_keys.length;
    pltsize = (this.dim / this.num_splot) - this.margin.inside;

    xRange = d3.scale.linear().range([0, pltsize]);
    yRange = d3.scale.linear().range([pltsize, 0]);

    this.brushCell = null;
    this.formatFloat = d3.format('.3f');

    this.initVisGraph();
}

SplomVis.prototype.initVisGraph = function() {
    var that = this;

    // setting the domains temporarily so that there is not a null return
    this.x = xRange.domain([0, 1]);
    this.y = yRange.domain([0, 1]);

    // setting up the brush that can be called on any of the scatterplots
    // keeps track of what scatter plot it is/was on
    this.brush = d3.svg.brush()
        .x(this.x)
        .y(this.y)
        .on("brushstart", function(d) {
            that.brushstarted(d, this, false);
        })
        .on("brush", function(d) {
            that.brushed(d);
        })
        .on("brushend", function(d) {
            that.brushended(d);
        });

    // color bar
    var barthickness = 10;
    var axistext = 20;

    var colorbar = Colorbar()
        .scale(splom_color)
        .thickness(barthickness)
        .barlength(this.dim - this.margin.outside * 2)
        .orient("horizontal");

    this.colorbar = this.parentElement.append("svg")
        .attr('width', this.dim + this.margin.outside * 2)
        .attr('height', barthickness + axistext)
        .append('g')
        .attr('transform', 'translate(' + that.margin.outside / 2 + ',0)');

    this.colorbar.call(colorbar);

    this.svg = this.parentElement.append("svg")
        .attr("width", this.dim + 2 * this.margin.inside)
        .attr("height", this.dim + 2 * this.margin.inside)
        .append("g")
        .attr('transform', 'translate(' + that.margin.inside + ',' + that.margin.inside + ')');

    this.cells = this.svg.selectAll(".cell")
        .data(this.cross(attribute_keys, attribute_keys))
        .enter().append("g")
        .attr("class", function(d) {
            return d.i >= d.j ? "cell" : "cell unused";
        })
        .attr("transform", function(d) {
            return "translate(" + (that.num_splot - d.i - 1) * (pltsize + that.margin.inside) + "," + d.j * (pltsize + that.margin.inside) + ")";
        });

    this.cells.append('rect')
        .attr("height", pltsize)
        .attr("width", pltsize)
        .attr("class", function(d) {
            return d.i > d.j ? "splom-subgraph" : "splom-diagonal"
        });


    this.cells.append("text")
        .attr("x", pltsize / 2)
        .attr("y", pltsize / 2)
        .attr('class', 'splom-subgraph-text')
        .html(function(d) {
            return d.i == d.j ? attributes[attribute_keys[d.i]].pp2 : ''
        });

    this.cells.append("text")
        .attr("x", pltsize - 45)
        .attr("y", 14)
        .attr('class', 'splom-pvalue');

    this.cells.append('path')
        .attr('class', 'correlation-line');

    this.cells.call(this.brush);

    $(".unused").remove();

    this.bigCellG = this.svg.append("g").attr("transform", "translate(" + (pltsize* (this.num_splot/ 2)) + "," + (pltsize* (1+this.num_splot/ 2)) + ")");

    // the big version of the scatterplot
    this.bigCell = new BigSplomVis(this.bigCellG, this.eventHandler, pltsize*4, pltsize*3);

    this.bigCell.displayCell(false);

    this.updateVis();
}

SplomVis.prototype.updateVis = function() {
    var that = this;

    this.cells.each(function(d) {
        that.plot(d, this);
    })

    if (!(this.brush.empty())) {
        this.brushstarted(this.brushCellPlt, this.brushCell, true);
    }
}

SplomVis.prototype.cross = function(a, b) {
    var c = [],
        n = a.length,
        m = b.length,
        i, j;
    for (i = -1; ++i < n;)
        for (j = -1; ++j < m;) c.push({
            x: a[i],
            i: i,
            y: b[j],
            j: j
        });
    return c;
}

SplomVis.prototype.plot = function(plt, thisplt) {
    var that = this;

    var cell = d3.select(thisplt);


    cell.select("rect").attr("fill", "white");
    if (plt.i > plt.j) {
        this.x.domain(data.domains[plt.x]);
        this.y.domain(data.domains[plt.y]);
        var line = d3.svg.line()
            .interpolate('linear')
            .x(function(d) {
                return that.x(d.x);
            })
            .y(function(d) {
                return that.y(d.y);
            });
        var cleanedData = cleanData(plt),
            points = getPoints(data.correlations[plt.i][plt.j], data.domains[plt.x], data.domains[plt.y]);

        cell.select(".splom-pvalue")
            .style("fill", function(d) {
                return splom_color(data.correlations[plt.i][plt.j].p_value);
            })
            .text(this.formatFloat(data.correlations[plt.i][plt.j].p_value));

        var circles = cell.selectAll('circle.' + plt.x + '-' + plt.y)
            .data(cleanedData);

        circles.enter()
            .append("circle")
            .attr("r", rSV);

        circles
            .attr("class", function(d) {
                return plt.x + '-' + plt.y + ' splom p' + d[2];
            })
            .attr("cx", function(d) {
                return that.x(d[0]);
            })
            .attr("cy", function(d) {
                return that.y(d[1]);
            });

        cell.select('.correlation-line').datum(points).attr('d', line);
    }
}

// Clear the previously-active brush, if any.
SplomVis.prototype.brushstarted = function(plt, thisplt, _update) {
    var that = this;

    this.bigCell.displayCell(true);

    if (this.brushCell !== thisplt) {
        d3.select(this.brushCell).call(this.brush.clear());
    }
    if ((this.brushCell !== thisplt) || _update) {
        this.x.domain(data.domains[plt.x]);
        this.y.domain(data.domains[plt.y]);
        this.bigCell.plot(thisplt, plt);
        this.brushCell = thisplt;
        this.brushCellPlt = plt;
        this.brushCellData = cleanData(plt);
    }
    if (_update) {
        this.brushed(plt);
    }
}

// Highlight the selected circles.
SplomVis.prototype.brushed = function(plt) {
    var that = this;

    var e = this.brush.extent();

    d3.selectAll("circle").classed("faded", true);
    this.selected = this.brushCellData
        .filter(function(d) {
            return ((d[0] >= e[0][0]) && (d[0] <= e[1][0]) && (d[1] >= e[0][1]) && (d[1] <= e[1][1]));
        })
        .map(function(d) {
            return d[2];
        });

    this.selected
        .forEach(function(protein) {
            d3.selectAll(".p" + protein).classed("faded", false);
        });

    d3.selectAll(".link").classed("faded", function(link) {
        return (that.selected.indexOf(link.source.id) == -1) || (that.selected.indexOf(link.target.id) == -1)
    });
}

// If the brush is empty, select all circles.
SplomVis.prototype.brushended = function(plt) {
    var that = this;

    if (this.brush.empty()) {
        d3.selectAll(".faded").classed("faded", false);
    }
}