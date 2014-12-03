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

  /*DACTYL - REMOVED this.viewer.models.annotations.renderAnnotations(); */
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

// basic reflow to ensure zoomlevel is right, pages are in the right place and annotation limits are correct
DV.PageSet.prototype.reflowPages = function() {
  this.viewer.models.pages.resize();
  this.viewer.helpers.setActiveAnnotationLimits();
  this.redraw(false, true);
};

// reflow the pages without causing the container to resize or annotations to redraw
DV.PageSet.prototype.simpleReflowPages = function(){
  this.viewer.helpers.setActiveAnnotationLimits();
  this.redraw(false, false);
};

// hide any active annotations
DV.PageSet.prototype.cleanUp = function(){
  if(this.viewer.activeAnnotation){
    this.viewer.activeAnnotation.hide(true);
  }
};

DV.PageSet.prototype.zoom = function(argHash){
  if (this.viewer.models.document.zoomLevel === argHash.zoomLevel) return;

  var currentPage  = this.viewer.models.document.currentIndex();
  var oldOffset    = this.viewer.models.document.offsets[currentPage];
  var oldZoom      = this.viewer.models.document.zoomLevel*1;
  var relativeZoom = argHash.zoomLevel / oldZoom;
  var scrollPos    = this.viewer.elements.window.scrollTop();

  this.viewer.models.document.zoom(argHash.zoomLevel);

  var diff        = (parseInt(scrollPos, 10)>parseInt(oldOffset, 10)) ? scrollPos - oldOffset : oldOffset - scrollPos;

  var diffPercentage   = diff / this.viewer.models.pages.height;

  this.reflowPages();
  this.zoomText();

  if (this.viewer.state === 'ViewThumbnails') {
    this.viewer.thumbnails.setZoom(argHash.zoomLevel);
    this.viewer.thumbnails.lazyloadThumbnails();
  }

  // Zoom any drawn redactions.
  if (this.viewer.state === 'ViewDocument') {
    this.viewer.$('.DV-annotationRegion.DV-accessRedact').each(function() {
      var el = DV.jQuery(this);
      el.css({
        top    : Math.round(el.position().top  * relativeZoom),
        left   : Math.round(el.position().left * relativeZoom),
        width  : Math.round(el.width()         * relativeZoom),
        height : Math.round(el.height()        * relativeZoom)
      });
    });
  }

  if(this.viewer.activeAnnotation != null){
    // FIXME:

    var args = {
      index: this.viewer.models.document.currentIndex(),
      top: this.viewer.activeAnnotation.top,
      id: this.viewer.activeAnnotation.id
    };
    this.viewer.activeAnnotation = null;

    this.showAnnotation(args);
    this.viewer.helpers.setActiveAnnotationLimits(this.viewer.activeAnnotation);
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

DV.PageSet.prototype.redraw = function(stopResetOfPosition, redrawAnnotations) {
  if (this.pages['p0']) this.pages['p0'].draw({ force: true, forceAnnotationRedraw : redrawAnnotations });
  if (this.pages['p1']) this.pages['p1'].draw({ force: true, forceAnnotationRedraw : redrawAnnotations });
  if (this.pages['p2']) this.pages['p2'].draw({ force: true, forceAnnotationRedraw : redrawAnnotations });

  if(redrawAnnotations && this.viewer.activeAnnotation){
    this.viewer.helpers.jump(this.viewer.activeAnnotation.page.index,this.viewer.activeAnnotation.position.top - 37);
  }
};

//Add annotation to its page. Takes in standard (schema) anno hash
DV.PageSet.prototype.addPageAnnotation = function(anno){
  this.getPageByNumber(anno.page).addPageAnnotation(anno);
};

//Remove annotation from its page. Takes in standard (schema) anno hash
DV.PageSet.prototype.removePageAnnotation = function(anno){
  //If page is visible, send remove request to it
  var page = this.getPageByNumber(anno.page);
  if(page){ page.removePageAnnotation(anno); }
};

//Refresh annotation display. Takes in standard (schema) anno hash
//active: Whether to make the refreshed annotation active (optional)
//groupId: The group to set the display to (optional)
DV.PageSet.prototype.refreshPageAnnotation = function(anno, groupId, active){
  //If page is visible, send refresh request to it
  var page = this.getPageByNumber(anno.page);
  if(page){ page.refreshPageAnnotation(anno, groupId, active); }
};

// set the annotation to load ahead of time
DV.PageSet.prototype.setActiveAnnotation = function(annotationId, edit){
  this.viewer.annotationToLoadId   = annotationId;
  this.viewer.annotationToLoadEdit = edit ? annotationId : null;
};

// a funky fucking mess to jump to the annotation that is active
DV.PageSet.prototype.showAnnotation = function(argHash, showHash){
  showHash = showHash || {};

  // if state is ViewAnnotation, jump to the appropriate position in the view
  // else
  // hide active annotations and locate the position of the next annotation
  // NOTE: This needs work
  if(this.viewer.state === 'ViewAnnotation'){

    var offset = this.viewer.$('.DV-allAnnotations div[rel=aid-'+argHash.id+']')[0].offsetTop;
    this.viewer.elements.window.scrollTop(offset+10,'fast');
    this.viewer.helpers.setActiveAnnotationInNav(argHash.id);
    this.viewer.activeAnnotationId = argHash.id;
  }else{
    this.viewer.helpers.removeObserver('trackAnnotation');
    this.viewer.activeAnnotationId = null;
    if(this.viewer.activeAnnotation != null){
      this.viewer.activeAnnotation.hide();
    }
    this.setActiveAnnotation(argHash.id, showHash.edit);

    var isPage = this.viewer.schema.data.annotationsById[argHash.id].type == 'page';
    var nudge  = isPage ? -7 : 36;
    var offset = argHash.top - nudge;

    for(var i = 0; i <= 2; i++){
      if (this.pages['p' + i]) {
        for(var n = 0; n < this.pages['p'+i].annotations.length; n++){
          if(this.pages['p'+i].annotations[n].id === argHash.id){
            this.viewer.helpers.jump(argHash.index, offset);
            this.pages['p'+i].annotations[n].show(showHash);
            return;
          }
        }
      }
    }

    this.viewer.helpers.jump(argHash.index,offset);
  }
};
