//#####################
//# Helpers for event handling
//#####################

DV._.extend(DV.Schema.helpers,{
    getViewFromEvent : function(e) {
        return this.getHighlightObject(this.viewer.$(e.target).closest(this.highlightClassName));
    },


    showHighlightEdit : function(e) {
        var highl = this.getViewFromEvent(e);
        highl.show({edit: true});
    },


    cancelHighlightEdit : function(e) {
        this.viewer.pageSet.cleanUp();
    },


    saveHighlight : function(e) {
        var highl = this.getViewFromEvent(e);
        if (!highl.model) return;

        var content = highl.model.getCurrentHighlightContent();
        content.type == 'graph' ? this.saveGraph(highl) : this.prepareForPointSave(highl);
    },


    cloneConfirm : function(e) {
        var highl = this.getViewFromEvent(e);
        if (!highl.model) return;

        this.viewer.fireCloneCallbacks(highl.model.assembleContentForDC());
    },


    saveGraph : function(highl){
        var graphData = this.viewer.$('.DV-graphData', highl.highlightEl).val();

        //Error checking
        if (graphData.length == 0) {
            this.viewer.$('.DV-errorMsg', highl.highlightEl).html(DV.t('graph_empty'));
            return;
        }

        var content = highl.model.assembleContentForDC();
        content.content.graph_json = this.viewer.$('.DV-graphData', highl.highlightEl).val();

        highl.highlightEl.removeClass('DV-editing');
        this.viewer.fireSaveCallbacks(content);
    },


    prepareForPointSave : function(highl){
        var _this = this;

        //Error checking
        if ($.trim(this.viewer.$('.DV-annotationTitleInput', highl.highlightEl).val()).length == 0) {
            this.viewer.$('.DV-annotationTitleInput', highl.highlightEl).addClass('error');
            this.viewer.$('.DV-errorMsg', highl.highlightEl).html(DV.t('no_title_error'));
            return;
        }

        //If multiple copies of annotation on highlight, find out if all should be updated
        if( highl.model.isCurrentContentDuplicated() ){
            $('#dupeAlert').dialog({
                modal: true,
                dialogClass: 'dv-dialog',
                height: 100,
                buttons: [
                    {
                        text: "Yes",
                        click: function() {
                            _this.saveDataPoint(highl, true);
                            $(this).dialog( "close" );
                        }
                    },
                    {
                        text: "No",
                        click: function() {
                            _this.saveDataPoint(highl, false);
                            $(this).dialog( "close" );
                        }
                    }
                ]
            });
        }else{
            //If no duplicates, just save normally
            _this.saveDataPoint(highl, false);
        }


    },


    saveDataPoint: function(highl, updateAll){
        var postToDC = highl.model.assembleContentForDC();
        postToDC.content.access                 = 'public';
        postToDC.content.author                 = postToDC.content.author || dc.account.name;
        postToDC.content.author_organization    = postToDC.content.author_organization || (dc.account.isReal && dc.account.organization.name);
        postToDC.content.content                = this.viewer.$('.DV-annotationTextArea', highl.highlightEl).val();
        postToDC.content.title                  = this.viewer.$('.DV-annotationTitleInput', highl.highlightEl).val();
        postToDC.content.unsaved                = false;
        postToDC.content.updateAll              = updateAll;

        this.viewer.fireSaveCallbacks(postToDC);
    }
});
