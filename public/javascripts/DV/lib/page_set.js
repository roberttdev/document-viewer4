// PageSet is a pseudo-presenter/view which manages and paints
// pages into a viewer's main display.
//
// PageSet creates three page objects, two of which are on screen
// at any one time.  The third is then updated off screen when
// the display is scrolled.
//
// PageSet is also manages zooming.
DV.PageSet = function(viewer){
    this.currentPage  = null;
    this.pages        = {};
    this.viewer       = viewer;
    this.zoomText();
};

//Return reference to page requested by sequential page #
DV.PageSet.prototype.getPageByNumber = function(pageNum){
    for(var i=0; i < 3; i++){
        if(this.pages['p' + i].pageNumber == pageNum){ return this.pages['p' + i]; }
    }
    return null;
};

// used to call the same method with the same params against all page instances
DV.PageSet.prototype.execute = function(action,params){
    this.pages.each(function(pageInstance){
        pageInstance[action].apply(pageInstance,params);
    });
};

// build the basic page presentation layer
DV.PageSet.prototype.buildPages = function(options) {
    options = options || {};
    var pages = this.getPages();

    DV._.each(pages, function(page){
        page.set  = this;

        // TODO: Make more explicit, this is sloppy
        this.pages[page.label] = new DV.Page(this.viewer, page);

        if (page.currentPage == true) { this.currentPage = this.pages[page.label]; }
    }, this);
};

// used to generate references for the build action
DV.PageSet.prototype.getPages = function(){
    var _pages = [];

    this.viewer.elements.sets.each(function(_index,el){
        var currentPage = (_index == 0) ? true : false;
        _pages.push({ label: 'p'+_index, el: el, index: _index, pageNumber: _index+1, currentPage: currentPage });
    });

    return _pages;
};

// basic reflow to ensure zoomlevel is right, pages are in the right place and highlight limits are correct
DV.PageSet.prototype.reflowPages = function() {
    this.viewer.models.pages.resize();
    this.viewer.helpers.setActiveHighlightLimits();
    this.redraw(false, true);
};

// reflow the pages without causing the container to resize or highlights to redraw
DV.PageSet.prototype.simpleReflowPages = function(){
    this.viewer.helpers.setActiveHighlightLimits();
    this.redraw(false, false);
};

// hide any active highlights and call success if not user-cancelled
DV.PageSet.prototype.cleanUp = function(success){
    var _me = this;
    var activeHighl = _me.viewer.activeHighlight;
    if(activeHighl){
        activeHighl.requestHide(true, function() {
            //Clean up mid-edit state and hide
            var content = activeHighl.content;

            var anno = content.content;
            if (anno.unsaved) {
                var highl = activeHighl.model;
                var contentRef = (content.type == 'annotation') ? {anno_id: anno.server_id} : {graph_id: anno.server_id};
                if( _me.viewer.schema.removeHighlightContent(highl, contentRef) ){
                    _me.viewer.schema.removeHighlight(highl);
                    _me.removeHighlight(highl);
                }else{
                    highl.displayIndex = 0;
                    _me.refreshHighlight(highl, false, false);
                }
            }else{
                _me.refreshHighlight(activeHighl.model, false, false);
            }

            activeHighl.hide(true);
            _me.viewer.fireCancelCallbacks(anno);
            if(success){ success.call(); }
        });
    }else{
        if(success){ success.call(); }
    }
};

DV.PageSet.prototype.zoom = function(argHash){
    if (this.viewer.models.document.zoomLevel === argHash.zoomLevel) return;

    var currentPage  = this.viewer.models.document.currentIndex();
    var oldOffset    = this.viewer.models.document.offsets[currentPage];
    var scrollPos    = this.viewer.elements.window.scrollTop();

    this.viewer.models.document.zoom(argHash.zoomLevel);

    var diff = (parseInt(scrollPos, 10)>parseInt(oldOffset, 10)) ? scrollPos - oldOffset : oldOffset - scrollPos;

    var diffPercentage = diff / this.viewer.models.pages.height;

    this.reflowPages();
    this.zoomText();

    if (this.viewer.state === 'ViewThumbnails') {
        this.viewer.thumbnails.setZoom(argHash.zoomLevel);
        this.viewer.thumbnails.lazyloadThumbnails();
    }

    if(this.viewer.activeHighlight != null){
        // FIXME:

        var args = {
            index: this.viewer.models.document.currentIndex(),
            top: this.viewer.activeHighlight.top,
            id: this.viewer.activeHighlight.id
        };
        this.viewer.activeHighlight = null;

        this.showHighlight(args);
        this.viewer.helpers.setActiveHighlightLimits(this.viewer.activeHighlight);
    }else{
        var _offset      = Math.round(this.viewer.models.pages.height * diffPercentage);
        this.viewer.helpers.jump(this.viewer.models.document.currentIndex(),_offset);
    }
};

