ProteinSearchVis = function(_parentElement,_eventHandler) {
    this.mediaList = _parentElement.select(".media-list");
    this.eventHandler = _eventHandler;
    this.proteins = [];
    this.initSearch();
}

ProteinSearchVis.prototype.initSearch = function() {
    var that = this;

    $('#protein_search').selectivity({
        multiple: true,
        closeOnSelect: false,
        ajax: {
            url: './query',
            dataType: 'json',
            minimumInputLength: 3,
            quietMillis: 250,
            params: function(term, offset) {
                // GitHub uses 1-based pages with 30 results, by default
                return { "q": term,"species": species };
            },
            processItem: function(item) {
                return {
                    id: item.domain,
                    text: item.domain,
                    text2: item.uniprot,
                    description: item.function2 ? item.genes+" | "+ item.function2 + "; " + item.function1 : item.genes,
                };
            },
            results: function(data, offset) {
                d = data;
                console.log(data);
                return {
                    results: data,
                    more: false
                };
            }
        },
        placeholder: 'Search for a protein',
        templates: {
            resultItem: function(item) {
                return (
                    '<div class="selectivity-result-item" data-item-id="' + item.id + '">' +
                        '<b>' + item.text + '</b> <small>' + item.text2 +'</small><br><span class="lightened">' +
                        item.description.slice(0,40) +
                    '</span></div>'
                );
            }
        }
    });

    $('#protein_search').on("selectivity-close enter", function () { that.onClose() });

    this.initButtons();

}

ProteinSearchVis.prototype.initButtons = function() {
    var that = this;
    $('#highlightBtn').on("click", function() {
        that.highlight();
    });

    $('#resetBtn').on("click", function() {
        clearHighlight(null, true);
    });

    this.initPanel();
}

ProteinSearchVis.prototype.initPanel = function() {
    var that = this;

    this.list = d3.select(".container.legend");
}

ProteinSearchVis.prototype.highlight = function() {
    var that = this;


}

ProteinSearchVis.prototype.onClose = function () {
    var that = this;
    var domains = $('#protein_search').selectivity("value");
    var data_request = 'fetch_proteins?species='+species+'&domains='+domains.reduce(function (a,b) { return a + '%2c' + b; });

    var jqxhr_data = $.getJSON(data_request, function () {
            console.log("requested the proteins");
        })
        .done(function (_data) {
            console.log("got the proteins");
            console.log(_data);
            that.addToList(_data[0]);
        });

    

    $('#protein_search').selectivity("clear");
}

ProteinSearchVis.prototype.addToList = function (oDomain) {
    var that = this;
    console.log(oDomain);
    // called on each of the objects of proteins
    var media = this.mediaList.append("div").attr("class","media").attr("id","media-object-"+oDomain.domain).datum(oDomain);

    media
        .append("div").attr('class','media-left')
        .append("img")
        .attr('class','media-object')
        .attr("src", that.chainImgSrc(oDomain.domain,oDomain.chains[0]))
        .attr("alt",oDomain.domain);

    var mediaBody = media.append("div")
        .attr("class",'media-body');

    mediaBody.append("h4").attr("class","media-heading")
        .html(that.mediaHeading(oDomain.domain,oDomain.function2));

    var chainBadges = mediaBody.append("span").attr("class","chain-details");

    var badges = mediaBody.append("div");

    badges.selectAll("span.label").data(oDomain.chains.map(function (chain) { return [oDomain.domain, chain]; }))
        .enter()
        .append("span").attr("class","label label-default label-chains")
        .html(function (d) { console.log(d); return d[1]; })
        .on('click', function (d) {
            // TODO ADD HIGHLIGHT & SHOW PICTURES BASED ON THE FACT THAT d IS AN ARRAY OF [domain, chain_letter]
        });




    mediaBody.append("div")
        .html("localization: "+
            oDomain.localizations
                .reduce(function(a,b) {
                    return a + ', ' + b;
                })
        );

    mediaBody.append("div")
        .html(that.createGeneLinks(oDomain.uniprot,oDomain.domain))

    mediaBody.append("div")
        .attr("class",'collapse')
        .attr("id","collapse-"+oDomain.domain)
        .attr("aria-expanded","false")
        .attr("aria-controls","collapse-"+oDomain.domain)
        .append("div")
        .attr("class","well function-well")
        .html(oDomain.function1.reduce(function (a,b) { return a+"<br>"+b;}));
    
}

ProteinSearchVis.prototype.highlight = function () {
    
}

ProteinSearchVis.prototype.mediaHeading = function (sDomain,sFunction) {
    var tmp = "<h4>";
    tmp += "<a href='http://www.rcsb.org/pdb/explore/explore.do?structureId=";
    tmp += sDomain + "'>" + sDomain + "</a> ";
    tmp += "<small>"+sFunction+"</small><span style='float:right'>&times;</span>";
    return tmp;
}
ProteinSearchVis.prototype.chainImgSrc = function (sDom,sChain) {
    sDom = sDom.toLowerCase();
    return "img/" + sDom[0] + '/' + sDom[1] + '/' + sDom + sChain[0] + ".png"
}

ProteinSearchVis.prototype.createGeneLinks = function (oUniprot,sDomain) {
    var str = "genes: ";
    str += oUniprot.map(function (entry) {
        var tmp = "<a href='http://www.uniprot.org/uniprot/"+entry.uniprot+"'>"+entry.genes.split(" ")[0]+"</a>";
        tmp += " <small>("+entry.uniprot+")</small>";
        return tmp;
    }).reduce(function (a,b) {
        return a+", "+b;
    });
    str += '<a data-toggle="collapse" href="#collapse-'+sDomain + '" title="More..." aria-expanded="false" aria-controls="collapse-'+sDomain + '">';
    str += "<span style='float:right' class='glyphicon glyphicon-menu-down'></span></a>";
    console.log(str);
    return str;
}