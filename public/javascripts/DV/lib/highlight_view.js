DV.HighlightView = function(highl, page, active, edit){
    this.LEFT_MARGIN      = 25;
    this.SCROLLBAR_WIDTH  = 25;
    this.page         = page;
    this.viewer       = this.page.set.viewer;
    this.model        = highl;
    this.position     = { top: highl.get('x1'), left: highl.get('x1') };
    this.dimensions   = { width: (highl.get('x1')+highl.get('x2')), height: (highl.get('y1')+highl.get('y2')) };
    this.showWindowX  = 0;
    this.highlightEl  = null;
    this.state        = 'collapsed';
    this.active       = active;
    this.showConfirm  = false;

    if (highl.get('access') == 'public')         this.accessClass = 'DV-accessPublic';
    else if (highl.get('access') =='exclusive')  this.accessClass = 'DV-accessExclusive';
    else if (highl.get('access') =='private')    this.accessClass = 'DV-accessPrivate';

    this.renderedHTML = DV.jQuery(this.render());

    this.remove();
    this.add();

    if(this.active){
        this.viewer.helpers.setActiveHighlightLimits(this);
        this.viewer.events.resetTracker();
        this.active = null;
        this.show({active: true, edit: edit});
        if (edit) this.showEdit();
    }
};

// Render an highlight model to HTML, calculating all of the dimensions
// and offsets, and running a template function.
DV.HighlightView.prototype.render = function(){
    var documentModel             = this.viewer.models.document;
    var pageModel                 = this.viewer.models.pages;
    var zoom                      = pageModel.zoomFactor();
    var x1, x2, y1, y2;


    var highlHash = {
        id                      : this.model.get('id'),
        options                 : this.viewer.options,
        accessClass             : this.accessClass,
        approvedClass           : '',
        leftMargin              : 0,
        showWindowMarginLeft    : this.showWindowX
    };
    var windowWidth = $('.DV-pages').width() - this.SCROLLBAR_WIDTH;

    y1                          = Math.round(this.model.get('y1') * zoom);
    y2                          = Math.round(this.model.get('y2') * zoom);
    if (x1 < this.LEFT_MARGIN) x1 = this.LEFT_MARGIN;
    x1                          = Math.round(this.model.get('x1') * zoom);
    x2                          = Math.round(this.model.get('x2') * zoom);

    highlHash.top                   = y1 - 5;
    highlHash.width                 = pageModel.width > $('.DV-paper').width() ? ($('.DV-paper').width() - this.LEFT_MARGIN - 5) : pageModel.width;

    //If page wider than window, fit anno edit to window
    if( pageModel.width > windowWidth ){
        //If larger than total page, back up so that right edge is on right edge of page, otherwise start on left edge of highlight
        this.showWindowX = (x1+windowWidth) > pageModel.width ? pageModel.width - windowWidth : x1;
        highlHash.width = this.showWindowX + windowWidth - this.LEFT_MARGIN;
        highlHash.excerptTopMarginLeft = x1 - this.showWindowX;
    }else{
        //Else, fit to page
        this.showWindowX = 0;
        highlHash.width = pageModel.width;
        highlHash.excerptTopMarginLeft = x1;
    }
    highlHash.excerptWidth            = ((x2 - x1) - 8) > 2 ? ((x2 - x1) - 8) : 2;
    highlHash.excerptMarginLeft       = x1 - 2;
    highlHash.excerptHeight           = y2 - y1;
    highlHash.tabTop                  = (y1 < 35 ? 35 - y1 : 0) + 8;

    var approvalState = this.model.getApprovalState();
    if(approvalState == 1){ highlHash.approvedClass = ' DV-semi-approved'; }
    if(approvalState == 2){ highlHash.approvedClass = ' DV-approved'; }

    highlHash.currentContent = this.model.get('displayIndex') + 1;
    highlHash.contentCount = this.model.getContentCount();

    //Generate inner content
    this.content = this.model.getCurrentHighlightContent();
    if( this.content.type == 'graph'){
        this.innerView = new DV.GraphView(this, this.content.content);
        var contentHash = {accessClass: highlHash.accessClass};
    }else{
        this.innerView = new DV.AnnotationView(this, this.content.content);
        var contentHash = {
            accessClass         : highlHash.accessClass,
            excerptHeight       : highlHash.excerptHeight,
            excerptMarginLeft   : highlHash.excerptMarginLeft,
            excerptTopMarginLeft: highlHash.excerptTopMarginLeft,
            excerptWidth        : highlHash.excerptWidth,
            showConfirm         : this.showConfirm,
            showWindowMarginLeft: highlHash.showWindowMarginLeft,
            top                 : highlHash.top
        };
    }
    highlHash.innerHTML = this.innerView.render(contentHash);

    return  JST['DV/views/highlight'](highlHash);
},


