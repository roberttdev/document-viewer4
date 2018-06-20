DV._.extend(DV.Schema.helpers, {
    // Set of bridges to access highlight methods

    getHighlightModel : function(annoEl) {
        var annoId = parseInt(annoEl.attr('data-id').match(/\d+/), 10);
        return this.viewer.schema.getHighlight(annoId);
    },

    // Return the highlight Object that connects with the element in the DOM
    getHighlightObject: function(highlight){
        var highlight    = this.viewer.$(highlight);
        var highlightId  = highlight.attr('id').replace(/DV\-highlight\-|DV\-listHighlight\-/,'');
        var pageId       = highlight.closest('div.DV-set').attr('data-id');

        for(var i = 0; (highlightObject = this.viewer.pageSet.pages[pageId].highlights[i]); i++){
            if(highlightObject.model.id == highlightId){
                // cleanup
                highlight = null;
                return highlightObject;
            }
        }

        return false;
    },

    // Toggle
    highlightBridgeToggle: function(e){
        e.preventDefault();
        var highlightObject = this.getHighlightObject(this.viewer.$(e.target).closest(this.highlightClassName));
        highlightObject.toggle();
    },

    // Show highlight
    highlightBridgeSelected: function(e){
        e.preventDefault();
        var highlightObject = this.getHighlightObject(this.viewer.$(e.target).closest(this.highlightClassName));
        this.viewer.fireSelectCallbacks(highlightObject.model.assembleContentForDC());
    },

    // Hide highlight
    highlightBridgeHide: function(e){
        e.preventDefault();
        var highlightObject = this.getHighlightObject(this.viewer.$(e.target).closest(this.highlightClassName));
        highlightObject.hide(true);
    },

    // Jump to the next highlight
    highlightBridgeNext: function(e){
        e.preventDefault();
        var highlightObject = this.getHighlightObject(this.viewer.$(e.target).closest(this.highlightClassName));
        highlightObject.next();
    },

    // Jump to the previous highlight
    highlightBridgePrevious: function(e){
        e.preventDefault();
        var highlightObject = this.getHighlightObject(this.viewer.$(e.target).closest(this.highlightClassName));
        highlightObject.previous();
    },

    // Update currentpage text to indicate current highlight
    setHighlightPosition: function(_position){
        this.elements.currentPage.text(_position);
    },

    // Update active highlight limits
    setActiveHighlightLimits: function(highlight){
        var highlight = (highlight) ? highlight : this.viewer.activeHighlight;

        if(!highlight || highlight == null){ return; }

        var elements  = this.elements;
        var aPage     = highlight.page;
        var aEl       = highlight.highlightEl;
        var aPosTop   = highlight.position.top * this.models.pages.zoomFactor();
        var _trackHighlight = this.events.trackHighlight;

        if(highlight.type === 'page'){
            _trackHighlight.h          = aEl.outerHeight()+aPage.getOffset();
            _trackHighlight.combined   = (aPage.getOffset()) - elements.window.height();
        }else{
            _trackHighlight.h          = aEl.height()+aPosTop-20+aPage.getOffset()+aPage.getPageNoteHeight();
            _trackHighlight.combined   = (aPosTop-20+aPage.getOffset()+aPage.getPageNoteHeight()) - elements.window.height();
        }
    }
});