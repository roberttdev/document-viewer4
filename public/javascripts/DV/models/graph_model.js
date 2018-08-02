DV.GraphModel = function(argHash){
    //Set defaults
    this.access = 'public';
    this.account_id = null;
    this.approved = false;
    this.based_on = null;
    this.graph_json = null;
    this.group_id = null;
    this.id = null;
    this.owns_note = true;
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
        if(['access','account_id','approved','based_on','graph_json','group_id','id','owns_note','server_id','unsaved'].indexOf(index) >= 0){
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
        account_id: this.account_id,
        graph_json: this.graph_json,
        group_id: this.group_id,
        id: this.id,
        server_id: this.server_id,
        unsaved: this.unsaved
    };
};