// Add highlight to page
DV.HighlightView.prototype.add = function(){
    this.highlightEl = this.renderedHTML.appendTo(this.page.highlightContainerEl);
};


// Remove the highlight from the page
DV.HighlightView.prototype.remove = function(){
    if(this.highlightEl){ this.highlightEl.remove(); }
};


// Redraw the HTML for this highlight
//active: Whether to make the refreshed highlight active (optional)
DV.HighlightView.prototype.refresh = function(active, edit, callbacks) {
    this.renderedHTML = DV.jQuery(this.render());
    this.remove();
    this.add();
    if(active != false){ this.show({callbacks: callbacks ? callbacks : false, edit: edit}); }else{ this.hide(true); }
};


// Jump to next highlight
DV.HighlightView.prototype.next = function(){
    this.hide.preventRemovalOfCoverClass = true;
    this.model.set({displayIndex: this.model.get('displayIndex') + 1});
    this.viewer.fireSelectCallbacks(this.model.assembleContentForDC());
};

// Jump to previous highlight
DV.HighlightView.prototype.previous = function(){
    this.hide.preventRemovalOfCoverClass = true;
    this.model.set({displayIndex: this.model.get('displayIndex') - 1});
    this.viewer.fireSelectCallbacks(this.model.assembleContentForDC());
};

// Show highlight
DV.HighlightView.prototype.show = function(argHash) {
    if (this.viewer.activeHighlight && this.viewer.activeHighlight.id != this.model.get('id')) {
        this.viewer.activeHighlight.hide();
    }

    this.viewer.highlightToLoadId = null;
    this.viewer.elements.window.addClass('DV-coverVisible');

    this.highlightEl.find('div.DV-highlightBG').css({display: 'block', opacity: 1});
    this.highlightEl.addClass('DV-activeHighlight');

    this.viewer.activeHighlight = this;

    //Display/hide nav as needed based on current content displayed
    var contentCount = this.model.getContentCount();
    if( contentCount > 1 ){
        //If there is more than one piece of content..
        if( this.content.type == 'annotation' ){
            //Annotation: show if not editing
            (argHash && argHash.edit) ? this.highlightEl.find('.DV-pagination').addClass('DV-hideNav') : this.highlightEl.find('.DV-pagination').removeClass('DV-hideNav');
        }else if( this.content.type == 'graph' ){
            //Graph: always show
            this.highlightEl.find('.DV-pagination').removeClass('DV-hideNav')
        }
    }else{
        this.highlightEl.find('.DV-pagination').addClass('DV-hideNav');
    }

    // Enable highlight tracking to ensure the active state hides on scroll
    this.viewer.helpers.addObserver('trackHighlight');
    this.viewer.helpers.setActiveHighlightInNav(this.model.get('id'));
    this.active = true;
    this.page.pageEl.parent('.DV-set').addClass('DV-activePage');

    if ( argHash && argHash.edit || this.content.type == 'graph' ) {
        this.showEdit();
    }

    //Scroll into view (horizontally)
    $('.DV-pages').scrollLeft(this.showWindowX);

    //Fire callbacks if requested
    if(argHash && argHash.callbacks){ this.viewer.fireSelectCallbacks(this.model.assembleContentForDC()); }
};