// Zoom the text container.
DV.PageSet.prototype.zoomText = function() {
    var padding = this.viewer.models.pages.getPadding();
    var width   = this.viewer.models.pages.zoomLevel;
    this.viewer.$('.DV-textContents').width(width - padding);
    this.viewer.$('.DV-textPage').width(width);
    this.viewer.elements.collection.css({'width' : width + padding});
};

// draw the pages
DV.PageSet.prototype.draw = function(pageCollection){
    for(var i = 0, pageCollectionLength = pageCollection.length; i < pageCollectionLength;i++){
        var page = this.pages[pageCollection[i].label];
        if (page) page.draw({ index: pageCollection[i].index, pageNumber: pageCollection[i].index+1});
    }
};

DV.PageSet.prototype.redraw = function(stopResetOfPosition, redrawHighlights) {
    if (this.pages['p0']) this.pages['p0'].draw({ force: true, forceHighlightRedraw : redrawHighlights });
    if (this.pages['p1']) this.pages['p1'].draw({ force: true, forceHighlightRedraw : redrawHighlights });
    if (this.pages['p2']) this.pages['p2'].draw({ force: true, forceHighlightRedraw : redrawHighlights });

    if(redrawHighlights && this.viewer.activeHighlight){
        this.viewer.helpers.jump(this.viewer.activeHighlight.page.index,this.viewer.activeHighlight.position.top - 37);
    }
};

//Add highlight to its page. Takes in standard (schema) hash
DV.PageSet.prototype.addHighlight = function(highl){
    this.getPageByNumber(highl.page).addHighlight(highl);
};

//Remove highlight from its page. Takes in standard (schema) anno hash
DV.PageSet.prototype.removeHighlight = function(highl){
    //If page is visible, send remove request to it
    var page = this.getPageByNumber(highl.page);
    if(page){ page.removeHighlight(highl); }
};

//Refresh highlight display. Takes in standard (schema) anno hash
//active: Whether to make the refreshed highlight active (optional)
//edit: Whether to put the refreshed highlight in edit mode (optional)
DV.PageSet.prototype.refreshHighlight = function(highl, active, edit){
    //If page is visible, send refresh request to it
    var page = this.getPageByNumber(highl.page);
    if(page){ page.refreshHighlight(highl, active, edit); }
};

// set the highlight to load ahead of time
DV.PageSet.prototype.setActiveHighlight = function(highlightId, edit){
    this.viewer.highlightToLoadId   = highlightId;
    this.viewer.highlightToLoadEdit = edit ? highlightId : null;
};

// a funky fucking mess to jump to the highlight that is active
//argHash: highlight_id, either anno_id or graph_id
DV.PageSet.prototype.showHighlight = function(argHash, showHash){
    showHash = showHash || {};

    // if state is ViewHighlight, jump to the appropriate position in the view
    // else
    // hide active highlights and locate the position of the next highlight
    // NOTE: This needs work
    if(this.viewer.state === 'ViewHighlight'){
        var offset = this.viewer.$('.DV-allHighlights div[rel=aid-'+argHash.id+']')[0].offsetTop;
        this.viewer.elements.window.scrollTop(offset+10,'fast');
        this.viewer.helpers.setActiveHighlightInNav(argHash.highlight_id);
        this.viewer.activeHighlightId = argHash.highlight_id;
    }else{
        this.viewer.helpers.removeObserver('trackHighlight');
        this.viewer.activeHighlightId = null;
        if(this.viewer.activeHighlight != null){
            this.viewer.activeHighlight.hide();
        }
        this.setActiveHighlight(argHash.highlight_id, showHash.edit);

        var offset = argHash.top - 36;

        for(var i = 0; i <= 2; i++){
            if (this.pages['p' + i]) {
                for(var n = 0; n < this.pages['p'+i].highlights.length; n++){
                    if(this.pages['p'+i].highlights[n].model.id === argHash.highlight_id){
                        this.viewer.helpers.jump(argHash.index, offset);
                        this.pages['p'+i].highlights[n].refresh(showHash.active, showHash.edit);
                        return;
                    }
                }
            }
        }

        //If not found in page set, jump to
        var highl = this.viewer.schema.getHighlight(argHash.highlight_id);
        this.viewer.helpers.jump((highl.page - 1),offset);
    }
};
