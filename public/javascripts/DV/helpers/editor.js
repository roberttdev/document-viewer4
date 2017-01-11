DV._.extend(DV.Schema.helpers,{
  showAnnotationEdit : function(e) {
    var annoEl = this.viewer.$(e.target).closest(this.annotationClassName);
    var area   = this.viewer.$('.DV-annotationTextArea', annoEl);
    annoEl.addClass('DV-editing');
    area.focus();
  },
  cancelAnnotationEdit : function(e) {
    var annoEl = this.viewer.$(e.target).closest(this.annotationClassName);
    var anno   = this.getAnnotationModel(annoEl);
    this.viewer.$('.DV-annotationTitleInput', annoEl).val(anno.title);
    this.viewer.$('.DV-annotationTextArea', annoEl).val(anno.text);
    if (anno.unsaved) {
      (anno.groupCount > 0) ? this.viewer.schema.removeAnnotationGroup(anno, anno.groups[anno.groupIndex - 1].group_id) : this.viewer.schema.removeAnnotation(anno);
      this.viewer.pageSet.removePageAnnotation(anno);
    } else {
      annoEl.removeClass('DV-editing');
    }
    this.viewer.fireCancelCallbacks(anno);
  },
  saveAnnotation : function(e, option) {
    var target = this.viewer.$(e.target);
    var annoEl = target.closest(this.annotationClassName);
    var anno   = this.getAnnotationModel(annoEl);
    if (!anno) return;
    anno.title     = this.viewer.$('.DV-annotationTitleInput', annoEl).val();

    //For data points, error if no title
    if(anno.anno_type != 'graph') {
      if ($.trim(anno.title).length == 0) {
        this.viewer.$('.DV-annotationTitleInput', annoEl).addClass('error');
        this.viewer.$('.DV-errorMsg', annoEl).html(DV.t('no_title_error'));
        return;
      }
    }

    //For graphs, make sure data was exported
    if(anno.anno_type == 'graph' && $(annoEl).find('.status_unsaved').length != 0){
      this.viewer.$('.DV-data_error', annoEl).html(DV.t('unsaved_data_error'));
      this.viewer.$('.DV-data_status_div', annoEl).addClass('error');
      return;
    }

    anno.text                = this.viewer.$('.DV-annotationTextArea', annoEl).val();
    anno.unsaved             = false;
    anno.owns_note           = anno.owns_note;
    anno.author              = anno.author || dc.account.name;
    anno.author_organization = anno.author_organization || (dc.account.isReal && dc.account.organization.name);
    anno.graph_json          = anno.anno_type == 'graph' ? this.viewer.$('#graph-data', annoEl).val() : null;

    if (target.hasClass('DV-saveAnnotationDraft'))  anno.access = 'exclusive';
    else if (annoEl.hasClass('DV-accessExclusive')) anno.access = 'public';

    annoEl.removeClass('DV-editing');
    this.viewer.fireSaveCallbacks(anno);

    this.viewer.pageSet.refreshPageAnnotation(anno);
  }

});
