// // page

DV.Page = function(viewer, argHash){
    this.viewer           = viewer;

    this.index            = argHash.index;
    for(var key in argHash) this[key] = argHash[key];
    this.el               = this.viewer.$(this.el);
    this.parent           = this.el.parent();
    this.pageNumberEl     = this.el.find('span.DV-pageNumber');
    this.pageInsertEl     = this.el.find('.DV-pageNoteInsert');
    this.removedOverlayEl = this.el.find('.DV-overlay');
    this.pageImageEl      = this.getPageImage();

    this.pageEl           = this.el.find('div.DV-page');
    this.highlightContainerEl = this.el.find('div.DV-highlights');
    this.coverEl          = this.el.find('div.DV-cover');
    this.loadTimer        = null;
    this.hasLayerPage     = false;
    this.hasLayerRegional = false;
    this.imgSource        = null;


    this.offset           = null;
    this.pageNumber       = argHash.pageNumber ? argHash.pageNumber : null;
    this.zoom             = 1;
    this.highlights      = [];

    // optimizations
    var m = this.viewer.models;
    this.model_document     = m.document;
    this.model_pages        = m.pages;
    this.model_highlights  = m.highlights;
    this.model_chapters     = m.chapters;
};

// Set the image reference for the page for future updates
DV.Page.prototype.setPageImage = function(){
    this.pageImageEl = this.getPageImage();
};

// get page image to update
DV.Page.prototype.getPageImage = function(){
    return this.el.find('img.DV-pageImage');
};

// get image URL of current page
DV.Page.prototype.getPageImageURL = function(){
    return this.model_pages.imageURL(this.index);
};

// Get the offset for the page at its current index
DV.Page.prototype.getOffset = function(){
    return this.model_document.offsets[this.index];
};

DV.Page.prototype.getPageNoteHeight = function() {
    return this.model_pages.pageNoteHeights[this.index];
};

// Draw the current page and its associated layers/highlights
// Will stop if page index appears the same or force boolean is passed
DV.Page.prototype.draw = function(argHash) {
    // Return immeditately if we don't need to redraw the page.
    if(this.index === argHash.index && !argHash.force && this.imgSource == this.model_pages.imageURL(this.index)){ return; }

    this.index = (argHash.force === true) ? this.index : argHash.index;
    var _types = [];
    var source = this.getPageImageURL();

    // Set the page number as a class, for page-dependent elements.
    this.el[0].className = this.el[0].className.replace(/\s*DV-page-\d+/, '') + ' DV-page-' + (this.index + 1);

    if (this.imgSource != source) {
      this.imgSource = source;
      this.loadImage();
    }
    this.sizeImage();
    this.position();

    // Only draw highlights if page number has changed or the
    // forceHighlightRedraw flag is true.
    if(this.pageNumber != this.index+1 || argHash.forceHighlightRedraw === true){
        //If the removed page has the active highlight, hide/cancel it
        if( this.viewer.activeHighlight && (this.pageNumber == this.viewer.activeHighlight.model.page) ){
            this.viewer.activeHighlight.hide();
        }

        for(var i = 0; i < this.highlights.length;i++){
            this.highlights[i].remove();
            delete this.highlights[i];
        }
        this.highlights = [];

        // if there are highlights for this page, it will proceed and attempt to draw
        var byPage = this.viewer.schema.data.highlightsByPage[this.index];
        if (byPage) {
            // Loop through all highlights and add to page
            for (var i=0; i < byPage.length; i++) {
                var highl = byPage[i];

                if(highl.id === this.viewer.highlightToLoadId){
                    var active = true;
                    if (highl.id === this.viewer.highlightToLoadEdit) argHash.edit = true;
                    if (this.viewer.openingHighlightFromHash) {
                        this.viewer.helpers.jump(this.index, (anno.top || 0) - 37);
                        this.viewer.openingHighlightFromHash = false;
                    }
                }else{
                    var active = false;
                }

                var newHighlight = this.createHighlight(highl, active, argHash.edit);

                this.highlights.push(newHighlight);
            }
        }

        //this.pageInsertEl.toggleClass('visible', !this.hasLayerPage);
        this.renderMeta({ pageNumber: this.index+1 });

        // Draw remove overlay if page is removed.
        this.drawRemoveOverlay();
    }
};


DV.Page.prototype.drawRemoveOverlay = function() {
    this.removedOverlayEl.toggleClass('visible', !!this.viewer.models.removedPages[this.index+1]);
};


// Position Y coordinate of this page in the view based on current offset in the Document model
DV.Page.prototype.position = function(argHash){
    this.el.css({ top: this.model_document.offsets[this.index] });
    this.offset  = this.getOffset();
};


