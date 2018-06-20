DV._.extend(DV.Schema.helpers, {
  resetNavigationState: function(){
    var elements = this.elements;

    if (elements.navigation.length) elements.navigation[0].id = '';
  },
  setActiveChapter: function(chapterId){
    if (chapterId) this.elements.chaptersContainer.attr('id','DV-selectedChapter-'+chapterId);
  },
  setActiveHighlightInNav: function(highlightId){
    if(highlightId != null){
      this.elements.navigation.attr('id','DV-selectedHighlight-'+highlightId);
    }else{
      this.elements.navigation.attr('id','');
    }
  }
});
