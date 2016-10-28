TypeLimitsVis = function (_parentElement, _eventHandler) {
    this.parentElement = _parentElement;
    this.eventHandler = _eventHandler;
    this.filter = null;

    this.initVis();

}

TypeLimitsVis.prototype.initVis = function () {
    var that = this;
    
    this.txtTMi = document.getElementById("TMi");
    this.txtTMf = document.getElementById("TMf");
    this.txtSIDi = document.getElementById("SIDi");
    this.txtSIDf = document.getElementById("SIDf");

    var speciesBtn = d3.selectAll("[name=speciesBtn]");

    speciesBtn.on("click", function () {
        if (this.value !== species) {
            species = this.value;
            speciesBtn.classed("active",false);
            d3.select(this).classed("active",true);
            $(that.eventHandler).trigger("speciesChanged");
        }
    })

    d3.selectAll(".typeLimitsInput").on("change",
        function () {
            $(this).value = this.value;
            TMi = that.txtTMi.value;
            TMf = that.txtTMf.value;
            SIDi = that.txtSIDi.value;
            SIDf = that.txtSIDf.value;
            $(that.eventHandler).trigger("manualLimitsChanged");
        });

    this.formatFloat = d3.format('.3f');
}


TypeLimitsVis.prototype.updateVis = function () {
    this.txtTMi.value = this.formatFloat(TMi);
    this.txtTMf.value = this.formatFloat(TMf);
    this.txtSIDi.value = this.formatFloat(SIDi);
    this.txtSIDf.value = this.formatFloat(SIDf);
};