//Process a request to hide an highlight; prompt user if necessary; call success if not user-cancelled
DV.HighlightView.prototype.requestHide = function(forceOverlayHide, success){
     _thisView = this;

    //If editing and data has changed, ask for confirmation before hiding
    var isEditing = this.highlightEl.hasClass('DV-editing');
    var hasChanged = this.innerView.hasChanged();

    if( isEditing && hasChanged ){
        var _highl_view = this;
        $('#noSaveDialog').dialog({
            modal: true,
            dialogClass: 'dv-dialog',
            height: 100,
            buttons: [
                {
                    text: "OK",
                    click: function() {
                    _highl_view.hide(forceOverlayHide);
                    success.call();
                    $(this).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() { $(this).dialog( "close" ); }
                }
            ]
        });
    }else{
        this.hide(forceOverlayHide);
        success.call();
    }
};


// Hide highlight
DV.HighlightView.prototype.hide = function(forceOverlayHide){
    var pageNumber = parseInt(this.viewer.elements.currentPage.text(),10);

    this.highlightEl.find('div.DV-highlightBG').css({ opacity: 0, display: 'none' });

    var isEditing = this.highlightEl.hasClass('DV-editing');

    this.highlightEl.removeClass('DV-editing DV-activeHighlight');
    if(forceOverlayHide === true){
        this.viewer.elements.window.removeClass('DV-coverVisible');
    }
    if(this.hide.preventRemovalOfCoverClass === false || !this.hide.preventRemovalOfCoverClass){
        this.viewer.elements.window.removeClass('DV-coverVisible');
        this.hide.preventRemovalOfCoverClass = false;
    }

    //If unsaved, just remove completely
    if(this.viewer.activeHighlight && this.content.content.unsaved  && this.model.getContentCount() <= 1){ this.remove(); }

    this.setCloneConfirm(false);

    // stop tracking this highlight
    this.active                                = false;
    this.viewer.activeHighlight                = null;
    this.viewer.events.trackHighlight.h        = null;
    this.viewer.events.trackHighlight.id       = null;
    this.viewer.events.trackHighlight.combined = null;
    this.viewer.pageSet.setActiveHighlight(null);
    this.viewer.helpers.removeObserver('trackHighlight');
    this.viewer.helpers.setActiveHighlightInNav();
    this.page.pageEl.parent('.DV-set').removeClass('DV-activePage');
    this.removeConnector(true);
};


// Toggle highlight
DV.HighlightView.prototype.toggle = function(argHash){
    if (this.viewer.activeHighlight && (this.viewer.activeHighlight != this)){
        this.viewer.activeHighlight.hide();
    }

    this.highlightEl.toggleClass('DV-activeHighlight');
    if(this.active == true){
        this.hide(true);
    }else{
        this.show();
    }
};


// Show hover highlight state
DV.HighlightView.prototype.drawConnector = function(){
    if(this.active != true){
        this.viewer.elements.window.addClass('DV-highlightActivated');
        this.highlightEl.addClass('DV-highlightHover');
    }
};


// Remove hover highlight state
DV.HighlightView.prototype.removeConnector = function(force){
    if(this.active != true){
        this.viewer.elements.window.removeClass('DV-highlightActivated');
        this.highlightEl.removeClass('DV-highlightHover');
    }
};


// Show edit controls
DV.HighlightView.prototype.showEdit = function() {
    this.highlightEl.addClass('DV-editing');
    this.innerView.showEdit();
};


// Set whether clone confirm button should show
DV.HighlightView.prototype.setCloneConfirm = function(setTo){
    this.showConfirm = setTo;
    this.showConfirm ? this.highlightEl.find('.DV-cloneConfirm').css('visibility', 'visible') : this.highlightEl.find('.DV-cloneConfirm').css('visibility','hidden');
}
