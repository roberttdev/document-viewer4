DV.GraphModel = function(argHash){
    //Set defaults
    this.access = 'public';
    this.graph_json = null;
    this.group_id = null;
    this.id = null;
    this.server_id = null;
    this.unsaved = argHash.id ? false : true;

    //Assign initial values
    this.set(argHash);
};


DV.GraphModel.prototype.get = function(property){
    return this[property];
};


//Supported params: displayIndex, id, location, server_id
DV.GraphModel.prototype.set = function(argHash){
    DV._.each(argHash, DV.jQuery.proxy(function(element, index){
        //Whitelist parameters
        if(['access','graph_json','group_id','id','server_id','unsaved'].indexOf(index) >= 0){
            this[index] = element;
        }

        //Special cases
        if(index == 'id') this.server_id = element;
        if(index == 'graph_json' && element) this.graph_json = JSON.parse(element);
    }, this));
};


//Assemble content structure for DC consumption
DV.GraphModel.prototype.assembleContentForDC = function(){
    return {
        access: this.access,
        graph_json: this.graph_json,
        group_id: this.group_id,
        id: this.id,
        server_id: this.server_id,
        unsaved: this.unsaved
    };
};
