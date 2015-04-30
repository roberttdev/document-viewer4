DV.Schema = function() {
  this.models       = {};
  this.views        = {};
  this.states       = {};
  this.helpers      = {};
  this.events       = {};
  this.elements     = {};
  this.text         = {};
  this.recommendations = null;
  this.data         = {
    zoomLevel               : 700,
    pageWidthPadding        : 20,
    additionalPaddingOnPage : 30,
    state                   : { page: { previous: 0, current: 0, next: 1 } }
  };
};

// Imports the document's JSON representation into the DV.Schema form that
// the models expect.
DV.Schema.prototype.importCanonicalDocument = function(json, view_only) {
  // Ensure that IDs start with 1 as the lowest id.
  DV._.uniqueId();
  // Ensure at least empty arrays for sections.
  json.sections               = DV._.sortBy(json.sections || [], function(sec){ return sec.page; });
  json.annotations            = json.annotations || [];
  json.canonicalURL           = json.canonical_url;
  this.document               = DV.jQuery.extend(true, {}, json);
  // Everything after this line is for back-compatibility.
  this.data.title             = json.title;
  this.data.totalPages        = !view_only ? json.pages : 1;
  this.data.totalAnnotations  = json.annotations.length;
  this.data.sections          = json.sections;
  this.data.chapters          = [];
  this.data.annotationsById   = {};
  this.data.annotationsByPage = [];
  this.data.translationsURL   = json.resources.translations_url;
  DV._.each(json.annotations, DV.jQuery.proxy(this.loadAnnotation, this));
};

// Load an annotation into the Schema, starting from the canonical format.
DV.Schema.prototype.loadAnnotation = function(anno) {
  //Only load annos with highlights already set
  if(anno.location) {
      if (anno.id) anno.server_id = anno.id;
      var idx = anno.page - 1;
      anno.id = anno.id || parseInt(DV._.uniqueId());
      anno.title = anno.title || '';
      anno.text = anno.content || '';
      anno.access = anno.access || 'public';
      anno.type = anno.location && anno.location.image ? 'region' : 'page';
      if (anno.type === 'region') {
          var loc = DV.jQuery.map(anno.location.image.split(','), function (n, i) {
              return parseInt(n, 10);
          });
          anno.y1 = loc[0];
          anno.x2 = loc[1];
          anno.y2 = loc[2];
          anno.x1 = loc[3];
      } else if (anno.type === 'page') {
          anno.y1 = 0;
          anno.x2 = 0;
          anno.y2 = 0;
          anno.x1 = 0;
      }
      this.data.annotationsById[anno.id] = anno;
      var page = this.data.annotationsByPage[idx] = this.data.annotationsByPage[idx] || [];
      var insertionIndex = DV._.sortedIndex(page, anno, function (a) {
          return a.y1;
      });
      page.splice(insertionIndex, 0, anno);
  }
  return anno;
};


//Populate an anno-group relationship with data from client, if missing.  Return generated anno ref
DV.Schema.prototype.addAnnotationGroup = function(annoId, groupId) {
  var dvAnno = this.findAnnotation({id: annoId});
  var newGroup = {group_id: groupId, approved_count: 0}
  if( dvAnno.groups.indexOf(groupId) < 0 ){ dvAnno.groups.push(newGroup); }
  return dvAnno;
};


//Update an annotation-group's approval status and return it
DV.Schema.prototype.markApproval = function(anno_id, group_id, approval){
  var matchedAnno = this.getAnnotation(anno_id);

  //Update anno approved count
  for(var i=0; i < matchedAnno.groups.length; i++){
    if( matchedAnno.groups[i].group_id == group_id ){
      if(approval){ matchedAnno.groups[i].approved_count++; }
      else{ matchedAnno.groups[i].approved_count--; }
    }
  }

  return matchedAnno;
};


//Remove anno-group relationship; if last one, remove total annotation.  Return true if anno is fully removed, false otherwise
DV.Schema.prototype.removeAnnotationGroup = function(anno, groupId){
  if( anno.groups && anno.groups.length > 1 ){
    anno.groups.splice(anno.groups.indexOf(groupId), 1);
    return false;
  }
  else {
    var i = anno.page - 1;
    this.data.annotationsByPage[i] = DV._.without(this.data.annotationsByPage[i], anno);
    delete this.data.annotationsById[anno.id];
    return true;
  }
};


//Reload annotation schema
DV.Schema.prototype.reloadAnnotations = function(annos) {
    this.data.annotationsById = {};
    this.data.annotationsByPage = {};
    DV._.each(annos, DV.jQuery.proxy(this.loadAnnotation, this));
};


