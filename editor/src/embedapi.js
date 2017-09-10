function SvgEditorEmbedded(frame){
  //initialize communication
  this.frame = frame;
  //this.stack = [] //callback stack
  this.callbacks = {}; //successor to stack
  this.encode = SvgEditorEmbedded.encode;
  //List of functions extracted with this:
  //Run in firebug on http://svg-edit.googlecode.com/svn/trunk/docs/files/svgcanvas-js.html

  //for(var i=0,q=[],f = document.querySelectorAll("div.CFunction h3.CTitle a");i<f.length;i++){q.push(f[i].name)};q
  //var functions = ["clearSelection", "addToSelection", "removeFromSelection", "open", "save", "getSvgString", "setSvgString",
  //"createLayer", "deleteCurrentLayer", "setCurrentLayer", "renameCurrentLayer", "setCurrentLayerPosition", "setLayerVisibility",
  //"moveSelectedToLayer", "clear"];


  //Newer, well, it extracts things that aren't documented as well. All functions accessible through the normal thingy can now be accessed though the API
  //var l=[];for(var i in svgCanvas){if(typeof svgCanvas[i] == "function"){l.push(i)}};
  //run in svgedit itself
  var functions = ["updateElementFromJson", "embedImage", "fixOperaXML", "clearSelection", "addToSelection",
    "removeFromSelection", "addNodeToSelection", "open", "save", "getSvgString", "setSvgString", "createLayer",
    "deleteCurrentLayer", "getCurrentDrawing", "setCurrentLayer", "renameCurrentLayer", "setCurrentLayerPosition",
    "setLayerVisibility", "moveSelectedToLayer", "clear", "clearPath", "getNodePoint", "clonePathNode", "deletePathNode",
    "getResolution", "getImageTitle", "setImageTitle", "setResolution", "setBBoxZoom", "setZoom", "getMode", "setMode",
    "getStrokeColor", "setStrokeColor", "getFillColor", "setFillColor", "setStrokePaint", "setFillPaint", "getStrokeWidth",
    "setStrokeWidth", "getStrokeStyle", "setStrokeStyle", "getOpacity", "setOpacity", "getFillOpacity", "setFillOpacity",
    "getStrokeOpacity", "setStrokeOpacity", "getTransformList", "getBBox", "getRotationAngle", "setRotationAngle", "each",
    "bind", "setIdPrefix", "getBold", "setBold", "getItalic", "setItalic", "getFontFamily", "setFontFamily", "getFontSize",
    "setFontSize", "getText", "setTextContent", "setImageURL", "setRectRadius", "setSegType", "quickClone",
    "changeSelectedAttributeNoUndo", "changeSelectedAttribute", "deleteSelectedElements", "groupSelectedElements",
    "ungroupSelectedElement", "moveToTopSelectedElement", "moveToBottomSelectedElement", "moveSelectedElements",
    "getStrokedBBox", "getVisibleElements", "cycleElement", "getUndoStackSize", "getRedoStackSize", "getNextUndoCommandText",
    "getNextRedoCommandText", "undo", "redo", "cloneSelectedElements", "alignSelectedElements", "getZoom", "getVersion",
    "setIconSize", "setLang", "setCustomHandlers"];

  //TODO: rewrite the following, it's pretty scary.
  for(var i = 0; i < functions.length; i++){
    this[functions[i]] = (function(d){
      return function(){
        var t = this //new callback
        for(var g = 0, args = []; g < arguments.length; g++){
          args.push(arguments[g]);
        }
        var cbid = t.send(d,args, function(){})  //the callback (currently it's nothing, but will be set later

        return function(newcallback){
          t.callbacks[cbid] = newcallback; //set callback
        }
      }
    })(functions[i])
  }
  //TODO: use AddEvent for Trident browsers, currently they dont support SVG, but they do support onmessage
  var t = this;
  window.addEventListener("message", function(e){
    if(e.data.substr(0,4)=="SVGe"){ //because svg-edit is too longish
      var data = e.data.substr(4);
      var cbid = data.substr(0, data.indexOf(";"));
      if(t.callbacks[cbid]){
        if(data.substr(0,6) != "error:"){
          t.callbacks[cbid](eval("("+data.substr(cbid.length+1)+")"))
        }else{
          t.callbacks[cbid](data, "error");
        }
      }
    }
    //this.stack.shift()[0](e.data,e.data.substr(0,5) == "ERROR"?'error':null) //replace with shift
  }, false)
}

SvgEditorEmbedded.encode = function(obj){
  //simple partial JSON encoder implementation
  if(window.JSON && JSON.stringify) return JSON.stringify(obj);
  var enc = arguments.callee; //for purposes of recursion

  if(typeof obj == "boolean" || typeof obj == "number"){
      return obj+'' //should work...
  }else if(typeof obj == "string"){
    //a large portion of this is stolen from Douglas Crockford's json2.js
    return '"'+
          obj.replace(
            /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g
          , function (a) {
            return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          })
          +'"'; //note that this isn't quite as purtyful as the usualness
  }else if(obj.length){ //simple hackish test for arrayish-ness
    for(var i = 0; i < obj.length; i++){
      obj[i] = enc(obj[i]); //encode every sub-thingy on top
    }
    return "["+obj.join(",")+"]";
  }else{
    var pairs = []; //pairs will be stored here
    for(var k in obj){ //loop through thingys
      pairs.push(enc(k)+":"+enc(obj[k])); //key: value
    }
    return "{"+pairs.join(",")+"}" //wrap in the braces
  }
}

SvgEditorEmbedded.prototype.send = function(name, args, callback){
  var cbid = Math.floor(Math.random()*31776352877+993577).toString();
  //this.stack.push(callback);
  this.callbacks[cbid] = callback;
  for(var argstr = [], i = 0; i < args.length; i++){
    argstr.push(this.encode(args[i]))
  }
  var t = this;
  setTimeout(function(){//delay for the callback to be set in case its synchronous
    t.frame.contentWindow.postMessage(cbid+";svgCanvas['"+name+"']("+argstr.join(",")+")","*");
  }, 0);
  return cbid;
  //this.stack.shift()("svgCanvas['"+name+"']("+argstr.join(",")+")")
}