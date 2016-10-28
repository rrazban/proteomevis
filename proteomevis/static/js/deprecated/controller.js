$(function () {
    "use strict";
    // start the visualization
    function initVis() {

        // the main graph with which we interact
        var typeVis = new TypeVis(d3.select("#typeVis"), MyEventHandler, $("#typeVis").height(),$("#typeVis").width());
        var typelimitsVis = new TypeLimitsVis(d3.select("#typelimitsVis"), MyEventHandler,$("#typelimitsVis").height(),$("#typelimitsVis").width());
        var proteinsearchVis = new ProteinSearchVis(d3.select("#nodeView"),MyEventHandler);

        // graphs affected by the changing of typevis
        var splomVis = new SplomVis(d3.select("#splomVis"), MyEventHandler,$("#splomVis").height(),$("#splomVis").width());
        var forceVis = new ForceVis(d3.select("#pdugVis"), MyEventHandler,$("#pdugVis").height(),$("#pdugVis").width());
        var clusterviewVis = new ClusterViewVis(d3.select("#clusterVis"), MyEventHandler);
        var clustercolorVis = new ClusterColorVis(d3.select("#pdugVis"), MyEventHandler);

        loadState.hide();

        tooltip.style("left", "10px").style("top", $('#forceLayoutDiv').position().top +"px");

        function waitDataLoadUpdate() {
            if (loaded) {
                data.edges = data.edges ? data.edges : [];
                clustercolorVis.updateVis();
                splomVis.updateVis();
                forceVis.updateVis();
                clusterviewVis.updateVis();
                proteinsearchVis.initSearch();
                calculateState.hide();
            } else {
                setTimeout(function () {
                    waitDataLoadUpdate();
                }, 1000);
            }
        }

        // triggered when you select a range on the TM v SID graph (typevis.js)
        $(MyEventHandler).bind("dataChanged", function (event, status) {
            typevisBrush = status;
            calculateState.show();

            // pointerEvents(((SIDi == SIDf) && (TMi == TMf)))

            makeRequest([TMi, TMf, SIDi, SIDf]);
            waitDataLoadUpdate();
        });
        // triggered when you select a different species
        $(MyEventHandler).bind("speciesChanged", function (event) {
            makeRequest([TMi, TMf, SIDi, SIDf]);
            typeVis.updateImage();
            waitDataLoadUpdate();
        });

        // triggered when you change the coloring scheme of the clusters
        $(MyEventHandler).bind("clusterColorChanged", function (event) {
            clusterviewVis.updateVis();
            forceVis.updateColor();
        });

        // triggered when you select a range on the TM v SID graph (typevis.js)
        $(MyEventHandler).bind("displayData", function (event, status) {
            typelimitsVis.updateVis();
        });

        // triggered when you select a range on the TM v SID graph (typevis.js)
        $(MyEventHandler).bind("manualLimitsChanged", function (event) {
            typeVis.updateBrush();
        });

        // triggered when you select a range on the TM v SID graph (typevis.js)
        $(MyEventHandler).bind("individualsplomUpdate", function (event, _data) {
            if (_data.x !== _data.y) {
                individual_splom = _data;
                splomindividualVis.updateVis();
                $("#splomindividualVisModal").modal('show');
            }
        });
    }

    function formatRequest(cutoffs) {
        var columns_string = d3.keys(attributes).reduce(function (a, b) {
            return a + '%2c' + b;
        });
        var cutoffs_string = cutoffs.map(function (d, i) {
            return names[i] + '=' + d;
        }).reduce(function (a, b) {
            return a + '&' + b;
        });
        var request = 'fetch_edges?' + cutoffs_string + '&columns=' + columns_string + '&species=' + species;
        return request;
    }

    function makeRequest(_cutoffs) {
        loaded = false;

        var cutoffs = _cutoffs == null ? [0, 0, 0, 0] : _cutoffs;

        var data_request = formatRequest(cutoffs);

        // Assign handlers immediately after making the request,
        // and remember the jqxhr object for this request
        var jqxhr_data = $.getJSON(data_request, function () {
                console.log("requested");
            })
            .done(function (_data) {
                console.log("complete");
                data = _data;
                loaded = true;
            });

        setTimeout(function () {
            console.log("aborting");
            jqxhr_data.abort();
        }, 5000);
    }

    function waitDataLoadInitial() {
        if (loaded) {
            initVis();
        } else {
            setTimeout(function () {
                waitDataLoadInitial();
            }, 1000);
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
            }};
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

    // our event handler. will be passed to every visualization on initilization
    var MyEventHandler = {};
    var padding = 30;
    var toolbarPadding = 100;

    // for sizing
    height = $(window).innerHeight() - toolbarPadding - padding;
    width = $(window).innerWidth() - 2*padding;

    setPanelSizes();

    makeRequest();

    waitDataLoadInitial();

});