//Match annotation data passed in with an existing annotation
DV.Schema.prototype.findAnnotation = function(anno) {
  var annos = null;
  //Try ID first
  if(anno.id) { annos = _.find(this.data.annotationsById, function (listAnno) { return listAnno.server_id == anno.id; }); }
  //If no ID match, and image data exists, match on highlight image
  if(!annos && anno.location){ annos = _.find(this.data.annotationsById, function (listAnno) { return listAnno.location.image == anno.location.image; }); }

  //If a group was passed, set the selected group index to that group
  if( anno.group_id ) {
    for (var i = 0; i < annos.groups.length; i++) {
      if (annos.groups[i].group_id == anno.group_id) {
        annos.groupIndex = i+1;
      }
    }
  }

  return annos;
};


//Populate any missing annotation server IDs with data from client
//locationIds: hash containing ID and location
DV.Schema.prototype.syncIDs = function(locationIds) {
  //Sync missing IDs
  var unsynced = _.filter(this.data.annotationsById, function(listAnno){ return listAnno.server_id == null; });
  unsynced.map(function(anno){
    var toSync = _.find(locationIds, function(pair){ return pair.location ? pair.location.image == anno.location.image : false; });
    if( toSync ){ anno.server_id = toSync.id; }
  });
};


// Returns the list of annotations on a given page.
DV.Schema.prototype.getAnnotationsByPage = function(_index){
  return this.schemaData.annotationsByPage[_index];
};


// Get an annotation by id, with backwards compatibility for argument hashes.
DV.Schema.prototype.getAnnotation = function(identifier) {
  if (identifier.id) return this.data.annotationsById[identifier.id];
  if (identifier.index && !identifier.id) throw new Error('looked up an annotation without an id'); // TRANSLATE ??
  return this.data.annotationsById[identifier];
};


DV.Schema.prototype.getFirstAnnotation = function(){
  var byPage = this.data.annotationsByPage;
  for(var i=0; i < byPage.length; i++){
    if( byPage[i] != null && byPage[i].length > 0 ){ return byPage[i][0]; }
  }

  return null;
};


DV.Schema.prototype.getLastAnnotation = function(){
  var byPage = this.data.annotationsByPage;
  for(var i=byPage.length - 1; i >= 0; i--){
    if( byPage[i] != null && byPage[i].length > 0 ){ return byPage[i][byPage.length - 1]; }
  }

  return null;
};


DV.Schema.prototype.getNextAnnotation = function(currentId) {
  var anno = this.data.annotationsById[currentId];
  if( anno.groupIndex < anno.groupCount ){
    //If there are more group associations in anno, advance association counter and return this anno
    anno.groupIndex++;
    return anno;
  }else{
    //Else, set this index back to 1
    anno.groupIndex = 1;

    var pid = anno.page - 1;
    var byPage = this.data.annotationsByPage;
    if( byPage[pid][byPage[pid].length - 1] == anno ){
      //If this is last anno on its page, find next page with anno.. if hit end of document, return first anno
      for(var i=(pid + 1); i < byPage.length; i++){
        if( byPage[i].length > 0 ) {
          return byPage[i][0];
        }
      }
      return this.getFirstAnnotation();
    }
    else{
      var nextAnno = null;
      for(var i = byPage[pid].length - 1; i >= 0; i--){
        if( byPage[pid][i] == anno ){ return nextAnno; }
        nextAnno = byPage[pid][i];
      }
    }
  }
};


DV.Schema.prototype.getPreviousAnnotation = function(currentId) {
  var anno = this.data.annotationsById[currentId];
  if (anno.groupIndex != 1) {
    //If there are more group associations in anno, reduce association counter and return this anno
    anno.groupIndex--;
    return anno;
  } else {
    var returnAnno = null;
    var pid = anno.page - 1;
    var byPage = this.data.annotationsByPage;
    if (byPage[pid][0] == anno) {
      //If this is first anno on its page, find first prev page with anno.. if hit end of document, return last anno
      for (var i = (pid - 1); i >= 0; i--) {
        if (byPage[i].length > 0) {
          returnAnno = byPage[i][byPage[i].length - 1];
          break;
        }
      }
      if (returnAnno == null) {
        returnAnno = this.getLastAnnotation();
      }
    }
    else {
      var prevAnno = null;
      for (var i = 0; i < byPage[pid].length; i++) {
        if (byPage[pid][i] == anno) {
          returnAnno = prevAnno;
          break;
        }
        prevAnno = byPage[pid][i];
      }
    }

    returnAnno.groupIndex = returnAnno.groupCount;
    return returnAnno;
  }
};


DV.Schema.prototype.setRecommendations = function(recArray){
  this.recommendations = recArray;
};