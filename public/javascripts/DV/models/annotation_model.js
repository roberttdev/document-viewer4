DV.AnnotationModel = function(argHash){
    //Set defaults
    this.access = 'public';
    this.account_id = null;
    this.group_id = null;
    this.id = null;
    this.match_id = null;
    this.owns_note = true;
    this.server_id = null;
    this.text = '';
    this.title = '';
    this.unsaved = argHash.id ? false : true;

    //Assign initial values
    this.set(argHash);
};


DV.AnnotationModel.prototype.get = function(property){
    return this[property];
};


//Supported params: displayIndex, id, location, server_id
DV.AnnotationModel.prototype.set = function(argHash){
    DV._.each(argHash, DV.jQuery.proxy(function(element, index){
        //Whitelist parameters
        if(['access','account_id','group_id','id','match_id','owns_note','server_id','text','title','unsaved'].indexOf(index) >= 0){
            this[index] = element;
        }

        //Special cases
        if(index == 'id') this.server_id = element;
        if(index == 'content') this.text = element ? element : '';
        if((index == 'title' || index == 'text') && !(element)) this[index] = '';
    }, this));
};


//Assemble content structure for DC consumption
DV.AnnotationModel.prototype.assembleContentForDC = function(){
    return {
        access: this.access,
        account_id: this.account_id,
        content: this.text,
        group_id: this.group_id,
        id: this.id,
        match_id: this.match_id,
        title: this.title,
        server_id: this.server_id,
        unsaved: this.unsaved
    };
};
