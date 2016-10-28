Array.prototype.remove = function (a) {
    var that = this;
    this.forEach(function (d,i) {
        if (Array.isArray(d)) {
            d.forEach(function (e,j) {
                if (a == e) {
                    that[i].splice(j,1);
                }
            });
            if (d.length == 1) {
                that[i] = d[0];
            }
        } else if (a == d) {
            that.splice(i,1);
        }
    });
}

$('input').keyup(function(e){
    if(e.keyCode == 13)
    {
        $(this).trigger("enterKey");
    }
});