DV.Schema.events.ViewHighlight = {
  next: function(e){
    var viewer              = this.viewer;
    var activeHighlightId  = viewer.activeHighlightId;
    var nextHighlight      = (activeHighlightId === null) ?
        viewer.schema.getFirstHighlight() : viewer.schema.getNextHighlight(activeHighlightId);

    if (!nextHighlight){
      return false;
    }

    viewer.pageSet.showHighlight(nextHighlight);
    this.helpers.setHighlightPosition(nextHighlight.position);


  },
  previous: function(e){
    var viewer              = this.viewer;
    var activeHighlightId  = viewer.activeHighlightId;

    var previousHighlight = (!activeHighlightId) ?
    viewer.schema.getFirstHighlight() : viewer.schema.getPreviousHighlight(activeHighlightId);
    if (!previousHighlight){
      return false;
    }

    viewer.pageSet.showHighlight(previousHighlight);
    this.helpers.setHighlightPosition(previousHighlight.position);


  },
  search: function(e){
    e.preventDefault();
    this.viewer.open('ViewSearch');

    return false;
  }
};