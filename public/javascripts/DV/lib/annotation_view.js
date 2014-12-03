DV.AnnotationView = function(argHash){
  this.LEFT_MARGIN  = 25;
  this.id           = argHash.id;
  this.page         = argHash.page;
  this.viewer       = this.page.set.viewer;
  this.model        = this.viewer.schema.getAnnotation(this.id);
  this.position     = { top: argHash.top, left: argHash.left };
  this.dimensions   = { width: argHash.width, height: argHash.height };
  this.pageEl       = argHash.pageEl;
  this.annotationContainerEl = argHash.annotationContainerEl;
  this.annotationEl = null;
  this.type         = argHash.type;
  this.state        = 'collapsed';
  this.active       = false;
  this.access       = argHash.access;
  this.groupIndex   = 0;
  this.renderedHTML = $(this.render(this.model.groups[0].group_id));
  this.remove();
  this.add();

  if(argHash.active){
    this.viewer.helpers.setActiveAnnotationLimits(this);
    this.viewer.events.resetTracker();
    this.active = null;
    // this.viewer.elements.window[0].scrollTop += this.annotationEl.offset().top;
    this.show();
    if (argHash.showEdit) this.showEdit();
  }
};

// Render an annotation model to HTML, calculating all of the dimenstions
// and offsets, and running a template function.
DV.AnnotationView.prototype.render = function(groupId){
  var documentModel             = this.viewer.models.document;
  var pageModel                 = this.viewer.models.pages;
  var zoom                      = pageModel.zoomFactor();
  var x1, x2, y1, y2;

  //Update groupIndex to the requested group to display
  this.groupIndex               = 0;
  for(var i=0; i < this.model.groups.length; i++){
    if( this.model.groups[i].group_id == groupId ) {
      this.groupIndex = i + 1;
    }
  }

  var argHash = this.model;
  if(this.type === 'page'){
    x1 = x2 = y1 = y2           = 0;
    argHash.top                   = 0;
  }else{
    y1                          = Math.round(argHash.y1 * zoom);
    y2                          = Math.round(argHash.y2 * zoom);
    if (x1 < this.LEFT_MARGIN) x1 = this.LEFT_MARGIN;
    x1                          = Math.round(argHash.x1 * zoom);
    x2                          = Math.round(argHash.x2 * zoom);
    argHash.top                   = y1 - 5;
  }
  argHash.owns_note               = argHash.owns_note || false;
  argHash.width                   = pageModel.width;
  argHash.pageNumber              = argHash.page;
  argHash.author                  = argHash.author || "";
  argHash.author_organization     = argHash.author_organization || "";
  argHash.bgWidth                 = argHash.width;
  argHash.bWidth                  = argHash.width - 16;
  argHash.excerptWidth            = (x2 - x1) - 8;
  argHash.excerptMarginLeft       = x1 - 3;
  argHash.excerptHeight           = y2 - y1;
  argHash.index                   = argHash.page - 1;
  argHash.image                   = pageModel.imageURL(argHash.index);
  argHash.imageTop                = y1 + 1;
  argHash.tabTop                  = (y1 < 35 ? 35 - y1 : 0) + 8;
  argHash.imageWidth              = pageModel.width;
  argHash.imageHeight             = Math.round(pageModel.height * zoom);
  argHash.regionLeft              = x1;
  argHash.regionWidth             = x2 - x1 ;
  argHash.regionHeight            = y2 - y1;
  argHash.excerptDSHeight         = argHash.excerptHeight - 6;
  argHash.DSOffset                = 3;
  argHash.groupCount              = this.model.groups.length;
  argHash.groupIndex              = this.groupIndex;

  if (argHash.access == 'public')         argHash.accessClass = 'DV-accessPublic';
  else if (argHash.access =='exclusive')  argHash.accessClass = 'DV-accessExclusive';
  else if (argHash.access =='private')    argHash.accessClass = 'DV-accessPrivate';

  argHash.orderClass = ''; //Can remove this if no longer needed; remove from template too
  argHash.options = this.viewer.options;
  /*DACTYL - REMOVED
  if (this.position == 1) this.orderClass += ' DV-firstAnnotation';
  if (this.position == this.schemthis.annotationsById.length) this.orderClass += ' DV-lastAnnotation';
  */

  argHash.approvedClass = '';
  var approvalState = this.getApprovalState();
  if(approvalState == 1){ argHash.approvedClass = ' DV-semi-approved'; }
  if(approvalState == 2){ argHash.approvedClass = ' DV-approved'; }

  var template = (this.type === 'page') ? 'pageAnnotation' : 'annotation';
  return JST[template](argHash);
},


//Find approval state of overall annotation based on annotation-group relationship statuses.
//Returns: 0 = unapproved, 1 = semi-approved, 2 = approved
DV.AnnotationView.prototype.getApprovalState = function(){
  var approved = 0;
  for(var i=0; i < this.model.groups.length; i++){
    if( this.model.groups[i].approved_count > 0){ approved++; }
  }

  if( approved > 0 ){
    if( approved == this.model.groups.length ){ approved = 2; }
    else{ approved = 1; }
  }

  return approved;
},


// Add annotation to page
DV.AnnotationView.prototype.add = function(){
/* DACTYL - REMOVED
  if(this.type === 'page'){
      this.annotationEl = this.renderedHTML.insertBefore(this.annotationContainerEl);
  }else{
    if(this.page.annotations.length > 0){
      for(var i = 0,len = this.page.annotations.length;i<len;i++){
        if(this.page.annotations[i].id === this.id){

          return false;
        }else{

          this.annotationEl = this.renderedHTML.appendTo(this.annotationContainerEl);
        }
      }
    }else{

      this.annotationEl = this.renderedHTML.appendTo(this.annotationContainerEl);
    }
  } */
  this.annotationEl = this.renderedHTML.appendTo(this.annotationContainerEl);
};


