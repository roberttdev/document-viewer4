// The Pages model represents the set of pages in the document, containing the
// image sources for each page, and the page proportions.
DV.model.Pages = function(viewer) {
  this.viewer     = viewer;

  // Rolling average page height.
  this.averageHeight   = 0;

  // Real page note heights.
  this.pageNoteHeights = [];

  // In pixels.
  this.NORMAL_WIDTH      = 700;
  this.NORMAL_HEIGHT     = 906;

  // For viewing page text.
  this.DEFAULT_PADDING = 100;

  // Embed reduces padding.
  this.REDUCED_PADDING = 44;

  // Mini padding, when < 500 px wide.
  this.MINI_PADDING    = 18;

  this.zoomLevel  = this.viewer.models.document.zoomLevel;
  this.imageWidth  = this.NORMAL_WIDTH;
  this.imageHeight = this.NORMAL_HEIGHT;
  this.width      = Math.round(this.zoomLevel);
  this.height     = Math.round(this.width * (this.NORMAL_HEIGHT/this.NORMAL_WIDTH));
  this.numPagesLoaded = 0;
};

DV.model.Pages.prototype = {

  // Get the complete image URL for a particular page.
  imageURL: function(index) {
    var url  = this.viewer.schema.document.resources.page.image;
    var size = this.zoomLevel > this.NORMAL_WIDTH ? 'large' : 'normal';
    var pageNumber = index + 1;
    if (this.viewer.schema.document.resources.page.zeropad) pageNumber = this.zeroPad(pageNumber, 5);
    url = url.replace(/\{size\}/, size);
    url = url.replace(/\{page\}/, pageNumber);
    return url;
  },

  zeroPad : function(num, count) {
    var string = num.toString();
    while (string.length < count) string = '0' + string;
    return string;
  },

  // Return the appropriate padding for the size of the viewer.
  getPadding: function() {
    if (this.viewer.options.mini) {
      return this.MINI_PADDING;
    } else if (this.viewer.options.zoom == 'auto') {
      return this.REDUCED_PADDING;
    } else {
      return this.DEFAULT_PADDING;
    }
  },

  // The zoom factor is the ratio of the current page width to the baseline width.
  zoomFactor : function() {
    return this.zoomLevel / this.NORMAL_WIDTH;
  },

  // Resize or zoom the pages width and height.
  resize : function(zoomLevel) {
    var padding = this.viewer.models.pages.DEFAULT_PADDING;

    if (zoomLevel) {
      if (zoomLevel == this.zoomLevel) return;
      this.zoomLevel      = zoomLevel || this.zoomLevel;
      this.width          = Math.round(this.zoomLevel);
      this.height         = Math.round(this.width * (this.NORMAL_HEIGHT/this.NORMAL_WIDTH));
    }

    this.viewer.elements.sets.width(this.zoomLevel);
    this.viewer.elements.collection.css({width : this.width + padding });
    this.viewer.$('.DV-textContents').css({'font-size' : this.zoomLevel * 0.02 + 'px'});
  },

  // Update the height for a page, when its real image has loaded.
  updateHeight: function(image, pageIndex) {
    this.imageWidth = image.width;
    this.imageHeight = image.height;

    this.viewer.models.document.computeOffsets();
    this.viewer.pageSet.simpleReflowPages();
  },

  // get the real page height
  getPageHeight: function(pageIndex) {
    return this.height;
  }

};
