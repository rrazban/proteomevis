ClusterViewVis = function(_parentElement, _eventHandler) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    this.margin = {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
    };

    this.initVis();
}

ClusterViewVis.prototype.initVis = function() {
    var that = this;

    d3.select("#downloadAllDataBtn").on("click", function() {
        that.exportData();
    });

    var accordion = this.parentElement
        .append('div')
        .attr('class', 'container clusterview')
        .attr("id", 'accordion');

    // the overall rows
    this.rows = accordion.selectAll('.panel.panel-default').data(d3.range(10)).enter()
        .append("div").attr('class', 'panel panel-default');

    // each of the visible row headers
    this.rows.append("div")
        .attr('class', 'panel-heading')
        .attr('id', function(d) {
            return "row" + d
        })
        .attr('data-target', function(d) {
            return "#col" + d
        })
        .attr('data-toggle', 'collapse')
        .attr('data-parent', "#accordion");

    // the collapse part
    this.rows.append("div")
        .attr('class', 'panel-collapse collapse')
        .attr('id', function(d) {
            return "col" + d;
        })
        .append("table")
        .attr("class", "protein-list table table-striped")
        .attr('id', function(d) {
            return "list" + d;
        })
        .append("tbody");
    this.updateVis();
}

ClusterViewVis.prototype.wrangleData = function(_filterFunction) {
    this.displayDataDetails = data.clusters.slice(0, 10).map(function(cluster) {
        return cluster.cluster.map(function(node) {
            return data.nodes[node];
        });
    });
}

ClusterViewVis.prototype.updateVis = function() {
    var that = this;
    this.wrangleData(null);

    this.rows.select(".panel-heading").data(this.displayDataDetails)
        .html(function(d, i) {
            return '<span class="badge">' + d.length + '</span><span class="glyphicon glyphicon-save pull-right download" id="download-' + i + '"></span>';
        });

    this.rows.select(".panel-heading")
        .on("mouseover", function() {
        	$(this).children(".glyphicon").show();
            var i = $(this)[0].id.split("w")[1];
            that.highlightCluster(i);
        })
        .on("mouseout", function () {
        	$(this).children(".glyphicon").hide();
        })
        .on("click", function() {
            $(".collapse.in").collapse();
            var i = $(this)[0].id.split("w")[1];
            that.addContent(i);
            that.highlightCluster(i);
        });

    this.parentElement.selectAll(".download").on("click", function() {
        var index = $(this)[0].id.split("-")[1];
        that.exportData(index);
    });

}

ClusterViewVis.prototype.exportData = function(i) {
    var that = this,
        columns = ['name'].concat(attribute_keys);
        
    var dataString = nodedataString(i,columns,',');

    var myWindow = window.open('', '', 'width=200,height=100');

    myWindow.document.write(dataString);

    myWindow.document.close();
}

ClusterViewVis.prototype.header = function() {
    var date = Date(Date.now());
    var str = "### " + date + "<br>";
    str += "### TM:  " + TMi + " - " + TMf + "<br>";
    str += "### SID: " + SIDi + " - " + SIDf + "<br>";
    str += ['name'].concat(attribute_keys).join("\t") + "<br>";
    return str;
}

ClusterViewVis.prototype.addContent = function(i) {
    var that = this;

    that.list = that.parentElement.select("#list" + i).select("tbody").selectAll("tr").data(that.displayDataDetails[i]);

    that.list.enter()
        .append('tr')
        .html("<td class='img'></td><td align='left' class='protein-info'></td><td align='right' class='dom-svg'></td>");

    d3.select("#list" + i).selectAll("tr")
        .on('mouseover', function(d) {
            d3.selectAll(".node-highlight").classed("node-highlight", false);
            d3.selectAll(".p" + d.id).classed("node-highlight", true).moveToFront();
        });

    that.list.select(".img").html(function(d) {
        return chainImage(d.name);
    });
    that.list.select(".protein-info").html(function(d) {
        return "<span class='link-title'><a href='http://www.rcsb.org/pdb/explore.do?structureId=" + d.name.slice(0, -1) + "' target='_blank'>" + d.name + "</a></span><br><span class='dom-details'></span>";
    });

    that.list.select(".protein-info").select(".dom-details").html(function(d) {
        return dom ? d[dom] : d.length;
    });

    that.list.exit().remove();
}

ClusterViewVis.prototype.highlightCluster = function(i) {
    d3.selectAll(".cluster-highlight").classed("cluster-highlight", false);
    data.clusters[i].cluster.forEach(function(node) {
        d3.selectAll(".p" + node).classed("cluster-highlight", true).moveToFront();
    });
}