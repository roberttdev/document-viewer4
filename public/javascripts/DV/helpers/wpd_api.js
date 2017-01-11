/*
  Usage:  Use as a singleton.  Set the anno view that is currently being displayed with WPD in it,
  and send/receive messages as necessary
 */

DV.WPD_API = function(){
  this.current_anno_view = null;
  window.addEventListener('message', $.proxy(this.receiveMessage, this));
};

DV.WPD_API.prototype.setActiveAnnoView = function(currentView){
  this.current_anno_view = currentView;
};

DV.WPD_API.prototype.sendMessage = function(message){
  var iframe = this.current_anno_view.getIframe();
  iframe.contentWindow.postMessage(message, DV.wpd_link);
};

//Take message passed and translate into proper function calls
DV.WPD_API.prototype.receiveMessage = function(e) {
  var message = e.data;

  switch(message.name) {
    case 'exportJSON': {
      //Receive graph data JSON
      //data: graph data JSON
      this.current_anno_view.setWPDJSON(JSON.parse(message.data));
      break;
    }
    case 'dataChange': {
      //Update annotation to reflect that WPD data has changed
      this.current_anno_view.updateDataStatus(false);
      break;
    }

    default: {
      alert('Error: WPD API call not recognized');
    }
  }
};

