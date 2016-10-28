ProteinSearchVis = function(_eventHandler) {
    this.eventHandler = _eventHandler;
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
                    id: item.id,
                    text: item.pdb ? item.pdb : item.uniprot,
                    text2: item.pdb ? item.uniprot : "",
                    description: item.function ? item.genes+" "+ item.function : item.genes,
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