// Remove the annotation from the page
DV.AnnotationView.prototype.remove = function(){
  if(this.annotationEl){ this.annotationEl.remove(); }
};


// Redraw the HTML for this annotation
//active: Whether to make the refreshed annotation active (optional)
//groupId: The group to set the display to (optional)
DV.AnnotationView.prototype.refresh = function(groupId, active) {
  var gid = groupId ? groupId : this.model.groups[0].group_id;
  this.renderedHTML = $(this.render(gid));
  this.remove();
  this.add();
  if(active != false){ this.show({callbacks: false}); }
};


// Jump to next annotation
DV.AnnotationView.prototype.next = function(){
  this.hide.preventRemovalOfCoverClass = true;

  var annotation = this.viewer.schema.getNextAnnotation(this.id);
  if(!annotation){
    return;
  }

  this.page.set.showAnnotation(annotation);
};

// Jump to previous annotation
DV.AnnotationView.prototype.previous = function(){
  this.hide.preventRemovalOfCoverClass = true;
  var annotation = this.viewer.schema.getPreviousAnnotation(this.id);
  if(!annotation) {
    return;
  }
  this.page.set.showAnnotation({ index: annotation.index, id: annotation.id, top: annotation.top });
};

// Show annotation
DV.AnnotationView.prototype.show = function(argHash) {

  if (this.viewer.activeAnnotation && this.viewer.activeAnnotation.id != this.id) {
    this.viewer.activeAnnotation.hide();
  }
  this.viewer.annotationToLoadId = null;
  this.viewer.elements.window.addClass('DV-coverVisible');

  this.annotationEl.find('div.DV-annotationBG').css({ display: 'block', opacity: 1 });
  this.annotationEl.addClass('DV-activeAnnotation');
  this.viewer.activeAnnotation   = this;

  //Refresh page markers to latest data
  this.annotationEl.find('.DV-groupCount').html('('+parseInt(this.model.groupIndex)+' of '+parseInt(this.model.groupCount)+')');

  // Enable annotation tracking to ensure the active state hides on scroll
  this.viewer.helpers.addObserver('trackAnnotation');
  this.viewer.helpers.setActiveAnnotationInNav(this.id);
  this.active                         = true;
  this.pageEl.parent('.DV-set').addClass('DV-activePage');
  // this.viewer.history.save('document/p'+(parseInt(this.page.index,10)+1)+'/a'+this.id);

  if (argHash && argHash.edit) {
    this.showEdit();
  }

  //If annotation is a saved one, trigger events on display
  if(!this.viewer.activeAnnotation.model.unsaved && (!argHash || argHash.callbacks != false)) {
    this.viewer.fireSelectCallbacks(this.viewer.activeAnnotation.model);
  }
};

// Hide annotation
DV.AnnotationView.prototype.hide = function(forceOverlayHide){
  var pageNumber = parseInt(this.viewer.elements.currentPage.text(),10);

  if(this.type !== 'page'){
    this.annotationEl.find('div.DV-annotationBG').css({ opacity: 0, display: 'none' });
  }

  var isEditing = this.annotationEl.hasClass('DV-editing');

  this.annotationEl.removeClass('DV-editing DV-activeAnnotation');
  if(forceOverlayHide === true){
    this.viewer.elements.window.removeClass('DV-coverVisible');
  }
  if(this.hide.preventRemovalOfCoverClass === false || !this.hide.preventRemovalOfCoverClass){
    this.viewer.elements.window.removeClass('DV-coverVisible');
    this.hide.preventRemovalOfCoverClass = false;
  }

  //If unsaved, just remove completely
  if(this.viewer.activeAnnotation.model.unsaved){ this.remove(); }

  // stop tracking this annotation
  this.viewer.activeAnnotation                = null;
  this.viewer.events.trackAnnotation.h        = null;
  this.viewer.events.trackAnnotation.id       = null;
  this.viewer.events.trackAnnotation.combined = null;
  this.active                                 = false;
  this.viewer.pageSet.setActiveAnnotation(null);
  this.viewer.helpers.removeObserver('trackAnnotation');
  this.viewer.helpers.setActiveAnnotationInNav();
  this.pageEl.parent('.DV-set').removeClass('DV-activePage');
  this.removeConnector(true);

};

// Toggle annotation
DV.AnnotationView.prototype.toggle = function(argHash){
  if (this.viewer.activeAnnotation && (this.viewer.activeAnnotation != this)){
    this.viewer.activeAnnotation.hide();
  }

  if (this.type === 'page') return;

  this.annotationEl.toggleClass('DV-activeAnnotation');
  if(this.active == true){
    this.hide(true);
  }else{
    this.show();
  }
};

// Show hover annotation state
DV.AnnotationView.prototype.drawConnector = function(){
  if(this.active != true){
    this.viewer.elements.window.addClass('DV-annotationActivated');
    this.annotationEl.addClass('DV-annotationHover');
  }
};

// Remove hover annotation state
DV.AnnotationView.prototype.removeConnector = function(force){
  if(this.active != true){
    this.viewer.elements.window.removeClass('DV-annotationActivated');
    this.annotationEl.removeClass('DV-annotationHover');
  }
};

// Show edit controls
DV.AnnotationView.prototype.showEdit = function() {
  this.annotationEl.addClass('DV-editing');
  this.viewer.$('.DV-annotationTitleInput', this.annotationEl).val() ? this.viewer.$('.DV-annotationTextArea', this.annotationEl).focus() : this.viewer.$('.DV-annotationTitleInput', this.annotationEl).focus() ;
};

