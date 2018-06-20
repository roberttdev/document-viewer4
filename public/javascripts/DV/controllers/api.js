// The API references it's viewer.
DV.Api = function(viewer) {
  this.viewer = viewer;
};

// Set up the API class.
DV.Api.prototype = {

  // Return the current page of the document.
  currentPage : function() {
    return this.viewer.models.document.currentPage();
  },

  // Set the current page of the document.
  setCurrentPage : function(page) {
    this.viewer.helpers.jump(page - 1);
  },

  // Register a callback for when the page is changed.
  onPageChange : function(callback) {
    this.viewer.models.document.onPageChangeCallbacks.push(callback);
  },

  // Return the page number for one of the three physical page DOM elements, by id:
  getPageNumberForId : function(id) {
    var page = this.viewer.pageSet.pages[id];
    return page.index + 1;
  },

  // Get the document's canonical schema
  getSchema : function() {
    return this.viewer.schema.document;
  },

  // Get the document's canonical ID.
  getId : function() {
    return this.viewer.schema.document.id;
  },

  // Get the document's numerical ID.
  getModelId : function() {
    return parseInt(this.getId(), 10);
  },

  // Return the current zoom factor of the document relative to the base zoom.
  relativeZoom : function() {
    return this.viewer.models.pages.zoomFactor();
  },

  // Return the total number of pages in the document.
  numberOfPages : function() {
    return this.viewer.models.document.totalPages;
  },

  // Return the name of the contributor, if available.
  getContributor : function() {
    return this.viewer.schema.document.contributor;
  },

  // Return the name of the contributing organization, if available.
  getContributorOrganization : function() {
    return this.viewer.schema.document.contributor_organization;
  },

  // Change the documents' sections, re-rendering the navigation. "sections"
  // should be an array of sections in the canonical format:
  // {title: "Chapter 1", pages: "1-12"}
  setSections : function(sections) {
    sections = DV._.sortBy(sections, function(s){ return s.page; });
    this.viewer.schema.data.sections = sections;
    this.viewer.models.chapters.loadChapters();
    this.redraw();
  },

  // Get a list of every section in the document.
  getSections : function() {
    return DV._.clone(this.viewer.schema.data.sections || []);
  },

  // Get the document's description.
  getDescription : function() {
    return this.viewer.schema.document.description;
  },

  // Set the document's description and update the sidebar.
  setDescription : function(desc) {
    this.viewer.schema.document.description = desc;
    this.viewer.$('.DV-description').remove();
    this.viewer.$('.DV-navigation').prepend(JST['DV/views/descriptionContainer']({description: desc}));
    this.viewer.helpers.displayNavigation();
  },

  // Get the document's related article url.
  getRelatedArticle : function() {
    return this.viewer.schema.document.resources.related_article;
  },

  // Set the document's related article url.
  setRelatedArticle : function(url) {
    this.viewer.schema.document.resources.related_article = url;
    this.viewer.$('.DV-storyLink a').attr({href : url});
    this.viewer.$('.DV-storyLink').toggle(!!url);
  },

  // Get the document's published url.
  getPublishedUrl : function() {
    return this.viewer.schema.document.resources.published_url;
  },

  // Set the document's published url.
  setPublishedUrl : function(url) {
    this.viewer.schema.document.resources.published_url = url;
  },

  // Get the document's title.
  getTitle : function() {
    return this.viewer.schema.document.title;
  },

  // Set the document's title.
  setTitle : function(title) {
    this.viewer.schema.document.title = title;
    document.title = title;
  },

  getSource : function() {
    return this.viewer.schema.document.source;
  },

  setSource : function(source) {
    this.viewer.schema.document.source = source;
  },

  getPageText : function(pageNumber) {
    return this.viewer.schema.text[pageNumber - 1];
  },

  // Set the page text for the given page of a document in the local cache.
  setPageText : function(text, pageNumber) {
    this.viewer.schema.text[pageNumber - 1] = text;
  },

  // Reset all modified page text to the original values from the server cache.
  resetPageText : function(overwriteOriginal) {
    var self = this;
    var pageText = this.viewer.schema.text;
    if (overwriteOriginal) {
      this.viewer.models.document.originalPageText = {};
    } else {
      DV._.each(this.viewer.models.document.originalPageText, function(originalPageText, pageNumber) {
        pageNumber = parseInt(pageNumber, 10);
        if (originalPageText != pageText[pageNumber-1]) {
          self.setPageText(originalPageText, pageNumber);
          if (pageNumber == self.currentPage()) {
            self.viewer.events.loadText();
          }
        }
      });
    }
    if (this.viewer.openEditor == 'editText') {
      this.viewer.$('.DV-textContents').attr('contentEditable', true).addClass('DV-editing');
    }
  },

  getHighlightsByPageIndex : function(idx) {
    return this.viewer.schema.getHighlightsByPage(idx);
  },

  getHighlight : function(aid) {
    return this.viewer.schema.getHighlight(aid);
  },

  // Add a new highlight to the document, prefilled to any extent.
  addHighlight : function(highl) {
    highl = this.viewer.schema.loadHighlight(highl);
    this.viewer.pageSet.addHighlight(highl);
    var highlightHash = {highlight_id: highl.id};
    ('annotations' in highl && highl.annotations.length > 0) ? highlightHash['anno_id'] = highl.annotations[0].server_id : highlightHash['graph_id'] = highl.graphs[0].server_id;
    this.viewer.pageSet.showHighlight(highlightHash, {active: true, edit : true});
    return highl;
  },

  //Add more content to existing highlight
  addContentToHighlight: function(highlightId, new_content, showEdit){
      highl = this.viewer.schema.findHighlight({id: highlightId });
      this.viewer.schema.addHighlightContent(highl, new_content);
      this.viewer.pageSet.refreshHighlight(highl, true, showEdit);
  },

  // Find highlight and make it the active one
  selectHighlight: function(highlightInfo, showEdit) {
      this.viewer.schema.setActiveContent(highlightInfo);
      this.viewer.pageSet.showHighlight(highlightInfo, {active: true, edit : showEdit, callbacks: false});
  },

  // Remove highlight/group relationship (and highlight if no relationships left)
  deleteHighlight: function(highlightInfo) {
      highl = this.viewer.schema.findHighlight({id: highlightInfo.highlight_id });

      if ( this.viewer.schema.removeHighlightContent(highl, highlightInfo) ) {
        this.viewer.pageSet.removeHighlight(highl);
      }else{
        this.viewer.pageSet.refreshHighlight(highl, false, false);
      }
  },

  //Set autocomplete recommendations
  setRecommendations: function(recArray) {
    this.viewer.schema.setRecommendations(recArray);
  },

  //Populate highlight(s) with updated data from DC client
  syncHighlights: function(highlightInfo) {
      var _this = this;
      _this.viewer.schema.syncHighlight(highlightInfo);
      this.viewer.activeHighlight.highlightEl.removeClass('DV-editing');
      this.viewer.pageSet.refreshHighlight(this.viewer.activeHighlight.model, true, false);
  },

  //Request current highlight to display/hide clone confirm buttons
  requestCloneConfirm: function(setTo) {
      this.viewer.activeHighlight.setCloneConfirm(setTo);
  },

  //Reload current highlights store with passed in highlights
  reloadHighlights: function(annos){
      this.viewer.schema.reloadHighlights(annos);
      this.viewer.pageSet.redraw(true, true);
  },

  // Register a callback for when an highlight is saved.
  onHighlightSave : function(callback) {
    this.viewer.saveCallbacks.push(callback);
  },

  // Register a callback for when an highlight is deleted.
  onHighlightDelete : function(callback) {
    this.viewer.deleteCallbacks.push(callback);
  },

  // Register a callback for when an highlight is deleted.
  onHighlightSelect : function(callback) {
    this.viewer.selectCallbacks.push(callback);
  },

  // Register a callback for when annotating is cancelled.
  onHighlightCancel : function(callback) {
    this.viewer.cancelCallbacks.push(callback);
  },

  // Register a callback for when a clone is confirmed.
  onCloneConfirm : function(callback) {
      this.viewer.cloneCallbacks.push(callback);
  },

  setConfirmStateChange : function(callback) {
    this.viewer.confirmStateChange = callback;
  },

  onChangeState : function(callback) {
    this.viewer.onStateChangeCallbacks.push(callback);
  },

  getState : function() {
    return this.viewer.state;
  },

  // set the state. This takes "ViewDocument," "ViewThumbnails", "ViewText"
  setState : function(state) {
    this.viewer.open(state);
  },

  resetRemovedPages : function() {
    this.viewer.models.document.resetRemovedPages();
  },

  addPageToRemovedPages : function(page) {
    this.viewer.models.document.addPageToRemovedPages(page);
  },

  removePageFromRemovedPages : function(page) {
    this.viewer.models.document.removePageFromRemovedPages(page);
  },

  resetReorderedPages : function() {
    this.viewer.models.document.redrawReorderedPages();
  },

  reorderPages : function(pageOrder, options) {
    var model = this.getModelId();
    this.viewer.models.document.reorderPages(model, pageOrder, options);
  },

  // Request the loading of an external JS file.
  loadJS : function(url, callback) {
    DV.jQuery.getScript(url, callback);
  },

  // Set first/last styles for tabs.
  roundTabCorners : function() {
    var tabs = this.viewer.$('.DV-views > div:visible');
    tabs.first().addClass('DV-first');
    tabs.last().addClass('DV-last');
  },

  // Register hooks into DV's hash history
  registerHashListener : function(matcher, callback) {
    this.viewer.history.register(matcher, callback);
  },

  // Clobber DV's existing history hooks
  clearHashListeners : function() {
    this.viewer.history.defaultCallback = null;
    this.viewer.history.handlers = [];
  },

  // Unload the viewer.
  unload: function(viewer) {
    this.viewer.helpers.unbindEvents();
    DV.jQuery('.DV-docViewer', this.viewer.options.container).remove();
    this.viewer.helpers.stopCheckTimer();
    delete DV.viewers[this.viewer.schema.document.id];
  },

  //Request to abandon current active highlight (hide or remove); call success if request succeeds (i.e. not user cancelled)
  cleanUp: function(success) {
    this.viewer.pageSet.cleanUp(success);
  },


  //Activate/deactivate 'approved' view for anno (temporary, data does not update)
  markApproval: function(anno_id, group_id, approval) {
      var anno = this.viewer.schema.markApproval(anno_id, group_id, approval);
      this.viewer.pageSet.refreshHighlight(anno, group_id, false);
  },

  // ---------------------- Enter/Leave Edit Modes -----------------------------

  enterRemovePagesMode : function() {
    this.viewer.openEditor = 'removePages';
  },

  leaveRemovePagesMode : function() {
    this.viewer.openEditor = null;
  },

  enterAddPagesMode : function() {
    this.viewer.openEditor = 'addPages';
  },

  leaveAddPagesMode : function() {
    this.viewer.openEditor = null;
  },

  enterReplacePagesMode : function() {
    this.viewer.openEditor = 'replacePages';
  },

  leaveReplacePagesMode : function() {
    this.viewer.openEditor = null;
  },

  enterReorderPagesMode : function() {
    this.viewer.openEditor = 'reorderPages';
    this.viewer.elements.viewer.addClass('DV-reorderPages');
  },

  leaveReorderPagesMode : function() {
    this.resetReorderedPages();
    this.viewer.openEditor = null;
    this.viewer.elements.viewer.removeClass('DV-reorderPages');
  },

  enterEditPageTextMode : function() {
    this.viewer.openEditor = 'editText';
    this.viewer.events.loadText();
  },

  leaveEditPageTextMode : function() {
    this.viewer.openEditor = null;
    this.resetPageText();
  }

};
