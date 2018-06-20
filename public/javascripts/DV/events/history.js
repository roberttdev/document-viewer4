DV._.extend(DV.Schema.events, {

  // #document/p[pageID]
  handleHashChangeViewDocumentPage: function(page){
    var pageIndex = parseInt(page,10) - 1;
    if(this.viewer.state === 'ViewDocument'){
      this.viewer.pageSet.cleanUp();
      this.helpers.jump(pageIndex);
    }else{
      this.models.document.setPageIndex(pageIndex);
      this.viewer.open('ViewDocument');
    }
  },

  // #p[pageID]
  handleHashChangeLegacyViewDocumentPage: function(page){
    var pageIndex   = parseInt(page,10) - 1;
    this.handleHashChangeViewDocumentPage(page);
  },

  // #document/p[pageID]/a[highlightID]
  handleHashChangeViewDocumentHighlight: function(page,highlight){
    var pageIndex   = parseInt(page,10) - 1;
    var highlight  = parseInt(highlight,10);

    if(this.viewer.state === 'ViewDocument'){
      this.viewer.pageSet.showHighlight(this.viewer.schema.data.highlightsById[highlight]);
    }else{
      this.models.document.setPageIndex(pageIndex);
      this.viewer.pageSet.setActiveHighlight(highlight);
      this.viewer.openingHighlightFromHash = true;
      this.viewer.open('ViewDocument');
    }
  },

  // #highlight/a[highlightID]
  handleHashChangeViewHighlightHighlight: function(highlight){
    var highlight  = parseInt(highlight,10);
    var viewer = this.viewer;

    if(viewer.state === 'ViewHighlight'){
      viewer.pageSet.showHighlight(this.viewer.schema.data.highlightsById[highlight]);
    }else{
      viewer.activeHighlightId = highlight;
      this.viewer.open('ViewHighlight');
    }
  },

  // Default route if all else fails
  handleHashChangeDefault: function(){
    this.viewer.pageSet.cleanUp();
    this.models.document.setPageIndex(0);

    if(this.viewer.state === 'ViewDocument'){
      this.helpers.jump(0);
      // this.viewer.history.save('document/p1');
    }else{
      this.viewer.open('ViewDocument');
    }
  },

  // #text/p[pageID]
  handleHashChangeViewText: function(page){
    var pageIndex = parseInt(page,10) - 1;
    if(this.viewer.state === 'ViewText'){
      this.events.loadText(pageIndex);
    }else{
      this.models.document.setPageIndex(pageIndex);
      this.viewer.open('ViewText');
    }
  },

  handleHashChangeViewPages: function() {
    if (this.viewer.state == 'ViewThumbnails') return;
    this.viewer.open('ViewThumbnails');
  },

  // #search/[searchString]
  handleHashChangeViewSearchRequest: function(page,query){
    var pageIndex = parseInt(page,10) - 1;
    this.elements.searchInput.val(decodeURIComponent(query));

    if(this.viewer.state !== 'ViewSearch'){
      this.models.document.setPageIndex(pageIndex);
    }
    this.viewer.open('ViewSearch');
  },

  // #entity/p[pageID]/[searchString]/[offset]:[length]
  handleHashChangeViewEntity: function(page, name, offset, length) {
    page = parseInt(page,10) - 1;
    name = decodeURIComponent(name);
    this.elements.searchInput.val(name);
    this.models.document.setPageIndex(page);
    this.states.ViewEntity(name, parseInt(offset, 10), parseInt(length, 10));
  }
});
