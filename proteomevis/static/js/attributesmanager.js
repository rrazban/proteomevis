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

        // CMI = correlation matrix index (what index the 
        // attribute is in the correlation matrix)
        this.cmi = function(attr) {
            return getKey(attr,'cmi');
        };

        this.magnitude = function (attr) {
            return getKey(attr,'magnitude');
        };

        this.order = function (attr) {
            return getKey(attr,'order');
        };

        this.prettyprint1 = function (attr) {
            return getKey(attr,'prettyprint1');
        };

        this.prettyprint2 = function (attr) {
            return getKey(attr,'prettyprint2');
        };

        this.decimalplaces = function (attr) {
            return getKey(attr,'decimal');
        };

        this.log = function (attr) {
            return getKey(attr,'log');
        };

        this.setOrder = function (arrAttr) {
            attributes.forEach(function (attr) {
                attr.order = null;
            });
            arrAttr.forEach(function (d,i) {
                var index = attributes.attribute_index(d);
                attributes[index].order = i;
                attributes[index].cmi = i;
            });
        };

        this.setCMI = function (attr,cmi) {
            var index = attributes.attribute_index(attr);
            attributes[index].cmi = cmi;
        };

        this.isAttr = function (attr) {
            var t = attributes.attribute_index(attr);
            return (t !== -1);
        };

        this.all = function () {
            return attributes.map(function (d) { return d.name; })
        };

        this.inactive = function () {
            return attributes.filter(function (d) { return d.order == null; }).map(function (d) { return d.name; })
        };
        this.active = function () {
            var current_attributes = attributes.filter(function (d) { return d.order !== null; });

            var attrArr = d3.range(current_attributes.length);

            current_attributes.forEach(function (d) {
                attrArr[d.order] = d.name;
            });

            return attrArr;
        };
    };