ForceVis = function(_parentElement, _eventHandler, _height, _width) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;

    this.margin = {
        top: 10,
        right: 10,
        bottom: 15,
        left: 10
    };
    this.width = _width - this.margin.left - this.margin.right;
    this.height = _height - this.margin.bottom - this.margin.top - formPadding- titlePadding;

    this.pieData = [{
        "orphans": true,
        "val": 100
    }, {
        "orphans": false,
        "val": 0
    }];
    this.initVis();
}
ForceVis.prototype.initVis = function() {
    var that = this;

    this.progress = this.parentElement.append("div")
    	.attr('class','progress')
    	.append('div')
		.attr("class","progress-bar")
		.attr("id","nodesDisplayedBar")
		.style("width","0%")
		.attr("title","0 chains shown");

    this.force = d3.layout.force()
        .on("tick", that.tick)
        .charge(-50)
        .friction(.7)
        .gravity(0.8)
        .linkDistance(25)
        .size([this.width, this.height]);

    this.zoom = function() {
        that.vis.attr("transform",
            "translate(" + d3.event.translate + ") " +
            "scale(" + d3.event.scale + ")");
    };

    this.zoomer = d3.behavior.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", this.zoom);

    
    var graph = this.parentElement.append("div").attr('id','forceLayoutDiv').append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("class", "graph")
        .call(this.zoomer);

    var rect = graph.append("rect")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .style("fill", "none")
        .style("pointer-events", "all");

    this.vis = graph.append("g").attr("class", "vis");

    this.updateVis();
}

ForceVis.prototype.updateVis = function() {
    var that = this;

    this.updateProgress();

    this.force
        .nodes(data.nodes)
        .links(data.edges)
        .start();

    nodes = this.vis.selectAll(".node")
        .data(data.nodes.filter(function(d) {
            return d.degree;
        }))

    // Enter any new nodes.
    nodes.enter().append("circle")
        .attr("r", rFV)

    nodes.attr('class', function(d) {
            return "node p" + d.id;
        })
        .attr('display', function(d) {
            return d.degree ? null : 'none'
        })
        .attr("fill", function(d) {
            return cluster_color(d[dom]);
        })
        .on("click", nodeClicked)
        .on("mouseover", function(d) {
            tooltip.style('opacity', 1).html(chainImage(d.name) + d.name + d[dom]);
            d3.selectAll(".node-highlight").classed("node-highlight", false);
            d3.selectAll(".cluster-highlight").classed("cluster-highlight", false);
            data.clusters[d.cluster].cluster.forEach(function(c) {
                d3.selectAll(proteinClass(c)).classed("cluster-highlight", true).moveToFront();
            });
            d3.selectAll(proteinClass(d.id)).classed("node-highlight", true).moveToFront();
        })
        .on("mouseout", function(d) {
            d3.selectAll(".node-highlight").classed("node-highlight", false);
            d3.selectAll(".cluster-highlight").classed("cluster-highlight", false);
            d3.selectAll(".highlight").moveToFront();
        });

        
    $('circle.node').bind("contextmenu", function (event) {
        rightclick(event,"pdug-node");
    });

    nodes.exit().remove();

    links = this.vis.selectAll(".link")
        .data(data.edges, function(d) {
            return that.linkID(d.source.id, d.target.id)
        });

    links.enter()
        .insert('svg:line', ".node")
        .attr("class", "link")
        .attr("stroke", 'black')
        .attr("stroke-width", 2)

    links
        .classed("ppi", function(link) {
            return link.ppi;
        })
        .attr("id", function(link) {
            return that.linkID(link.source.id, link.target.id)
        });
    links.exit().remove();

}

ForceVis.prototype.tick = function(e) {
    var that = this;

    nodes
        .attr("cx", function(d) {
            return d.x;
        })
        .attr("cy", function(d) {
            return d.y;
        });
    links
        .attr("x1", function(d) {
            return d.source.x;
        })
        .attr("y1", function(d) {
            return d.source.y;
        })
        .attr("x2", function(d) {
            return d.target.x;
        })
        .attr("y2", function(d) {
            return d.target.y;
        });
};
// ForceVis.prototype.connectedNodes = function (d, _that) {
//     var that = this,
//         eh = _that;
//     d3.select(".center").classed('center',false);
//     if (d == nodeSelected.node) {
//         nodeSelected.node = null;
//         nodeSelected.nodes = [];
//         nodeSelected.links = new Set();
//         that.addClass();
//     } else {
//         nodeSelected.node = d;
//         d3.select(".p" + nodeSelected.node.index).classed("center", true);
//         nodeSelected.nodes = [];
//         nodeSelected.links = new Set();
//         that.addClass();
//         $(eh.eventHandler).trigger("nodeChanged");
//     }
// };

// ForceVis.prototype.addClass = function () {
//     var that = this;
//     if (nodeSelected.node) {
//         displayData.nodes.forEach(function (node) {
//             var l = that.linkID(nodeSelected.node,node);
//             var t = linked.has(l);
//             if (t) { 
//                 nodeSelected.nodes.push(node);
//                 nodeSelected.links.add(l);
//             };
//         });
//         links.classed("faded",true);
//         nodeSelected.links.forEach(function (link) {
//             d3.select("#"+link).classed('faded',false)
//         });
//         nodes.classed("highlight",false);
//         nodeSelected.nodes.forEach(function (node) {
//             d3.selectAll(".p"+node.index).classed("highlight",true);
//         });
//     } else {
//         links.classed("faded",false);
//         links.classed('ppi', function (link) { return link.ppi })
//         nodes.classed("highlight",false);
//     }
// };



// ForceVis.prototype.clusterChanged = function (d) {
//     var that = this;
//     d3.selectAll('.node').classed("highlight",false)
//     d.forEach(function (ea) {
//         d3.selectAll('.p'+ea).classed("highlight",true)
//     });
// }

// ForceVis.prototype.trackProtein = function () {
//     var that = this;
//     var t = 1000;
//     var bigR = 20, smallR = 5;

//     var untrack = d3.selectAll(".track.node");
//     untrack.attr("r",smallR);
//     untrack.classed("track",false);

//     if (search.track) {
//         trackProtein.forEach(function (d) {
//             var node = d3.select(".node"+d)
//             node.classed('track',true)
//             node.transition().duration(t).attr("r", bigR);
//         });
//         that.force.charge(function (d) {
//             return (trackProtein.indexOf(".p"+d.index) > -1) ? -750 : -75;
//         });
//         that.force.start();
//     } else {
//         that.force.charge(-75).start();

//     }
// }
ForceVis.prototype.updateColor = function() {
    nodes.attr("fill", function(d) {
        return cluster_color(d[dom]);
    });
}

ForceVis.prototype.linkID = function(a, b) {
    return "ls" + Math.min(a, b) + "t" + Math.max(a, b);
}

ForceVis.prototype.updateProgress = function() {
    var lenNodes = data.nodes.length,
        lenClusters = data.nodes.filter(function(d) {
            return d.degree;
        }).length;
	this.progress.style("width", (100.*lenClusters/lenNodes)+"%").attr("title",lenClusters +" of "+lenNodes+" shown");

}