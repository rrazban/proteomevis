Highlighter = function(_eventHandler) {
    this.eventHandler = _eventHandler;
    this.arrProteins = [];
    this.i = 0;
}

Highlighter.prototype.proteins = function(_proteins) {
    if (_proteins) {
        this.arrProteins = _proteins;
        this.i = 0;
        return true;
    } else {
        return this.arrProteins;
    }
}

Highlighter.prototype.add = function(_protein) {
    if (_protein) {
        this.arrProteins.push(_protein);
        this.i += 1;
        return true;
    }
    return false;
}

Highlighter.prototype.remove = function(_protein) {
    if (_protein) {
        var iProtein = this.arrProteins.indexOf(_protein);
        if (iProtein > -1) {
            this.arrProteins.splice(iProtein,1);
            return true;
        }
    }
    return false;
}

Highlighter.prototype.currentIndex = function() {
    return this.i;
}

