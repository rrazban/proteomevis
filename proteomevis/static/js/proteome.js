var ss = {};
var data,ID2i,attributes;
var nodes, links;

/***********************************
***********************************
CONTROLLER
***********************************
**********************************/
function main () {
    // variables
    // our event handler. will be passed to every visualization on initilization
    function formatFloat (n, _d) {
        if (_d !== null) {
            return d3.format('.'+_d+"f")(n);
        }
        return d3.format('.3f')(n);
    }

    function getPoints (plt) {
        if (plt) {
            var limX = data.domains[plt.x],
                limY = data.domains[plt.y],
                corr = data.correlations[plt.i][plt.j];

            var x0 = limX[0],
                x1 = limX[1],
                y0 = corr.intercept + (x0 * corr.slope),
                y1 = corr.intercept + (x1 * corr.slope);

            // if y0 falls bellow the range of Y
            if (y0 < limY[0]) {
                y0 = limY[0];
                x0 = (y0 - corr.intercept)/corr.slope;
            }

            // if y0 falls above the range of Y
            if (y0 > limY[1]) {
                y0 = limY[1];
                x0 = (y0 - corr.intercept)/corr.slope;
            }

            // if y1 falls bellow the range of Y
            if (y1 < limY[0]) {
                y1 = limY[0];
                x1 = (y1 - corr.intercept)/corr.slope;
            }

            // if y1 falls bellow the range of Y
            if (y1 > limY[1]) {
                y1 = limY[1];
                x1 = (y1 - corr.intercept)/corr.slope;
            }

            return [{
                x: x0,
                y: y0
            }, {
                x: x1,
                y: y1
            }];            
        } else {
            return null;
        }

    }

    var force, eventHandler = {}, node;
    $( window ).resize(function () { $(eventHandler).trigger("windowResize"); });
    ss.tmi = 0;
    ss.tmf = 0;
    ss.sidi = 0;
    ss.sidf = 0;
    ss.species = { id: 0,
                 name: 'yeast',
     has_localization: true,
         has_function: true,
    };

    var cluster,
        loaded,
        dom = 'degree',
        tooltip = d3.select("#tooltip"),
        link_tooltip = d3.select("#link-tooltip"),
        colorschemes = {
            discrete: ['white','lightgrey','darkgrey','grey','black'],
            continuous: ['white','black']
        },
        nodeColorScale = d3.scale.linear().range(colorschemes.continuous),
        /* previously nodeDomColor, returns color that node
           should be for currently selected domain attribute */
        nodeColor = function (d) {
            return nodeColorScale(d[dom]);
        };

    var doc = {
            height: 0,
            width: 0
        },
        titlePadding = 12,
        splomFocusPlot;

    var splom_color = d3.scale.linear()
            .domain([0, 0.05, 0.1])
            .range(['red', 'black', 'white']),
        color = d3.scale.ordinal().range([
            '#B3D580', '#88CB8C', '#AABAD3', '#FFCC80', '#80CCE3',
            '#99B3E6', '#6F92D8', '#56B45B', '#92C24A', '#6D90B2',
            '#920BD8', '#C2C256', '#4EA1A1', '#99C9B1', '#F3B980',
            '#D5D588', '#B399E6', '#C58383', '#91D5CC', '#B288B3',
            '#CCA2CC', '#98B1CA', '#CC80CC'
        ]);

    /* RIGHT CLICK FUNCTIONS */
    // currently selected node data
    function rightclick(event, _type, _element) {
        // Avoid the real one
        event.preventDefault();
        // Show contextmenu
        if (_type == 'pcg-node') {
            var element = d3.select(_element);
            node = element.data()[0];
            // we want the list element to be disabled if the element is not highlighted
            d3.select("#liRemove").classed("disabled", !(element.classed("highlight")));
            element.classed("highlight", true);
        }

        $("#" + _type + ".custom-menu")
            .finish().toggle(100)
            .css({
                top: (event.pageY - 0) + "px",
                left: event.pageX + "px"
            });
    }

    // If the document is clicked somewhere, you want to hide the context menu
    // if it wasn't the thing clicked ("click out")
    $(document)
        .bind("mousedown", function (e) {
            // If the clicked element is not the menu
            if (!$(e.target).parents(".custom-menu").length > 0) {
                $(".custom-menu").hide(100); // Hide it
            }
        });


    // If the menu element is clicked
    $(".custom-menu li").click(function () {

        // This is the triggered action name
        switch ($(this)
            .parent().attr("id")) {

            // A case for each action. Your actions here
        case "pcg-node":
            $(eventHandler).trigger($(this).attr("data-action"));
            break;
        case "big-splomvis":
            $(eventHandler).trigger(
                $(this).attr("data-action"), $(this).attr("value")
            );
            break;
        }

        // Hide it AFTER the action was triggered
        $(".custom-menu").hide(100);
    });
    var chainName = function (d) {	//not sure what the point of this function is, just return d...
            return d.slice(0, -1) + d.slice(-1);
        },
		complexName = function(d) {
			return d.slice(0, d.indexOf('.'));
		},
        chainImage = function (d) {
            return "<img class='media-object' src ='../static/img/" + d[
                    0] + '/' + d[1] + '/' + d + ".png'>";
                   // 0] + '/' + d[1] + '/' + chainName(d) + ".png'>";
        },
        setPanelSizes = function () {
            // column 1
            doc.height = window.innerHeight - toolbarPadding - padding - 18;	//added 18 adhoc
            doc.width = window.innerWidth - 2 * padding;
            var col1 = 0.3 * doc.width,
                col2 = 0.4 * doc.width,
                col3 = 0.3 * doc.width;
            $("#typeVis").height(doc.height * 0.35);
            $("#typeVis").width(col1);
            $("#pcgVis").height(doc.height * 0.65);
            $("#pcgVis").width(col1);
            // column 2
            $("#splomVis").height(doc.height + 17);
            $("#splomVis").width(col2);
            // column 3
            $("#view").width(col3);
            $("#view").height(doc.height + 17);
            $("head").append("<style>.media { width:" + (col3 - 20) +
                "px;}</style>");
        };

    // start the visualization
    function initVis() {
        // the main graph with which we interact
        var highlighter = new Highlighter();
        var errorMessage = new ErrorMessage();
        var typeVis = new TypeVis("#typeVis");

        var typelimitsVis = new TypeLimitsVis(d3.select("#typelimitsVis"), $("#typelimitsVis").height(), $("#typelimitsVis").width());

        var proteinsearch = new ProteinSearch(d3.select("#nodeList"));
        // graphs affected by the changing of typevis
        var splomVis = new SplomVis("#splomVis", true);
        var splomBar = new SplomBar("#splomVis");

        var forceVis = new ForceVis("#pcgVis");
        var tmsid = new TMSID();

        var nodeColorVis = new NodeColorVis("#nodeColor");
        var clusterScatter = new ClusterScatter(d3.select("#clusterScatter"), 300, $("#clusterList").width());

        var clusterList = new ClusterList(d3.select("#clusterList"));

        var proteinmediaItem = new ProteinMediaItem();

        var viewTab = new ViewTab();

        var dataexportModal = new DataExportModal();

        loadState.hide();
        tooltip.style("left", "10px").style("top", $('#forceLayoutDiv').position().top + "px");
        link_tooltip.style("left", "10px").style("top", $('#forceLayoutDiv').position().top + "px");
        $("#individual_list").height($("#view").height() - 110);
        function updateVises () {
        	splomVis = new SplomVis("#splomVis", true);
            splomVis.updateVis();
            forceVis.updateVis();
            nodeColorVis.update();
            if (viewTab.view == 'clusterListTab') {
                clusterScatter.updateVis();
            }
            proteinmediaItem.clear("#cluster_list");
			index_list_cluster.length=0;		
            calculateState.hide();
        }

        function waitDataLoadUpdate(_tries,_update) {	//necessary, gives time for request
            if (loaded) {
                if (data.edges) {
                    if (_update) {
                        setIDdictionary(updateVises);
                    } else {
                        updateVises();
                    }
                } else {
                    errorMessage.show(data.errorMessage);
                }
            } else {
                _tries += 1;
                if (_tries > 3) {
                    errorMessage.show(
                        "You've selected too many edges. Try selecting a smaller area."	//any issue with dataload will go here 
                    );
                } else {
                    setTimeout(function () {
                        waitDataLoadUpdate(_tries,_update);
                    }, 3000);
                }
            }
        }
        // triggered when you select a range on the TM v SID graph
        $(eventHandler)
            .bind("dataChanged", function (event,
                status) {
                calculateState.show();
                highlighter.updateHighlight();
                makeRequest(function () { waitDataLoadUpdate(0); });

            });
        // triggered when you select a different ss.species
        $(eventHandler)
            .bind("speciesChanged", function (event) {
                calculateState.show();
                makeRequest(function () {
                    proteinmediaItem.clear();
                    highlighter.removeHighlight();
                    typeVis.updateImage();
                    waitDataLoadUpdate(0,true);
					proteinMediaList = [];
					forceVis.reset_first();//for distinguishing edges after first highlight
                });
            });
        // triggered when you change the coloring scheme of the clusters
        $(eventHandler)
            .bind("nodeColorChanged", function (
                event) {
                forceVis.updateColor();
                if (viewTab.view == 'clusterListTab') {
                    clusterScatter.updateColor();
                }
            });

        $(eventHandler)
            .bind("displayData", function (event, status) {
                typelimitsVis.updateVis();
            });

        $(eventHandler)
            .bind("manualLimitsChanged", function (event) {
                typeVis.updateBrush(true);
            });

        $(eventHandler)
            .bind("updateSplom", function (event) {
                makeRequest([ss.tmi, ss.tmf, ss.sidi, ss.sidf],
                    function () {
                        waitDataLoadUpdate(0);
                        splomVis = new SplomVis("#splomVis",true);
                    });
            });

        $(eventHandler)
            .bind("nodeClicked", function (
                event, _node) {
                tmsid.addLinks(_node);
                $.when(proteinsearch.individualSearch(_node.pdb, false))
                    .done(function () {
                        highlighter.highlight(_node.id);
                    });
            });

        $(eventHandler)
            .bind("bigSplomValuesSelected", function (
                event, _data) {
                _data.ids
                    .forEach(function (d) {
                        $(eventHandler).trigger("nodeClicked", data.nodes[ID2i(d)]);
                    })
                    .toUpperCase();
            });

        $(eventHandler)
            .bind("highlightChains", function (event, _data) {
                _data.data.forEach(function (pdb) {
                    highlighter.highlight(pdb);
                });
            });
        $(eventHandler)
            .bind("chainClicked", function (event, _pID) {
                highlighter.removeProtein(_pID);
                highlighter.highlight(_pID);
            });

        $(eventHandler)
            .bind("removeHighlight", function (event, _data) {
                var chainIDs = _data ? _data.chains.map(function (chain) { return chain.id; }) : [node.id];
                highlighter.removeHighlight(chainIDs);	
                proteinsearch.removeProtein(_data.pdb_complex);
            });

        $(eventHandler)
            .bind("clusterHoverHighlight", function (event, _cluster, _center) {
                highlighter.hoverHighlight(_cluster, _center);
            });	//responsible for pink color color when hover over

        $(eventHandler)
            .bind("removeClusterHoverHighlight", function (event) {
                highlighter.removeHoverHighlight();
            });

		var index_list_cluster =[];	
        $(eventHandler)
            .bind("clusterClicked", function (event, _cluster, _index) {
                if (!(d3.select('.cluster.c' + _index).classed("highlight"))) {	
                    highlighter.highlight(_cluster.cluster, _index); 
					if (index_list_cluster.indexOf(_index)==-1){
						index_list_cluster.push(_index);
       		            clusterList.addContent(_cluster);
					}
                }
            });

        $(eventHandler)
            .bind("removeClusterHighlight", function (event, _cluster) {
                highlighter.removeHighlight(_cluster.cluster, _cluster.id);	
				remove_index = index_list_cluster.indexOf(_cluster.id);
				index_list_cluster.splice(remove_index, 1);
                highlighter.removeHoverHighlight();	//easiest way cuz need !important tag for color to span pcg, pi, splom
            });

        $(eventHandler)
            .bind("updateClusterScatter", function (event) {
                clusterScatter.updateVis();
            });

        $(eventHandler)
            .bind("add-to-individual-list", function (event, _data) {
                proteinmediaItem.addPdbsToList(_data.pdbData,
                    d3.select("#individual_list"));
            });

        $(eventHandler)
            .bind("add-to-cluster-list", function (event, _data) {
                var clusterListItem = '#list' + _data.cluster.id;
                proteinmediaItem.addPdbsToList(_data.pdbData,	
                    d3.select(clusterListItem), _data.cluster.id
                );	//gives type error when delete cluster when not expanded
            });

        $(eventHandler)
            .bind("getClusterDetails", function (event, _d) {
                proteinsearch.clusterSearch(_d, false);
            });

        $(eventHandler).bind("scrunch", function (event) {
            setTimeout(function () {
                clusterScatter.scrunch();
            }, 100);
        });

        $(eventHandler).bind("clusterInfo", function (event) {
                // force change the view
            viewTab.switchView("clusterListTab");
            // add it to the list
            $(eventHandler)
                .trigger("clusterClicked", [data.clusters[node.cluster],
                    node.cluster
                ]);
        });

        $(eventHandler).bind("windowResize", function (event) {
            setPanelSizes();
            $("#individual_list").height($("#view").height() - 110);
			clusterScatter.setHeight();
			clusterScatter.updateVis();
            typeVis.setHeight();
            forceVis.setHeight();
            splomBar.setHeight();
	    	splomVis.setHeight();
        });
    }

    function setAttributes () {
        d3.csv("../static/attributes/attributes.csv", function (_attributes) {
	        attributes = new AttributesManager(_attributes);
            makeRequest(function () { waitDataLoadInitial(0); });
        });
    }

    function makeRequest(_callback) {
        loaded = false;
        // Assign handlers immediately after making the request,
        // and remember the jqxhr object for this request
        var request = $.param({
            columns: attributes.all(),
            species: ss.species.id,
            TMi: ss.tmi,
            TMf: ss.tmf,
            SIDi: ss.sidi,
            SIDf: ss.sidf,
        });
        var jqxhr_data = $.ajax({
                url: "fetch_edges/", // the endpoint
                type: "POST", // http method
                data: request
            })
            .done(function (_data) {
                data = _data;
                ss.species = _data.species;
                _callback();
                loaded = true;
            })
            .fail(function(_data){
               var errorMessage = new ErrorMessage();
                if (_data['status']==400){
                        errorMessage.show("You've selected too many edges. Try selecting a smaller area.");
                } else {
            			calculateState.hide();
						$("#errorMessagetwo").modal();
                }
            });
        setTimeout(function () { jqxhr_data.abort(); }, 6000);
    }

    function setIDdictionary (_callback) {
        var is = data.nodes.map(function (d, i) { return i;}),
            ids = data.nodes.map(function (d, i) { return d.id; });
            ID2i = d3.scale.ordinal().domain(ids).range(is);
            i2ID = d3.scale.ordinal().domain(is).range(ids);

        if (_callback) {
            _callback();
        }
    }

    function waitDataLoadInitial(_tries) {
        if (loaded) {
            setIDdictionary(initVis);
        } else {
            _tries += 1;
            if (_tries > 5) {
                errorMessage.show("You've selected too many edges. Try selecting a smaller area.");
            } else {
                setTimeout(function () { waitDataLoadInitial(_tries); }, 1000);
            }
        }
    }

    var loadState = (function () {
        var pleaseWaitDiv = $("#pleaseWaitDialogInitial");
        return {
            show: function () {
                pleaseWaitDiv.modal();
            },
            hide: function () {
                pleaseWaitDiv.modal('hide');
            }
        };
    })();
    var calculateState = (function () {
        var pleaseWaitDiv = $("#pleaseWaitDialog");
        return {
            show: function () {
                pleaseWaitDiv.modal();
            },
            hide: function () {
                pleaseWaitDiv.modal('hide');
            }
        };
    })();
    loadState.show();

    var padding = 30;
    var toolbarPadding = 65;
    // for sizing

    setPanelSizes();
    setAttributes();
    /***********************************
    ***********************************
    TYPE VIS
    ***********************************
    **********************************/
    TypeVis = function (_parentElement) {
            var parentElement = d3.select(_parentElement),
                that = this,
                margin = {
                    top: 5,
                    right: 10,
                    bottom: 25,
                    left: 20
                },
                height = $(_parentElement).height() - margin.top - margin.bottom,
                width = $(_parentElement).width() -margin.left - margin.right,
                filter = null;

            function setHeight () {
                height = $(_parentElement).height() - margin.top - margin.bottom - titlePadding;
                width = $(_parentElement).width() - margin.left - margin.right;

                x.range([margin.left, width]);
                y.range([height, margin.top]);

                svg.attr("width", width + margin.left+margin.right)		
                   .attr("height", height + margin.top + margin.bottom);

                background.attr("width",width-margin.left).attr("height", height-margin.top);

                graph.select(".x.axis").attr("transform","translate(0," + height + ")");
                graph.select(".x.label").attr("x", width).attr("y", height - 6);

                graph.select('.x.axis').call(xAxis);
                graph.select('.y.axis').call(yAxis);

                that.updateBrush(false);
            }

            var x = d3.scale.linear().domain([0, 1]).range([margin.left, width]);

            var y = d3.scale.linear().domain([0, 1]).range([height, margin.top]);

            var xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom");

            var yAxis = d3.svg.axis()
                        .scale(y)
                        .orient("left");

            var svg = parentElement
                        .append("svg")

            var background = svg	
                        .append("svg:image")
                        .attr("transform", "translate(" + (margin.left * 2) + "," + (margin.top*2) +")")
                        .attr("preserveAspectRatio", "none")
                        .attr("xlink:href", "../static/img/species." + ss.species.id + ".png");	
            var graph = svg
                        .append("g")
                        .attr("transform", "translate(" +margin.left + "," + margin.top + ")");
            graph.append("g")
                        .attr("class", "x axis")
                        .attr("transform","translate(0," + height + ")")
                        .call(xAxis);
            graph.append("g")
                        .attr("class", "y axis")
                        .attr("transform","translate(" + margin.left + ",0)")
                        .call(yAxis);
            graph.append("text")
                        .attr("class", "x label")
                        .attr("text-anchor", "end")
                        .text("TM-score");
            graph.append("text")
                        .attr("class", "y label")
                        .attr("y", margin.top)
                        .attr("x", margin.left + 10)
                        .attr("dy",".75em")
                        .text("Sequence ID");

            var brush = d3.svg.brush()
                        .x(x)
                        .y(y)
                        .on("brush", function () {
                            brushed(that, false);
                        })
                        .on("brushend", function () {
                            brushed(that, true);
                        });
            graph.append("g")
                        .attr("class", "brush")
                        .call(brush);

            var brushed = function (that, _update) {
                var extent = brush.extent();
                ss.tmi = formatFloat(extent[0][0]);
                ss.sidi = formatFloat(extent[0][1]);
                ss.tmf = formatFloat(extent[1][0]);
                ss.sidf = formatFloat(extent[1][1]);
                if (_update && (ss.tmi !== ss.tmf) && (ss.sidi !== ss.sidf)) {
                    $(eventHandler).trigger("dataChanged", brush.empty());
                }
                $(eventHandler).trigger("displayData", brush.empty());
            };

            this.updateBrush = function (_brushEvent) {
                var extent = [
                    [ss.tmi, ss.sidi],
                    [ss.tmf, ss.sidf]
                ];
                graph.select(".brush")
                    .transition()
                    .call(brush.extent(extent));

                if (_brushEvent && (ss.tmi !== ss.tmf) && (ss.sidi !== ss.sidf)) {	//also dont calculate if just a point
                    graph.select(".brush").call(brush.event);
                }
            };

            this.updateImage = function () {
                background.attr("xlink:href", "../static/img/species." + ss.species.id + ".png");
            };

            setHeight();

            this.setHeight = function () {
                setHeight();
            };
    };

    /***********************************
    ***********************************
    FORCE VIS
    ***********************************
    **********************************/
    ForceVis = function (_parentElement) {
            var parentElement = d3.select(_parentElement),
                that = this,
                edgeData = null;
            var margin = {
                    top: 10,
                    right: 10,
                    bottom: 15,
                    left: 10
                },
                formPadding = 30,
                height = $(_parentElement).height() - margin.top - margin.bottom - formPadding - titlePadding,
                width = $(_parentElement).width() -margin.left - margin.right;

            function setHeight () {
                height = $(_parentElement).height() - margin.top - margin.bottom - titlePadding - formPadding;
                width = $(_parentElement).width() - margin.left - margin.right;

                force.size([width/4, (height+15)/4]);

                parentElement.select("svg").attr("width", width + margin.left + margin.right)
                     .attr("height", height + margin.top + margin.bottom);

                graph.attr("width", width + margin.left + margin.right)
                     .attr("height", height + margin.top + margin.bottom);

                rect.attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom);

                vis.attr("transform", "translate(" + width / 2 + "," + height / 2 + ") scale(0.25)");
                tooltip.style("top", $('#forceLayoutDiv').position().top + "px");
            }

            this.setHeight = function () {
                setHeight();
            };

            var getEdge = function (d) {
                return edgeData.filter(function (edge) {
                    return edge.source.id == d || edge.target.id == d;
                })[0];
            },
            line = function (d) {
                return "M " + d.source.x + " " + d.source.y + " L " + d.target.x + " " + d.target.y;
            },
            curved_line = function (d) {
                var dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" +
                    d.source.x + "," +
                    d.source.y + "A" +
                    dr + "," + dr + " 0 1,0 " +
                    d.target.x + "," +
                    d.target.y;
            },
            tick = function (e) {
                nodes.attr("cx", function (d) {
                    return d.x;
                }).attr("cy", function (d) {
                    return d.y;
                });
                links.attr("d", line);
            },
            progress = parentElement
                    .append("div")
                    .attr('class','progress')
                    .append('div')
                    .attr("class","progress-bar")
                    .attr("id", "nodesDisplayedBar")
                    .style("width", "0%")
                    .attr("title", "0 chains shown");

            force = d3.layout.force()
                .on("tick", tick)
                .charge(function (d) {
                    return d.highlight ? -500 : -200;
                })
                .friction(0.7)
                .gravity(0.35)
                .linkDistance(80)
                .size([width/4, (height-15)/4]);	//15 refers to progress bar height 
            var zoom = function () {
                    var trans = [d3.event.translate[0] + width / 2, d3.event.translate[1] + height / 2 ];
                    vis.attr("transform", "translate(" + trans +
                        ") scale(" + d3.event.scale + ")");
                },
                zoomer = d3.behavior.zoom()
                    .scaleExtent([0.1, 10])
                    .scale([0.35])
                    .on("zoom", zoom);
                tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .offset([-10, 0])
                    .html(function (_center, _d, _edge) {
                        return data.nodes[ID2i(_center)].pdb + " to " +
                            _d.pdb + "<br><b>TM</b>" + _edge.tm +
                            "<br><b>SID</b>" + _edge.sid;
                    });
            var graph = parentElement
                .append("div").attr('id', 'forceLayoutDiv')
                .append("svg").attr("width", width + margin.left +
                    margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g").attr("class", "graph")
                .call(zoomer)
                .call(tip);

            var rect = graph
                .append("rect")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style("fill", "none").style("pointer-events", "all");

            var vis = graph.append("g").attr("class", "vis");

            var proteinClass = function (a) {
                return ".graph.p" + a;
            },
            nodeMousedOver = function (d) {
                tooltip.style('opacity', 1)
                    .html(chainImage(d.pdb) + d.pdb);	
                $(eventHandler)
                    .trigger("clusterHoverHighlight", [data.clusters[d.cluster],d]);
            },
            nodeMousedOut = function () {
                tooltip.style('opacity', 0);
                $(eventHandler).trigger("removeClusterHoverHighlight");
            };
			edgeMousedOver = function (d) {
				tooltip.style('opacity', 1).html('TM-score: '+(d.tm).toFixed(4)+'<br>Sequence ID: '+(d.sid).toFixed(4)+'<br>Alignment length: '+d.align_length);
            },
            edgeMousedOut = function () {
                tooltip.style('opacity', 0);
            };

            this.updateVis = function () {
                update();
            };

			var first_link_ids = [];
			this.reset_first = function () {
				first_link_ids = [];
			};
            var update = function () {
                force.linkDistance(50);
                nodes = vis.selectAll("circle.pcg").
                    data(data.nodes.filter(
                        function (d) {
							if (d.degree!=-1){
	                            return 1; 
							}
                        })
                    );
                updateProgress();
                force.nodes(data.nodes)
                    .links(data.edges)
                    .start();

                // Enter any new nodes.
                nodes.enter().append("circle").attr('r', 8);	//firefox //already defined in graph.css for chrome and others	
                nodes.attr('class', function (d) {
                        return "pcg p" + d.id + " c" + d.cluster;
                    })
                    .attr("fill", nodeColor)
                    .on("click", function (d) {
                        d3.select(this).classed("highlight", true);
                        $(eventHandler)
                            .trigger("nodeClicked", d);
                        force.start();
                    })
                    .on("mouseover", nodeMousedOver)
                    .on("mouseout", nodeMousedOut);
                nodes.exit().remove();

                links = vis.selectAll(".link").data(data.edges,
                    function (d) {
                        return linkID(d.source.id, d.target.id);
                    });
                links.enter()
                    .insert('path', ".pcg")
                    .attr("class", "link");
				if (first_link_ids.length>0){
					links.style('stroke', function(link){
						if (first_link_ids.indexOf(linkID(link.targetID, link.sourceID))==-1){
							return 'red';
						}
						else {
							return 'grey';
						}
					}); 
				}
				else {
					links.attr('stroke', function(link){
							first_link_ids.push(linkID(link.targetID, link.sourceID));
							return 'grey'
							});	//attr gets overriden by style (for ppi to show as green)
				}


                links
                    .classed("ppi", function (link) {
                        return link.ppi;
                    })
                    .attr("id", function (link) {
                        return linkID(link.source.id, link.target.id);
                    })
					.on('mouseover', edgeMousedOver)
					.on('mouseout', edgeMousedOut);
                links.exit().remove();
                vis.attr("transform", "translate(" + width / 2 + "," + height / 2 + ") scale(0.25)");	//scale is set to maximum pcg possible to fit	
                force.start();
            };

            this.updateColor = function () {
                nodes.attr("fill", nodeColor);
            };
            var linkID = function (a, b) {
                return "ls" + Math.min(a, b) + "t" + Math.max(a, b);
            };
            var updateProgress = function () {
                var lenNodes = data.nodes.length,
                    lenClusters = data.nodes
                        .filter(function (d) {
							if (d.degree!=-1){
	                            return 1; 
							}
						}).length;
                progress
                    .style("width", (100.0 * lenClusters / lenNodes) + "%")
                    .attr("title", lenClusters + " of " + lenNodes + " shown");
            };
    };
    /***********************************
    ***********************************
    NODE COLORING
    ***********************************
    **********************************/
    // What the node color bar needs to be able to do:
    // Update the color bar itself with the appropriate colors
    //  - if the domain is limited, then it should be a solid block
    //  - otherwise, it should range on those five colors
    // Control the select option that is dictating the attribute
    // Update the domain for coloring the nodes
    // Color bar should be 1/2 the height of the toolbar, and should be twice as wide as the height

    NodeColorVis = function (_parentElement) {
        var parentElement = d3.select(_parentElement),
            that = this,
            margin = {
                top: 0,
                right: 10,
                bottom: 15,
                left: 20
            },
            height = 15,
            // want to make sure that the height is half the width of each 'block'
            blockWidth = 2*height,
            width = 5*blockWidth;

        function checkDomain (domain) {
            return (domain[0] == domain[1]) ? null : domain;
        }

        /* initialize select option */
        var select = parentElement.append("select");

        select.style("vertical-align", "top")
            .attr("class","form-control")
            .attr("id","nodeColorSelect")
            .selectAll("option")
            .data(attributes.all())
            .enter()
            .append("option").attr('value', function (d) { return d; })
            .html(function (d) { return d.split("_").join(" "); });
        /* when the select changed, trigger an update */
        select.on('change', function () {
            dom = $("#nodeColorSelect option:selected").val();
            updateVis();
        });
        /* initialize the legend */
        var svg = parentElement.append("svg")
                .attr("id","legendSVG")
                .attr("width", width + margin.left/2 + margin.right + 10)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + (margin.left/2 + 5)+ "," + margin.top + ")");		

        svg.append("pattern")
            .attr({id:"striped",
                    width:4,
                    height:8,
                    patternUnits:"userSpaceOnUse",
                    patternTransform:"rotate(55)"})
            .append("rect")
            .attr('width',3)
            .attr("height",8);

        var legend = svg.append('g')
            .attr('id', 'legend');

       legend.selectAll('.color-block')
            .data(d3.range(5))
            .enter().append('svg:rect')
            .attr("class","color-block")
            .attr('x', function(d) { return d * blockWidth + 'px'; })
            .attr('height', height+'px')
            .attr('width', blockWidth+'px')
            .attr('y', '0px')
            .attr("fill",function (d) { return colorschemes.discrete[d];})
            .attr('stroke', 'none');

        var legendScale = d3.scale.linear()
            .range([0, width]);

        var legendAxis = d3.svg.axis()
            .scale(legendScale)
            .orient('bottom')
            .tickSize(2)
            .tickFormat(d3.format('.1f'));

        var legendLabels = svg.append('g')
            .attr('transform', 'translate(0,'+height+')')
            .attr('class', 'x axis')
            .call(legendAxis);


        legendLabels.select("path.domain").style("display",'none');

        var suffix = parentElement.append('div')
			.style("font-size", "12px")
            .attr("id",'color-scale-suffix');

        /* triggered when the domain or the data selected changes */
        updateVis = function () {
          	var domain = checkDomain(data.domains[dom]);
            if ((domain) && (ss.tmi !== ss.tmf) && (ss.sidi !== ss.sidf)) { // the domain exists, so we should
                // 1) change the legend scale appropriately
                // 2) color the nodes appropriately
                nodeColorScale.domain(domain);
                legendScale.domain(domain);
                legend.selectAll(".color-block").classed("striped",false);
				legendAxis.tickValues(d3.range(domain[0], domain[1]+0.01,(domain[1]-domain[0])/5));
                legendLabels.style('display',null).call(legendAxis);
                $(eventHandler).trigger("nodeColorChanged");
            } else { // the domain was null, meaning there was no range
                // we should make the color bar striped in this case
                legendLabels.style('display',"none");
                legend.selectAll(".color-block").classed("striped",true);
                suffix.style("display","none");
            }
        };

        this.update = function () {
            updateVis();
        };

        /* initial update */
        updateVis(dom);
    };

    /***********************************
    ***********************************
    TOOLBAR FOR LIMITS
    ***********************************
    **********************************/
    TypeLimitsVis = function (_parentElement) {
        var parentElement = _parentElement,
            filter = null,
            that = this;
        var txtTMi = document.getElementById("TMi"),
            txtTMf = document.getElementById("TMf"),
            txtSIDi = document.getElementById("SIDi"),
            txtSIDf = document.getElementById("SIDf"),
            speciesBtn = d3.selectAll("[id=speciesSelectorBtnGroup]");
        speciesBtn.on('change', function () {
            	ss.species.id = parseInt($("#proteome option:selected").val());
//			    ss.species.id = parseInt(this.value);
                $(eventHandler).trigger("speciesChanged");
        });
        $(".typeLimitsInput").on("enterKey", function () {
            $(this).value = this.value;
            ss.tmi = txtTMi.value;
            ss.tmf = txtTMf.value;
            ss.sidi = txtSIDi.value;
            ss.sidf = txtSIDf.value;
            $(eventHandler)
                .trigger("manualLimitsChanged");
        });

       this.updateVis = function () {
            txtTMi.value = formatFloat(ss.tmi);
            txtTMf.value = formatFloat(ss.tmf);
            txtSIDi.value = formatFloat(ss.sidi);
            txtSIDf.value = formatFloat(ss.sidf);
        };

        d3.select("#downloadAllDataBtn").on("click", function () {
            d3.select("#numedges_adddisclaimer_label").classed("disabled",((ss.tmi == ss.tmf) && (ss.sidi == ss.sidf)));
       		d3.select("#mb-tab-corr").classed("disabled",0);		//undo what clusters tab does 
            $("#dataExport_triggeredby").val("");					//forget that clusters download had been even clicked
        });		//need this for cluster download btn

		function runThis(){
		    corr_columns = $('input[name="columns_correlations"]:checkbox:checked').length;
		    corr_options = $('input[name="correlation-options"]:checkbox:checked').length;
			if (corr_columns==1 || corr_options==0){	
	            d3.select("#btnSubmitSPLOMExport").classed("disabled", 1);
			} else {
	            d3.select("#btnSubmitSPLOMExport").classed("disabled", 0);
			}
		}		

		d3.select("#mbSPLOMexport").on("click", function () {
			setTimeout(function() {runThis()}, 100);	//need delay cuz too fast
		});

		function runThis1(){
		    columns = $('input[name="columns_nodes"]:checkbox:checked').length;
			if (columns==0){	
	            d3.select("#btnSubmitDataExport").classed("disabled", 1);
			} else {
	            d3.select("#btnSubmitDataExport").classed("disabled", 0);
			}
		}		

		d3.select("#mbDataexport").on("click", function () {
			setTimeout(function() {runThis1()}, 100);	//need delay cuz too fast
		});
    };

    SplomBar = function (_parentElement) {
        var splomBar = d3.select(_parentElement).select("#splom-bar"), 
	         colorbar = new Colorbar();
		var gColorbar = splomBar.append("svg");

        var  _button = 40;
        var margin = { left: 10, right: 20, top: 7.5, bottom: 7.5};
        var height = { text: 10, bar: 15 };

        function setHeight () {
            _width = $(_parentElement).width();
		    width = { bar: _width - _button - margin.left - margin.right, 
					button: _button };
		    colorbar.scale(splom_color)
                    .thickness(height.bar)
                    .barlength(width.bar)
                    .orient("horizontal");
		    gColorbar.attr('width', width.bar + margin.left + margin.right)
        		     .attr('height', height.bar + margin.top + margin.bottom + height.text)
 		             .append('g')
      		         .attr('transform', 'translate('+margin.left+','+margin.top+')');
			gColorbar.call(colorbar);
       	}
		setHeight();
    	splomBar.select("svg.colorbar")
        	    .append('text')
           		.attr("transform", "translate(" + (margin.left +5)+ "," + ((height.bar + margin.top)/2) + ")")
         	    .text("P-VALUE")
      	        .attr('class','text-subtitle')
        	    .style("fill", "white");

		this.setHeight = function () {
                setHeight();
				gColorbar.call(colorbar);	//calling twice ensures cbar aligns properly
            };
    };

   /***********************************
    ***********************************
    SPLOM FOCUS PLOT
    ***********************************
    **********************************/
    SplomFocusPlot = function (_parentElement, _dim, _pltsize) {
        var filter = null,
            that = this,
            currentThisPlt, currentPlt, plotData, selectedIDs,points;

        var margin = {
                top: 5,
                right: 10,
                bottom: 50,
                left: 20
            },
            pos = d3.max([((_dim + 2*_pltsize)/2),250]),
            parent = { height: $("#splom").height(), width: $("#splom").width() },
            height = parent.height - pos - margin.top - margin.bottom,
            width = parent.width - pos - margin.left - margin.right,
            text = {size: 12, position: 100};
        var x = d3.scale.linear()
                .range([0, width])
                .domain([0, 1]),
            y = d3.scale.linear()
                .range([height, 0])
                .domain([0, 1]),
            xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom"),
            yAxis = d3.svg.axis()
                .scale(y)
                .orient("left"),
            brush = d3.svg.brush()
                .x(x)
                .y(y)
                .on("brushend", brushended);

        var details = d3.select(_parentElement).select("svg")
            .append('g')
            .attr("id",'splomfocusplot-details')
       		.attr("transform","translate(" + margin.left + "," + (parent.height-1.75*margin.bottom-(6.75-2.5)*text.size) + ")"); 
//            .attr("transform","translate(" + margin.left + "," + (_dim - 2*_pltsize+10) + ")");	//align here


        var detail_labels = details.append("g").attr('class',"detail-labels");
        var detail_values = details.append("g").attr('class',"detail-values");

        detail_labels.append("text")	//maybe putting this in a table would be better
            .attr("x",text.position)
            .attr("y",text.size*2.5)	
            .attr("class","text-subtitle")
            .text("PEARSON");

        detail_labels.append("text")
            .attr("x",text.position+75)
            .attr("y",text.size*2.5)
            .attr("class","text-subtitle")
            .text("SPEARMAN");

        detail_labels.append("text")
            .attr("x",text.position-60)
            .attr("y",text.size*3.75)
            .text("cor coef");

        detail_labels.append("text")
            .attr("x",text.position-60)
            .attr("y",text.size*5)
            .text("p-value");

        detail_labels.append("text")
            .attr("x",text.position-60)
            .attr("y",text.size*6.75)
            .text("best-fit");

        var pvalue = detail_values.append("text")
            .attr("x",text.position-50)
            .attr("y",text.size*5)

        var pvalue_SP = detail_values.append("text")
            .attr("x",text.position + 20)
            .attr("y",text.size*5)

        var rvalue = detail_values.append("text")
            .attr("x",text.position-50)
            .attr("y",text.size*3.75)

        var rho = detail_values.append("text")
            .attr("x",text.position+20)
            .attr("y",text.size*3.75)

        var regression = detail_values.append("text")
            .attr("x",text.position-50)
            .attr("y",text.size*6.75)

/*        var std_err = detail_values.append("text")
            .attr("x",text.position + 10)
            .attr("y",text.size*5);*/

        var graph = d3.select(_parentElement).select("svg")
            .append('g')
            .attr("id",'splomfocusplot')
            .attr("class",'splomfocusplot')
            .attr("transform","translate(" + pos+ "," + pos + ")");

        graph.append("rect")
            .style("visibility", "hidden")
            .style("pointer-events", "all")
            .attr("x", 0)
            .attr('y', 0)
            .attr("height", height)
            .attr("width", width)
			.attr("class","splomfocus-rect");

        graph.append("g")		
            .attr("class", "x axis");

        graph.append("g")	
            .attr("class", "x axis two")
            .attr("transform","translate(0," + height + ")");


        graph.append("g")
            .attr("class", "y axis");

        graph.append("g")
            .attr("class", "y axis two")
            .attr("transform","translate(" + (width) + ", 0)");


        var correlationLine = graph.append("path")
            .attr("class", "correlation-line");

        var xText = graph
            .append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", -30);

        graph.call(brush);

        var yText = graph.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("x", -height/2)
            .attr("y", -35)
			.attr("transform", "rotate(-90)");	
          //  .attr("x", -margin.left);
//            .attr("dy", ".75em");

        this.plot = function (thisplt, plt) {

            currentThisPlt = thisplt ? thisplt : currentThisPlt;
            currentPlt = plt ? plt : currentPlt;
            points = getPoints(currentPlt);

            if (currentPlt) {
                x.domain(data.domains[currentPlt.x]);
                y.domain(data.domains[currentPlt.y]);

                var c = data.correlations[currentPlt.i][currentPlt.j];

 
                pvalue.text(c.p_value_r.toExponential(2));
                rvalue.text(formatFloat(c.r,3));
                regression.text(formatFloat(c.slope,3) + "x + " + formatFloat(c.intercept,3));
             //   std_err.text(c.slope_err);
                rho.text(formatFloat(c.rho,3));
                pvalue_SP.text(c.p_value_rho.toExponential(2));

                plotData = d3.select(currentThisPlt)
                    .selectAll("circle").data();

                var circles = graph.selectAll('circle').data(plotData);

                circles
                    .enter()
                    .append("circle");

                circles
                    .attr("class", function (d) {
	                      return 'splom graph big-graph p' + d[2] + ' c' + d[3];
                    })
                    .attr("cx", function (d) {
                        return x(d[0]);
                    })
                    .attr("cy", function (d) {
                        return y(d[1]);
                    });
//					.attr("r", 1.5);	//for firefox
				circles.attr("r", function (d) {	//solution to allow highlighted points to remain colored for firefox. really slow, consider different solution that passes which points highlighed, tried before but hard  
				var color = $(".splom.p" +d[2]).css('fill');
				color = color.substring(
                          color.indexOf('(') + 1,
                          color.lastIndexOf(color[3] == 'a' ? ',' : ')')
                        );
				if (color == '0, 0, 0') {
					return 1.5;
				}
				else{
					return 3;
				}
				});
	
                circles.exit().remove();

                xText.html(currentPlt.x);
                yText.html(currentPlt.y);

                xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("top");

                yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                var line = d3.svg.line().interpolate('linear')
                    .x(function (d) {
                        return x(d.x);
                    })
                    .y(function (d) {
                        return y(d.y);
                    });

                correlationLine
                    .datum(points)
                    .attr('d', line);	

                graph.select(".x.axis")
                    .call(xAxis)
					.selectAll("text")
					.attr("transform", "rotate(-45)")
					.attr("dx", "10px");
	//				.attr("dy", "-15px");
				graph.select(".x.axis.two")
					.call(xAxis.orient('bottom').tickFormat(function (d) { return ''; }));
                graph.select(".y.axis")
                    .call(yAxis);
                graph.select(".y.axis.two")
                    .call(yAxis.orient('right').tickFormat(function (d) { return ''; }));
            }
        };

        this.displayCell = function (_bool) {
            graph.attr("display", (_bool ? null : "none"));
        };
	
		this.setHeight = function (_dim, _pltsize) {

            pos = d3.max([((_dim + 2*_pltsize)/2),250]),
            parent = { height: $("#splom").height(), width: $("#splom").width() },
            height = parent.height - pos - margin.top - margin.bottom,
            width = parent.width - pos - margin.left - margin.right,
       		details.attr("transform","translate(" + margin.left + "," + (parent.height-1.75*margin.bottom-(6.75-2.5)*text.size) + ")"); 
        x.range([0, width]);
        y.range([height, 0]);

			graph.select(".x.axis.two")	
            .attr("transform","translate(0," + height + ")");

//		graph.select(".y.axis").call(yAxis);

            graph.select(".y.axis.two").attr("transform","translate(" + (width) + ", 0)");

            graph.attr("transform","translate(" + pos+ "," + pos + ")");	//necessary for big window resize
        xText.attr("x", width/2);
        yText.attr("x", -height/2);
		};

        function brushended () {
            if (brush.empty()) {
                d3.select("#btnBigSplomHighlight").style("display", "none");
                d3.selectAll("circle").classed("faded", false);
                selectedIDs = [];
            } else {
                d3.select("#btnBigSplomHighlight").style("display",
                        "inline")
                    .on("click", highlightSplomProteins);
                var e = brush.extent();
                selectedIDs = plotData.filter(function (d) {
                        return (d[0] > e[0][0]) && (d[0] < e[1]
                            [0]) && (d[1] > e[0][1]) && (d[
                            1] < e[1][1]);
                    })
                    .map(function (d) {
                        return d[2];
                    });

                d3.selectAll("circle").classed("faded", true);

                selectedIDs.forEach(function (d) {
                    d3.selectAll("circle.p" + d).classed("faded", false);
                });
            }
        }

        function highlightSplomProteins () {
            $(eventHandler)
                .trigger("bigSplomValuesSelected", {
                    ids: selectedIDs
                });
        }
    };

    /***********************************
    ***********************************
    SPLOM
    ***********************************
    **********************************/
    SplomVis = function (_parentElement, _newData) {	

        var parentElement = d3.select(_parentElement).select("#splom"),
            filter = null,
            that = this,
            brushCell = null,
            num_splot = attributes.all().length;

        parentElement.html('');

        var x = d3.scale.linear().domain([0, 1]),
            y = d3.scale.linear().domain([0, 1]);

      // setting up the brush that can be called on any of the scatterplots
        // keeps track of what scatter plot it is/was on
        var brush = d3.svg.brush()
            .on("brushstart", function (d) {
                brushstarted(d, this, false);
            })
            .on("brush", function (d) {
                brushed(d);
            })
            .on("brushend", function (d) {
                brushended(d);
            });


	function setHeight_one () {
  	   _height=$(_parentElement).height() - 40;
           _width=$(_parentElement).width();
           margin = {inside: 5, outside: 15};
	   dim = d3.min([_height - 40, _width]) - 2 * margin.outside,
	   pltsize = (dim / (num_splot + 1)) - margin.inside;

	   x.range([0, pltsize]);
	   y.range([pltsize, 0]);

	   brush.x(x);
	   brush.y(y);
	}
        
	setHeight_one();

        /******** HELPER FUNCTIONS *******/
        function cross (a, b) {
            var c = [],
                n = a.length,
                m = b.length,
                i, j;
            for (i = -1; ++i < n; true) {
                for (j = -1; ++j < m; true) {
                    c.push({
                        x: a[i],
                        i: i,
                        y: b[j],
                        j: j
                    });
                }
            }
            return c;
        }

        function plot (plt, thisplt) {
            var that = this,
                cell = d3.select(thisplt);
	            cell.select("rect").attr("fill", function (d) {
	                return (d.i == d.j) ? "none" : "white";
	            });

            if (plt.i > plt.j) {
                x.domain(data.domains[plt.x]);
                y.domain(data.domains[plt.y]);
                var line = d3.svg.line().interpolate('linear')
                    .x(function (d) {
                        return x(d.x);
                    }).y(function (d) {
                        return y(d.y);
                    }),
                    points = getPoints(plt),
                    cleanedData = cleanData(plt);
                cell.select("rect").style("fill",
                    function (d) {
                        var dCorrelation = data.correlations[plt.i][plt.j];
                        if (Math.abs(dCorrelation.rho) > 0.15) {
                            return splom_color(data.correlations[plt.i][plt.j].p_value_rho);
                        } else {
                            return 'white';
                        }
                    });

                var circles = cell.selectAll('circle.' + plt.x + '-' + plt.y)
                    .data(cleanedData);

                circles
                    .enter()
                    .append("circle");

                circles
                    .attr("class", function (d) {
                        return plt.x + '-' + plt.y + ' graph splom p' + d[2] + " c"+d[3];
                    })
                    .attr("cx", function (d) {
                        return x(d[0]);
                    })
                    .attr("cy", function (d) {
                        return y(d[1]);
                    })
		    .attr("r", 1);	//necessary for firefox. chrome and others automatically do (.style("r", 1))

                circles.exit().remove();

                cell.select('.correlation-line')
                    .datum(points)
                    .attr('d', line)	
		    .style('stroke-width', 2);
            }
        }

            // Clear the previously-active brush, if any.
        var brushstarted = function (plt, thisplt, _update) {
                splomFocusPlot.displayCell(true);
                if (brushCell !== thisplt) {
                    d3.select(brushCell)
                        .call(brush.clear());
                }
                if ((brushCell !== thisplt) || _update) {
                    x.domain(data.domains[plt.x]);
                    y.domain(data.domains[plt.y]);
                    splomFocusPlot.plot(thisplt, plt, getPoints(plt));
                    brushCell = thisplt;
                    brushCellPlt = plt;
                    brushCellData = cleanData(plt);
                }
                if (_update) {
                    brushed(plt);
                }
            };

        // Highlight the selected circles.
        function brushed (plt) {
            var e = brush.extent();
            d3.selectAll("circle").classed("faded", true);
            selected = brushCellData.filter(function (d) {
                return ((d[0] >= e[0][0]) && (d[0] <= e[1][0]) && (d[1] >= e[0][1]) && (d[1] <= e[1][1]));
            }).map(function (d) {
                return d[2];
            });
            selected.forEach(function (protein) {
                d3.selectAll(".p" + protein)
                    .classed(
                        "faded", false);
            });
            d3.selectAll(".link").classed("faded", function (
                link) {
                return (selected.indexOf(link.source.id) ==-1) || (selected.indexOf(link.target.id) == -1);
            });
        }

        // If the brush is empty, select all circles.
        function brushended (plt) {
            if (brush.empty()) {
                d3.selectAll(".faded").classed("faded", false);
            }
        }

        function cleanData (_plt) {
            var colX = data.nodes.map(function (d) {
                    return d[_plt.x];
                }),
                colY = data.nodes.map(function (d) {
                    return d[_plt.y];
                }),
                colCluster = data.nodes.map(function (d) {
                    return (d.cluster !== null) ? d.cluster : "X";
                });
            var n = colX.length,
                tmp = [],
                row;
            for (i = -1; ++i < n; true) {
                if ((colX[i] !== null) && (colY[i] !== null)) {
                    row = [colX[i], colY[i], i2ID(i), colCluster[i]];
                    tmp.push(row);
                }
            }
            return tmp;
        }
        
        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .direction('w')
            .offset([0,-10])	
            .html(function (corr) {	//change to splom focus table format
                return "<table style='text-align: center'><tr><td></td><td class='text-subtitle'> PEARSON</td><td class='text-subtitle'>SPEARMAN</tr>" +
                       "<tr><td class='detail-labels'>cor coef</td><td class='detail-values'>" + formatFloat(corr.r, 3) + "</td><td class='detail-values'>"+formatFloat(corr.rho,3)+"</td></tr>"+
                       "<tr><td class='detail-labels'>p-value</td><td class='detail-values'>" + formatFloat(corr.p_value_r, 3) + "</td><td class='detail-values'>"+formatFloat(corr.p_value_rho,3)+"</td></tr></td></tr></table>"+"<table><tr><td class='detail-labels'>best-fit </td><td class='detail-values'>" + formatFloat(corr.slope, 3) + "x + " + formatFloat(corr.intercept, 3) + "</td></tr></table>";
            });

        var svg = parentElement.append("svg");

        var cells = svg.selectAll(".cell")
            .data(cross(data.columns, data.columns))
            .enter().append("g").attr("class", function (d) {
                if (d.i == d.j) {
                    return "cell-diagonal";
                }
                if (d.i < d.j) {
                    return "cell unused";
                }
                return "cell";
            });

        cells.append('rect').attr('class', 'splom-box');
   
        cells.append("text")
            .attr("x", 10)
            .attr('class', 'splom-subgraph-text')
            .text(function (d) {
                return d.i == d.j ? (data.columns[d.i]) : '';
            });
        cells.append("text")
            .attr("y", 14)
            .attr('class', 'splom-pvalue');
        cells.append('path')
            .attr('class', 'correlation-line');//accidentally replicated label from above?

        svg.selectAll(".cell")
            .call(brush)
            .call(tip);

        $(".unused").remove();

        svg.selectAll(".cell").on("mouseover", function (d) {
                tip.show(data.correlations[d.i][d.j]);
            })
            .on("mouseout", tip.hide);
    
	function setHeight_two () {
  	    _height=$(_parentElement).height() - 40;
            _width=$(_parentElement).width();
            margin = {inside: 5, outside: 15};
            dim = d3.min([_height - 40, _width]) - 2 * margin.outside,
            pltsize = (dim / (num_splot + 1)) - margin.inside;

	    scale=pltsize/old_pltsize

            svg.attr("width", _width)
               .attr("height", _height)
               .append("g").attr('transform', 'translate(' + margin.outside + ',' + margin.outside + ')');	

	    cells.attr("transform", function (d) {
                return "matrix(" +scale+','+0+','+0+','+scale+','+ (num_splot - d.i - 1) * (pltsize + margin.inside) + "," + d.j * (pltsize + margin.inside) + ")"});
					//selecting class messes things up
	    cells.select(".splom-box")
		     .attr("height", pltsize)
             .attr("width", pltsize)
             .attr("class", function (d) { return d.i > d.j ? "rect-subgraph" : "rect-diagonal"; });	//only controls outside box
	    cells.select(".splom-subgraph-text").attr("y", pltsize / (2*scale));
	    cells.select(".splom-subgraph-text").style("font-size", 100/scale+"%");	//size changes upon resize
	    cells.select(".splom-pvalue").attr("x", pltsize - 45);
        cells.select(".correlation-line").style('stroke-width',2/scale);
        cells.selectAll("circle").attr("r", 1/scale);	//for firefox		//1 is the initial radius
        cells.selectAll("circle").style("r", 1/scale);	//for others...
	};

	_height=$(_parentElement).height() - 40;
    _width=$(_parentElement).width();
    margin = {inside: 5, outside: 15};
    dim = d3.min([_height - 40, _width]) - 2 * margin.outside,
    old_pltsize = (dim / (num_splot + 1)) - margin.inside;
	setHeight_two();

// the big version of the scatterplot
    splomFocusPlot = new SplomFocusPlot("#splom", dim, pltsize);	//resizing big splom tricky if passing variables
	splomFocusPlot.displayCell(false);

	this.setHeight = function () {
		//unable to define univerals position variables here and pass them without problems
		setHeight_one();	//maybe important once splom matrix change positions?
		setHeight_two();

 	    _height=$(_parentElement).height() - 40;
		_width=$(_parentElement).width();
		margin = {inside: 5, outside: 15};
	    dim = d3.min([_height - 40, _width]) - 2 * margin.outside;
	    pltsize = (dim / (num_splot + 1)) - margin.inside;

		splomFocusPlot.setHeight(dim, pltsize);
		splomFocusPlot.plot();
	};

        var brushCellPlt;
        this.updateVis = function () {
            cells.each(function (d) {
                plot(d, this);
            });
            if (brushCellPlt) {
                brushstarted(brushCellPlt, brushCell, true);
            }
            splomFocusPlot.plot();
        };

        var buttonGroup = parentElement.append("div")
            .attr('class', 'form-group pull-right');

        buttonGroup.append("button")
            .attr('class', 'btn btn-default')
            .attr("role", "button")
            .attr("id", "btnBigSplomHighlight")
            .style("display", "none")
            .html("Highlight selected proteins");

        this.updateVis();
    };


    ViewTab = function (_value) {

        var that = this;

        var nodeList = d3.select("#nodeList"),
            clusterList = d3.select("#clusterList"),
            viewTabGroup = d3.select("#viewTabGroup");

        this.view = 'nodeListTab';

        this.switchView = function (_view) {

            if (_view !== that.view) {
                that.view = _view;

                viewTabGroup.selectAll(".active").classed(
                    "active", false);
                d3.select("#" + _view)
                    .classed('active', true);
                nodeList.style("display", ((that.view ==
                        'nodeListTab') ? "block" :
                    "none"));
                clusterList.style("display", ((that.view ==
                        'clusterListTab') ? "block" :
                    "none"));

                if (that.view == 'clusterListTab') {
                    $(eventHandler)
                        .trigger("updateClusterScatter");
                }
            }
        };

        clusterList.style("display", "none");

        viewTabGroup.selectAll("li").on('click', function () {
            that.switchView($(this)[0].id);
        });
    };

	var proteinMediaList = [];	//more descriptive name. i.e. proteinMediaList
    /***********************************
    ***********************************
    PROTEIN SEARCH
    ***********************************
    **********************************/
    ProteinSearch = function (_parentElement) {
        var mediaList = _parentElement.select(".media-list"),
//            proteinMediaList = [],	 //made into a global variable so that can reset upon species change
            that = this;
            triggerDestinationIndividual = 'add-to-individual-list',
            triggerDestinationCluster = 'add-to-cluster-list';

            cluster = {
                cluster: null,
                pdbData: [],
                dLength: 0
            };
        $('#protein_search').selectivity({
            multiple: true,
            closeOnSelect: false,
            ajax: {
                url: './query',
                dataType: 'json',
                minimumInputLength: 3,
                quietMillis: 250,
                params: function (term, offset) {
                    // GitHub uses 1-based pages with 30 results, by default
                    return {
                        q: term,
                        species: ss.species.id
                    };
                },
                processItem: function (item) {
					gene = item.genes
					gene_list = gene.split(" ");
                    return {
                        id: item.pdb,
                        text: item.pdb,
                        text2: item.uniprot,
                        description: item.function2 ? gene_list[0] + " | " + (item.function2).slice(0,(item.function2).indexOf('[GO')-1) : gene_list[0]
                    };
                },
                results: function (data, offset) {
                    d = data;
                    return {
                        results: data,
                        more: false
                    };
                }
            },
            placeholder: 'Search for a protein',
            templates: {
                resultItem: function (item) {
                    return (
                        '<div class="selectivity-result-item" data-item-id="' +
                        item.id + '">' + '<b>' +
                        item.text + '</b> <small>' +
                        item.text2 +
                        '</small><br><span class="lightened">' +
                        item.description.slice(0,
                            40) + '</span></div>');
                }
            }
        });
        $('#protein_search').on("selectivity-close",
            function () {
                that.individualSearch($('#protein_search').selectivity("value"), true);
            });

        $('#btnProteinSearch').on("click", function () {
            that.individualSearch($('#protein_search').selectivity("value"), true);
        });


        var getChainIDs = function (_data, domains) {
            return {
                data: _data.map(function (domain) {
                    return domain.chains.map(function (chain) {
						if (chain.highlight_bool){
	                        return chain.id;
						}
                    });
                })
            };
        };

        this.individualSearch = function (pdbs,
            _triggerPdbHighlighting) {
            if (!(Array.isArray(pdbs))) {
                pdbs = [pdbs];
            }
            $('#protein_search').selectivity("clear");
            // for the individual proteins, you need to check that they aren't already on the list of proteins shown
            var newPdbs = check(pdbs);
            if (newPdbs) {
                var request = $.param({
                    species: ss.species.id,
                    pdblist: newPdbs		//cant pass _, pdb_list becomes pdblist Python-side
                });
                var jqxhr_data = $.ajax({
                        url: "fetch_proteins/", // the endpoint
                        type: "POST", // http method
                        data: request
                    })
                    .done(function (_data) {
                        var d = {pdbData: _data};
	                    $(eventHandler).trigger(triggerDestinationIndividual,d);

                        if (_triggerPdbHighlighting) {
                            var dData = getChainIDs(_data);
                            $(eventHandler).trigger("highlightChains",dData);
                        }
                    });
            }
            return true;
        }
        this.clusterSearch = function (_data,
            _triggerPdbHighlighting) {
            var chunk, request,
                isDone = false;
            cluster.cluster = _data.cluster;
            cluster.pdbData = [];
            cluster.pdbcomplexes = _data.clusterdata;
            cluster.dLength = _data.clusterdata.length;
            while (cluster.pdbcomplexes.length > 0) {
                chunk = cluster.pdbcomplexes.splice(0, 10);
                var request = $.param({
                    species: ss.species.id,
                    pdbcomplexlist: chunk
                });
                var jqxhr_data = $.ajax({
                        url: "fetch_proteins/", // the endpoint
                        type: "POST", // http method
                        data: request
                    })
                    .done(function (d) {
                        cluster.pdbData = cluster.pdbData
                            .concat(d);
                        isDone = (cluster.pdbData.length ==
                            cluster.dLength);
                        if (isDone) {
                            // wait for everything else to finish
                            $(eventHandler).trigger(triggerDestinationCluster,cluster);
                            if (_triggerPdbHighlighting) {
                                var chainIDs = getChainIDs(cluster.pdbData);
                                $(eventHandler).trigger("highlightChains",chainIDs);
                            }
                        }
                    });

            }
        };

        function check (pdbs) {
            var notYetAdded = pdbs.filter(function (pdb) {
                return proteinMediaList.indexOf(pdb) == -1;
            });
            return (notYetAdded.length) ? notYetAdded : false;
        }

        this.removeProtein = function (p) {
			var proteinMediaListcopy = proteinMediaList.slice();
			proteinMediaListcopy.forEach(function (protein){
				if (protein.pdb_complex == p){
            		proteinMediaList.remove(protein);
				}
			});
        };
    };

    /***********************************
    ***********************************
    CLUSTER SCATTER
    ***********************************
    **********************************/
    ClusterScatter = function (_parentElement, _height, _width) {
        var parentElement = _parentElement,
            that = this,
            r = 10,
            scrunched = false,
            baseHeight = $("#view").height() - $("#viewTabGroup").height() -
            5;

        var margin = {
                top: 5,
                right: 10,
                bottom: 25,
                left: 20
            },
            width = _width - margin.left - margin.right,
            height = (_height - margin.top - margin.bottom -
                titlePadding),
            scrunchHeight = (_height / 4 - margin.top - margin.bottom -
                titlePadding);

        var x = d3.scale.ordinal().rangeRoundBands([margin.left,
                width
            ]),
            y = d3.scale.ordinal().rangeRoundBands([margin.top,
                height
            ]),
            scrunchScale = d3.scale.ordinal().rangeRoundBands([
                margin.top, height / 4
            ]),
            xMap = function (d) {
                return x(d.i) + ((x.rangeBand() - r) / 2);
            },
            yMap = function (d) {
                return y(d.size) + ((y.rangeBand() - r) / 2);
            },
            scrunchMap = function (d) {
                return scrunchScale(d.size);
            };

        // .exponent(0.5);
        var yAxis = d3.svg.axis().scale(y)
            .orient("left");

        var svg = parentElement.append("svg").attr("class","cluster_size")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        var graph = svg.append("g").attr("class","cluster_placement").attr("transform", "translate(" +
            margin.left + "," + margin.top + ")");

        graph.append("g").attr("class", "y axis").attr("transform",
            "translate(" + margin.left + ",0)").call(yAxis);

        graph.append("text")
            .attr("class", "y label")
            .attr("x", -(height+margin.top+margin.bottom)/2)
            .attr("y", -5)
            .attr("transform", 'rotate(-90)')
            .text("cluster size");
		
        function setHeight () {
			_height = 300;
			_width = $("#clusterList").width();
            baseHeight = $("#view").height() - $("#viewTabGroup").height() -
            5;
	            width = _width - margin.left - margin.right,
            height = (_height - margin.top - margin.bottom -
                titlePadding),
            scrunchHeight = (_height / 4 - margin.top - margin.bottom -
                titlePadding);
    		x.rangeRoundBands([margin.left, width]);
            y.rangeRoundBands([margin.top, height]);

            var scrunchScale = d3.scale.ordinal().rangeRoundBands([margin.top, height / 4]),
            xMap = function (d) {
                return x(d.i) + ((x.rangeBand() - r) / 2);
            },
            yMap = function (d) {
                return y(d.size) + ((y.rangeBand() - r) / 2);
            },
            scrunchMap = function (d) {
                return scrunchScale(d.size);
            };
			yAxis.scale(y);
   			
			svg.attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
			graph.select(".y axis").attr("transform",
            "translate(" + margin.left + ",0)").call(yAxis);

		}
	
		this.setHeight = function () {
                setHeight();
            };

        this.updateVis = function () {
            that.data = data.clusters.filter(function (d) {
                return d.size > 2;
            });
            var yDomain = data.cluster_frequencies.map(function (
                d) {
                return d.size;
            }).filter(function (d) {
                return d !== 2;
            });
            x.domain(d3.range(1, d3.max(that.data, function (d) {
                return d.i;
            }) + 1));
            y.domain(yDomain);
            scrunchScale.domain(yDomain);
            graph.select(".y.axis").call(yAxis);

            var clusters = graph.selectAll(".cluster").data(
                that.data);
            clusters.enter().append("rect")
                .attr('height', r)
                .attr('width', r);
            clusters
                .attr("x", xMap)
                .attr("y", yMap)
                .attr("class", function (d, i) {
                    return "cluster c" + i;	
                })
                .style("fill", nodeColor)
                .on("mouseover", function (d) {
                    $(eventHandler)
                        .trigger("clusterHoverHighlight", d);
                })
                .on("mouseout", function (d) {
                    $(eventHandler)
                        .trigger("removeClusterHoverHighlight");
                })
                .on("click", function (d, i) {
                    $(eventHandler)
                        .trigger("clusterClicked", [d, i]);
                });

            clusters.exit().remove();
        };

        this.updateColor = function () {
            graph.selectAll(".cluster").style("fill",
                nodeColor);	//this is responsible for colorfill
        };

        this.scrunch = function (_forceScrunch) {
            var _scrunch = !(d3.select("#cluster_list").selectAll(
                    ".collapsed")[0].length == d3.select(
                    "#cluster_list").selectAll(".panel")[0]
                .length);

            if (!(_scrunch == scrunched) || _forceScrunch) {
                if (_scrunch && !(_forceScrunch)) {
                    graph.classed("scrunched", true);
                    graph.selectAll(".cluster").transition().duration(
                            500)
                        .attr("height", 2)
                        .attr("y", scrunchMap);
                    graph.selectAll(".y").style("display",
                        "none");
                    svg.transition().duration(500)
                        .attr("height", scrunchHeight + margin.top +
                            margin.bottom);
                    _height = baseHeight - (scrunchHeight +
                        margin.top + margin.bottom);
                } else { // unscrunch the stuff
                    graph.classed("scrunched", false);
                    graph.selectAll(".cluster").transition().duration(
                            500)
                        .attr("height", r)
                        .attr("y", yMap);
                    graph.selectAll(".y").style("display", null);
                    svg.transition().duration(500)
                        .attr("height", height + margin.top +
                            margin.bottom);
                    _height = baseHeight - (height + margin.top +
                        margin.bottom);
                }
                scrunched = _forceScrunch ? !(_forceScrunch) :
                    _scrunch;
                $("#cluster_list").height(_height-titlePadding-5);
            }
        };

        parentElement.on('mouseover', function () {
            that.scrunch(true);
        });
    };

    /***********************************
    ***********************************
                CLUSTER VIEW
    ***********************************
    **********************************/
    ClusterList = function (_parentElement) {
        var parentElement = _parentElement,
            displayData = [],
            that = this,
            margin = {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
            };

        var cluster_list = parentElement.append('div').attr('class',
            'clusterview panel-group').attr("id",
            'cluster_list');

        function wrangleData (_cluster) {
            var chains = {},
                pdb_complex, chain;
            _cluster.cluster.forEach(function (node) {
                pdb_complex = data.nodes[ID2i(node)].pdb_complex;	//easier to pass pdb_complex
                chains[pdb_complex] = [];
            });
            return d3.keys(chains);
        }

        this.clear = function () {
            cluster_list.selectAll("div").remove();
        };

        this.addContent = function (_cluster) {
            // the overall rows
            var panel = cluster_list.append("div")
                .attr('class', 'panel panel-default')	
				.attr('id', 'entirepanel' + _cluster.id);	//make new id here instead of putting in class, because lose nice default behavior
            // each of the visible row headers
            var panelHeader = panel.append("div")
                .attr('class', 'panel-heading')
                .attr('id', "row" + _cluster.id)
                .attr('href', "#panel" + _cluster.id)
                .attr('data-toggle', 'collapse')
                .attr('aria-expanded', 'false')
                .attr('aria-controls', "col" + _cluster.id)
                .attr('data-parent', "#cluster_list")
                .html('<span class="badge">' + _cluster.size +
                    "</span><span class='remove' style='float:right;cursor: pointer'>&times;</span></a>"+
                    '</span><span data-target="#mDataexport" data-toggle="modal" class="glyphicon glyphicon-save pull-left download" id="download-' +
                    _cluster.id + '"></span>');	

            panelHeader.select(".download").on("click",
                function () {
                    $("#mlDataexport").html("Download options - selected cluster");
                    d3.select("#mb-tab-corr").classed("disabled", 1);		//have to undo this....
					$("a[href='#mbDataexport']").tab('show');
            		d3.select("#numedges_adddisclaimer_label").classed("disabled",0);
                    $("#dataExport_triggeredby").val(_cluster.id);
                });

            // the collapse part
            panel.append("div")
                .attr('class','panel-collapse collapse')
                .attr('id', "panel" + _cluster.id)
                .attr("aria-labelledby", "row" + _cluster.id)
                .attr("role", "tabpanel")
                .append("ul").attr("class", "media-list")
                .attr('id', "list" + _cluster.id)

            panelHeader.datum(_cluster)
                .on("mouseover", function () {
                    $(this)
                        .children(".glyphicon").show();
                    $(eventHandler)
                        .trigger("clusterHoverHighlight",
                            _cluster);
                })
                .on("mouseout", function () {
                    $(this)
                        .children(".glyphicon").hide();
                    $(eventHandler)
                        .trigger("removeClusterHoverHighlight");
                })
                .on("click", function (d) {
                    if (!(d3.select(this)
                            .classed("loaded"))) {
                        var clusterData = wrangleData(d);
                        var dt = {
                            cluster: d,
                            clusterdata: clusterData
                        };
                        d3.select(this)
                            .classed("loaded", true);
                        $(eventHandler)
                            .trigger("getClusterDetails",
                                dt);
                    }
                    $(eventHandler)
                        .trigger("scrunch");
                })
				.select(".remove")
				.on("click", function () {	
                $(eventHandler).trigger("removeClusterHighlight", _cluster);
				$('#entirepanel'+_cluster.id).remove();
            	});
        };
    };

    /* PROTEIN MEDIA ITEM */
    ProteinMediaItem = function () {
        var that = this,
            mediaList, closeSpan, cluster;

        var lightboxDiv = d3.select("#lightbox-div");

        function mediaItem (_data) {
            // called on each of the objects of proteins
            var media = mediaList
                .append("li")
                .attr("class", "media")
                .attr("id", "media-object-" + _data.pdb_complex)
                .datum(_data);

            var mediaLeft = media.append("div")
                .attr('class', 'media-left');

            var mediaView = mediaLeft.append("div")
                .attr('class','view third-effect');

            mediaView.append("img")
                .attr('class', 'media-object')
                .attr("src", chainImgSrc(_data.pdb_complex,_data.chains[0].chain))
                .attr("alt", _data.pdb_complex);

            mediaView.append('div')
                .attr("class","mask")
                .html('<a href="#" class="info" title="Full Image">+</a>')
                .on('click', function () { showChainDetails(_data); });

            var chainBadges = mediaLeft.append("div")
                .attr("class","label-chains-group");

            var mediaBody = media.append("div").attr("class",
                'media-body');
            mediaBody.append("h4").attr("class",
                "media-heading").html(mediaHeading(_data.pdb_complex, _data.function2));

            if (ss.species.has_localization) {
                mediaBody.append("div").html("localization: " +
                    ((_data.localizations.length) ? _data.localizations.reduce(
                            function (a, b) {
                                return a + ', ' + b;
                            }) : " - "));
            };

            mediaBody.append("div").html(createGeneLinks(
                _data.uniprot, _data.pdb_complex));

            mediaBody.append("div").attr("class", 'collapse')
                .attr("id", "collapse-" + (closeSpan ?
                    "individual-" : "cluster-") + _data.pdb_complex)
                .attr("aria-expanded", "false")
                .attr("aria-controls", "collapse-" + (closeSpan ?
                    "individual-" : "cluster-") + _data.pdb_complex)
                .append("div").attr("class",
                    "well function-well")
                .html(_data.function1.length ? _data.function1
                    .reduce(function (a, b) {
                        return a + "<br>" + b;
                    }) : "");

            var chainData = _data.chains.map(function (d) {
                return data.nodes[ID2i(d.id)];
            });

            chainBadges.selectAll("span.label")
                .data(chainData)
              .enter()
                .append("span")
                .attr("class",function (d) {
                    return "label label-default label-chains p" + d.id + " c" + (cluster ? cluster : d.cluster);
                })
                .html(function (d) {
                    return d.chain;
                })
                .on('click', function (d) {
                    d3.select(this)
                      .classed("highlight", true);
                    $(eventHandler).trigger("chainClicked", d.id);
                });

            mediaBody.select(".remove").on("click", function () {	
                media.remove();
                $(eventHandler).trigger("removeHighlight", _data);
            });
            mediaBody.select(".glyphicon.more").on("click",
                function () {
                    if ($($(this)
                            .parent()).attr("aria-expanded") ==
                        'false') {
                        d3.select(this)
                            .classed("glyphicon-plus",
                                false)
                            .classed("glyphicon-minus",
                                true);
                    } else {
                        d3.select(this)
                            .classed("glyphicon-minus",
                                false)
                            .classed("glyphicon-plus", true);
                    }
                });
        }

        function mediaHeading (sPdbcomplex, sFunction) {
            var tmp = "<h4>";
            tmp +=
                "<a href='http://www.rcsb.org/pdb/explore/explore.do?structureId=";
            tmp += sPdbcomplex + "' target='_blank'>" + sPdbcomplex +
                "</a>  ";
            tmp += "<small>" + sFunction + "</small>";
            if (closeSpan) {
                tmp +=
                    "<a href='#'><span class='remove' style='float:right'>&times;</span></a>";
            }
            return tmp;
        }

        function chainImgSrc (sDom, sChain) {
            sDom = sDom.toLowerCase();
            return "../static/img/" + sDom[0] + '/' + sDom[1] + '/' + sDom + '.' + sChain + ".png";	
        }

        this.clear = function (_list) {
            if (_list) {
                d3.select(_list)
                  .selectAll((_list == '#individual_list' ?  "li" : ".panel.panel-default")).remove();
            } else {

                d3.select("#individual_list").selectAll("li").remove();
                d3.select("#cluster_list").html('');
            }
        };

        function createGeneLinks (oUniprot, sPdbcomplex) {
            var str = "gene: ";
			if (oUniprot.length>1){
				str = "genes: ";
			}
            str += oUniprot.length ? oUniprot.map(function (
                entry) {
                var tmp =
                    "<a href='http://www.uniprot.org/uniprot/" +
                    entry.uniprot +
                    "' target='_blank'>" + entry.genes
                    .split(" ")[0] + "</a>";
//                tmp += " <small>(" + entry.uniprot +
  //                  ")</small>";
                return tmp;
            }).reduce(function (a, b) {
                return a + ", " + b;
            }) : '-';
            str +=
                '<a data-toggle="collapse" href="#collapse-' +
                (closeSpan ? "individual-" : "cluster-") +
                sPdbcomplex +
                '" title="More..." aria-expanded="false" aria-controls="collapse-' +
                (closeSpan ? "individual-" : "cluster-") +
                sPdbcomplex + '">';
            str +=
                "<span style='float:right' class='more glyphicon glyphicon-plus'></span></a>";
            return str;
        }

        function showChainDetails (_data) {
            lightboxDiv.html('');

            lightboxDiv.selectAll("a")
                .data(_data.chains)
            	.enter()
                .append("a")
                .attr("class",'lightbox-modal')
                .attr('href',function (d) { return chainImgSrc(_data.pdb_complex,d.chain); })
                .attr('data-lightbox','lightbox-modal')
                .attr('data-title',function (d) { return generateChainDetailsTable(d.id); })
                .append('img')
                .attr('src',function (d) { return chainImgSrc(_data.pdb_complex,d.chain); });

            $('.lightbox-modal')[0].click();
        }

        function generateChainDetailsTable (chainID) {
            var d = data.nodes[ID2i(chainID)];
            var str = '<span class="lb-chainTitle">'+d.pdb+' <span class="label label-default">' + '</span></span><table class="lb-chainTable"><tbody>';
            attributes.all().forEach(function (attr) {
                str += "<tr><td>"+(attr.split("_").join(" "))+"</td><td class='detail-values'>"+formattedNum(d,attr)+"</td></tr>";
            });
            str += "</tbody></table>";
            return str;
        }

        function formattedNum (d,attr) {
            var v = d[attr];
            if (attributes.log(attr)==1 && v!=null) {
                v = Math.pow(10,v);
            }
            return v ? formatFloat(v,attributes.decimalplaces(attr)) : '';
        }

        this.addPdbsToList = function (_pdbs, _mediaList,_cID) {
            mediaList = _mediaList;
            closeSpan = (mediaList.attr("id") == 'individual_list');
            cluster = _cID;
            var pdbs = (!(Array.isArray(_pdbs))) ? [_pdbs] : _pdbs;
			var addbool = true;
            pdbs.forEach(function (pdb, i) {
				proteinMediaList.forEach(function (protein){
					if (protein.pdb_complex == pdb.pdb_complex && _mediaList[0][0].id=='individual_list'){
						addbool = false;
					}
				});
				if (addbool) {
	                mediaItem(pdb);
				}
            })
			if (_mediaList[0][0].id=='individual_list'){
	            proteinMediaList = proteinMediaList.concat(pdbs);	//having this here is convenient for determining whether to add media item if already present. dont want cluster to go here
			}
        };
    };

    /***********************************
    ***********************************
    HIGHLIGHTING TOOL
    ***********************************
    **********************************/
    Highlighter = function (_initProteins) {
        var arrProteins = Array.isArray(_initProteins) ?
            _initProteins : [],
            i = 0,
            styleString;

        this.highlightedProteins = function () {
            return arrProteins;
        };

		d3.selection.prototype.moveToFront = function() {
			return this.each(function(){
			    this.parentNode.appendChild(this);
			});
		};

        var singleHighlight = function (protein, index) {
           d3.selectAll(".splom.p" +protein).attr('r',3);	//for firefox. seems like firefox quantum no longer needs this
           d3.selectAll(".splom.p" +protein).moveToFront();	//have point come to front
           return "<style id='style-p" + protein +
                "' class='style-highlight'> " +
                "circle.p" + protein + "{ fill: " + color(i) +	
                " !important;}" +
                ".pcg.p" + protein + "{r:8;}" +	
                ".pcg.highlight-center.p" + protein + "{r:35;}" +
                ".splom.p" + protein +
                " {r:3 !important; stroke:" + color(i) +	
                " !important ;}" +	
                ".label-chains.p" + protein +
                " { background-color:" + color(i) +	
                ";}</style>";
        };

        var clusterHighlight = function (index) {
            return "circle.c" + index + "{ fill: " + color(i) +
                ";}" +
                ".cluster.c" + index + "{fill:" + color(i) +	//colors the little box!
                "!important;}";

        };

        this.highlight = function (proteins, _index) {
            if (Array.isArray(proteins) && (proteins.length > 1)) {
                proteins.forEach(function (protein) {
                    styleString = singleHighlight(protein);
                    $("head").append(styleString);
                });
            } else {
                var protein = Array.isArray(proteins) ? proteins[0] : proteins;
               	styleString = singleHighlight(protein)
                $("head").append(styleString);
                d3.select(".pcg.p" + protein).classed("highlight", true);
                arrProteins.push(protein);
            }

			if ((_index) || (_index==0)){
                styleString = clusterHighlight(_index);	
                d3.select("head").insert("style",".style-highlight")
                    .attr("id", "style-c" + _index)
                    .attr("class", "style-highlight-cluster")
                    .html(styleString);
            }
			i += 1;
        };

        this.removeHighlight = function (proteins, _index) {	
			if ((_index) || (_index==0)) {
                tries_to_delete = i;	//easy way to get number of clusters clicked?	
				
            	while (tries_to_delete > 0) {
					$("#style-c" + _index).remove();
					proteins.forEach(function (protein) {
            			d3.selectAll(".splom.p" +protein).attr('r',1);	//for firefox
						$("#style-p" + protein).remove();	
                    	d3.selectAll(".highlight.p" + protein).classed("highlight", false);
                    	data.nodes[ID2i(protein)].highlight = false;
					});
					tries_to_delete -= 1;
				}
            } 

            /* if they provide a valid protein */
	        else if (proteins) {
                if (!(Array.isArray(proteins))) {
                    proteins = [proteins];
                }
                proteins.forEach(function (protein) {
                    arrProteins.remove(protein);
                    tries_to_delete = 1+i;	//best we can do without knowing how many times color changed for a given protein. protein.length doesnt work for multiple chains per complex?
            	    while (tries_to_delete > 0) {
                        $("#style-p" + protein).remove();		//this be trippin when change initial color //needs the same number of times color was changed
						tries_to_delete -= 1;
				    }
            		d3.selectAll(".splom.p" +protein).attr('r',1);	//for firefox
                    d3.selectAll(".highlight.p" + protein).classed("highlight", false);
                    data.nodes[ID2i(protein)].highlight = false;
                });
            } 
			else {
                $(".style-highlight").remove();
                $(".style-highlight-cluster").remove();
                d3.selectAll(".highlight").classed("highlight",false);
                arrProteins = [];
                i = 0;
            }
        };

        this.removeProtein = function (pID) {
            arrProteins.remove(pID);
        };

        this.hoverHighlight = function (_cluster, _center) {
            // highlight the cluster everywhere
            _cluster.cluster.forEach(function (node) {
                d3.selectAll("circle.p" + node)
                    .classed("protein-hover", true)
                    .moveToFront();
            });

            if (_center) {
                // highlight the center node
                d3.selectAll("circle.p" + _center.id)
                    .classed("protein-center-hover", true)
                    .moveToFront();
                d3.selectAll(".cluster.c" + _center.cluster)
                    .classed("protein-hover", true);
            }
        };

        this.removeHoverHighlight = function () {
            d3.selectAll(".protein-hover").classed(
                "protein-hover", false);
            d3.selectAll(".protein-center-hover").classed(
                "protein-center-hover", false);
        };

        this.updateHighlight = function () {
            $('.style-highlight-cluster').remove();
        };
    };

    /***********************************
    ***********************************
    DATA DOWNLOAD
    ***********************************
    **********************************/
    DataExportModal = function () {
        var that = this,
            mbDataexport = d3.select("#mbDataexport"),
            mbSPLOMexport = d3.select("#mbSPLOMexport");

        var options = ['pdb'].concat(attributes.all());

        mbDataexport.select("#main-options")
            .selectAll("label").data(options)
            .enter()
            .append("label")
            .attr("class","btn active")
            .html(function (d) {
                return "<input name='columns_nodes' type='checkbox' value='" + d +
                    "' checked>" + (attributes.isAttr(d) ? d.split("_").join(" ") : d.toUpperCase()) + " <span class='modal-button-checkmarks glyphicon glyphicon-ok'></span></input><br>";
            });

        mbSPLOMexport.select("#correlation-main-options")
            .selectAll("label").data(attributes.all())
            .enter()
            .append("label")
            .attr("class","btn active")
            .html(function (d) {
                return "<input name='columns_correlations' type='checkbox' value='" + d +
                    "' checked>" + (attributes.isAttr(d) ? d.split("_").join(" ") : d.toUpperCase()) + " <span class='modal-button-checkmarks glyphicon glyphicon-ok'></span></input><br>";
            });

        $("#mbDataexport").submit(function () {
            var selectedCluster = $("#dataExport_triggeredby").val();

			var selectedProteins;
            if (selectedCluster == "") {
                $("#dataExport_nodes").val(JSON.stringify(data.nodes));
				selectedProteins=0;
            } else {
                selectedProteins = data.clusters[parseInt(selectedCluster)].cluster
                    .map(function (d) {
                        return data.nodes[ID2i(d)];
                    });
                $("#dataExport_nodes").val(JSON.stringify(selectedProteins));
            }
            $("#dataExport_TMi").val(ss.tmi);
            $("#dataExport_TMf").val(ss.tmf);
            $("#dataExport_SIDi").val(ss.sidi);
            $("#dataExport_SIDf").val(ss.sidf);
            $("#dataExport_species").val(ss.species.id);
            $("#dataExport_option").val($(".more-options.active>input").val());
            if ($(".more-options.active>input").val() !== '0') {
                $("#exportEdges").submit(function () {
                    $("#dataExport_edges").val($(".more-options.active>input").val());
                    $("#dataExport_edges_TMi").val(ss.tmi);
                    $("#dataExport_edges_TMf").val(ss.tmf);
                    $("#dataExport_edges_SIDi").val(ss.sidi);
                    $("#dataExport_edges_SIDf").val(ss.sidf);
                    $("#dataExport_edges_species").val(ss.species.id);
                	$("#dataExport_edges_nodes").val(JSON.stringify(selectedProteins));	//empty if not cluster download
                    return true;
                });
                setTimeout(function () { $("#exportEdges").submit(); }, 1000);
            }
            return true;
        });

        $("#mbSPLOMexport").submit(function () {
            $("#splomExport_correlations").val(JSON.stringify(data.correlations));
            $("#splomExport_column_order").val(JSON.stringify(data.columns));
            $("#splomExport_TMi").val(ss.tmi);
            $("#splomExport_TMf").val(ss.tmf);
            $("#splomExport_SIDi").val(ss.sidi);
            $("#splomExport_SIDf").val(ss.sidf);
            $("#splomExport_species").val(ss.species.id);

            return true;

        });
    };



    TMSID = function (_parentElement) {
        var parentElement = _parentElement,
            newLinks = [],
            proteinIDs = [],
            links = [],
            that = this,
            edgeData = {},
            vis = d3.select(".vis"),
            center = null;

        function addLinkLabel(link) {
            link.classed("highlight", true);
        }

        function formatRequest(source, target) {
            return 'fetch_edge?species=' + ss.species.id + '&source=' +
                source + "&target=" + target;
        }

        function linkID(_p1, _p2) {
            if (_p2 !== null) {
                return "#ls" + _p1 + "t" + _p2
            } else {
                return "#ls" + d3.min([_p1.source.id, _p1.target.id]) +
                    "t" + d3.max([_p1.source.id, _p1.target.id]);
            }
        }


        // every time a new protein is added, go through and generate
        // the source,target,linkID object and add it to links
        this.addLinks = function (_protein) {
            var protein = _protein.id;
            if (proteinIDs.indexOf(protein) == -1) {
                proteinIDs.map(function (p) {
                    if (p !== protein) {
                        var p1 = d3.min([p, protein]),
                            p2 = d3.max([p, protein]),
                            tmp = {
                                source: p1,
                                target: p2,
                                id: linkID(p1, p2),
                            };
                        if ($(tmp.id)
                            .length) {
                            addLinkLabel(d3.select(tmp.id))
                        } else {
                            links.push(tmp);
                        }
                    }
                });
                // see if any of them are already displayed
                // push the protein into proteins
                data.nodes[ID2i(protein)]['highlight'] = true;
                proteinIDs.push(protein);
            }
        }

    };

    ErrorMessage = function () {
        var errorDiv = $("#errorMessage");
        this.show = function (_errorMessage) {
            calculateState.hide();
            d3.select("#errorMessage").select(".modal-body").text(
                _errorMessage);
            errorDiv.modal();
        }
    };

    AttributesManager = function (_attributes) {
        Array.prototype.attribute_index = function (attr) {
            var attribute_index = -1;
            this.forEach(function (d,i) {
                if (d.name == attr) {
                    attribute_index = i;
                }
            });
            return attribute_index;
        }

        var attributes = _attributes;

        var lookup = function (attr) {
            var i = attributes.attribute_index(attr);
            return attributes[i];
        }

        var getKey = function (attr,attr_property) {
            return lookup(attr)[attr_property];
        };

        this.order = function (attr) {
            return getKey(attr,'order');
        };

        this.decimalplaces = function (attr) {
            return getKey(attr,'decimal');
        };

        this.log = function (attr) {
            return getKey(attr,'log');
        };

        this.isAttr = function (attr) {
            var t = attributes.attribute_index(attr);
            return (t !== -1);
        };

        this.all = function () {
            return attributes.map(function (d) { return d.name; })
        };
    };
}

main();
