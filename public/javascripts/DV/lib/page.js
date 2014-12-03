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
  this.annotationContainerEl = this.el.find('div.DV-annotations');
  this.coverEl          = this.el.find('div.DV-cover');
  this.loadTimer        = null;
  this.hasLayerPage     = false;
  this.hasLayerRegional = false;
  this.imgSource        = null;


  this.offset           = null;
  this.pageNumber       = null;
  this.zoom             = 1;
  this.annotations      = [];

  // optimizations
  var m = this.viewer.models;
  this.model_document     = m.document;
  this.model_pages        = m.pages;
  this.model_annotations  = m.annotations;
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

// Get the offset for the page at its current index
DV.Page.prototype.getOffset = function(){
  return this.model_document.offsets[this.index];
};

DV.Page.prototype.getPageNoteHeight = function() {
  return this.model_pages.pageNoteHeights[this.index];
};

// Draw the current page and its associated layers/annotations
// Will stop if page index appears the same or force boolean is passed
DV.Page.prototype.draw = function(argHash) {

  // Return immeditately if we don't need to redraw the page.
  if(this.index === argHash.index && !argHash.force && this.imgSource == this.model_pages.imageURL(this.index)){
    return;
  }

  this.index = (argHash.force === true) ? this.index : argHash.index;
  var _types = [];
  var source = this.model_pages.imageURL(this.index);

  // Set the page number as a class, for page-dependent elements.
  this.el[0].className = this.el[0].className.replace(/\s*DV-page-\d+/, '') + ' DV-page-' + (this.index + 1);

  if (this.imgSource != source) {
    this.imgSource = source;
    this.loadImage();
  }
  this.sizeImage();
  this.position();

  // Only draw annotations if page number has changed or the
  // forceAnnotationRedraw flag is true.
  if(this.pageNumber != this.index+1 || argHash.forceAnnotationRedraw === true){
    //If the removed page has the active annotation, hide/cancel it
    if( this.viewer.activeAnnotation && (this.pageNumber == this.viewer.activeAnnotation.model.page) ){
      this.viewer.activeAnnotation.hide();
    }

    for(var i = 0; i < this.annotations.length;i++){
      this.annotations[i].remove();
      delete this.annotations[i];
      this.hasLayerRegional = false;
      this.hasLayerPage     = false;
    }
    this.annotations = [];

    // if there are annotations for this page, it will proceed and attempt to draw
    var byPage = this.viewer.schema.data.annotationsByPage[this.index];
    if (byPage) {
      // Loop through all annotations and add to page
      for (var i=0; i < byPage.length; i++) {
        var anno = byPage[i];

        if(anno.id === this.viewer.annotationToLoadId){
          var active = true;
          if (anno.id === this.viewer.annotationToLoadEdit) argHash.edit = true;
          if (this.viewer.openingAnnotationFromHash) {
            this.viewer.helpers.jump(this.index, (anno.top || 0) - 37);
            this.viewer.openingAnnotationFromHash = false;
          }
        }else{
          var active = false;
        }

        if(anno.type == 'page'){
          this.hasLayerPage     = true;
        }else if(anno.type == 'regional'){
          this.hasLayerRegional = true;
        }

        /*DACTYL - REMOVED (and replaced by byId ref below)
        var html = this.viewer.$('.DV-allAnnotations .DV-annotation[rel=aid-'+anno.id+']').clone();
        html.attr('id','DV-annotation-' + anno.id);
        html.find('.DV-img').each(function() {
          var el = DV.jQuery(this);
          el.attr('src', el.attr('data-src'));
        }); */

        var newAnno = this.createPageAnnotation(anno, active, argHash.edit);

        this.annotations.push(newAnno);

      }
    }

    //this.pageInsertEl.toggleClass('visible', !this.hasLayerPage);
    this.renderMeta({ pageNumber: this.index+1 });

    // Draw remove overlay if page is removed.
    this.drawRemoveOverlay();
  }
  // Update the page type
  this.setPageType();

};

DV.Page.prototype.drawRemoveOverlay = function() {
  this.removedOverlayEl.toggleClass('visible', !!this.viewer.models.removedPages[this.index+1]);
};

DV.Page.prototype.setPageType = function(){
  if(this.annotations.length > 0){
    if(this.hasLayerPage === true)    { this.el.addClass('DV-layer-page'); }
    if(this.hasLayerRegional === true){ this.el.addClass('DV-layer-page'); }
  } else {
    this.el.removeClass('DV-layer-page DV-layer-regional');
  }
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
  this.viewer.pageSet.redraw();
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


//Create Page Annotation from regular Annotation and return
DV.Page.prototype.createPageAnnotation = function(anno, active, edit) {
  return new DV.AnnotationView({
    id: anno.id,
    page: this,
    pageEl: this.pageEl,
    annotationContainerEl: this.annotationContainerEl,
    pageNumber: this.pageNumber,
    state: 'collapsed',
    top: anno.y1,
    left: anno.x1,
    width: anno.x1 + anno.x2,
    height: anno.y1 + anno.y2,
    active: active,
    showEdit: edit,
    type: anno.type,
    groups: anno.groups,
    access: anno.access
  });
};


//Create new annotation and add it to existing annotation list
DV.Page.prototype.addPageAnnotation = function(anno){
  var newAnno = this.createPageAnnotation(anno, false, true);
  var insertIndex = DV._.sortedIndex(this.annotations, newAnno, function(anno){
    return anno.position.top;
  });
  this.annotations.splice(insertIndex, 0, newAnno);
};


//Remove annotation from annotation list
DV.Page.prototype.removePageAnnotation = function(anno){
  var removeAnno = this.findAnnotationView(anno.id);
  if(removeAnno) {
    removeAnno.remove();
    this.annotations = DV._.without(this.annotations, removeAnno);
    this.viewer.elements.window.removeClass('DV-coverVisible');
  }
};


//Refresh annotation
//active: Whether to make the refreshed annotation active (optional)
//groupId: The group to set the display to (optional)
DV.Page.prototype.refreshPageAnnotation = function(anno, groupId, active){
  var refreshAnno = this.findAnnotationView(anno.id);
  refreshAnno.refresh(groupId, active);
};


// Check page's annotations in schema and add any missing ones
DV.Page.prototype.syncAnnotations = function() {
  var byPage = this.viewer.schema.data.annotationsByPage[this.index];
  if (byPage) {
    // Loop through all annotations and splice in any additions
    for (var i=0; i < byPage.length; i++) {
      var anno = byPage[i];

      if( i >= this.annotations.length || (anno.id != this.annotations[i].id) ) {
        var newAnno = this.createPageAnnotation(anno, false, true);

        this.annotations.splice(i, 0, newAnno);
      }
    }
  }
};


//Find annotation view on page by annotation ID
DV.Page.prototype.findAnnotationView = function(annoID){
  return _.find(this.annotations, function (listAnno) { return listAnno.id == annoID; });
}
