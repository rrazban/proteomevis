var proteinClass = function(a) {
    return ".p" + a;
}

var cleanData = function(_plt) {
    var colX = data.nodes.map(function(d) {
            return d[_plt.x];
        }),
        colY = data.nodes.map(function(d) {
            return d[_plt.y];
        });

    var n = colX.length,
        tmp = [];

    for (i = -1; ++i < n;) {
        if ((colX[i] !== null) && (colY[i] !== null)) {
            if ((colX[i] >= 0) && (colY[i] >= 0)) {
                var row = [colX[i], colY[i], i]
                tmp.push(row);
            }
        }
    }
    return tmp;
};

var getPoints = function(_corr, _dom_x, _dom_y) {
    var x0 = _dom_x[0],
        x1 = _dom_x[1],
        y0 = _corr.intercept,
        y1 = _corr.intercept + (x1 - x0) * _corr.slope;
    var points = [{
        x: x0,
        y: y0
    }, {
        x: x1,
        y: y1
    }];
    return points;
}

var r_scale = d3.scale.linear().range([1, 20]);
var r = function(l) {
    return r_scale(Math.sqrt(l));
}

// to reset all the highlighting on the visualization
var clearHighlight = function(_node, _reset) {
    if (_node) {
        // reset all the splom nodes
        d3.selectAll(".highlight.splom" + _node)
            .classed("highlight", false)
            .attr("r", rSV)
            .attr("fill", null);
        //reset all the forceVis normal nodes
        d3.select(".highlight.node" + _node)
            .classed("highlight", false)
            .attr("r", rFV)
            .attr("fill", function(d) {
                return cluster_color(d[dom]);
            });


        $("#row" + _node.slice(1)).remove();
    } else {
        d3.selectAll(".highlight.splom")
            .classed("highlight", false)
            .attr("r", rSV)
            .attr("fill", null);
        d3.selectAll(".highlight.node")
            .classed("highlight", false)
            .attr("r", rFV)
            .attr("fill", function(d) {
                return cluster_color(d[dom]);
            });
        d3.select("#nodeView").select("table").select("tbody").html("");
    }

    if (_reset) {
        iColor = 0;
    }

}

var addHighlight = function(chain, pNode, i) {
    d3.selectAll(".splom" + pNode)
        .classed("highlight", true)
        .attr("r", rSVh)
        .attr("fill", color(i))
        .moveToFront();
    d3.selectAll(".node" + pNode)
        .classed("highlight", true)
        .attr("r", rFVh)
        .attr("fill", color(i))
        .moveToFront();
    var row = d3.select("#nodeView").select("table").select("tbody")
        .append("tr")
        .attr("id", "row" + pNode.slice(1))
        .html("<td>" + chainImage(chain) + "</td><td>" + chain + "</td><td class='removeNode removeNode-" + pNode.slice(1) + "' style='background:" + color(i) + "'><span class='glyphicon glyphicon-trash glyphicon-white'></span></td>")
        .on("mouseover", function () {
    		$(this).children(".removeNode").children(".glyphicon").show(100);
    	})
    	.on("mouseout", function () {
    		$(this).children(".removeNode").children(".glyphicon").hide(100);
    	});
    iColor += 1;
    $(".removeNode")
        .on("click", function() {
            node = "." + this.classList[1].split("-")[1];
            clearHighlight(node, false);
        });
}

var nodeClicked = function(d) {
    var pNode = proteinClass(d.index)
    if (d3.select(this).classed("highlight")) {
        clearHighlight(pNode, false);
    } else {
        // highlight the clicked node
        addHighlight(d.name, pNode, iColor);
    }
}

var chainName = function(d) {
    return d.slice(0, -1) + d.slice(-1).toUpperCase();
}
var chainImage = function(d) {
    return "<img class='media-object' src ='img/" + d[0] + '/' + d[1] + '/' + chainName(d) + ".png'>"
}

$(".removeNode").on("click", function() {
    console.log(this);
});

var setPanelSizes = function() {
	// column 1
	var col1 = 0.3 * width,
		col2 = 0.4 * width,
		col3 = 0.3 * width;

	$("#typeVis").height(height * 0.35);
    $("#typeVis").width(col1);

    $("#pdugVis").height(height * 0.65);
    $("#pdugVis").width(col1);

	// column 2
    $("#splomVis").height(height);
    $("#splomVis").width(col2);

	// column 3
    $("#clusterVis").height(height / 2);
    $("#clusterVis").width(col3);

    $("#nodeView").height(height / 2);
    $("#nodeView").width(col3);

    $("#protein_search_list").height(-60 + height / 2);
}

// var pointerEvents = function (_allow) {
// 	if (_allow) {
// 		d3.select(document).
// 	} else {

// 	}
// }


var cluster_color = d3.scale.linear().domain([0, 2000]).range(['white', 'blue']),
    xRange = d3.scale.linear().range([0, pltsize]),
    yRange = d3.scale.linear().range([pltsize, 0]),
    splom_color = d3.scale.linear().domain([0, 0.05, .1]).range(['red', 'black', 'white']),
    color = d3.scale.ordinal().range(["#001f3f","#7FDBFF","#39CCCC","#3D9970","#2ECC40","#01FF70","#FFDC00","#FF851B","#FF4136","#85144b","#F012BE","#B10DC9"]);
