DV.HighlightModel = function(argHash){
    //Set defaults
    this.annotations = [];
    this.graphs = [];

    this.displayIndex = 0;
    this.document_id = null;
    this.id = null;
    this.image_link = null;
    this.location = null;
    this.page = 0;
    this.server_id = null;
    this.x1 = null;
    this.x2 = null;
    this.y1 = null;
    this.y2 = null;

    //Assign initial values
    this.set(argHash);

    //Add content
    DV._.each(argHash.annotations, this.addAnnotation, this);
    DV._.each(argHash.graphs, this.addGraph, this);
};


DV.HighlightModel.prototype.get = function(property){
    return this[property];
};


DV.HighlightModel.prototype.set = function(argHash){
    DV._.each(argHash, DV.jQuery.proxy(function(element, index){
        //If in whitelist, set param
        if(['displayIndex','document_id','id','image_link','location','page','server_id','x1','x2','y1','y2'].indexOf(index) >= 0){
            this[index] = element;
        }

        //Special case logic
        if(index == 'id') this.server_id = element;
        if(index == 'location'){
            var loc = DV.jQuery.map(element.split(','), function (n, i) {
                return parseInt(n, 10);
            });
            this.y1 = loc[0];
            this.x2 = loc[1];
            this.y2 = loc[2];
            this.x1 = loc[3];
        }
    }, this));
};


DV.HighlightModel.prototype.addAnnotation = function(anno){
    this.annotations.push(new DV.AnnotationModel(anno));
};


DV.HighlightModel.prototype.addGraph = function(graph){
    this.graphs.push(new DV.GraphModel(graph));
};


DV.HighlightModel.prototype.removeAnnotation = function(anno_id){
    this.annotations.splice(this.annotations.findIndex(function(anno){ return anno.server_id == anno_id; }), 1);
    this.displayIndex = 0;
};


DV.HighlightModel.prototype.removeGraph = function(graph_id){
    this.graphs.splice(this.graphs.findIndex(function(graph){ return graph.server_id == graph_id; }), 1);
    this.displayIndex = 0;
}


//Return first (should be only) anno matching ID
DV.HighlightModel.prototype.findAnnotation = function(id){
    var annos = _.filter(this.annotations, function(listAnno){ return listAnno.server_id == id; });
    return annos ? annos[0] : null;
};


//Return first (should be only) graph matching ID
DV.HighlightModel.prototype.findGraph = function(id){
    var graphs = _.filter(this.graphs, function(listGraph){ return listGraph.server_id == id; });
    return graphs ? graphs[0] : null;
};


//Return current content for highlight and what type it is
DV.HighlightModel.prototype.getCurrentHighlightContent = function(){
    if(this.displayIndex >= this.annotations.length){
        return {type: 'graph', content: this.graphs[this.displayIndex - this.annotations.length]};
    }else{
        return {type: 'annotation', content: this.annotations[this.displayIndex]};
    }
};


//Return total count of content in highlight
DV.HighlightModel.prototype.getContentCount = function(){
    var annos = this.annotations ? this.annotations.length : 0;
    var graphs = this.graphs ? this.graphs.length : 0;
    return annos + graphs;
};


//Assemble content structure for DC consumption
DV.HighlightModel.prototype.assembleContentForDC = function(){
    var currentContent = this.getCurrentHighlightContent();
    var dcContent = {};
    dcContent.type = currentContent.type;
    dcContent.content = currentContent.content.assembleContentForDC();
    dcContent.content.document_id = this.document_id;
    dcContent.content.highlight_id = this.server_id;
    dcContent.content.image_link = this.image_link;
    dcContent.content.location = this.location;
    dcContent.content.page_number = this.page;

    //Return whether multiple title/content duos are represented in this highlight
    var other_data = _.filter(this.annotations, function(listAnno){
        return listAnno.title != dcContent.content.title || listAnno.text != dcContent.content.content;
    });
    dcContent.content.multiple_anno_data = other_data.length > 0 ? true : false;


    return dcContent;
};


//Find approval state of overall highlight based on highlight-group relationship statuses.
//Returns: 0 = unapproved, 1 = semi-approved, 2 = approved
DV.HighlightModel.prototype.getApprovalState = function(){
    var approval_state = 0;
    var all_approved = true;

    DV._.each(this.annotations, function(anno){ (anno.qc_approved_by != null)? approval_state = 1 : all_approved = false; });
    DV._.each(this.graphs, function(graph){ (graph.qc_approved_by != null)? approval_state = 1 : all_approved = false; });

    return (all_approved) ? 2: approval_state;
};


//Returns true if current content is duplicated in highlight; false otherwise
DV.HighlightModel.prototype.isCurrentContentDuplicated = function(){
    var currentContent = this.getCurrentHighlightContent().content;
    var dupes = _.filter(this.annotations, function(listAnno){
        return listAnno.id != currentContent.id && listAnno.title == currentContent.title && listAnno.text == currentContent.text;
    });
    return (dupes.length > 0);
}
