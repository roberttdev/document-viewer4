DV.Schema.events.ViewAnnotation = {
  next: function(e){
    var viewer              = this.viewer;
    var activeAnnotationId  = viewer.activeAnnotationId;
    var nextAnnotation      = (activeAnnotationId === null) ?
        viewer.schema.getFirstAnnotation() : viewer.schema.getNextAnnotation(activeAnnotationId);

    if (!nextAnnotation){
      return false;
    }

    viewer.pageSet.showAnnotation(nextAnnotation);
    this.helpers.setAnnotationPosition(nextAnnotation.position);


  },
  previous: function(e){
    var viewer              = this.viewer;
    var activeAnnotationId  = viewer.activeAnnotationId;

    var previousAnnotation = (!activeAnnotationId) ?
    viewer.schema.getFirstAnnotation() : viewer.schema.getPreviousAnnotation(activeAnnotationId);
    if (!previousAnnotation){
      return false;
    }

    viewer.pageSet.showAnnotation(previousAnnotation);
    this.helpers.setAnnotationPosition(previousAnnotation.position);


  },
  search: function(e){
    e.preventDefault();
    this.viewer.open('ViewSearch');

    return false;
  }
};