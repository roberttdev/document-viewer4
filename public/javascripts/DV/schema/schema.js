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
    json.highlights             = json.highlights || [];
    json.canonicalURL           = json.canonical_url;
    this.document               = DV.jQuery.extend(true, {}, json);
    // Everything after this line is for back-compatibility.
    this.data.title             = json.title;
    this.data.totalPages        = !view_only ? json.pages : 1;
    this.data.totalHighlights   = json.highlights.length;
    this.data.sections          = json.sections;
    this.data.chapters          = [];
    this.data.highlightsById   = {};
    this.data.highlightsByPage = [];
    this.data.translationsURL   = json.resources.translations_url;
    DV._.each(json.highlights, DV.jQuery.proxy(this.loadHighlight, this));
};

// Load an highlight into the Schema, starting from the canonical format.
DV.Schema.prototype.loadHighlight = function(highl) {
    //Only load highlights with locations already set
    if(highl.location) {
        var hiModel = new DV.HighlightModel(highl);
        var idx = hiModel.get('page') - 1;
        this.data.highlightsById[hiModel.id] = hiModel;
        var page = this.data.highlightsByPage[idx] = this.data.highlightsByPage[idx] || [];
        //Generate sort by top of highlight
        var insertionIndex = DV._.sortedIndex(page, hiModel, function (h) {
            return h.get('y1');
        });

        page.splice(insertionIndex, 0, hiModel);
    }
    return hiModel;
};


//Set reference to active content: hash should contain highlight_id and either anno_id or graph_id to set as active
DV.Schema.prototype.setActiveContent = function(highlightInfo) {
    var highl = this.findHighlight({id: highlightInfo.highlight_id});
    if( "anno_id" in highlightInfo ){
        highl.displayIndex = highl.annotations.findIndex(function(anno){ return anno.server_id == highlightInfo.anno_id; });
      }else if( "graph_id" in highlightInfo ){
        highl.displayIndex = highl.graphs.findIndex(function(graph){ return graph.server_id == highlightInfo.graph_id; }) + highl.annotations.length;
    }
};


//Update an highlight-group's approval status and return it
DV.Schema.prototype.markApproval = function(anno_id, group_id, approval){
    var matchedAnno = this.getHighlight(anno_id);

    //Update anno approved count
    for(var i=0; i < matchedAnno.groups.length; i++){
        if( matchedAnno.groups[i].group_id == group_id ){
            if(approval){ matchedAnno.groups[i].approved_count++; }
            else{ matchedAnno.groups[i].approved_count--; }
        }
    }

    return matchedAnno;
};


//Add blank highlight content
DV.Schema.prototype.addHighlightContent = function(highl, new_content){
    if( new_content.type == 'annotation' ){
        var annoHash = {};
        if(new_content.id){
            annoHash.id         = new_content.id;
            annoHash.server_id  = new_content.id;
            annoHash.unsaved    = (new_content.text && new_content.text != '' && new_content.title && new_content.title != '') ? false : true;
        }
        if(new_content.group_id) annoHash.group_id = new_content.group_id;
        if(new_content.title) annoHash.title = new_content.title;
        if(new_content.text) annoHash.text = new_content.text;

        highl.addAnnotation(annoHash);
        highl.set({displayIndex: highl.annotations.length - 1});
    }else if( new_content.type == 'graph' ) {
        var graphHash = {};
        if(new_content.id){
            graphHash.id         = new_content.id;
            graphHash.server_id  = new_content.id;
            graphHash.unsaved    = (new_content.graph_json && new_content.graph_json != '') ? false : true;
        }
        if(new_content.graph_json) annoHash.graph_json = new_content.graph_json;
        if(new_content.group_id) graphHash.group_id = new_content.group_id;
        if(new_content.image_link) annoHash.image_link = new_content.image_link;

        highl.addGraph(graphHash);
        highl.set({displayIndex: highl.annotations.length + highl.graphs.length - 1});
    }
}

//Remove highlight-content relationship; if last one, remove total highlight.  Return true if all content is fully removed, false otherwise
DV.Schema.prototype.removeHighlightContent = function(highl, highlightInfo){
    if( "anno_id" in highlightInfo ){
        highl.removeAnnotation(highlightInfo.anno_id);
    }else if( "graph_id" in highlightInfo ){
        highl.removeGraph(highlightInfo.graph_id);
    }
    return ( (!highl.annotations || highl.annotations.length < 1) && (!highl.graphs || highl.graphs.length < 1) ) ? true : false;
};

//Remove graph highlight
DV.Schema.prototype.removeHighlight = function(anno){
    var i = anno.page - 1;
    this.data.highlightsByPage[i] = DV._.without(this.data.highlightsByPage[i], anno);
    delete this.data.highlightsById[anno.id];
    return true;
};


//Reload highlight schema
DV.Schema.prototype.reloadHighlights = function(annos) {
    this.data.highlightsById = {};
    this.data.highlightsByPage = {};
    DV._.each(annos, DV.jQuery.proxy(this.loadHighlight, this));
};


//Match highlight data passed in with an existing highlight
DV.Schema.prototype.findHighlight = function(highl) {
    var highls = null;
    //Try ID first
    if(highl.id) { highls = _.find(this.data.highlightsById, function (listHighl) { return listHighl.server_id == highl.id; }); }
    //If no ID match, and image data exists, match on highlight image
    if(!highls && highl.location){ highls = _.find(this.data.highlightsById, function (listHighl) { return listHighl.location == highl.location; }); }

    return highls;
};


