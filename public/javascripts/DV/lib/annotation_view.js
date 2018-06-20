DV.AnnotationView = function(highlViewRef, annoModel){
    this.highlight   = highlViewRef;
    this.model       = annoModel;
};

// Render an Annotation model to HTML
// Receives an argHash with external data about the highlight container/context
DV.AnnotationView.prototype.render = function(argHash){
    var pageModel = this.highlight.viewer.models.pages;

    argHash.imageWidth          = pageModel.width;
    argHash.imageHeight         = Math.round(pageModel.height * pageModel.zoomFactor());
    argHash.author              = this.model.get('author') || "";
    argHash.author_organization = this.model.get('author_organization') || "";
    argHash.image               = pageModel.imageURL(this.highlight.page.pageNumber - 1);
    argHash.imageTop            = argHash.top + 6;
    argHash.title               = this.model.get('title');
    argHash.text                = this.model.get('text');

    var returnHTML = JST['DV/views/annotation'](argHash);
    if( this.highlight.viewer.schema.recommendations ){
        $('.DV-annotationTitleInput', this.highlight.highlightEl).autocomplete({source: this.highlight.viewer.schema.recommendations});
    }

    return returnHTML;
},


// Show edit controls
DV.AnnotationView.prototype.showEdit = function() {
    if( this.highlight.viewer.$('.DV-annotationTitleInput', this.highlight.highlightEl).val() ) {
        this.highlight.viewer.$('.DV-annotationTextArea', this.highlight.highlightEl).focus();
    }else{
        this.highlight.viewer.$('.DV-annotationTitleInput', this.highlight.highlightEl).focus();
    }
};


//Return whether the anno info has changed from what's in the model
DV.AnnotationView.prototype.hasChanged = function() {
    var compareTitle = this.model.get('title') == null ? "" : this.model.get('title');
    var compareText = this.model.get('text') == null ? "" : this.model.get('text');
    return this.highlight.highlightEl.hasClass('DV-editing') && (this.highlight.highlightEl.find('.DV-annotationTitleInput ').val() != compareTitle || this.highlight.highlightEl.find('.DV-annotationTextArea').val() != compareText);
};