// Render the page meta, currently only the page number
DV.Page.prototype.renderMeta = function(argHash){
    this.pageNumberEl.text( DV.t('pg') + ' ' + argHash.pageNumber );
    this.pageNumber = argHash.pageNumber;
};


// Load the actual image
DV.Page.prototype.loadImage = function(argHash) {
    if(this.loadTimer){
        clearTimeout(this.loadTimer);
        delete this.loadTimer;
    }

    this.el.removeClass('DV-loaded').addClass('DV-loading');

    // On image load, update the height for the page and initiate drawImage method to resize accordingly
    var pageModel       = this.model_pages;
    var preloader       = DV.jQuery(new Image);
    var me              = this;

    var lazyImageLoader = function(){
        if(me.loadTimer){
            clearTimeout(me.loadTimer);
            delete me.loadTimer;
        }

        preloader.bind('load readystatechange',function(e) {
            if(this.complete || (this.readyState == 'complete' && e.type == 'readystatechange')){
                if (preloader != me._currentLoader) return;
                pageModel.updateHeight(preloader[0], me.index);
                me.drawImage(preloader[0].src);
                clearTimeout(me.loadTimer);
                delete me.loadTimer;
            }
        });

        var src = me.model_pages.imageURL(me.index);
        me._currentLoader = preloader;
        preloader[0].src = src;
    };

    this.loadTimer = setTimeout(lazyImageLoader, 150);
    this.viewer.pageSet.redraw(null, true);
};


DV.Page.prototype.sizeImage = function() {
    var width = this.model_pages.width;
    var height = this.model_pages.getPageHeight(this.index);

    // Resize the cover.
    this.coverEl.css({width: width, height: height});

    // Resize the image.
    this.pageImageEl.css({width: width, height: height});

    // Resize the page container.
    this.el.css({height: height, width: width});

    // Resize the page.
    this.pageEl.css({height: height, width: width});
};


// draw the image and update surrounding image containers with the right size
DV.Page.prototype.drawImage = function(imageURL) {
    var imageHeight = this.model_pages.getPageHeight(this.index);
    // var imageUrl = this.model_pages.imageURL(this.index);
    if(imageURL == this.pageImageEl.attr('src') && imageHeight == this.pageImageEl.attr('height')) {
        // already scaled and drawn
        this.el.addClass('DV-loaded').removeClass('DV-loading');
        return;
    }

    // Replace the image completely because of some funky loading bugs we were having
    this.pageImageEl.replaceWith('<img width="'+this.model_pages.width+'" height="'+imageHeight+'" class="DV-pageImage" src="'+imageURL+'" />');
    // Update element reference
    this.setPageImage();

    this.sizeImage();

    // Update the status of the image load
    this.el.addClass('DV-loaded').removeClass('DV-loading');
};


//Create Highlight
DV.Page.prototype.createHighlight = function(highl, active, edit) {
    return new DV.HighlightView(highl, this, active, edit);
};


//Create new highlight and add it to existing highlight list
DV.Page.prototype.addHighlight = function(highl){
    var newHighl = this.createHighlight(highl, false, true);
    var insertIndex = DV._.sortedIndex(this.highlights, newHighl, function(highl){
        return highl.position.top;
    });
    this.highlights.splice(insertIndex, 0, newHighl);
};


//Remove highlight from highlight list
DV.Page.prototype.removeHighlight = function(highl){
    var removeHighl = this.findHighlightView(highl.id);
    if(removeHighl) {
        removeHighl.remove();
        this.highlights = DV._.without(this.highlights, removeHighl);
        this.viewer.elements.window.removeClass('DV-coverVisible');
    }
};


//Refresh highlight
//active: Whether to make the refreshed highlight active (optional)
//edit: Whether to put refreshed highlight in edit view (optional)
DV.Page.prototype.refreshHighlight = function(highl, active, edit){
    var refreshHighl = this.findHighlightView(highl.id);
    refreshHighl.refresh(active, edit);
};


// Check page's highlights in schema and add any missing ones
DV.Page.prototype.syncHighlights = function() {
    var byPage = this.viewer.schema.data.highlightsByPage[this.index];
    if (byPage) {
        // Loop through all highlights and splice in any additions
        for (var i=0; i < byPage.length; i++) {
            var anno = byPage[i];

            if( i >= this.highlights.length || (anno.id != this.highlights[i].id) ) {
                var newAnno = this.createHighlight(anno, false, true);
                this.highlights.splice(i, 0, newAnno);
            }
        }
    }
};


//Find highlight view on page by highlight ID
DV.Page.prototype.findHighlightView = function(highlID){
    return _.find(this.highlights, function (listHighl) { return listHighl.model.id == highlID; });
}
