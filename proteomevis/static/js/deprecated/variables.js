var attributes = {
        'degree': {
            'pp1': 'degree <br> - ',
            'pp2': 'degree',
            'xscale': null,
            'yscale': null
        },
        'weighted_degree': {
            'pp1': 'weighted <br>degree',
            'pp2': 'weighted degree',
            'xscale': null,
            'yscale': null
        },
        'ppi_degree': {
            'pp1': 'PPI <br>degree',
            'pp2': 'PPI degree',
            'xscale': null,
            'yscale': null
        },
        'length': {
            'pp1': 'chain <br>length',
            'pp2': 'chain length',
            'xscale': null,
            'yscale': null
        },
        'evorate': {
            'pp1': 'mutation <br>rate',
            'pp2': 'mutation rate',
            'xscale': null,
            'yscale': null
        },
        'abundance': {
            'pp1': 'cellular <br>abundance',
            'pp2': 'cellular abundance',
            'xscale': null,
            'yscale': null
        },
        'conden': {
            'pp1': 'contact <br>density',
            'pp2': 'contact density',
            'xscale': null,
            'yscale': null
        },
        'dostox': {
            'pp1': 'dosage <br>toxicity',
            'pp2': 'dosage toxicity',
            'xscale': null,
            'yscale': null
        }
    },
    attribute_keys = d3.keys(attributes),
    names = ['TMi', "TMf", "SIDi", "SIDf"],
    data;

var TMi = 0,
    TMf = 0,
    SIDi = 0,
    SIDf = 0;


var loaded, x, nodes, links, circles;

var pltsize = 105;

var individual_splom = null;

var dom = 'length';

var myGlobal;

var iColor = 0;

var rFV = 5,
    rSV = 1,
    rFVh = 8,
    rSVh = 3;
var species = 'yeast';

var tooltip = d3.select("#tooltip");

var height, width,
	titlePadding = 12,
	formPadding = 110;