DV.GraphView = function(highlViewRef, graphModel){
    this.highlight   = highlViewRef;
    this.model       = graphModel;
};


// Receives an argHash with external data about the highlight container/context
DV.GraphView.prototype.render = function(argHash){
    argHash.graph_json = _.escape(JSON.stringify(this.model.get('graph_json')));
    argHash.owns_note = this.model.get('owns_note');

    var returnHTML = JST['DV/views/graph'](argHash);
    return returnHTML;
},


DV.GraphView.prototype.showEdit = function(){
    this.highlight.model.get('image_link') ? this.showGraphEditor() :  this.processImage();
},


DV.GraphView.prototype.initWPD = function(){
    //If wpd loaded, run init -- if not, it's already loading, so wait and try again
    if(typeof(wpd) != 'undefined'){
        wpd.iframe_api.setParentMsgFunction(this.highlight.viewer.wpd_api.receiveMessage.bind(this.highlight.viewer.wpd_api));
        wpd.initApp(true, this.highlight.model.get('image_link'), this.model.get('graph_json'), $(this.highlight.highlightEl).find('#graph_frame'), !this.model.get('owns_note'));
    }else{
        //If not loaded, try again in 1 second
        setTimeout(this.initWPD.bind(this), 1000);
    }
};


DV.GraphView.prototype.setWPDJSON = function(json){
    this.highlight.highlightEl.find('.DV-graphData').val(json);
};


//Show WPD
DV.GraphView.prototype.showGraphEditor = function(){
    var _thisView = this;
    var frame = this.highlight.highlightEl.find('#graph_frame')[0];
    this.highlight.viewer.wpd_api.setActiveAnnoView(this);

    //Grab height of image being sent to WPD, use it to set height of anno window
    var _width, _height;
    $("<img/>").attr("src", _thisView.highlight.model.get('image_link')).load(function() {
        var frame_height = this.height > 475 ? this.height : 475;
        $(frame).height(frame_height);

        if( !DV.WPD_loaded ){
            //If WPD JS isn't loaded, load and initialize
            var script = document.createElement('script');
            script.src = '/viewer/WPD/combined-compiled.js';
            script.onload = function(){
                $(frame).html(JST['WPD/wpd']);
                _thisView.initWPD();
            }
            document.body.appendChild(script);
            DV.WPD_loaded = true;
        }else {
            $(frame).html(JST['WPD/wpd']);
            _thisView.initWPD();
        }
    });
};


//Provide loading message and generate cropped image based on annotation selection
DV.GraphView.prototype.processImage = function(){
    var _thisView = this;
    this.highlight.highlightEl.find('#graph_frame').html(JST['DV/views/generatingImage']);

    //Convert anno parameters to ratios for image crop
    var pageModel               = this.highlight.viewer.models.pages;
    var imageWidth              = pageModel.width;
    var imageHeight             = Math.round(pageModel.height * pageModel.zoomFactor());

    var img_json = {};
    img_json['x_ratio'] = this.highlight.model.get('x1') / imageWidth;
    img_json['y_ratio'] = this.highlight.model.get('y1') / imageHeight;
    img_json['w_ratio'] = (this.highlight.model.get('x2') - this.highlight.model.get('x1')) / imageWidth;
    img_json['h_ratio'] = (this.highlight.model.get('y2') - this.highlight.model.get('y1')) / imageHeight;

    //Determine name of large image
    var image_url = this.highlight.page.getPageImageURL();
    img_json['img_name'] = image_url.substring(0, image_url.lastIndexOf("-")) + '-large' + image_url.substring(image_url.lastIndexOf("."), image_url.length);
    img_json['img_name']= img_json['img_name'].substring(0, img_json['img_name'].lastIndexOf("?") );

    DV.jQuery.ajax({
        url: DV.img_slice_link,
        type: 'POST',
        data: img_json,
        dataType: 'json',
        success: function(resp){
            _thisView.highlight.model.set({image_link: resp.filename});
            _thisView.showGraphEditor();
        },
        failure: function(){
            alert('Image generation failed!');
        }
    });
};


//Return whether the graph info has changed from what's in the model
DV.GraphView.prototype.hasChanged = function() {
    var compareJSON = this.model.get('graph_json') == null ? "" : JSON.stringify(this.model.get('graph_json'));
    return this.highlight.highlightEl.hasClass('DV-editing') && (_.unescape(this.highlight.highlightEl.find('.DV-graphData').val()) != compareJSON);
};