//Update highlight and one content item with data from client
//highlightInfo: standard DV/DC communication structure:
// {type:(annotation/graph), content:(highlight/content data flattened), updateAll: whether to update matching items as well}
DV.Schema.prototype.syncHighlight = function(highlightInfo) {
    var _me = this;
    var contentType = highlightInfo.type;
    var content = highlightInfo.content;
    var updateAll = highlightInfo.updateAll;

    //Try to find highlight based on ID.  If no luck, find highlight with no ID that matches location
    var highl = _.filter(this.data.highlightsById, function(listHighl){ return listHighl.server_id == content.highlight_id; });
    if(highl.length == 0){
        highl = _.filter(this.data.highlightsById, function(listHighl){ return listHighl.server_id == null && listHighl.location == content.location; });
        if(highl.length != 0){
            highl = highl[0];

            //Update highlight ID and associated refs
            highl.set({server_id: content.highlight_id});
            _me.data.highlightsById[highl.server_id] = _me.data.highlightsById[highl.id];
            delete _me.data.highlightsById[highl.id];
            highl.set({id: highl.server_id});
        }
    }else{
        highl = highl[0];
    }

    //If the content passed is an annotation..
    if( contentType == 'annotation' ){
        //Match anno.  If no luck, find anno with no ID and set that one
        var anno = highl.findAnnotation(content.id);
        if(!anno){
            anno = highl.findAnnotation(null);
            anno.set({id: content.id, server_id: content.id});
        }

        //If requested, update all with same title/text
        if(updateAll){
            annos = _.filter(highl.annotations, function(listAnno){ return listAnno.title == anno.title && listAnno.text == anno.text; });
            DV._.each(annos, function(listAnno){
                listAnno.set({
                    text:       content.content,
                    title:      content.title,
                    unsaved:    false
                });
            });
        }else{
            anno.set({
                group_id:   content.group_id,
                text:       content.content,
                title:      content.title,
                unsaved:    false
            });
        }
    }

    //If graph..
    if( contentType == 'graph' ){
        //Match anno.  If no luck, find anno with no ID and set that one
        var graph = highl.findGraph(content.id);
        if(!graph){
            graph = highl.findGraph(null);
            graph.set({id: content.id, server_id: content.id});
        }
        graph.set({
            graph_json: content.graph_json,
            group_id:   content.group_id,
            unsaved:    false
        })
    }
};


// Returns the list of highlights on a given page.
DV.Schema.prototype.getHighlightsByPage = function(_index){
    return this.schemaData.highlightsByPage[_index];
};


// Get an highlight by id, with backwards compatibility for argument hashes.
DV.Schema.prototype.getHighlight = function(identifier) {
    if (identifier.id) return this.data.highlightsById[identifier.id];
    if (identifier.index && !identifier.id) throw new Error('looked up an highlight without an id'); // TRANSLATE ??
    return this.data.highlightsById[identifier];
};


DV.Schema.prototype.getFirstHighlight = function(){
    var byPage = this.data.highlightsByPage;
    for(var i=0; i < byPage.length; i++){
        if( byPage[i] != null && byPage[i].length > 0 ){ return byPage[i][0]; }
    }

    return null;
};


DV.Schema.prototype.getLastHighlight = function(){
    var byPage = this.data.highlightsByPage;
    for(var i=byPage.length - 1; i >= 0; i--){
        if( byPage[i] != null && byPage[i].length > 0 ){ return byPage[i][byPage.length - 1]; }
    }

    return null;
};


DV.Schema.prototype.getNextHighlight = function(currentId) {
    var anno = this.data.highlightsById[currentId];
    if( anno.groupIndex < anno.groupCount ){
        //If there are more group associations in anno, advance association counter and return this anno
        anno.groupIndex++;
        return anno;
    }else{
        //Else, set this index back to 1
        anno.groupIndex = 1;

        var pid = anno.page - 1;
        var byPage = this.data.highlightsByPage;
        if( byPage[pid][byPage[pid].length - 1] == anno ){
            //If this is last anno on its page, find next page with anno.. if hit end of document, return first anno
            for(var i=(pid + 1); i < byPage.length; i++){
                if( byPage[i].length > 0 ) { return byPage[i][0]; }
            }
            return this.getFirstHighlight();
        }else{
            var nextAnno = null;
            for(var i = byPage[pid].length - 1; i >= 0; i--){
                if( byPage[pid][i] == anno ){ return nextAnno; }
                nextAnno = byPage[pid][i];
            }
        }
    }
};


DV.Schema.prototype.getPreviousHighlight = function(currentId) {
    var anno = this.data.highlightsById[currentId];
    if (anno.groupIndex != 1) {
        //If there are more group associations in anno, reduce association counter and return this anno
        anno.groupIndex--;
        return anno;
    } else {
        var returnAnno = null;
        var pid = anno.page - 1;
        var byPage = this.data.highlightsByPage;
        if (byPage[pid][0] == anno) {
            //If this is first anno on its page, find first prev page with anno.. if hit end of document, return last anno
            for (var i = (pid - 1); i >= 0; i--) {
                if (byPage[i].length > 0) {
                    returnAnno = byPage[i][byPage[i].length - 1];
                    break;
                }
            }
            if (returnAnno == null) {
                returnAnno = this.getLastHighlight();
            }
        } else {
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