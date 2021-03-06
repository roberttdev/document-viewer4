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

    if($.trim(anno.title).length==0){
        this.viewer.$('.DV-annotationTitleInput', annoEl).addClass('error');
        this.viewer.$('.DV-errorMsg', annoEl).html(DV.t('no_title_error'));
        return;
    }

    anno.text                = this.viewer.$('.DV-annotationTextArea', annoEl).val();
    anno.unsaved             = false;
    anno.owns_note           = anno.owns_note;
    anno.author              = anno.author || dc.account.name;
    anno.author_organization = anno.author_organization || (dc.account.isReal && dc.account.organization.name);

    if (target.hasClass('DV-saveAnnotationDraft'))  anno.access = 'exclusive';
    else if (annoEl.hasClass('DV-accessExclusive')) anno.access = 'public';

    annoEl.removeClass('DV-editing');
    this.viewer.fireSaveCallbacks(anno);

    this.viewer.pageSet.refreshPageAnnotation(anno);
  }

});
