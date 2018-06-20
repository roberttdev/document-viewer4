 // Renders the navigation sidebar for chapters and highlights.
DV._.extend(DV.Schema.helpers, {

  showHighlights : function() {
    if (this.viewer.options.showHighlights === false) return false;
    return DV._.size(this.viewer.schema.data.highlightsById) > 0;
  },

  renderViewer: function(){
    var doc         = this.viewer.schema.document;
    var pagesHTML   = this.constructPages();
    var description = (doc.description) ? doc.description : null;
    var storyURL = doc.resources.related_article;

    var headerHTML  = JST['DV/views/header']({
      options     : this.viewer.options,
      id          : doc.id,
      story_url   : storyURL,
      title       : doc.title || ''
    });
    var footerHTML = JST['DV/views/footer']({options : this.viewer.options});

    var pdfURL = doc.resources.pdf;
    pdfURL = pdfURL && this.viewer.options.pdf !== false ? '<a target="_blank" href="' + pdfURL + '">' + DV.t('original_document_pdf') + ' &raquo;</a>' : '';

    var contribs = doc.contributor && doc.contributor_organization &&
                   ('' + doc.contributor + ', '+ doc.contributor_organization);

    var showHighlights = this.showHighlights();
    var printNotesURL = (showHighlights) && doc.resources.print_highlights;

    var viewerOptions = {
      options : this.viewer.options,
      pages: pagesHTML,
      header: headerHTML,
      footer: footerHTML,
      pdf_url: pdfURL,
      contributors: contribs,
      story_url: storyURL,
      print_notes_url: printNotesURL,
      descriptionContainer: JST['DV/views/descriptionContainer']({ description: description}),
      autoZoom: this.viewer.options.zoom == 'auto',
      mini: false
    };

    var width  = this.viewer.options.width;
    var height = this.viewer.options.height;
    if (width && height) {
      if (width < 500) {
        this.viewer.options.mini = true;
        viewerOptions.mini = true;
      }
      DV.jQuery(this.viewer.options.container).css({
        position: 'relative',
        width: this.viewer.options.width,
        height: this.viewer.options.height
      });
    }

    var container = this.viewer.options.container;
    var containerEl = DV.jQuery(container);
    if (!containerEl.length) throw "Document Viewer container element not found: " + container; // TRANSLATE?
    if( this.viewer.options.layout == 'vertical' ){ containerEl.html(JST['DV/views/viewerVertical'](viewerOptions)); }
    else{ containerEl.html(JST['DV/views/viewerHorizontal'](viewerOptions)); }
  },

  // If there is no description, no navigation, and no sections, tighten up
  // the sidebar.
  displayNavigation : function() {
    var doc = this.viewer.schema.document;
    var missing = (!doc.description && !DV._.size(this.viewer.schema.data.highlightsById) && !this.viewer.schema.data.sections.length);
    this.viewer.$('.DV-supplemental').toggleClass('DV-noNavigation', missing);
  },

  renderSpecificPageCss : function() {
    var classes = [];
    for (var i = 1, l = this.models.document.totalPages; i <= l; i++) {
      classes.push('.DV-page-' + i + ' .DV-pageSpecific-' + i);
    }
    var css = classes.join(', ') + ' { display: block; }';
    var stylesheet = '<style type="text/css" media="all">\n' + css +'\n</style>';
    DV.jQuery("head").append(stylesheet);
  },

  renderNavigation : function() {
    var me = this;
    var chapterViews = [], bolds = [], expandIcons = [], expanded = [], navigationExpander = JST['DV/views/navigationExpander']({}),nav=[],notes = [],chapters = [];
    var boldsId = this.viewer.models.boldsId || (this.viewer.models.boldsId = parseInt(DV._.uniqueId()));

    /* ---------------------------------------------------- start the nav helper methods */
    var getAnnotionsByRange = function(rangeStart, rangeEnd){
      var highlights = [];
      for(var i = rangeStart, len = rangeEnd; i < len; i++){
        if(notes[i]){
          highlights.push(notes[i]);
          nav[i] = '';
        }
      }
      return highlights.join('');
    };

    var createChapter = function(chapter){
      var selectionRule = "#DV-selectedChapter-" + chapter.id + " #DV-chapter-" + chapter.id;

      bolds.push(selectionRule+" .DV-navChapterTitle");
      return (JST['DV/views/chapterNav'](chapter));
    };

    var createNavHighlights = function(highlightIndex){
      var renderedHighlights = [];
      var highlights = me.viewer.schema.data.highlightsByPage[highlightIndex];

      for (var j=0; j<highlights.length; j++) {
        var highlight = highlights[j];
        renderedHighlights.push(JST['DV/views/highlightNav'](highlight));
        bolds.push("#DV-selectedHighlight-" + highlight.id + " #DV-highlightMarker-" + highlight.id + " .DV-navHighlightTitle");
      }
      return renderedHighlights.join('');
    };
    /* ---------------------------------------------------- end the nav helper methods */

    if (this.showHighlights()) {
      for(var i = 0,len = this.models.document.totalPages; i < len;i++){
        if(this.viewer.schema.data.highlightsByPage[i]){
          nav[i]   = createNavHighlights(i);
          notes[i] = nav[i];
        }
      }
    }

    var sections = this.viewer.schema.data.sections;
    if (sections.length) {
      for (var i = 0; i < sections.length; i++) {
        var section        = sections[i];
        var nextSection    = sections[i + 1];
        section.id         = section.id || parseInt(DV._.uniqueId());
        section.pageNumber = section.page;
        section.endPage    = nextSection ? nextSection.page - 1 : this.viewer.schema.data.totalPages;
        var highlights    = getAnnotionsByRange(section.pageNumber - 1, section.endPage);

        if(highlights != '') {
          section.navigationExpander       = navigationExpander;
          section.navigationExpanderClass  = 'DV-hasChildren';
          section.noteViews                = highlights;
          nav[section.pageNumber - 1]      = createChapter(section);
        } else {
          section.navigationExpanderClass  = 'DV-noChildren';
          section.noteViews                = '';
          section.navigationExpander       = '';
          nav[section.pageNumber - 1]      = createChapter(section);
        }
      }
    }

    // insert and observe the nav
    var navigationView = nav.join('');

    var chaptersContainer = this.viewer.$('div.DV-chaptersContainer');
    chaptersContainer.html(navigationView);
    chaptersContainer.unbind('click').bind('click',this.events.compile('handleNavigation'));
    this.viewer.schema.data.sections.length || DV._.size(this.viewer.schema.data.highlightsById) ?
       chaptersContainer.show() : chaptersContainer.hide();
    this.displayNavigation();

    DV.jQuery('#DV-navigationBolds-' + boldsId, DV.jQuery("head")).remove();
    var boldsContents = bolds.join(", ") + ' { font-weight:bold; color:#000 !important; }';
    var navStylesheet = '<style id="DV-navigationBolds-' + boldsId + '" type="text/css" media="screen,print">\n' + boldsContents +'\n</style>';
    DV.jQuery("head").append(navStylesheet);
    chaptersContainer = null;
  },

  // Hide or show all of the components on the page that may or may not be
  // present, depending on what the document provides.
  renderComponents : function() {
    // Hide the overflow of the body, unless we're positioned.
    var containerEl = DV.jQuery(this.viewer.options.container);
    var position = containerEl.css('position');
    if (position != 'relative' && position != 'absolute' && !this.viewer.options.fixedSize) {
      //DV.jQuery("html, body").css({overflow : 'hidden'});
      // Hide the border, if we're a full-screen viewer in the body tag.
      if (containerEl.offset().top == 0) {
        this.viewer.elements.viewer.css({border: 0});
      }
    }

    // Hide and show navigation flags:
    var showHighlights = this.showHighlights();
    var showPages       = this.models.document.totalPages > 1;
    var showSearch      = (this.viewer.options.search !== false) &&
                          (this.viewer.options.text !== false) &&
                          (!this.viewer.options.width || this.viewer.options.width >= 540);
    var noFooter = (!showHighlights && !showPages && !showSearch && !this.viewer.options.sidebar);


    // Hide highlights, if there are none:
    var $highlightsView = this.viewer.$('.DV-highlightView');
    $highlightsView[showHighlights ? 'show' : 'hide']();

    // Hide the text tab, if it's disabled.
    if (showSearch) {
      this.elements.viewer.addClass('DV-searchable');
      this.viewer.$('input.DV-searchInput', containerEl).placeholder({
        message: 'Search',
        clearClassName: 'DV-searchInput-show-search-cancel'
      });
    } else {
      this.viewer.$('.DV-textView').hide();
    }

    // Hide the Pages tab if there is only 1 page in the document.
    if (!showPages) {
      this.viewer.$('.DV-thumbnailsView').hide();
    }

    // Hide the Documents tab if it's the only tab left.
    if (!showHighlights && !showPages && !showSearch) {
      this.viewer.$('.DV-views').hide();
    }

    this.viewer.api.roundTabCorners();

    // Hide the entire sidebar, if there are no highlights or sections.
    //var showChapters = this.models.chapters.chapters.length > 0;

    // Remove and re-render the nav controls.
    // Don't show the nav controls if there's no sidebar, and it's a one-page doc.
    this.viewer.$('.DV-navControls').remove();
    if (showPages || this.viewer.options.sidebar) {
      var navControls = JST['DV/views/navControls']({
        totalPages: this.viewer.schema.data.totalPages,
        totalHighlights: this.viewer.schema.data.totalHighlights
      });
      this.viewer.$('.DV-navControlsContainer').html(navControls);
    }
    this.viewer.$('.DV-fullscreenControl').remove();
    if (this.viewer.schema.document.canonicalURL) {
      var fullscreenControl = JST['DV/views/fullscreenControl']({});
      if (noFooter) {
        this.viewer.$('.DV-collapsibleControls').prepend(fullscreenControl);
        this.elements.viewer.addClass('DV-hideFooter');
      } else {
        this.viewer.$('.DV-fullscreenContainer').html(fullscreenControl);
      }
    }

    if (this.viewer.options.sidebar) {
      this.viewer.$('.DV-sidebar').show();
    }

    // Check if the zoom is showing, and if not, shorten the width of search
    DV._.defer(DV._.bind(function() {
      if ((this.elements.viewer.width() <= 700) && (showHighlights || showPages || showSearch)) {
        this.viewer.$('.DV-controls').addClass('DV-narrowControls');
      }
    }, this));

    // Set the currentPage element reference.
    this.elements.currentPage = this.viewer.$('span.DV-currentPage');
    this.models.document.setPageIndex(this.models.document.currentIndex());
  },

  // Reset the view state to a baseline, when transitioning between views.
  reset : function() {
    this.resetNavigationState();
    this.cleanUpSearch();
    this.viewer.pageSet.cleanUp();
    this.removeObserver('drawPages');
    this.viewer.dragReporter.unBind();
    this.elements.window.scrollTop(0);
  }

});
