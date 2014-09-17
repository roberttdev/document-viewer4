DV.model.Annotations = function(viewer) {
  this.LEFT_MARGIN              = 25;
  this.PAGE_NOTE_FUDGE          = window.dc && dc.account && (dc.account.isOwner || dc.account.isReviewer) ? 46 : 26;
  this.viewer                   = viewer;
  this.offsetsAdjustments       = [];
  this.offsetAdjustmentSum      = 0;
  this.saveCallbacks            = [];
  this.deleteCallbacks          = [];
  this.selectCallbacks          = [];
  this.cancelCallbacks          = [];
  this.byId                     = this.viewer.schema.data.annotationsById;
  this.byPage                   = this.viewer.schema.data.annotationsByPage;
  this.bySortOrder              = this.sortAnnotations();
};

DV.model.Annotations.prototype = {

  // Render an annotation model to HTML, calculating all of the dimenstions
  // and offsets, and running a template function.
  render: function(annotation, groupId){
    var documentModel             = this.viewer.models.document;
    var pageModel                 = this.viewer.models.pages;
    var zoom                      = pageModel.zoomFactor();
    var adata                     = annotation;
    var x1, x2, y1, y2;

    if(adata.type === 'page'){
      x1 = x2 = y1 = y2           = 0;
      adata.top                   = 0;
    }else{
      y1                          = Math.round(adata.y1 * zoom);
      y2                          = Math.round(adata.y2 * zoom);
      if (x1 < this.LEFT_MARGIN) x1 = this.LEFT_MARGIN;
      x1                          = Math.round(adata.x1 * zoom);
      x2                          = Math.round(adata.x2 * zoom);
      adata.top                   = y1 - 5;
    }

    adata.owns_note               = adata.owns_note || false;
    adata.width                   = pageModel.width;
    adata.pageNumber              = adata.page;
    adata.author                  = adata.author || "";
    adata.author_organization     = adata.author_organization || "";
    adata.bgWidth                 = adata.width;
    adata.bWidth                  = adata.width - 16;
    adata.excerptWidth            = (x2 - x1) - 8;
    adata.excerptMarginLeft       = x1 - 3;
    adata.excerptHeight           = y2 - y1;
    adata.index                   = adata.page - 1;
    adata.image                   = pageModel.imageURL(adata.index);
    adata.imageTop                = y1 + 1;
    adata.tabTop                  = (y1 < 35 ? 35 - y1 : 0) + 8;
    adata.imageWidth              = pageModel.width;
    adata.imageHeight             = Math.round(pageModel.height * zoom);
    adata.regionLeft              = x1;
    adata.regionWidth             = x2 - x1 ;
    adata.regionHeight            = y2 - y1;
    adata.excerptDSHeight         = adata.excerptHeight - 6;
    adata.DSOffset                = 3;
    adata.groupCount              = annotation.groups.length;
    adata.groupIndex              = annotation.groups.indexOf(groupId);

    adata.groupIndex = adata.groupIndex <= 0 ? 1 : adata.groupIndex + 1;

    if (adata.access == 'public')         adata.accessClass = 'DV-accessPublic';
    else if (adata.access =='exclusive')  adata.accessClass = 'DV-accessExclusive';
    else if (adata.access =='private')    adata.accessClass = 'DV-accessPrivate';

    adata.orderClass = '';
    adata.options = this.viewer.options;
    if (adata.position == 1) adata.orderClass += ' DV-firstAnnotation';
    if (adata.position == this.bySortOrder.length) adata.orderClass += ' DV-lastAnnotation';

    adata.approvedClass = '';
    var approvalState = this.getApprovalState(annotation);
    if(approvalState == 1){ adata.approvedClass = ' DV-semi-approved'; }
    if(approvalState == 2){ adata.approvedClass = ' DV-approved'; }

    var template = (adata.type === 'page') ? 'pageAnnotation' : 'annotation';
    return JST[template](adata);
  },

  //Find approval state of overall annotation based on annotation-group relationship statuses.
  //Returns: 0 = unapproved, 1 = semi-approved, 2 = approved
  getApprovalState: function(annotation){
    var approved = 0;
    for(var i=0; i < annotation.groups.length; i++){
        if( annotation.groups[i].approved_count > 0){ approved++; }
    }

    if( approved > 0 ){
        if( approved == annotation.groups.length ){ approved = 2; }
        else{ approved = 1; }
    }

    return approved;
  },

  // Re-sort the list of annotations when its contents change. Annotations
  // are ordered by page primarily, and then their y position on the page.
  sortAnnotations : function() {
    return this.bySortOrder = DV._.sortBy(DV._.values(this.byId), function(anno) {
      return anno.page * 10000 + anno.y1;
    });
  },

  //Populate any missing annotation server IDs with data from client
  //locationIds: hash containing ID and location
  syncIDs: function(locationIds) {
    //Sync missing IDs
    unsynced = _.filter(this.byId, function(listAnno){ return listAnno.server_id == null; });
    unsynced.map(function(anno){
       toSync = _.find(locationIds, function(pair){ return pair.location ? pair.location.image == anno.location.image : false; });
       anno.server_id = toSync.id;
    });
  },

  //Populate a group relations with data from client, if missing
  syncGroupAnnotation: function(annoId, groupId) {
      dvAnno = this.findAnnotation({id: annoId});
      if( dvAnno.groups.indexOf(groupId) < 0 ){ dvAnno.groups.push(groupId); }
  },

  //Remove current annotations from DOM and reload from schema
  reloadAnnotations: function(){
      DV._.each(this.byId, DV.jQuery.proxy(this.removeAnnotationFromDOM, this));
      this.byId                     = this.viewer.schema.data.annotationsById;
      this.byPage                   = this.viewer.schema.data.annotationsByPage;
      this.bySortOrder              = this.sortAnnotations();
  },

  //Match annotation data passed in with an existing annotation
  findAnnotation: function(anno) {
      annos = null;
      //Try ID first
      if(anno.id) { annos = _.find(this.byId, function (listAnno) { return listAnno.server_id == anno.id; }); }
      //If no ID match, and image data exists, match on highlight image
      if(!annos && anno.location){ annos = _.find(this.byId, function (listAnno) { return listAnno.location.image == anno.location.image; }); }
      return annos;
  },

  // Renders each annotation into it's HTML format.
  renderAnnotations: function(){
    if (this.viewer.options.showAnnotations === false) return;
            
    for (var i=0; i<this.bySortOrder.length; i++) {
      var anno      = this.bySortOrder[i];
      anno.of       = DV._.indexOf(this.byPage[anno.page - 1], anno);
      anno.position = i + 1;
      anno.html     = this.render(anno);
    }
    this.renderAnnotationsByIndex();
  },

  // Renders each annotation for the "Annotation List" tab, in order.
  renderAnnotationsByIndex: function(){
    var rendered  = DV._.map(this.bySortOrder, function(anno){ return anno.html; });
    var html      = rendered.join('')
                    .replace(/id="DV-annotation-(\d+)"/g, function(match, id) {
      return 'id="DV-listAnnotation-' + id + '" rel="aid-' + id + '"';
    });

    this.viewer.$('div.DV-allAnnotations').html(html);

    this.renderAnnotationsByIndex.rendered  = true;
    this.renderAnnotationsByIndex.zoomLevel = this.zoomLevel;

    // TODO: This is hacky, but seems to be necessary. When fixing, be sure to
    // test with both autozoom and page notes.
    this.updateAnnotationOffsets();
    DV._.defer(DV._.bind(this.updateAnnotationOffsets, this));
  },


  // Removes a given annotation/group relationship from the Annotations model (and DOM).  If last relationship left is being
  // deleted, deletes entire annotation
  removeAnnotation : function(anno, groupId) {
    if( anno.groups && anno.groups.length > 1 ){ anno.groups.splice(anno.groups.indexOf(groupId), 1); }
    else {
        goneAnno = this.byId[anno.id]
        delete this.byId[anno.id];
        var i = anno.page - 1;
        this.byPage[i] = DV._.without(this.byPage[i], goneAnno);
        this.sortAnnotations();
        this.removeAnnotationFromDOM(anno);
        this.viewer.api.redraw(true);
        if (DV._.isEmpty(this.byId)) this.viewer.open('ViewDocument');
    }
  },

  removeAnnotationFromDOM: function(anno) {
      DV.jQuery('#DV-annotation-' + anno.id + ', #DV-listAnnotation-' + anno.id).remove();
  },

  //Add/remove CSS styling for approval (temporary solution; does not persist anno model changes fully.. will it survive redraw?)
  markApproval: function(anno_id, group_id, approval) {
      var matchedAnno = this.findAnnotation({id: anno_id});
      var annoDOM = DV.jQuery('#DV-annotation-' + anno_id + ' .DV-annotationRegion');
      annoDOM.removeClass('DV-approved');
      annoDOM.removeClass('DV-semi-approved');

      //Update anno approved count
      for(var i=0; i < matchedAnno.groups.length; i++){
          if( matchedAnno.groups[i].group_id == group_id ){
              if(approval){ matchedAnno.groups[i].approved_count++; }
              else{ matchedAnno.groups[i].approved_count--; }
          }
      }

      var approvalState = this.getApprovalState(matchedAnno);
      if(approvalState == 1){ annoDOM.addClass('DV-semi-approved'); }
      if(approvalState == 2){ annoDOM.addClass('DV-approved'); }
  },

  // Offsets all document pages based on interleaved page annotations.
  updateAnnotationOffsets: function(){
    this.offsetsAdjustments   = [];
    this.offsetAdjustmentSum  = 0;
    var documentModel         = this.viewer.models.document;
    var annotationsContainer  = this.viewer.$('div.DV-allAnnotations');
    var pageAnnotationEls     = annotationsContainer.find('.DV-pageNote');
    var pageNoteHeights       = this.viewer.models.pages.pageNoteHeights;
    var me = this;

    if(this.viewer.$('div.DV-docViewer').hasClass('DV-viewAnnotations') == false){
      annotationsContainer.addClass('DV-getHeights');
    }

    // First, collect the list of page annotations, and associate them with
    // their DOM elements.
    var pageAnnos = [];
    DV._.each(DV._.select(this.bySortOrder, function(anno) {
      return anno.type == 'page';
    }), function(anno, i) {
      anno.el = pageAnnotationEls[i];
      pageAnnos[anno.pageNumber] = anno;
    });

    // Then, loop through the pages and store the cumulative offset due to
    // page annotations.
    for (var i = 0, len = documentModel.totalPages; i <= len; i++) {
      pageNoteHeights[i] = 0;
      if (pageAnnos[i]) {
        var height = (this.viewer.$(pageAnnos[i].el).height() + this.PAGE_NOTE_FUDGE);
        pageNoteHeights[i - 1] = height;
        this.offsetAdjustmentSum += height;
      }
      this.offsetsAdjustments[i] = this.offsetAdjustmentSum;
    }
    annotationsContainer.removeClass('DV-getHeights');
  },

  // When an annotation is successfully saved, fire any registered
  // save callbacks.
  fireSaveCallbacks : function(anno) {
    DV._.each(this.saveCallbacks, function(c){ c(anno); });
  },

  // When an annotation is successfully removed, fire any registered
  // delete callbacks.
  fireDeleteCallbacks : function(anno) {
    DV._.each(this.deleteCallbacks, function(c){ c(anno); });
  },


  // When new active annotation selected from DV UI, fire select callbacks
  fireSelectCallbacks : function(anno) {
      DV._.each(this.selectCallbacks, function(c){ c(anno); });
  },


  // When an annotation is successfully removed, fire any registered
  // delete callbacks.
  fireCancelCallbacks : function(anno) {
      DV._.each(this.cancelCallbacks, function(c){ c(anno); });
  },


  // Returns the list of annotations on a given page.
  getAnnotations: function(_index){
    return this.byPage[_index];
  },

  getFirstAnnotation: function(){
    return DV._.first(this.bySortOrder);
  },

  getNextAnnotation: function(currentId) {
    var anno = this.byId[currentId];
    if( anno.groupIndex < anno.groupCount ){
        //If there are more group associations in anno, advance association counter and return this anno
        anno.groupIndex++;
        return anno;
    }else{
        //Else, set this index back to 1 and return next anno.  If this is the last, return the first
        anno.groupIndex = 1;
        if( DV._.indexOf(this.bySortOrder, anno) + 1 < this.bySortOrder.length ){ return this.bySortOrder[DV._.indexOf(this.bySortOrder, anno) + 1]; }
        else{ return this.bySortOrder[0]; }
    }
  },

  getPreviousAnnotation: function(currentId) {
    var anno = this.byId[currentId];
    if( anno.groupIndex != 1 ){
        //If there are more group associations in anno, reduce association counter and return this anno
        anno.groupIndex--;
        return anno;
    }else{
        //Else, return previous anno's last group association.  If this is the first, move to the last
        if( DV._.indexOf(this.bySortOrder, anno) != 0 ){ returnAnno = this.bySortOrder[DV._.indexOf(this.bySortOrder, anno) - 1]; }
        else{ returnAnno = this.bySortOrder[this.bySortOrder.length - 1]; }
        returnAnno.groupIndex = returnAnno.groupCount;
        return returnAnno;
    }
  },

  // Get an annotation by id, with backwards compatibility for argument hashes.
  getAnnotation: function(identifier) {
    if (identifier.id) return this.byId[identifier.id];
    if (identifier.index && !identifier.id) throw new Error('looked up an annotation without an id'); // TRANSLATE ??
    return this.byId[identifier];
  }

};
