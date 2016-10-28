ClusterColorVis = function (_parentElement, _eventHandler) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;
    this.margin = {
        top: 5,
        right: 20,
        bottom: 20,
        left: 10
    },
    this.width = this.parentElement.node().clientWidth - this.margin.left - this.margin.right;
    this.initVis();
}

ClusterColorVis.prototype.initVis = function () {
    var that = this;

    var form = this.parentElement.append("div")
        .attr("class",'form-group')
        .attr("id",'clusterColorSelect')
        .append("select")
        .attr('class','form-control');

    attribute_keys.forEach(function (v) {
        form.append("option")
            .attr('value',v)
            .html(attributes[v].pp2);
    });

    $("#clusterColorSelect").on('change', function () {
    	dom = $("#clusterColorSelect option:selected").val();
    	that.updateVis(dom);
    });


    // color bar
    var barthickness = 10;
    var axistext = 25;

    this.colorbar = Colorbar()
      .scale(cluster_color)
      .thickness(barthickness)
      .barlength(this.width)
      .orient("horizontal");

    this.bar = this.parentElement.append("svg")
      .attr("id","colorbar")
      .attr('width',this.width)
      .attr('height',barthickness+axistext)
      .append('g')
      .attr('transform','translate('+this.margin.left+',0)');

    this.bar.call(this.colorbar);

    $("#colorbar").bind("contextmenu", function (event) {
        rightclick(event,"cluster-color");
    });
}

ClusterColorVis.prototype.updateVis = function () {
    var that = this;
    if (dom) {
    	var tmpdom = data.domains[dom];
		tmpdom[0] = tmpdom[0] + 0.00001;
        cluster_color.domain(tmpdom);
        that.colorbar.scale(cluster_color);
        that.bar.call(that.colorbar);
        $(that.eventHandler).trigger("clusterColorChanged");
    }
}

ClusterColorVis.prototype.updateScale = function (_scale) {
	var tmpscale;
	switch (_scale){
		case "linear":
			tmpscale = d3.scale.linear().range(cluster_color.range());
			break;
		case "exponential":
			tmpscale = d3.scale.pow().range(cluster_color.range()).exponent(0.5);
			break;
		case "logarithmic":
			tmpscale = d3.scale.log().range(cluster_color.range());
			break;
	}
	cluster_color = tmpscale;
	this.updateVis();
}