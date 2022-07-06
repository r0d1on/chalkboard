"use strict";

//utility functions
function dst2(a, b) { return (a.X - b.X)*(a.X - b.X) + (a.Y - b.Y)*(a.Y - b.Y) };
function dst2seg2(p, a, b) {
  var len2 = dst2(a, b);
  if (len2 == 0) return dst2(p, a);
  var t = ((p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y)) / len2;
  t = Math.max(0, Math.min(1, t));
  return dst2(p, { X: a.X + t * (b.X - a.X),
                   Y: a.Y + t * (b.Y - a.Y) });
};
function dst2seg(p, a, b) { return Math.sqrt(dst2seg2(p, a, b)); }
function sub(a, b) {return { X : a.X - b.X, Y : a.Y - b.Y } }
function angle(a, b) {return ((a.X*b.X+a.Y*b.Y)/(Math.sqrt((a.X*a.X+a.Y*a.Y)*(b.X*b.X+b.Y*b.Y))))||0;};
function rotate(p, phi) {return {X:p.X*Math.cos(phi)-p.Y*Math.sin(phi),Y:p.X*Math.sin(phi)+p.Y*Math.cos(phi)}};


let TOASTS = {};
function toast(topic, text, lifespan) {

    function drop(topic) {
        document.body.removeChild(TOASTS[topic]["div"]);
        clearTimeout(TOASTS[topic]["timeout"]);
        delete TOASTS[topic];
    };

    function blur(topic) {
        function handler() {
            const tst = TOASTS[topic];
            if (tst===undefined)
                return;
            
            if (tst["age"] >= tst["lifespan"]) {
                drop(topic);
            } else {
                tst["age"] += lifespan/10;
                tst["div"].style.opacity = 1.0 - tst["age"]/tst["lifespan"];
                tst["timeout"] = setTimeout(blur(topic),lifespan/10);
            };
        };
        return handler;
    };

    if (topic in TOASTS)
        drop(topic);

    const e = document.createElement("div")
    e.innerHTML = text;
    e.style.position = "absolute";
    e.style['background-color'] = "#3333";
    e.style['padding'] = "10px";
    e.style["border"] = "1px solid black";
    e.style['border-radius'] = "15px";
    e.style['pointer-events'] = "none";
        
    document.body.appendChild(e);
    e.style.top = "" + ((UI.window_height - e.clientHeight)>>1) + "px";
    e.style.left = "" + ((UI.window_width - e.clientWidth)>>1) + "px";

    TOASTS[topic] = {
         "div" : e
        ,"lifespan" : lifespan
        ,"age" : 0
        ,"timeout" : setTimeout(blur(topic),lifespan/10)
    };
};


function copy(o){return Object.assign({},o)}

function deepcopy(o){
    if (typeof(o) in {'number':1,'string':1}) {
        return o;
    } else if (Array.isArray(o)) {
        return o.map((oi)=>{return deepcopy(oi);})
    } else if (o==null) {
        return null;
    } else if (typeof(o)=='object') {
        var co = {};
        for(var k in o) co[k] = deepcopy(o[k]);
        return co;
    };
}

function getConstructor(T) {
    let _T = null;
    // get constructor
    for(let prop in T) {
        if ( (typeof(T[prop]) == 'function') && (T.hasOwnProperty(prop)) ) {
            if ( window[T[prop].name]==T )
                _T = T[prop];
        };
    };
    if (_T == null) {
        throw "@constructor not found for object :" + JSON.stringify(T)
    };
    return _T;
}

function allMethodNames(T) {
    let _T = getConstructor(T);
    let methodsNames = [];
    for(var prop in T) {
        if (typeof(T[prop]) == 'function') {
            if (!(T[prop] == _T)) {
                methodsNames.push(prop);
            }
        };
    };
    return methodsNames;
} 

function allFieldNames(T) {
    let fieldNames = [];
    for(var prop in T) {
        if (typeof(T[prop]) != 'function') {
            if ((prop!="super")&&(prop!="mixins")) {
                fieldNames.push(prop);
            }
        };
    };
    return fieldNames;
}

function _new(T, params, dry) {
    params = (params===undefined)?[]:params;
    
    let _S = null;
    let _T = getConstructor(T);
    
    var at = null;
    
    if (!_T.hasOwnProperty("__@__")) {
        // T was not parsed before
        at  = {
             "statics" : allFieldNames(T)
            ,"super" : T["super"]
            ,"mixins" : T["mixins"]||[]
        };
        
        // links to super
        if (!(at.super===undefined)) {
            // inherit stuff from _S
            _T.prototype = _new(at.super, [], true);
            // so that new _T() will be of a _T type for introspection
            _T.prototype.constructor = _T;
        };

        // mixin methods
        at.mixins.map((M)=>{
            allMethodNames(M).map((method_name)=>{
                _T.prototype[method_name] = M[method_name];
            });
        });
        
        // own _T methods
        allMethodNames(T).map((method_name)=>{
            _T.prototype[method_name] = T[method_name];
        });
        
        // own constructor
        T.init = _T;
        
        _T["__@__"] = at;
        
    } else {
        at = _T["__@__"];
    };
    
    // create instance of the object with constructor call
    var obj = null;

    obj = Object.create(_T.prototype);
    
    if (dry) {
    } else {

        // mixin methods
        at.mixins.map((M)=>{
            allFieldNames(M).map((prop)=>{
                obj[prop] = deepcopy(M[prop]);
            });
        });
        
        //obj = new _T(...params);
        // inject getters setters for class-level variables
        at.statics.map((prop)=>{
            Object.defineProperty(obj, prop, {
                 // probably throw some here
                 // as class var should be addressed through Class.var explicitly
                  get: function() { 
                    return T[prop]; 
                  }
                 ,set: function(value) { 
                    return T[prop] = value; 
                  }
            });
        });
        
        // run mixin initializers
        obj._mixins = {};
        at.mixins.map((M)=>{
            var _M = getConstructor(M);
            obj._mixins[_M.name] = M;
            _M.call(obj);
        });        
        
        // run own constructor
        _T.apply(obj, params);
    };
    
    return obj;
}



var DT=[];
function debug(t) {
    if (BOARD.board_name=='debug') {
        console.log(t);
        DT.splice(0,0,t);
        DT.slice(0,40);

        var ctx = UI.contexts[UI.LAYERS.indexOf("overlay")];

        for(var i=0; i < DT.length; i++) {
            ctx.fillStyle = "white";
            ctx.fillRect(10, i*25, 20*DT[i].length, 20);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.font="20px courier";
            ctx.strokeText(""+(i)+"::"+DT[i], 10, 20+i*25);
        };
    };
};


let BOARD = {
    board_name : null

    ,buffer : [] // globally positioned strokes on buffer layer and accumulated stroke buffer
    ,add_buffer_stroke : function(lp0, lp1) {
        var ctx = UI.contexts[UI.LAYERS.indexOf("buffer")];
        var color = BRUSH.get_color();
        var width = BRUSH.get_local_width();
        
        if (lp0!=null)
            UI.draw_stroke(lp0, lp1, color, width, ctx);
        
        BOARD.buffer.push({
             gp : [UI.local_to_global(lp0), UI.local_to_global(lp1)]
            ,color : color
            ,width : width / UI.viewpoint.scale
        });
    }
    
    ,version : 0
    
    ,commit_id : 0
    ,stroke_id : 0
    ,strokes : [] // globally positioned strokes on board layer (committed ones)
    ,locked : false

    ,add_stroke : function(stroke) {
        stroke.version = BOARD.version;
        stroke.commit_id = BOARD.commit_id;
        stroke.stroke_id = BOARD.stroke_id++;
        
        BOARD.strokes.push(stroke);
    }

    ,flush : function(buffer, clear) {
        clear = (clear===undefined)?true:clear;
        var ctx = UI.contexts[UI.LAYERS.indexOf("board")];
        var maxw = -1e10;
        
        var brect = UI.get_rect(buffer.reduce((a, stroke)=>{
            var lp0, lp1;
            if (stroke.gp[0]!=null) {
                lp0 = UI.global_to_local(stroke.gp[0], UI.viewpoint);
                lp1 = UI.global_to_local(stroke.gp[1], UI.viewpoint);
                UI.draw_stroke(lp0, lp1, stroke.color, stroke.width * UI.viewpoint.scale, ctx);
            };
            BOARD.add_stroke(stroke);
            
            maxw = Math.max(stroke.width, maxw) * UI.viewpoint.scale;
            
            a.push(lp0, lp1);
            return a;
        }, []));

        ctx = UI.contexts[UI.LAYERS.indexOf("buffer")];
        ctx.clearRect(brect[0].X-maxw
                    , brect[0].Y-maxw
                    , brect[1].X-brect[0].X+2*maxw
                    , brect[1].Y-brect[0].Y+2*maxw
        );
        
        if (clear)
            buffer.splice(0, buffer.length);
        
        return brect;
    }

    ,flush_commit : function() {
        
        if (BOARD.buffer.length==0)
            return false;
        
        BOARD.op_start();
        BOARD.flush(BOARD.buffer);
        BOARD.op_commit();

        return true;
    }

    ,undo_strokes : function(strokes) {
        
        return strokes.reduce((a,stroke)=>{

            if ((stroke.gp[0]==null)&&(stroke.gp[1]=="erase")) {
                var erased = BOARD.strokes.reduce((a,s)=>{
                    if (s.erased==stroke.stroke_id)
                        a.push(s);
                    return a;
                },[]);
                
                erased = BOARD.undo_strokes(erased);
                erased.map((s)=>{
                    a.push(s);
                });
            };
            
            if ((stroke.erased!=undefined)&&(stroke.erased>0)) {
                stroke.erased = -stroke.erased;
            } else {
                stroke.erased = BOARD.stroke_id;
            };

            stroke.version = BOARD.version;

            a.push(stroke);
            return a;
        }, []);
    }
    
    ,rollback : function() {
        
        var last_commit = 0;

        BOARD.op_start();
        
        var last_strokes = BOARD.strokes.reduce((a, stroke)=>{
            var active = (stroke.gp[1]!="undo");
            active = (active)&&((stroke.erased===undefined)||(stroke.erased<0));
            if ((stroke.commit_id>last_commit)&&(active)) {
                a = [];
                last_commit = stroke.commit_id;
            };
            if (stroke.commit_id == last_commit) {
                a.push(stroke);
            };
            return a;
        }, []);
        
        var changed = BOARD.undo_strokes(last_strokes);
        BOARD.add_stroke({gp:[null, "undo"]});

        BOARD.op_commit();
        
        
        return UI.get_rect(changed.reduce((a, stroke)=>{
            a.push(stroke.gp[0], stroke.gp[1]);
            return a;
        }, [] ));
        
    }

    ,op_start : function() {
        if (BOARD.locked)
            throw "board is locked"
        BOARD.version += 1;
        BOARD.commit_id += 1;
        BOARD.locked = true;
    }
    
    ,op_commit : function() {
        if (!BOARD.locked)
            throw "board is not locked"
        BOARD.locked = false;
    }
    

    ,get_strokes : function(rect, points) {
        points = (points===undefined)?false:points;
        
        var pnt = null;
        var ret = [];
        
        for(var i=0; i<BOARD.strokes.length; i++) {
            for(var pi=0; pi<2; pi++) {
                pnt = BOARD.strokes[i].gp[pi];
                if (pnt==null)
                    continue;
                    
                if (BOARD.strokes[i].erased>0)
                    continue;
                    
                if ((rect[0].Y<=pnt.Y)&&(pnt.Y<=rect[1].Y)&&(rect[0].X<=pnt.X)&&(pnt.X<=rect[1].X)) {
                    ret.push({
                         stroke_idx : i
                        ,stroke_id : BOARD.strokes[i].stroke_id
                        ,point_idx : pi
                    });
                    if (!(points))
                        break
                };
            };
        };
        
        return ret;
    }

    ,get_glyphs : function(col, ddx, ddy) {
        col = (col===undefined)?0:col;
        ddx = (ddx===undefined)?60:ddx;
        ddy = (ddy===undefined)?60:ddy;

        function linearize(glyph) {
            var g = glyph.reduce((a, cur)=>{
                var prev = a.pop();
                
                if (prev==null) {
                    a.push(null);
                    a.push(cur);
                    
                } else if (Array.isArray(prev)) {
                    for (var pi=0; pi<2; pi++) 
                        for (var ci=0; ci<2; ci++) {
                            if (dst2(prev[pi], cur[ci])==0) {
                                a.push(prev[1-pi], prev[pi], cur[1-ci]);
                                pi=9;
                                break;
                            };
                        };
                    if (pi==2) {
                        a.push(prev[0], prev[1]);
                        a.push(null);
                        a.push(cur);
                    };
                    
                } else {
                    if (dst2(prev, cur[0])==0) {
                        a.push(prev, cur[1]);
                    } else if (dst2(prev, cur[1])==0) {
                        a.push(prev, cur[0]);
                    } else {
                        a.push(prev, null, cur);
                    };
                };
                
                return a;
            },[null]);
            
            var prev = g.pop();
            if (Array.isArray(prev)) {
                g.push(prev[0],prev[1]);
            } else {
                g.push(prev);
            };
            
            return g;
        };

        var row = 0;
        var result = [];
        var blanks = 2;
                              
        while(true) {
            var glyph = BOARD.get_strokes([
                 {X:(col+0)*ddx, Y:(row+0)*ddy}
                ,{X:(col+1)*ddx, Y:(row+1)*ddy}
            ]);
            
            if ((glyph.length==0)) {
                if ((--blanks)==0)
                    return result;
                else {
                    row += 1;
                    continue;
                }
            } else {
                blanks = 2;
            };

            glyph = glyph.map((gs)=>{
                return BOARD.strokes[gs.stroke_idx].gp.map((p)=>{
                    return {X:p.X-(col+0)*ddx, Y:p.Y-(row+0)*ddy}
                });
            });

            var rect = UI.get_rect(glyph.reduce((a, ps)=>{
                a.push(ps[0], ps[1]);
                return a;
            }, []));

            glyph = glyph.map((ps)=>{
                return ps.map((p)=>{
                    return {X:p.X, Y:p.Y}
                });
            });            

            rect[0].X -= col*ddx;
            rect[1].X -= col*ddx;
            rect[0].Y -= row*ddy;
            rect[1].Y -= row*ddy;

            glyph = linearize(glyph);
            
            glyph = glyph.map((p)=>{
                if (p==null) {
                    return p;
                } else {
                    return [p.X, p.Y]
                };
            });
            
            result.push([glyph, rect]);

            row += 1;
        };
        return result;
    }

}

let UI = {

     CANVAS_MARGIN : 20
    ,GRID : 30.0
    ,LAYERS : ['background', 'board', 'buffer', 'overlay']
    
    ,_last_point : null
    
    ,is_mobile : false
    ,view_mode : undefined
    
    ,window_width : null
    ,window_height : null
    
    ,layers : null
    ,contexts : null
    ,viewpoint : {
         dx : 0.0
        ,dy : 0.0
        ,scale : 1.0
    }
    
    
    ,keys : {"Control":false, "Shift":false, "Alt":false}
    
    ,viewpoint_set : function(dx, dy, scale, maketoast) {
        maketoast = (maketoast===undefined)?true:maketoast;
        UI.viewpoint.dx = dx;
        UI.viewpoint.dy = dy;
        UI.viewpoint.scale = scale;
        UI.redraw();
        
        if (maketoast) {
            const zoom_prc = Math.round(1000*((UI.viewpoint.scale>=1)?UI.viewpoint.scale:-1/UI.viewpoint.scale))/10;
            toast("viewpoint","( "+Math.round(UI.viewpoint.dx)+" , "+Math.round(UI.viewpoint.dy)+") :: <b>"+zoom_prc+"%</b>", 700);
        };
    }    
    
    ,viewpoint_shift : function(dx, dy, maketoast) {
        maketoast = (maketoast===undefined)?true:maketoast;
        UI.viewpoint_set(UI.viewpoint.dx + dx, UI.viewpoint.dy + dy, UI.viewpoint.scale, maketoast);
    }
    
    ,viewpoint_zoom: function(scale, center) {
        var p0 = UI.local_to_global(center);
        //console.log(center,p0);
        
        UI.viewpoint.scale *= scale;
        
        const zoom_prc = Math.round(1000*((UI.viewpoint.scale>=1)?UI.viewpoint.scale:-1/UI.viewpoint.scale))/10;
        toast("viewpoint","ZOOM: <b>" + zoom_prc + "%</b>", 700);
        
        var p1 = UI.local_to_global(center);
        
        var dx = (p0.X - p1.X);
        var dy = (p0.Y - p1.Y);
        //console.log(dx, dy);
        
        UI.viewpoint_shift(dx, dy, false);
    }
    
    
    ,reset_layer : function(layer_name) {
        var canvas = UI.layers[UI.LAYERS.indexOf(layer_name)]
        canvas.style['margin'] = UI.CANVAS_MARGIN + 'px';
        canvas.width = UI.window_width - 2 * UI.CANVAS_MARGIN;
        canvas.height = UI.window_height - 2 * UI.CANVAS_MARGIN;
    }
    
    ,update_layers : function() {
        UI.window_width = window.innerWidth;
        UI.window_height = window.innerHeight;
        UI.LAYERS.map((layer_name)=>{
            UI.reset_layer(layer_name);
        });
    }
    
    ,_setup_event_listeners : function() {

        // window size change listener
        window.addEventListener('resize', ()=>{
            UI.update_layers();
            UI.redraw();
        });
        
        // tool usage start events
        var buffer_canvas = UI.layers[UI.LAYERS.indexOf("buffer")]
        
        buffer_canvas.addEventListener('mousedown', e => {
            var lp = {X:e.offsetX*1.0, Y:e.offsetY*1.0};
            UI._last_point = lp;
            UI.on_start(lp);
        });
        buffer_canvas.addEventListener('touchstart', e => {
            UI.is_mobile = true;
            var lp = UI.get_touch(UI.layers[UI.LAYERS.indexOf("buffer")], e);
            
            if (false) { // &&(UI.check_mobile_keys(lp,UI._last_point!=null))
                UI._last_point = null;
                e.preventDefault();
                return;
            };
                        
            UI._last_point = lp;

            if (e.touches.length==2) {
                UI.on_key_down("Escape"); // cancel single touch start + maybe moves
                UI.on_key_down("Control"); // activate zoom / pan
            };

            UI.on_start({X:lp.X, Y:lp.Y, D:lp.D});
            e.preventDefault();
        });
        
        // tool move events
        buffer_canvas.addEventListener('mousemove', e => {
            var lp = {X:e.offsetX*1.0, Y:e.offsetY*1.0};
            UI._last_point = lp;
            UI.on_move(lp);
        });
        buffer_canvas.addEventListener('touchmove', e => {
            UI.is_mobile = true;
            var lp = UI.get_touch(UI.layers[UI.LAYERS.indexOf("buffer")], e);
            
            if (false) { // UI.check_mobile_keys(lp,UI._last_point!=null)
                UI._last_point = null;
                e.preventDefault();
                return;
            };
            
            UI._last_point = lp;
            UI.on_move({X:lp.X, Y:lp.Y, D:lp.D});
            e.preventDefault();
        });
        
        // tool usage stop events
        buffer_canvas.addEventListener('mouseup', e => {
            var lp = {X:e.offsetX*1.0, Y:e.offsetY*1.0};
            UI._last_point = lp;
            UI.on_stop(lp);
        });
        buffer_canvas.addEventListener('touchend', e => {
            UI.is_mobile = true;
            var lp = UI._last_point;

            if (false) { // (lp==null)||(UI.check_mobile_keys(lp))
                UI._last_point = null;
                e.preventDefault();
                return;
            };
            
            if (lp!=null) {
                UI.on_stop({X:lp.X, Y:lp.Y});
                if (lp.D!=undefined)
                    UI.on_key_up("Control");
                UI._last_point = null;
            };
            e.preventDefault();
        });
        
        // mouse wheel listener
        buffer_canvas.addEventListener('wheel', e => {
            UI.on_wheel(e.deltaY);
            e.preventDefault();
        });
        
        // keyboard listener
        document.addEventListener('keydown', e => {
            const handled = UI.on_key_down(e.key);
            if ((handled)||(((e.key=="+")||(e.key=="-"))&&(UI.keys['Control'])))
                e.preventDefault();
        });
        document.addEventListener('keyup', e => {
            UI.on_key_up(e.key);
            if (((e.key=="+")||(e.key=="-"))&&(UI.keys['Control']))
                e.preventDefault();
        });
        
        // paste listener
        document.addEventListener('paste', (e)=>{
            var cd = e.clipboardData;
            console.log('paste:',cd);
            for(var i=0; i<cd.types.length; i++) {
                console.log('=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
                console.log('type:', cd.types[i]);
                console.log('kind:', cd.items[i].kind);

                if (cd.items[i].kind=='string') {
                    cd.items[i].getAsString(
                        ((type)=>{
                            return (data)=>{
                                UI._on_paste(data, type);
                            };
                        })(cd.types[i])
                    );

                } else if (cd.items[i].kind=='file') {
                    var file = cd.items[i].getAsFile();
                    UI.on_file(file);
                    
                } else {
                    console.log('Unknown kind:', cd.items[i].kind);
                };
            };
        });        
           
        window.addEventListener("focus",()=>{console.log("focus")})
        window.addEventListener("blur",()=>{console.log("blur")})
    }
    
    ,init : function() {
        // env constants
        var uri = window.location.hash.slice(1,)
        BOARD.board_name = uri.split('$')[0];
        
        // UI modes
        UI.view_mode = uri.split('$')[1];
        
        try {
            UI.is_mobile = navigator.userAgentData.mobile;
        } catch(e) {
            UI.is_mobile = true;
        };
        
        
        UI.layers = (UI.LAYERS).map((id)=>{
            return document.getElementById("canvas_" + id);
        });
        
        UI.contexts = UI.layers.map((canvas)=>{
            return canvas.getContext('2d');
        });

        UI.update_layers();
        
        UI._setup_event_listeners();
    }


    // Events
    ,_event_handlers : {
         "on_start" : []
        ,"on_move" : []
        ,"on_stop" : []

        ,"on_key_down" : []
        ,"on_key_up" : []
        ,"on_wheel" : []
        
        ,"on_paste_strokes" : []
    }
    
    ,addEventListener : function(event_type, event_handler) {
        if (event_type in UI._event_handlers) {
            UI._event_handlers[event_type].push(event_handler);
        } else {
            throw ("Unknown event type: "+event_type);
        };
    }
    
    ,get_touch : function(canvasDom, e) {
        var rect = canvasDom.getBoundingClientRect();
        var p0 = {
            X: e.touches[0].clientX - rect.left
           ,Y: e.touches[0].clientY - rect.top
        };
        
        if (e.touches.length>1) {
            var p1 = {
                X: e.touches[1].clientX - rect.left
               ,Y: e.touches[1].clientY - rect.top
            };
            return {
                 X: (p0.X + p1.X) / 2
                ,Y: (p0.Y + p1.Y) / 2
                ,D: Math.sqrt(dst2(p0 , p1))
                ,P: [p0, p1]
            };
        } else {
            return p0;
        };
        
        return;
    }

    
    ,on_key_down_default : function(key) {
        if (key == '+') {
            BRUSH.update_size(+5);
        } else if (key == '-') {
            BRUSH.update_size(-5);
        } else if (key == 'Tab') {
            BRUSH.select_color((BRUSH.cid + 1) % BRUSH.COLORS.length);
            return true;
        };
        if (BOARD.board_name=='debug')
            console.log("key_down:", key);
    }

    ,on_key_up_default : function(key) {
        if (BOARD.board_name=='debug')
            console.log("key_up:", key);
    }

    ,on_paste_strokes_default : function(strokes) {
        if (BOARD.board_name=='debug')
            console.log("received strokes:", strokes);
    }

    ,on_wheel_default : function(delta) {
        if (UI.keys["Shift"])
            UI.viewpoint_shift(Math.sign(delta)*60.0/UI.viewpoint.scale, 0);
        else
            UI.viewpoint_shift(0, Math.sign(delta)*60.0/UI.viewpoint.scale);
    }


    ,on_start : function(lp) {
        var handled = UI._event_handlers["on_start"].reduce((handled, handler)=>{
            return handled||handler(copy(lp));
        }, false);
    }

    ,on_move : function(lp) {
        var handled = UI._event_handlers["on_move"].reduce((handled, handler)=>{
            return handled||handler(copy(lp));
        }, false);
    }

    ,on_stop : function(lp) {
        var handled = UI._event_handlers["on_stop"].reduce((handled, handler)=>{
            return handled||handler(copy(lp));
        }, false);
    }

    
    ,on_key_down : function(key) {
        if (key in UI.keys)
            UI.keys[key] = true;
        
        var handled = UI._event_handlers["on_key_down"].reduce((handled, handler)=>{
            return handled||handler(key);
        }, false);
        
        if (!handled)
            handled = UI.on_key_down_default(key);

        return handled;
    }

    ,on_key_up : function(key) {
        var handled = UI._event_handlers["on_key_up"].reduce((handled, handler)=>{
            return handled||handler(key);
        }, false);
        
        if (!handled) 
            UI.on_key_up_default(key);
        
        if (key in UI.keys)
            UI.keys[key] = false;
    }
    
    ,on_wheel : function(delta) {
        var handled = UI._event_handlers["on_wheel"].reduce((handled, handler)=>{
            return handled||handler(delta);
        }, false);
        
        if (!handled) 
            UI.on_wheel_default(delta);        
    }
    

    ,_on_paste : function(text, type) {
        //console.log("paste:", type , text);
        try {
            if (type!='text/plain')
                throw "not a plain text";
            
            var js = JSON.parse(text);
            if (js.strokes===undefined) {
                throw "not a figure";
            } else {
                UI.on_paste_strokes(js.strokes);
                return;
            };
        } catch (ex) {
            console.log("pasted text is not parseable:",ex);
        };
        UI.on_paste_text(text);
    }
        
    ,on_file : function(file) {
        console.log("FILE:", file);
    }

    ,on_paste_text : function(text) {
        console.log("TEXT:", text);
    }
    
    ,on_paste_strokes : function(strokes) {
        var handled = UI._event_handlers["on_paste_strokes"].reduce((handled, handler)=>{
            return handled||handler(strokes);
        }, false);
        
        if (!handled)
            UI.on_paste_strokes_default(strokes);        
    }
    
    
    // Stroke handling
    ,global_to_local : function(point, viewpoint) {
        if (point==null) return null;
        var vp = (viewpoint===undefined)?UI.viewpoint:viewpoint;
        return {
            X : (point.X - vp.dx) * vp.scale
           ,Y : (point.Y - vp.dy) * vp.scale
        }
    }
    
    ,local_to_global : function(point) {
        if (point==null) return null;
        var vp = UI.viewpoint;
        return {
            X : (point.X / vp.scale) + vp.dx
           ,Y : (point.Y / vp.scale) + vp.dy
        }
    }
    
    ,figure_split : function(figure, cyclic, max_length) {
        cyclic = (cyclic===undefined)?true:cyclic;
        var ret = [];
        var p0, p1;
        
        var i =0;
        while (i < figure.length) {
            p0 = copy(figure[i]);
            p1 = figure[(i+1)%figure.length];

            ret.push(copy(p0));
            
            if ((!cyclic)&&(i==figure.length-1)) 
                break;
            
            if (max_length===undefined) {
                ret.push({X:(p0.X+p1.X)/2, Y:(p0.Y+p1.Y)/2});
                
            } else {
                var dv = sub(p1, p0);
                var dx = dv.X * max_length / Math.sqrt(dst2(p0, p1));
                var dy = dv.Y * max_length / Math.sqrt(dst2(p0, p1));
                
                while(dst2(p0, p1) > max_length*max_length) {
                    if (dst2(p0, p1) > 2*max_length*max_length) {
                        p0.X += dx;
                        p0.Y += dy;
                    } else {
                        p0.X += dx;
                        p0.Y += dy;
                    };
                    ret.push(copy(p0));
                };
                
            };
            
            i++;
        };

        return ret;
    }

    ,figure_distort : function(figure, mode, cyclic) {
        mode = (mode===undefined) ? 1 : mode;
        cyclic = (cyclic===undefined) ? true : cyclic;

        var w = BRUSH.get_local_width();
        
        if (mode==1) {
            w *= 1.6
        } else if (mode==2) {
            w *= 1.0
        };
        
        var p0 = null;
        var t = 0; 
        
        var distortion = (p, i)=>{
            if ((i==0)&&(t==0)) {
                p0 = copy(p);
                return p;
            };
                
            var v = sub(p0, p);

            var dx = angle({X:Math.abs(v.X), Y:0}, v);
            var dy = angle({X:0, Y:Math.abs(v.Y)}, v);

            var dphi = Math.sin((2 * Math.PI) * (t / (w * 80)));
            
            var phi = (2 * Math.PI) * (1 / (w * 60)) * (t + 10 * w * dphi);

            t += Math.sqrt(dst2(p, p0));

            p0 = copy(p);
            
            return {
                 X : p.X + Math.sin(phi) * w * ((dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2)))
                ,Y : p.Y + Math.sin(phi) * w * ((dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2)))
            }
            
            /*
              X : p.X + Math.sin(phi+dphi*t) * w * ((dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2)))
             ,Y : p.Y + Math.sin(phi+dphi*t) * w * ((dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2)))
            */ 
            
        };
        
        var figure = figure.map(distortion);
        
        if (mode==2) {
            // if not cyclic push invisible stroke to transit from p[-1] to p[0]
            figure.map(distortion).map((p)=>{
                figure.push(p);
            });
        };
        
        return figure;
    }
    
    ,draw_glyph : function(glyph, ctx, viewpoint, color) {
        var a,b,p = null;
        color = (color===undefined) ? "#0095" : color;
        viewpoint = (viewpoint===undefined) ? {dx:0, dy:0, scale:1.0} : viewpoint;
        
        for(var i=0; i<glyph.length; i++) {
            a = p;
            b = glyph[i];
            if ((p==null)&&(glyph[i]!=null)&&((i==glyph.length-1)||((i<glyph.length-1)&&(glyph[i+1]==null))))
                a = b;

            if ((a!=null)&&(b!=null)) {
                var pa = {"X":a[0], "Y":a[1]};
                var pb = {"X":b[0], "Y":b[1]};
                UI.draw_gstroke(pa, pb, color, 4, ctx, viewpoint);
            };

            p = glyph[i];
        };
    }
    
    ,draw_gstroke : function(gp0, gp1, color, width, ctx, viewpoint) {
        var lp0 = UI.global_to_local(gp0, viewpoint);
        var lp1 = UI.global_to_local(gp1, viewpoint);
        UI.draw_stroke(
             lp0
            ,lp1
            ,color
            ,width * viewpoint.scale
            ,ctx
        );
    }
    
    ,draw_stroke : function(lp0, lp1, color, width, ctx) {
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.moveTo(lp0.X, lp0.Y);
        ctx.lineTo(lp1.X, lp1.Y);
        ctx.stroke();
        ctx.closePath();
    }
    
    ,add_overlay_stroke : function(lp0, lp1, params) { // temporary strokes in overlay layer
        var ctx = UI.contexts[UI.LAYERS.indexOf("overlay")];
        const {
             color:color = BRUSH.get_color()
            ,width:width = BRUSH.get_local_width()
        } = params||{};
        UI.draw_stroke(lp0, lp1, color, width, ctx);
    }


    ,get_rect : function(points) {
        var rect = [{X:1e10,Y:1e10}, {X:-1e10,Y:-1e10}];
        points.map((point)=>{
            if (point!=null) {
                rect[0].X = Math.min(rect[0].X, point.X);
                rect[1].X = Math.max(rect[1].X, point.X);
                
                rect[0].Y = Math.min(rect[0].Y, point.Y);
                rect[1].Y = Math.max(rect[1].Y, point.Y);
            };
        });
        return rect;
    }

    
    ,redraw : function() {
        var canvas = UI.layers[UI.LAYERS.indexOf("board")];
        var ctx = UI.contexts[UI.LAYERS.indexOf("board")];
        var lp0, lp1;

        //ctx.clearRect(0, 0, canvas.width, canvas.height);
        UI.update_layers();

        if (GRID_MODE.grid_active)
            UI.redraw_grid();
        
        BOARD.strokes.map((stroke, stroke_idx)=>{
            if ((stroke.erased!=undefined)&&(stroke.erased>0))
                return; // erased stroke

            if (stroke.gp[0]==null)
                return; // erasure stroke
            
            lp0 = UI.global_to_local(stroke.gp[0], UI.viewpoint);
            lp1 = UI.global_to_local(stroke.gp[1], UI.viewpoint);
            
            UI.draw_stroke(
                 lp0
                ,lp1
                ,stroke.color
                ,stroke.width * UI.viewpoint.scale
                ,ctx
            );
        });

        if ((TOOLS.current!=null)&&(TOOLS.current.after_redraw!=undefined)) {
            TOOLS.current.after_redraw();
        };        
    
        BRUSH.update_size();
    }
    
    ,redraw_grid : function() {
        var ctx = UI.contexts[UI.LAYERS.indexOf("background")];

        //h
        var y = - (UI.viewpoint.dy % UI.GRID) * UI.viewpoint.scale;
        while (y < UI.window_height) {
            UI.draw_stroke(
                 {"Y" : y, "X" : 0}
                ,{"Y" : y, "X" : UI.window_width}
                ,(Math.abs(y / UI.viewpoint.scale + UI.viewpoint.dy)>0.1)?'#CCC':'#333'
                ,1
                ,ctx
            );
            y += UI.GRID * UI.viewpoint.scale;
        };
        
        //w
        var x = - (UI.viewpoint.dx % UI.GRID) * UI.viewpoint.scale;
        while (x < UI.window_width) {
            UI.draw_stroke(
                 {"X" : x, "Y" : 0}
                ,{"X" : x, "Y" : UI.window_height}
                ,(Math.abs(x / UI.viewpoint.scale + UI.viewpoint.dx)>0.1)?'#CCC':'#333'
                ,1
                ,ctx
            );
            x += UI.GRID * UI.viewpoint.scale;
        };
        
    }
    
};

var Menu = {

     SIZE : 60
    ,LONG_CLICK_DELAY : 1000
    ,COLOR0 : "#666D"
    ,COLOR1 : "#555D"

    ,Menu : function(root_name, root_div_id, top) {
        this.id = root_div_id;
        this.container = document.getElementById(this.id);
        
        this.top = (top===undefined)?true:top;
        
        if (this.top) {
            this.container.style['top'] = "0px";
            this.container.style['bottom'] = undefined;
        } else {
            this.container.style['top'] = undefined;
            this.container.style['bottom'] = "0px";
        };
        
        this.tree = {};
        this.tree[root_name] = this._new_item(null, this.container, null, 0, 0);
    }

    ,_new_item : function(dom, rdom, pid, top, left) {
        return {
             dom : dom
            ,rdom : rdom
            ,sub : []
            ,pid : pid
            ,horizontal : (pid==null) || (!this.tree[pid].horizontal)
            ,top : top
            ,left : left
        };
    }
    
    ,hide : function(id, x) {
        if (id == null) 
            return;

        if (id != 'root') 
            this.tree[id].rdom.style['display'] = "none";

        this.tree[id].sub.map((sid)=>{
            if (sid != x) this.hide(sid);
        });

        if (x != undefined)
            this.hide(this.tree[id].pid, id);
    }
    
    ,show : function(id) {
        this.tree[id].rdom.style['display'] = "block";
    }
    
    ,onpush : function(id) {
        var that = this;
        function handler(e) {
            that.tree[id]._push = (new Date()).valueOf();
        };
        return handler;
    }
    
    ,onclick : function(id, onclk) {
        var that = this;
        return (e) => {
            var long = ((new Date()).valueOf() - that.tree[id]._push) > Menu.LONG_CLICK_DELAY;
            
            //console.log("menu:", id);
            
            if ( ( onclk != undefined ) && ( onclk != null ) && ( !onclk(e, id, long) ) ) {
                //console.log(id, e, " - cancelled");
                return
            };
            
            if (that.tree[id].sub.length > 0) {
                that.hide(that.tree[id].pid, id);
                if (that.tree[id].rdom.style['display']=="none") {
                    that.show(id);
                } else {
                    that.hide(id);
                };
            } else {
                that.hide("root");
            };
        };
    }

    
    ,get_menu_block : function(type, id) {
        var elem = document.createElement(type);
        elem.id = id;
        elem.style['width'] = Menu.SIZE;
        elem.style['height'] = Menu.SIZE;
        if (type=="canvas") {
            elem.width = Menu.SIZE;
            elem.height = Menu.SIZE;
        };
        return elem;
    }
    
    ,add : function(pid, id, onclick, inner_type, title) {
        var parent = this.tree[pid];

        var elem = document.createElement("div");
        elem.id = id;
        elem.style['position'] = 'absolute';
        elem.style['width'] = Menu.SIZE + 'px';
        elem.style['height'] = Menu.SIZE + 'px';
        elem.style['background-color'] = Menu.COLOR0;
        elem.addEventListener("click", this.onclick(id, onclick));
        elem.addEventListener("mousedown", this.onpush(id));
        elem.title = title||"";

        var sub_elem = null;
        if (inner_type != undefined) {
            sub_elem = this.get_menu_block(inner_type, id + "_g");
            elem.appendChild(sub_elem);
        };

        var row = document.createElement("div");
        row.id = id + '_row';
        row.style['position'] = 'absolute';
        row.style['display'] = 'none';

        var top = parent.top;
        var left = parent.left;
        
        var top_prop = (this.top)?'top':'bottom';
        var bot_prop = (!this.top)?'top':'bottom';

        if (parent.horizontal) {
            left += parent.sub.length;
            top += 1;
            elem.style[top_prop]  = '0px';
            elem.style['left'] = Menu.SIZE * parent.sub.length + 'px';
            row.style[top_prop]   = Menu.SIZE * top + 'px';
            row.style['left']  = Menu.SIZE * left + 'px';
        } else {
            left += 1;
            top += parent.sub.length;
            elem.style[top_prop]  = Menu.SIZE * parent.sub.length + 'px';
            elem.style['left'] = '0px';
            row.style[top_prop]   = Menu.SIZE * top + 'px';
            row.style['left']  = Menu.SIZE * left + 'px';
        };

        this.tree[id] = this._new_item(elem, row, pid, top, left);
        
        parent.sub.push(id);
        parent.rdom.appendChild(elem);
        if (parent.dom != null) {
            parent.dom.style['background-color'] = Menu.COLOR1;
            if (!parent.horizontal) {
                parent.dom.style['border-'+bot_prop] = '3px solid black';
            } else {
                parent.dom.style['border-right'] = '3px solid black';
            };
        };
        
        this.tree['root'].rdom.appendChild(row);
        
        return [elem, sub_elem];
     }
    
    ,drop : function(id) {
        this.tree['root'].rdom.removeChild(this.tree[id].dom);
        this.tree['root'].rdom.removeChild(this.tree[id].rdom);
        
        var subelems = this.tree['root'].sub;
        var index = subelems.indexOf("input");
        subelems.splice(index, 1);
    }

};

let BRUSH = {
    icon_size_inc :  [null,[41,20],[40,17],[42,15],[45,16],[44,19],[41,20],null,[40,24],[36,21],[35,17],[36,13],[40,11],[45,11],[48,13],[50,17],[49,20],[47,23],[40,24],null,[39,27],[36,26],[34,23],[32,20],[32,17],[32,14],[34,11],[36,9],[39,7],[42,7],[45,7],[48,9],[51,11],[52,14],[50,17],[52,20],[51,23],[48,26],[45,27],[42,28],[39,27],null,[12,50],[10,48],[12,45],[15,46],[15,49],[12,50],null,[32,35],[32,28],[25,28],null,[17,44],[32,28]]
    ,icon_size_dec : [null,[19,40],[20,41],[20,43],[19,45],[17,45],[16,44],[15,43],[16,41],[17,40],[19,40],null,[20,36],[22,37],[24,40],[25,41],[25,44],[25,46],[23,48],[21,48],[19,49],[17,50],[14,49],[12,48],[11,47],[11,45],[10,43],[11,40],[12,39],[13,37],[15,36],[18,36],[20,36],null,[21,33],[24,35],[26,38],[28,41],[28,44],[28,47],[25,50],[23,52],[20,53],[17,53],[14,53],[11,51],[8,49],[8,46],[8,43],[8,40],[9,37],[12,34],[15,33],[18,32],[21,33],null,[49,11],[50,12],[51,13],[50,14],[49,15],[48,16],[46,16],[45,15],[45,13],[46,12],[47,11],[48,10],[49,11],null,[43,25],[43,18],[35,18],null,[27,34],[43,18]]
    
    ,COLORS : [
        ['#000A',  'black'],
        ['#FFFA',  'white'],
        ['#F00A',  'red'],
        ['#FD0A',  'gold'],
        ['#080A',  'green'],
        ['#93EA',  'blueviolet'],
        ['#00FA',  'blue'],
        ['#469A',  '#469']
    ]
    
    ,cid : 0
    ,size : 5

    ,div : null
    ,wdiv: null
    
    ,select_color : function(cid) {
        //console.log("color id selected: ",cid);
        BRUSH.cid = cid;
        BRUSH.div.style['background-color'] = BRUSH.get_color("E");
        MENU_main.hide("colors");
    }
    
    ,oncolor : function(e, id, long) {
        var cid = id.split('_')[1]*1;
        BRUSH.select_color(cid);
    }
    
    ,update_size : function (delta) {
        if (delta==undefined) delta = 0;
        BRUSH.size += delta;
        if (BRUSH.size>40) BRUSH.size=5;
        if (BRUSH.size<5)  BRUSH.size=40;
        
        var wdiv = BRUSH.wdiv;
        var size = BRUSH.get_local_width();
        wdiv.style['left']   = ((Menu.SIZE-size)>>1)+'px';
        wdiv.style['top']    = ((Menu.SIZE-size)>>1)+'px';
        wdiv.style['width']  = ((size)>>0)+'px';
        wdiv.style['height'] = ((size)>>0)+'px';
        wdiv.style['borderRadius'] = ((size)>>0)+'px';
        wdiv.style['borderColor'] = 'red';
        //if (document.getElementById('palette').children[0].dataset['color']=='red') {
        //    wdiv.style.borderColor='black';
        //} else {
        //    wdiv.style.borderColor='red';
        //};
        if (delta!=0)
            UI.redraw();
    }
    
    ,get_local_width : function() {
        return BRUSH_MODE.scaled ? BRUSH.size * UI.viewpoint.scale : BRUSH.size;
    }
    
    ,get_color : function(alpha, cid) {
        var cid = (cid===undefined)?BRUSH.cid:cid;
        var color = BRUSH.COLORS[cid][0];
        color = (alpha===undefined)?color:(color.slice(0,-1) + alpha);
        return color;
    }
    
    ,init : function() {
        
        // color picker menu item
        // shows current color, size. sub:colors
        var [par,div] = MENU_main.add("root", "colors", null, "div");
        par.style['overflow'] = "hidden";
        
        div.style['background-color'] = "black";
        div.style['border-radius'] = "40px";
        div.style['width'] = "100%";
        div.style['height'] = "100%";
        BRUSH.div = div;
        
        var wdiv = document.createElement("div");
        wdiv.id = div.id + "_s";
        wdiv.style['position'] = 'relative';
        wdiv.style['border'] = '1px solid';
        div.appendChild(wdiv);
        BRUSH.wdiv = wdiv;
        
        BRUSH.COLORS.map((color, i)=>{
            var [g,v] = MENU_main.add("colors", "color_" + i, BRUSH.oncolor, "div");
            v.style['background-color'] = BRUSH.get_color("E", i);
            v.style['border-radius'] = "40px";
            v.style['width'] = "100%";
            v.style['height'] = "100%";
            g.style['background-color'] = "#666D";
        });
        
        BRUSH.update_size();
        
        // bruch size changer options menu items
        var ctx = MENU_options.add("root"
                        , "brush_size_inc"
                        , ()=>{
                            BRUSH.update_size(+5)
                        }
                        , "canvas"
                        , "increase brush size")[1].getContext('2d');
        UI.draw_glyph(BRUSH.icon_size_inc, ctx, undefined, undefined);

        ctx = MENU_options.add("root"
                        , "brush_size_dec"
                        , ()=>{
                            BRUSH.update_size(-5)
                        }
                        , "canvas"
                        , "decrease brush size")[1].getContext('2d');
        UI.draw_glyph(BRUSH.icon_size_dec, ctx, undefined, undefined);
    }
    
};

// TOOLS CONTAINER
let TOOLS = {
    canvas : null
    ,div : null
    
    ,tools : {}
    
    ,previous : []
    
    ,current : null
    ,background : null


    ,option_update_icon : function(tool, option_name) {
        var option = tool.options[option_name];
        var option_value = tool[option_name];
        var icon_color = (option_value==0)?"#555":undefined;
        var icon_idx = (option.type=="binary")?0:option_value;
        var icon = option.icon[icon_idx]||tool.icon;
        option.ctx.canvas.width = option.ctx.canvas.width
        UI.draw_glyph(icon, option.ctx, undefined, icon_color);
    }

    ,option_get_click_handler : function(tool, option_name) {
        return ()=>{
            var option = tool.options[option_name];
            var option_value = tool[option_name] + 1;
            option_value = option_value % ((option.type=="binary")? 2 : option.icon.length);
            tool[option_name] = option_value;
            
            (option.on_click)&&(option.on_click());
            
            TOOLS.option_update_icon(tool, option_name);
        };
    }

    ,options_enable : function(tool) {
        if (tool.options!==undefined) {
            console.log("enabling options for:", tool);
            var ctx = null;
            for(var option_name in tool.options) {
                var option = tool.options[option_name];
                var handler = TOOLS.option_get_click_handler(tool, option_name, option);
                
                option.ctx = MENU_options.add("root"
                                , option_name
                                , handler
                                , "canvas"
                                , option.tooltip||option_name)[1].getContext('2d');
                                
                option.handler = handler;
                
                TOOLS.option_update_icon(tool, option_name);
            }
        };
    }
        
    ,options_disable : function(tool) {
        if (tool.options!==undefined) {
            for(var option_name in tool.options) {
                MENU_options.drop(option_name)
            }
        };
    }

        
    ,show : function(tool) {
        var ctx = TOOLS.canvas.getContext('2d');
        ctx.clearRect(0, 0, TOOLS.canvas.width, TOOLS.canvas.height);
        UI.draw_glyph(tool.icon, ctx);
        MENU_main.hide("tools");
    }
    
    ,activate : function(tool_name, background) {
        background = (background===undefined)?false:background;
        
        var tool = TOOLS.tools[tool_name];
        var prev = TOOLS.current;
        
        TOOLS.previous.push(prev);
        
        if (TOOLS.background!=null) {
            if (!background)
                TOOLS.previous.push(tool);
        } else {
            TOOLS.show(tool);
        };

        if (tool.on_activated!==undefined)
            tool.on_activated();
        
        if (background) {
            TOOLS.background = tool;
        } else {
            if (prev!=null) {
                (prev.on_deactivated!==undefined)&&prev.on_deactivated();            
                TOOLS.options_disable(prev);
            };
            TOOLS.options_enable(tool);
            TOOLS.current = tool;
        };

    }
    
    ,deactivate_backtool : function() {
        var prev = TOOLS.previous.pop();
        TOOLS.show(prev);
        TOOLS.background = null;
    }
    
    ,init : function() {
        // shows current tool (pen / eraser / texter). sub: tool glyphs
        [TOOLS.div, TOOLS.canvas] = MENU_main.add("root", "tools", null, "canvas");
        
        UI.addEventListener("on_key_down",TOOLS.on_key_down);
        UI.addEventListener("on_key_up",TOOLS.on_key_up);
        UI.addEventListener("on_wheel",TOOLS.on_wheel);
        UI.addEventListener("on_start",TOOLS.on_start);
        UI.addEventListener("on_move",TOOLS.on_move);
        UI.addEventListener("on_stop",TOOLS.on_stop);
        UI.addEventListener("on_paste_strokes",TOOLS.on_paste_strokes);
    }
    
    ,add_tool : function(tool, visible, title) {
        visible = (visible===undefined)?true:visible;
        
        TOOLS.tools[tool.name] = tool;
        
        if (visible) {
            [tool.div, tool.canvas] = MENU_main.add("tools", tool.name, ((tool_name)=>{
                return ()=>{
                    TOOLS.activate(tool_name);
                }
            })(tool.name), "canvas", title);
            
            UI.draw_glyph(tool.icon, tool.canvas.getContext('2d'));
        };
        
    }
    
    // events
    ,on_key_down : function(key) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_key_down!=undefined)&&(TOOLS.background.on_key_down(key))) {
            return true;
        };
        if ((TOOLS.current.on_key_down!=undefined)&&(TOOLS.current.on_key_down(key))) {
            return true;
        };

        for (const tool_name in TOOLS.tools) {
            const tool = TOOLS.tools[tool_name];
            if (tool.activation_key == key) {
                TOOLS.activate(tool_name, true); // activate as a background tool
                return true;
            } else if ((tool.shortcut!==undefined)&&(UI.keys[tool.shortcut[0]])&&(tool.shortcut[1] == key)) {
                TOOLS.activate(tool_name); // activate as a foreground
                return true;
            };
        };
        
        if (key=="Escape") {
            (TOOLS.background!=null)&&(TOOLS.background.cancel!=undefined)&&(TOOLS.background.cancel());
            (TOOLS.current!=null)&&(TOOLS.current.cancel!=undefined)&&(TOOLS.current.cancel());
        };
        
        return false;
    }
 
    ,on_key_up : function(key) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_key_up!=undefined)&&(TOOLS.background.on_key_up(key))) {
            return true;
        } else if ((TOOLS.current.on_key_up!=undefined)&&(TOOLS.current.on_key_up(key))) {
            return true;
        };

        if ((TOOLS.background!=null)&&(TOOLS.background.activation_key==key)) 
            TOOLS.deactivate_backtool(); // deactivate background tool
        
        return false;
    }
    
    ,on_wheel : function(delta) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_wheel!=undefined)&&(TOOLS.background.on_wheel(delta))) {
            return true;
        } else if ((TOOLS.current.on_wheel!=undefined)&&(TOOLS.current.on_wheel(delta))) {
            return true;
        };
        return false;
    }
    
    ,on_start : function(lp) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_start!=undefined)&&(TOOLS.background.on_start(copy(lp)))) {
            return true;
        } else if ((TOOLS.current.on_start!=undefined)&&(TOOLS.current.on_start(copy(lp)))) {
            return true;
        };
        return false;
    }
    
    ,on_move : function(lp) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_move!=undefined)&&(TOOLS.background.on_move(copy(lp)))) {
            return true;
        } else if ((TOOLS.current.on_move!=undefined)&&(TOOLS.current.on_move(copy(lp)))) {
            return true;
        };
        return false;
    }    
    
    ,on_stop : function(lp) {
        if ((TOOLS.background!=null)&&(TOOLS.background.on_stop!=undefined)&&(TOOLS.background.on_stop(copy(lp)))) {
            return true;
        } else if ((TOOLS.current.on_stop!=undefined)&&(TOOLS.current.on_stop(copy(lp)))) {
            return true;
        };
        return false;
    }    

    ,on_paste_strokes : function(strokes) {
        //console.log('strokes:',strokes);
        if ((TOOLS.background!=null)&&(TOOLS.background.on_paste_strokes!=undefined)&&(TOOLS.background.on_paste_strokes(strokes))) {
            return true;
        } else if ((TOOLS.current.on_paste_strokes!=undefined)&&(TOOLS.current.on_paste_strokes(strokes))) {
            return true;
        };
        return false;
    }    
    
}

// TOOLS ITEMS
let PAN_ZOOM = { // background tool 
    icon : [null,[23,49],[30,55],[37,49],null,[35,11],[29,6],[24,12],null,[29,6],[30,18],null,[30,42],[30,55],null,[11,24],[6,30],[11,35],null,[48,34],[54,30],[49,24],null,[54,30],[42,30],null,[18,30],[6,30],null,[30,25],[30,34],null,[24,30],[35,30],null,[25,12],[29,6],[35,11],null,[36,49],[30,55],[24,49],null,[12,25],[6,30],[11,35],null,[48,25],[54,30],[48,34]]
           
    ,name : "panzoom"
    ,activation_key : "Control"
    
    ,moving : false
    ,last_point : null
    
    ,on_start : function(lp) {
        PAN_ZOOM.moving = true;
        PAN_ZOOM.last_point = lp;
        return true;
    }
    
    ,on_move : function(lp) {
        if (PAN_ZOOM.moving) {
            UI.viewpoint_shift(
                 (PAN_ZOOM.last_point.X - lp.X) / UI.viewpoint.scale
                ,(PAN_ZOOM.last_point.Y - lp.Y) / UI.viewpoint.scale
            );
        };
        
        if ((lp.D!=undefined)&&(PAN_ZOOM.last_point.D!=undefined))
            UI.viewpoint_zoom(lp.D / PAN_ZOOM.last_point.D, PAN_ZOOM.last_point);
        
        PAN_ZOOM.last_point = lp;
        return true;
    }
    
    ,on_stop : function(lp) {
        PAN_ZOOM.moving = false;
        return true;
    }

    ,on_wheel : function(delta) {
        var scale = 1.2;
        
        if (delta > 0)
            scale = 1.0 / scale;
        
        if (PAN_ZOOM.last_point!=null)
            UI.viewpoint_zoom(scale, PAN_ZOOM.last_point);
        
        return true;
    }

}

let UNDO = { // background tool
     icon : [null,[21,8],[11,17],[21,25],null,[23,16],[11,17],null,[22,15],[29,15],[35,16],[41,18],[46,22],[49,27],[50,32],[49,38],[46,43],[41,47],null,[22,19],[26,19],[34,19],[41,21],[46,25],[49,29],[50,34],[48,40],[43,45],[37,49],[27,50],null,[11,17],[22,10],null,[10,17],[22,23],null,[38,48],[30,50]]

    ,name : "undo"
    
    ,activation_key : "Backspace"
    
    ,on_activated : function() {
        BOARD.rollback();
        UI.redraw();
    }
    
}



var DrawToolBase = {

    DrawToolBase : function(name, cyclic, shortcut) {
        this.name = name;
        this.cyclic = cyclic;
        this.shortcut = shortcut;
        
        this.activated = false;
        this.start_point = null;
        this.last_point = null;
    }

    ,on_start : function(lp) {
        this.activated = true;
        this.start_point = lp;
        this.last_point = lp;
    }

    ,draw : function(){throw 'DrawToolBase.draw should be defined';}

    ,on_move : function(lp) {
        if (this.activated) {
            UI.reset_layer("overlay");
            this.draw(this.start_point, lp, UI.add_overlay_stroke);
            this.last_point = lp;
        } else {
            UI.reset_layer("overlay");
            UI.add_overlay_stroke(lp, lp, {
                color : BRUSH.get_color("2")
            });
        };
    }
    
    ,on_stop : function(lp) {
        if (this.activated) {
            UI.reset_layer("overlay");
            this.draw(this.start_point, lp, BOARD.add_buffer_stroke);        
            BOARD.flush_commit();
        };
        this.activated = false;
    }

    ,cancel : function() {
        UI.reset_layer("overlay");
        this.activated = false;
    }
    
}

var PenTool = {
    super : DrawToolBase
    
    ,icon : [null,[6,45],[13,53],[46,23],[39,15],[6,45],null,[43,11],[51,19],[55,8],[43,11],null,[12,47],[40,21],null,[13,53],[6,45],[39,15],null,[13,53],[46,23],[39,15],null,[43,11],[51,19],[55,8],[44,11],null,[47,15],[55,8],null,[6,45],[46,23],null,[13,53],[39,16]]
     
    ,PenTool : function() {
        DrawToolBase.init.call(this, "pen", false, ["Control", "p"]);
    }
    
    ,draw : function(sp, lp, func) {
        // TODO: if dist(PEN.last_point,p)*viewpoint.zoom > threshold
        BOARD.add_buffer_stroke(this.last_point, lp);
    }

    ,cancel : function() {
        if ((this.activated)&&(BOARD.flush_commit())) {
            BOARD.rollback();
            UI.redraw();
        };
        this.activated = false;
    }
}

var EraserTool = {
    super : DrawToolBase
    
    ,icon : [null,[35,10],[24,26],[39,36],[50,20],[35,10],null,[15,40],[21,31],[36,42],null,[44,21],[36,16],[30,25],[38,30],[44,21],null,[39,21],[35,25],null,[50,20],[35,10],[24,26],[39,36],[50,20],null,[42,27],[32,20],null,[41,18],[34,29],null,[45,20],[37,31],null,[38,15],[30,26],null,[15,40],[24,46],null,[36,42],[33,46],[24,46],null,[18,36],[33,46],null,[25,34],[19,43],null,[29,37],[24,45],null,[33,40],[29,46],null,[5,51],[22,51],null,[35,51],[54,51],null,[5,51],[16,51],null,[54,51],[41,51]]
     
    ,EraserTool : function() {
        DrawToolBase.init.call(this, "eraser", false, ["Control", "e"]);
    }
    
    ,touches : function(gp, stroke) {
        var dst = dst2seg(gp
                          ,stroke.gp[0]
                          ,stroke.gp[1]
        );
        return (dst < ((BRUSH.size + stroke.width)/2.0));        
    }    
    
    ,on_start : function(lp) {
        DrawToolBase.on_start.call(this, lp);
        BOARD.op_start();
    }    
    
    ,draw : function(sp, lp, func) {
        var erased = false;
        var gp = UI.local_to_global(lp);
        for(var i=0; i<BOARD.strokes.length; i++) {
            if (BOARD.strokes[i].gp[0]==null)
                continue;
                
            if (BOARD.strokes[i].erased!=undefined)
                continue;

            if (BOARD.strokes[i].erased>0)
                continue;
                
            if (!(this.touches(gp, BOARD.strokes[i])))
                continue;
                
            BOARD.strokes[i].erased = BOARD.stroke_id;
            erased = true;
        };
        
        if (erased) {
            UI.redraw();
        };
        
        UI.add_overlay_stroke(lp, lp, {color : "#9335"});
    }

    ,on_stop : function(lp) {
        this.activated = false;

        var erased = BOARD.strokes.reduce((a, stroke)=>{
            if (stroke.erased==BOARD.stroke_id) {
                stroke.erased = -stroke.erased;
                a.push(stroke);
            };
            return a;
        }, []);

        if (erased.length>0) {
            BOARD.undo_strokes(erased);
            BOARD.add_stroke({gp:[null, "erase"]});
        };
        
        BOARD.op_commit();
        UI.redraw();
        
        DrawToolBase.on_move.call(this, lp);
    }

    ,cancel : function() {
        this.activated = false;
    }
}

var SelectorTool = {
    super : DrawToolBase

    ,icon : [null,[6,12],[6,18],null,[7,24],[6,30],null,[6,36],[7,42],null,[7,49],[6,55],null,[12,54],[18,54],null,[25,54],[30,55],null,[36,55],[42,54],null,[48,54],[54,54],null,[54,48],[54,42],null,[54,36],[54,30],null,[54,24],[54,18],null,[54,12],[54,6],null,[48,6],[42,6],null,[36,5],[30,5],null,[25,6],[18,6],null,[12,6],[7,6],null,[54,46],[54,54],[48,54],null,[55,55],[54,46],null,[12,54],[6,55],[11,54],null,[6,55],[6,49],null,[6,54],[7,49],null,[7,6],[12,6],null,[6,12],[6,6],[6,12],null,[55,6],[55,12],null,[48,6],[54,5],[48,6]]
    ,COLOR : "#F33A"
    ,COLOR_COPYPASTE : "#3F3A"
    ,WIDTH : 6
    ,USE_SYSTEM_CLIPBOARD : true
    ,NAME : "selector"
    
    ,SelectorTool : function() {
        DrawToolBase.init.call(this, "selector", false, ["Control", "s"]);
    }

    ,mode : 0 // 0:selecting / 1:selected / 2:moving / 3:scale / 4:rotate
    
    ,original_strokes : {}
    
    ,selection : null
    ,selection_center : null
    ,selection_rect : null

    ,init : function() {
        var ctx = MENU_main.add("root", "delete", SelectorTool.DELETE.on_activated, "canvas", "delete selected[del]")[1].getContext('2d');
        UI.draw_glyph(SelectorTool.DELETE.icon, ctx);

        SelectorTool.DELETE.selector = this;

        // default strokes paste override
        UI.on_paste_strokes_default = (strokes)=>{
            debug('selector:on_paste_strokes_default');
            
            TOOLS.activate(SelectorTool.NAME);
            
            this.last_point = {
                 X : UI.window_width/2
                ,Y : UI.window_height/2
            };
            
            this.paste(strokes);
            //UI.redraw();
        };
    }

    ,_save_selected : function() {
        var was = new Set();

        this.original_strokes = {};
        
        this.selection.map((sl)=>{
            var stroke = BOARD.strokes[sl.stroke_idx];
            if (!was.has(stroke.stroke_id)) {
                this.original_strokes[sl.stroke_idx] = deepcopy(stroke);
                was.add(stroke.stroke_id);
            };
        });
        
    }

    ,_replace_changed : function() {
        var new_strokes = [];
        var old_strokes = [];
        for(var idx in this.original_strokes) {
            var old_stroke = this.original_strokes[idx];
            // capture changed strokes
            if (!(BOARD.strokes[idx].erased>=0))
                new_strokes.push(deepcopy(BOARD.strokes[idx]));
            // return original strokes back
            BOARD.strokes[idx] = old_stroke;
            old_strokes.push(old_stroke);
        };
        
        // delete original strokes
        BOARD.undo_strokes(old_strokes);
        BOARD.add_stroke({gp:[null, "erase"]});

        // add new strokes
        var offset = BOARD.strokes.length; 
        BOARD.flush(new_strokes, false);            
        
        // remap selection to new strokes
        var idmap = {};
        var idxmap = {};
        new_strokes.map((stroke, idx)=>{
            idmap[old_strokes[idx].stroke_id] = stroke.stroke_id;
            idxmap[old_strokes[idx].stroke_id] = offset + idx;
        });
        
        this.selection = this.selection.reduce((a, sl, si)=>{
            if (sl.stroke_id in idxmap) {
                sl.stroke_idx = idxmap[sl.stroke_id];
                sl.stroke_id = idmap[sl.stroke_id];
                a.push(sl);
            };
            return a;
        }, []);
        
        if (this.selection.length) {
            this.get_selection_bounds();
            this.draw_selected();
        } else {
            this.activated = false;
            this.selection = null;
        };
        
    }

    ,draw_selecting : function(sp, lp) {
        UI.reset_layer("overlay");

        var ctx = UI.contexts[UI.LAYERS.indexOf("overlay")];
        
        var rect = UI.get_rect([sp, lp]);
        
        var figure = [
            rect[0], {X:rect[1].X, Y:rect[0].Y},
            rect[1], {X:rect[0].X, Y:rect[1].Y}
        ];

        figure = UI.figure_split(figure, true, 2*SelectorTool.WIDTH);
        
        figure.map((p,pi)=>{
            if (pi%2==0)
                return;
            UI.draw_stroke(p, figure[(pi+1) % figure.length], SelectorTool.COLOR, SelectorTool.WIDTH, ctx);
        });
    }

    ,draw_selected : function() {
        var ctx = UI.contexts[UI.LAYERS.indexOf("overlay")];
        UI.reset_layer("overlay");

        var W = SelectorTool.WIDTH;
        
        // draw selected center
        var lp = UI.global_to_local(this.selection_center);
        UI.draw_stroke(lp, lp, SelectorTool.COLOR, W*2, ctx);
        UI.draw_stroke(lp, lp, SelectorTool.COLOR_COPYPASTE, W, ctx);
        
        var rect = this.selection_rect.map((p)=>{return UI.global_to_local(p);});
        var figure = [
            {X:rect[0].X-W, Y:rect[0].Y-W}, {X:rect[1].X+W, Y:rect[0].Y-W},
                                            {X:rect[1].X+W, Y:rect[1].Y+W}, 
            {X:rect[0].X-W, Y:rect[1].Y+W}
        ];
        
        var d = W * 2;
        var figures = [
             [{X:figure[0].X,Y:figure[0].Y+d}, figure[0], {X:figure[0].X+d,Y:figure[0].Y}]
            ,[{X:figure[1].X-d,Y:figure[1].Y}, figure[1], {X:figure[1].X,Y:figure[1].Y+d}]
            ,[{X:figure[2].X,Y:figure[2].Y-d}, figure[2], {X:figure[2].X-d,Y:figure[2].Y}]
            ,[{X:figure[3].X+d,Y:figure[3].Y}, figure[3], {X:figure[3].X,Y:figure[3].Y-d}]
        ];
        
        // draw rect
        figures.map((f,fi)=>{
            f.map((p,pi)=>{
                if (pi < f.length-1)
                    UI.draw_stroke(
                         p
                        ,f[(pi+1) % f.length]
                        ,SelectorTool.COLOR
                        ,W
                        ,ctx
                    );
            });
        });

        // draw ancor mode selectors
        // rotator
        lp = figure[1];
        ctx.beginPath();
        ctx.arc(lp.X, lp.Y, d/2, Math.PI, Math.PI/2);
        ctx.stroke();
        
        // scaler
        lp = figure[2];
        ctx.beginPath();
        ctx.rect(lp.X-d/2, lp.Y-d/2, d, d);
        ctx.stroke();

        // optimizer
        lp = {
             X: figure[1].X
            ,Y:(figure[1].Y + figure[2].Y)/2
        };
        UI.draw_stroke({X:lp.X-d/2,Y:lp.Y-d/2},{X:lp.X+d/2,Y:lp.Y+d/2}, SelectorTool.COLOR_COPYPASTE, W, ctx);
        UI.draw_stroke({X:lp.X+d/2,Y:lp.Y-d/2},{X:lp.X-d/2,Y:lp.Y+d/2}, SelectorTool.COLOR_COPYPASTE, W, ctx);
        
        // copy
        lp = figure[0];
        UI.draw_stroke({X:lp.X,Y:lp.Y},{X:lp.X-d,Y:lp.Y-d}  ,SelectorTool.COLOR_COPYPASTE, W, ctx);
        UI.draw_stroke({X:lp.X-d,Y:lp.Y-d},{X:lp.X,Y:lp.Y-d},SelectorTool.COLOR_COPYPASTE, W, ctx);
        UI.draw_stroke({X:lp.X-d,Y:lp.Y-d},{X:lp.X-d,Y:lp.Y},SelectorTool.COLOR_COPYPASTE, W, ctx);
        
        // paste
        if (this.clipboard.length) {
            lp = figure[3];
            UI.draw_stroke({X:lp.X,Y:lp.Y}, {X:lp.X-d,Y:lp.Y+d}, SelectorTool.COLOR_COPYPASTE, W, ctx);
            UI.draw_stroke({X:lp.X,Y:lp.Y}, {X:lp.X-d,Y:lp.Y}, SelectorTool.COLOR_COPYPASTE, W, ctx);
            UI.draw_stroke({X:lp.X,Y:lp.Y}, {X:lp.X,Y:lp.Y+d}, SelectorTool.COLOR_COPYPASTE, W, ctx);
        };
        
        // draw over selected points
    }
    
    
    ,start_mode : function(mode) {
        BOARD.op_start();
        this._save_selected();
        this.mode = mode;
    }
    
    ,on_start : function(lp) {
        DrawToolBase.on_start.call(this, lp);
        
        if (this.mode==0) { // selecting
            return;
        };
        
        if (this.mode==1) { // selected
            var dst = Math.sqrt(dst2(lp, UI.global_to_local(this.selection_center)));
            var W = SelectorTool.WIDTH;

            if (UI.is_mobile)
                dst /= 3;

            if (dst < W) {
                this.start_mode(2); // move mode
                return;
            };

            var rect = this.selection_rect.map((p)=>{return UI.global_to_local(p);});
            var figure = [
                {X:rect[0].X-W, Y:rect[0].Y-W}, // copy    
                {X:rect[1].X+W, Y:rect[0].Y-W}, // rotate
                {X:rect[1].X+W, Y:rect[1].Y+W}, // scale
                {X:rect[0].X-W, Y:rect[1].Y+W}, // paste
                
                {X:rect[1].X+W, Y:(rect[0].Y+rect[1].Y)/2} // optimize
            ];
            
            var anchor_i = null;
            figure.map((p, pi)=>{
                dst = Math.sqrt(dst2(lp, p));
                
                if (UI.is_mobile)
                    dst /= 3;
                
                if (dst < W) {
                    anchor_i = pi;
                };
            });
            
            if (anchor_i == null) {
                this.mode = 0;
                this.selection = null;
                this.selection_center = null;
                this.selection_rect = null;
                UI.redraw();
                return;
            };
            
            if (anchor_i==0) { // copy
                this.copy();
                
            } else if (anchor_i==1) {
                this.start_mode(4); // rotate mode
                
            } else if (anchor_i==2) {
                this.start_mode(3); // scale mode
                
            } else if (anchor_i==3) { // paste
                if (SelectorTool.USE_SYSTM_CLIPBOARD) {
                    navigator.clipboard.readText().then(text => {
                        UI.on_paste(text, 'text/plain');
                    });
                } else {
                    this.paste(this.clipboard);  
                };
                
            } else if (anchor_i==4) { // optimize
                BOARD.op_start();
                this._save_selected();
                this.optimize();
                this._replace_changed();
                BOARD.op_commit();
                
            }
        };
    }


    ,move_scale : function(lp) {
        if (this.activated) {
            var lpc = UI.global_to_local(this.selection_center);
            var cx = ( (lp.X - lpc.X) / (this.last_point.X - lpc.X) );
            var cy = ( (lp.Y - lpc.Y) / (this.last_point.Y - lpc.Y) );
                        
            this.selection.map((sl)=>{
                var pnt = BOARD.strokes[sl.stroke_idx].gp[sl.point_idx];
                pnt.X -= this.selection_center.X;
                pnt.Y -= this.selection_center.Y;
                
                pnt.X *= cx;
                pnt.Y *= cy;
                
                pnt.X += this.selection_center.X;
                pnt.Y += this.selection_center.Y;
            });

        };
    }

    ,move_rotate : function(lp) {
        if (this.activated) {
            var lcp = UI.global_to_local(this.selection_center);
            var p0 = sub(this.last_point, lcp);
            var p1 = sub(             lp, lcp);
            
            var a = (
                 Math.atan(p0.X / p0.Y)
                -Math.atan(p1.X / p1.Y)
            );
            
            if (Math.abs(a) > 1) a = 0;
            
            this.selection.map((sl)=>{
                var pnt = BOARD.strokes[sl.stroke_idx].gp[sl.point_idx];
                pnt.X -= this.selection_center.X;
                pnt.Y -= this.selection_center.Y;
                
                var rpnt = rotate(pnt, a);
                pnt.X = rpnt.X;
                pnt.Y = rpnt.Y;
                
                pnt.X += this.selection_center.X;
                pnt.Y += this.selection_center.Y;
            });

        };
    }

    
    ,_move_selection : function(dx, dy) {
        this.selection.map((sl)=>{
            var pnt = BOARD.strokes[sl.stroke_idx].gp[sl.point_idx];
            pnt.X += dx;
            pnt.Y += dy;
        });
        
        this.selection_center.X += dx;
        this.selection_center.Y += dy;
        
        this.selection_rect[0].X += dx;
        this.selection_rect[1].X += dx;
        this.selection_rect[0].Y += dy;
        this.selection_rect[1].Y += dy;
    }
    
    ,move_moving : function(lp) {
        if (this.activated) {
            var dx = -(UI.local_to_global(this.last_point).X - UI.local_to_global(lp).X);
            var dy = -(UI.local_to_global(this.last_point).Y - UI.local_to_global(lp).Y);
            this._move_selection(dx, dy);
        };
    }
    
    ,move_selecting : function(lp) {
        if (this.activated) {
            this.draw_selecting(this.start_point, lp);
        };
    }
    
    ,on_move : function(lp) {
        if (this.mode==0) {
            this.move_selecting(lp);
        } else {
            if (this.mode==2) { // moving
                this.move_moving(lp);
            } else if (this.mode==3) { // scaling
                this.move_scale(lp);
            } else if (this.mode==4) { // rotating
                this.move_rotate(lp);
            };
            UI.redraw();
        };
        this.last_point = lp;
    }

    
    ,get_selection_bounds : function() {
        this.selection_rect = UI.get_rect(
            this.selection.map((sl)=>{
                return BOARD.strokes[sl.stroke_idx].gp[sl.point_idx]
            })
        );
        
        this.selection_center = {X:0, Y:0};
        this.selection_center.X = ( this.selection_rect[1].X + this.selection_rect[0].X ) / 2;
        this.selection_center.Y = ( this.selection_rect[1].Y + this.selection_rect[0].Y ) / 2;        
    }
    
    ,stop_selecting : function(lp) {
        UI.reset_layer("overlay");
        var sp = this.start_point;
        
        this.selection = BOARD.get_strokes(UI.get_rect([sp, lp]).map((p)=>{
            return UI.local_to_global(p)
        }), true);
                
        if (this.selection.length>0) {
            this.get_selection_bounds();
            this.draw_selected();
            this.mode = 1;
        };
    }

    ,stop_mode : function(mode) {
        this._replace_changed();
        this.mode = 1;
        BOARD.op_commit();
    }
    
    ,on_stop : function(lp) {
        if (this.mode==0) { // stopped selecting
            this.stop_selecting(lp);

        } else if (this.mode==1) { // this mode is transient, should not happen
        } else {
            this.stop_mode(this.mode); // stopped moving
            
        };
        
        this.activated = false;
    }


    ,clipboard : []
    ,copy : function() {
        var copied = new Set();
        this.clipboard = this.selection.reduce((a, sl)=>{
            var stroke = BOARD.strokes[sl.stroke_idx];
            if (!copied.has(stroke.stroke_id)) {
                copied.add(stroke.stroke_id);
                var c_stroke = deepcopy(stroke);
                c_stroke.gp[0] = UI.global_to_local(c_stroke.gp[0]);
                c_stroke.gp[1] = UI.global_to_local(c_stroke.gp[1]);
                c_stroke.width *= UI.viewpoint.scale;
                a.push(c_stroke);
            };
            return a;
        }, []);
     
        if (SelectorTool.USE_SYSTEM_CLIPBOARD) {
            window.navigator.clipboard.writeText(
                JSON.stringify({
                    "strokes" : this.clipboard
                })
            ).then(console.log('copied to system clipboard'))
        };
     
        this.draw_selected();
    }
    ,paste : function(clipboard) {
        
        var cx = 0;
        var cy = 0;
        clipboard.map((stroke)=>{
            cx += stroke.gp[0].X + stroke.gp[1].X;
            cy += stroke.gp[0].Y + stroke.gp[1].Y;
        });
        cx /= clipboard.length * 2;
        cy /= clipboard.length * 2;
        
        
        BOARD.buffer = [];
        clipboard.map((stroke)=>{
            stroke.gp[0] = UI.local_to_global({
                X : stroke.gp[0].X - cx + this.last_point.X
               ,Y : stroke.gp[0].Y - cy + this.last_point.Y 
            });
            stroke.gp[1] = UI.local_to_global({
                X : stroke.gp[1].X - cx + this.last_point.X
               ,Y : stroke.gp[1].Y - cy + this.last_point.Y 
            });
            stroke.width /= UI.viewpoint.scale;
            BOARD.buffer.push(stroke);
        });
        BOARD.flush_commit();
        
        this.selection = [];
        for(var i=0; i<BOARD.strokes.length; i++) {
            for(var pi=0; pi<2; pi++) {
                if (BOARD.strokes[i].commit_id==BOARD.commit_id) {
                    this.selection.push({
                         stroke_idx : i
                        ,stroke_id : BOARD.strokes[i].stroke_id
                        ,point_idx : pi
                    });
                };
            };
        };
        
        this.get_selection_bounds();
        this.draw_selected();

        this.clipboard = [];
        this.mode = 1;
    }

    ,optimize : function() {
        
        // merge nearby points
        var squeezed = 0;
        for(var i=0; i<this.selection.length; i++) {
            var s0 = this.selection[i];
            var p0 = BOARD.strokes[s0.stroke_idx].gp[s0.point_idx];
            var lp0 = UI.global_to_local(p0);
            
            // TODO: n**2 -> O(logN) with kd
            for(var j=i+1; j<this.selection.length; j++) {
                var s1 = this.selection[j];
                var lp1 = UI.global_to_local(BOARD.strokes[s1.stroke_idx].gp[s1.point_idx]);
                var to = (BOARD.strokes[s0.stroke_idx].width + BOARD.strokes[s1.stroke_idx].width)/2.0;
                var d = dst2(lp0, lp1);
                if (( d < to ) && ( d > 0 )) { 
                    BOARD.strokes[s1.stroke_idx].gp[s1.point_idx] = copy(p0);
                    squeezed += 1;
                };
            };
        };
        console.log("Squeezed: ",squeezed);
        
        
        // delete dots - strokes of length 0
        var deleted = this.selection.reduce((a, s0)=>{
            var ix = s0.stroke_idx;
            var stroke = BOARD.strokes[ix];
            var d = dst2(stroke.gp[0], stroke.gp[1]);
            if ((d==0)&&(!(stroke.erased>0))&&(!(stroke.erased===null))) {
                a.push(stroke);
                stroke.erased=null;
            };
            return a;
        }, []);
        
        if (deleted.length>0) {
            deleted.map((stroke)=>{delete stroke.erased;});
            BOARD.undo_strokes(deleted);
        };
        console.log("Deleted: ", deleted.length);
        
        // 
        if (UI.keys["Shift"]) { // round up opt
            var rounded = 0;
            this.selection.map((s0)=>{
                var ix = s0.stroke_idx;
                if (BOARD.strokes[ix].erased>0)
                    return;

                BOARD.strokes[ix].gp.map((p)=>{
                    if (Math.round(p.X)!=p.X) {
                        p.X = Math.round(p.X);
                        rounded++;
                    };
                    if (Math.round(p.Y)!=p.Y) {
                        p.Y = Math.round(p.Y);
                        rounded++;
                    };
                });
                
            });
            console.log("Rounded: ", rounded);
        };
    }
    
    ,on_key_down : function(key) {
        var keymap = {
            "ArrowUp"    : [0,-1],
            "ArrowDown"  : [0,+1],
            "ArrowLeft"  : [-1,0],
            "ArrowRight" : [+1,0]
        };
        
        if (key=='Escape') {
            this.activated = false;
            this.mode = 0;
            UI.redraw();
        };

        if (this.mode==1) {

            if ((UI.keys["Control"])&&(key=='c')) {
                this.copy();
                
            } else if ((UI.keys["Control"])&&(key=='v')) {
                if (!SelectorTool.USE_SYSTEM_CLIPBOARD) {
                    this.paste(this.clipboard);
                }
                
            } else if (key in keymap) {
                var dxdy = keymap[key];
                var scale = (UI.keys["Control"])?1:5;
                scale = (UI.keys["Shift"])?30:scale;
                scale = scale / UI.viewpoint.scale;
                this._move_selection(dxdy[0]*scale, dxdy[1]*scale);
            };
            
            UI.redraw();
        };

        return false;
    }

    ,on_paste_strokes : function(strokes) {
        if (SelectorTool.USE_SYSTEM_CLIPBOARD) {
            debug('selector:on_paste_strokes');
            this.paste(strokes);
            return true;
        };
    }
    
    ,after_redraw : function() {
        if ((this.mode==1)||(this.mode==2)) {
            this.draw_selected();
        };
    }

    ,DELETE : { // background tool
         icon : [null,[24,55],[21,54],[17,53],null,[43,53],[41,54],[38,55],[34,55],[29,55],[24,55],null,[25,27],[21,27],[16,27],[14,26],[16,24],[19,23],[23,23],[29,23],[34,23],[39,23],[43,24],[45,24],[42,27],[37,27],[32,27],[28,27],[25,27],null,[24,16],[20,16],[16,15],[14,15],[16,13],[19,12],[23,12],[28,11],[33,11],[38,12],[41,12],[44,13],[40,16],[36,16],[32,16],[27,16],[24,16],null,[14,26],[17,53],null,[45,24],[43,53],null,[21,54],[21,27],null,[24,55],[25,27],null,[29,55],[30,28],null,[34,55],[35,28],null,[42,27],[38,55],null,[16,27],[17,53],null,[21,27],[24,55],null,[28,27],[29,55],null,[37,27],[38,55],null,[45,24],[43,53],null,[19,12],[39,14],null,[22,7],[23,12],[22,7],[37,7],null,[22,7],[30,5],[37,7],[38,12],[37,7],null,[23,12],[38,12],null,[14,26],[19,23],null,[23,23],[29,23],null,[31,22],[39,23],[45,24]]

        ,name : "delete"
        
        ,selector : null
        
        ,activation_key : "Delete"
        
        ,on_activated : function() {
            if (SelectorTool.DELETE.selector.mode==1) {
                
                BOARD.op_start();
                
                SelectorTool.DELETE.selector.selection.map((sl)=>{
                    BOARD.strokes[sl.stroke_idx].erased = BOARD.stroke_id;
                });
                
                SelectorTool.DELETE.selector._replace_changed();
                
                BOARD.op_commit();

                SelectorTool.DELETE.selector.mode = 0;
                
                UI.redraw();
            };
        }
    }

}

let ALPHABET = {"0":{"A":[null,[9,-54],[8,-53],[6,-50],[5,-47],[4,-44],[3,-42],[2,-39],[1,-37],[1,-34],[0,-33],[0,-30],[0,-27],[0,-24],[0,-22],[0,-18],[0,-15],[1,-14],[2,-12],[3,-11],[5,-10],[7,-9],[11,-9],[15,-11],[17,-12],[19,-13],[21,-15],[22,-17],[23,-20],[24,-23],[25,-26],[26,-31],[25,-32],[25,-35],[25,-37],[25,-40],[24,-43],[23,-44],[22,-46],[21,-47],[20,-48],[17,-51],[15,-52],[13,-52],[11,-53]],"dx":26},"1":{"A":[null,[2,-36],[5,-38],[6,-39],[8,-41],[9,-42],[10,-43],[11,-44],[12,-45],[13,-46],[14,-47],[15,-48],[15,-46],[15,-44],[14,-42],[14,-40],[14,-37],[13,-35],[13,-33],[13,-31],[12,-27],[11,-24],[11,-21],[11,-18],[11,-16],[11,-14],null,[0,-8],[2,-9],[4,-9],[6,-10],[7,-11],[9,-12],[11,-12],[13,-12],[16,-13]],"dx":16},"2":{"A":[null,[3,-40],[3,-43],[4,-45],[6,-47],[8,-48],[9,-49],[12,-50],[14,-50],[16,-49],[17,-48],[18,-47],[18,-45],[19,-42],[19,-39],[19,-36],[19,-34],[19,-31],[18,-29],[17,-28],[15,-27],[13,-25],[12,-24],[11,-23],[9,-21],[7,-20],[6,-19],[5,-18],[4,-16],[3,-15],[2,-14],[1,-13],[0,-12],[1,-13],[2,-14],[3,-15],[4,-16],[5,-18],[8,-19],[10,-19],[12,-18],[15,-17],[16,-16],[17,-15],[18,-14],[19,-13],[20,-12],[21,-11]],"dx":21},"3":{"A":[null,[3,-52],[5,-53],[7,-54],[9,-54],[10,-53],[12,-53],[13,-52],[14,-51],[17,-47],[17,-45],[17,-42],[17,-40],[17,-37],[16,-36],[15,-35],[14,-34],[13,-33],[12,-32],[8,-31],[7,-32],[5,-32],[7,-32],[8,-31],[9,-32],[12,-32],[13,-33],[14,-32],[15,-31],[16,-28],[17,-25],[17,-22],[16,-19],[16,-17],[15,-15],[13,-14],[11,-13],[9,-13],[7,-13],[5,-13],[2,-13],[0,-13]],"dx":17},"4":{"A":[null,[1,-47],[1,-44],[1,-42],[1,-40],[1,-38],[1,-36],[1,-34],[1,-32],[1,-29],[1,-27],[0,-25],[2,-23],[4,-24],[7,-25],[10,-25],[12,-26],[14,-27],[16,-28],null,[20,-49],[19,-47],[19,-45],[19,-43],[19,-41],[19,-38],[19,-36],[19,-33],[19,-29],[19,-26],[18,-25],[18,-23],[19,-22],[18,-20],[18,-17],[18,-14],[19,-13],[19,-11]],"dx":20},"5":{"A":[null,[11,-51],[10,-49],[8,-46],[7,-44],[6,-42],[5,-38],[5,-35],[4,-34],[4,-31],[3,-29],[3,-27],[2,-26],[3,-27],[4,-28],[6,-29],[8,-30],[10,-30],[13,-30],[16,-29],[17,-28],[19,-27],[20,-24],[21,-23],[22,-20],[22,-18],[22,-15],[21,-12],[20,-11],[19,-10],[17,-10],[14,-9],[12,-9],[8,-8],[7,-9],[4,-9],[2,-9],[0,-9],null,[11,-51],[13,-51],[16,-51],[19,-51],[21,-52],[24,-52],[26,-52]],"dx":26},"6":{"A":[null,[19,-53],[17,-53],[16,-52],[14,-50],[13,-49],[9,-47],[8,-45],[7,-44],[6,-42],[4,-40],[3,-38],[2,-37],[1,-35],[1,-33],[0,-29],[0,-27],[0,-25],[0,-23],[0,-21],[1,-20],[2,-17],[3,-15],[5,-14],[6,-13],[8,-12],[10,-12],[13,-12],[15,-12],[17,-13],[18,-14],[19,-15],[21,-16],[22,-18],[24,-20],[25,-22],[25,-24],[25,-26],[24,-27],[23,-30],[22,-31],[21,-32],[19,-33],[15,-33],[13,-34],[11,-34],[9,-33],[7,-33],[4,-32]],"dx":25},"7":{"A":[null,[0,-48],[2,-48],[4,-49],[8,-49],[10,-50],[14,-50],[18,-51],[20,-51],[22,-52],[25,-52],[28,-53],[27,-50],[25,-48],[24,-45],[22,-44],[21,-40],[15,-31],[14,-28],[13,-25],[12,-24],[10,-22],[9,-20],[8,-18],[7,-16],[7,-13],[6,-11],[6,-9],null,[1,-24],[3,-25],[8,-26],[11,-27],[14,-28],[16,-28],[18,-29],[20,-30],[22,-30],[23,-31]],"dx":28},"8":{"A":[null,[10,-47],[12,-49],[13,-50],[16,-50],[17,-49],[18,-47],[19,-46],[19,-43],[19,-41],[18,-38],[17,-37],[16,-36],[15,-34],[14,-31],[13,-30],[12,-28],[10,-26],[9,-25],[7,-23],[5,-22],[3,-21],[2,-19],[1,-18],[0,-15],[1,-13],[2,-10],[4,-9],[5,-8],[8,-8],[10,-7],[14,-7],[17,-8],[19,-8],[20,-9],[21,-11],[22,-12],[22,-14],[22,-16],[22,-18],[21,-20],[20,-22],[18,-24],[17,-25],[16,-27],[13,-30],[11,-32],[8,-34],[7,-35],[6,-36],[5,-38],[4,-42],[3,-44],[3,-47],[3,-49]],"dx":22},"9":{"A":[null,[17,-50],[15,-50],[13,-51],[10,-50],[7,-49],[5,-48],[3,-47],[2,-45],[1,-43],[0,-40],[0,-38],[0,-35],[1,-34],[2,-32],[5,-31],[7,-31],[10,-32],[11,-33],[14,-34],[15,-36],[17,-37],[18,-38],[19,-41],[20,-43],[20,-45],[21,-44],[21,-42],[21,-39],[21,-37],[21,-35],[21,-32],[21,-30],[21,-28],[20,-25],[20,-23],[19,-20],[18,-19],[17,-18],[14,-17],[13,-16],[9,-15],[6,-15],[4,-14],[2,-14],[0,-15]],"dx":21},"-":{"A":[null,[0,-32],[2,-32],[5,-32],[9,-32],[11,-32],[14,-32],[17,-32],[19,-33],[22,-33],[24,-33],[27,-33]],"dx":27},"=":{"A":[null,[0,-38],[2,-38],[4,-38],[6,-39],[8,-39],[10,-39],[13,-39],[16,-39],[18,-39],[20,-39],[22,-38],[25,-39],[26,-38],null,[1,-20],[4,-20],[7,-20],[9,-20],[12,-20],[14,-20],[16,-20],[18,-20],[21,-20],[23,-20],[26,-20],[28,-20]],"dx":28},"q":{"A":[null,[16,-29],[14,-29],[10,-29],[7,-29],[6,-28],[4,-26],[2,-23],[1,-22],[0,-19],[0,-17],[0,-15],[1,-13],[2,-11],[5,-9],[7,-9],[9,-9],[10,-10],[13,-11],[15,-13],[17,-15],[18,-17],[19,-19],[19,-21],[19,-19],[19,-16],[18,-13],[17,-9],[16,-7],[16,-5],[15,-2],[15,0],[15,2],[14,4],[14,6],[13,8],[13,10],[12,13],[12,16],[14,15],[16,12],[18,8],[19,7],[20,6],[22,4],[24,3],[26,2],[27,0]],"dx":27},"w":{"A":[null,[0,-31],[1,-29],[1,-26],[1,-23],[1,-20],[2,-19],[3,-15],[4,-13],[5,-12],[7,-11],[9,-11],[11,-11],[13,-12],[16,-14],[17,-17],[18,-18],[19,-20],[20,-23],[21,-24],[21,-26],[21,-28],[21,-26],[21,-24],[21,-21],[21,-19],[22,-16],[22,-14],[22,-12],[23,-11],[24,-10],[26,-9],[28,-9],[30,-11],[32,-12],[33,-16],[34,-19],[35,-21],[36,-24],[37,-27],[37,-30],[38,-33]],"dx":38},"e":{"A":[null,[1,-20],[4,-20],[6,-20],[8,-21],[10,-21],[12,-22],[14,-23],[15,-24],[16,-26],[16,-28],[16,-31],[15,-33],[13,-34],[12,-35],[9,-35],[7,-34],[5,-34],[4,-33],[2,-29],[0,-27],[0,-25],[0,-23],[1,-20],[2,-16],[4,-12],[6,-11],[8,-10],[11,-9],[13,-8],[17,-8],[18,-7],[21,-7],[23,-7]],"dx":23},"r":{"A":[null,[0,-7],[0,-10],[0,-12],[0,-15],[0,-17],[0,-20],[0,-24],[1,-25],[2,-27],[3,-29],[4,-30],[6,-30],[10,-29],[11,-27],[12,-26],[13,-25],[15,-24],[18,-25],[20,-26],[21,-28]],"dx":21},"t":{"A":[null,[12,-50],[11,-48],[10,-45],[10,-43],[9,-40],[8,-37],[8,-35],[8,-32],[8,-29],[8,-26],[9,-22],[9,-20],[9,-16],[9,-14],[10,-13],[11,-11],[14,-11],[16,-11],[20,-11],[23,-12],[26,-12],[29,-13],[32,-13],null,[0,-34],[5,-35],[8,-35],[10,-34],[14,-34],[15,-33],[18,-33],[21,-33],[23,-33]],"dx":32},"y":{"A":[null,[2,-26],[1,-23],[1,-19],[1,-16],[2,-12],[2,-10],[4,-8],[6,-6],[12,-5],[14,-6],[17,-8],[20,-10],[21,-11],[22,-12],[23,-15],[24,-18],[25,-22],[25,-25],[25,-22],[25,-20],[25,-16],[26,-13],[26,-11],[26,-7],[26,-3],[25,0],[25,5],[24,10],[24,12],[22,16],[20,20],[19,23],[18,26],[16,29],[13,31],[11,31],[8,30],[5,29],[3,27],[1,24],[0,20],[1,16],[4,13],[8,11],[11,9],[15,7],[18,5],[22,2],[25,0]],"dx":26},"u":{"A":[null,[1,-37],[1,-34],[1,-30],[0,-26],[0,-23],[0,-19],[0,-17],[0,-15],[1,-14],[2,-13],[6,-13],[8,-13],[11,-15],[13,-17],[15,-18],[16,-20],[17,-21],[18,-24],[19,-26],[20,-27],[20,-30],[21,-31],[22,-32],[22,-34],[22,-32],[23,-30],[24,-26],[24,-23],[24,-19],[24,-17],[24,-14],[25,-12]],"dx":25},"i":{"A":[null,[0,-26],[1,-27],[3,-29],[5,-31],[6,-32],[7,-33],[8,-35],[9,-37],[9,-39],null,[10,-38],[9,-37],[10,-34],[10,-32],[10,-30],[10,-26],[9,-25],[9,-23],[9,-21],[9,-19],[9,-17],[9,-15],[9,-13],[8,-12],[10,-11],[13,-12],[15,-13],null,[10,-53],[10,-53],[10,-53],[10,-53],[10,-53],[10,-53],[10,-53]],"dx":15},"o":{"A":[null,[8,-30],[6,-29],[5,-28],[3,-26],[2,-24],[1,-23],[0,-21],[0,-19],[0,-16],[1,-14],[2,-12],[4,-10],[7,-9],[10,-9],[12,-10],[15,-11],[16,-12],[17,-14],[18,-15],[19,-18],[20,-21],[19,-23],[18,-26],[17,-27],[16,-28],[13,-29],[12,-30],[10,-30]],"dx":20},"p":{"A":[null,[6,-25],[6,-22],[5,-19],[4,-17],[3,-13],[3,-10],[2,-5],[2,-3],[2,1],[1,5],[1,9],[1,12],[1,16],[0,18],[0,21],null,[7,-27],[10,-29],[12,-30],[14,-30],[17,-30],[19,-30],[20,-29],[22,-28],[23,-27],[24,-24],[25,-23],[25,-20],[25,-17],[25,-15],[25,-13],[24,-12],[22,-9],[20,-8],[18,-7],[16,-7],[14,-7],[11,-7]],"dx":25},"a":{"A":[null,[18,-36],[17,-37],[14,-38],[12,-38],[10,-37],[8,-37],[6,-35],[5,-34],[3,-32],[2,-29],[1,-26],[1,-24],[0,-21],[0,-17],[1,-16],[1,-14],[3,-12],[4,-11],[8,-11],[10,-11],[12,-12],[14,-13],[15,-14],null,[26,-38],[25,-36],[24,-34],[23,-33],[23,-30],[22,-29],[22,-27],[22,-24],[22,-20],[22,-18],[23,-15],[24,-13],[25,-11],[28,-10]],"dx":28},"s":{"A":[null,[16,-34],[15,-35],[13,-36],[11,-36],[9,-36],[7,-35],[5,-34],[4,-33],[4,-30],[4,-28],[5,-26],[6,-24],[7,-22],[8,-21],[10,-19],[11,-18],[13,-17],[15,-16],[16,-15],[17,-14],[17,-12],[15,-11],[12,-10],[9,-9],[7,-9],[3,-8],[2,-9],[0,-9]],"dx":17},"d":{"A":[null,[15,-27],[13,-28],[9,-28],[6,-27],[4,-25],[2,-23],[0,-17],[0,-14],[1,-12],[2,-11],[5,-10],[8,-10],[10,-10],[12,-10],[14,-11],null,[24,-54],[24,-50],[24,-48],[24,-46],[23,-44],[23,-41],[23,-38],[22,-37],[22,-34],[22,-31],[21,-30],[21,-27],[21,-24],[21,-22],[21,-18],[22,-17],[22,-15],[23,-13],[23,-11],[24,-10]],"dx":24},"f":{"A":[null,[20,-48],[18,-48],[16,-48],[14,-48],[13,-47],[12,-46],[9,-44],[9,-42],[8,-41],[8,-39],[8,-37],[9,-35],[10,-32],[11,-30],[12,-27],[13,-23],[14,-20],[15,-19],[15,-15],[15,-13],[14,-11],[13,-8],[10,-7],[8,-7],[7,-6],[4,-6],[0,-6],null,[2,-25],[4,-26],[8,-27],[12,-27],[15,-27],[17,-28],[19,-28],[21,-28]],"dx":21},"g":{"A":[null,[19,-27],[17,-28],[16,-29],[13,-29],[11,-28],[10,-27],[8,-26],[6,-24],[4,-21],[3,-18],[3,-15],[4,-12],[8,-10],[9,-9],[11,-9],[13,-9],[15,-9],[18,-10],[19,-11],null,[19,-27],[20,-25],[21,-23],[21,-20],[21,-17],[21,-13],[21,-8],[21,-6],[20,-1],[20,4],[20,6],[20,11],[20,16],[20,19],[19,24],[19,28],[18,29],[17,32],[15,33],[13,34],[11,35],[9,35],[5,34],[4,33],[2,29],[1,26],[0,22],[1,19],[1,17],[4,13],[6,11],[10,6],[14,0],[16,-2]],"dx":21},"h":{"A":[null,[2,-50],[1,-48],[1,-46],[1,-42],[0,-40],[0,-37],[0,-33],[0,-29],[0,-27],[0,-23],[0,-20],[0,-16],[0,-12],[0,-10],null,[3,-30],[4,-31],[7,-33],[11,-33],[14,-33],[16,-32],[17,-31],[18,-29],[19,-27],[19,-23],[19,-21],[19,-19],[19,-16],[19,-14]],"dx":19},"j":{"A":[null,[14,-39],[14,-36],[14,-34],[14,-32],[14,-30],[14,-28],[14,-26],[14,-23],[15,-20],[15,-17],[15,-15],[16,-13],[15,-11],[15,-9],[14,-8],[13,-6],[12,-5],[10,-5],[8,-5],[6,-5],[5,-6],[4,-7],[3,-8],[1,-11],[0,-13],null,[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-54],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53],[13,-53]],"dx":16},"k":{"A":[null,[1,-33],[1,-30],[0,-28],[1,-25],[1,-21],[1,-19],[1,-16],[1,-14],[1,-12],[0,-10],[0,-8],null,[16,-34],[15,-32],[13,-29],[12,-26],[11,-24],[10,-22],[8,-20],[8,-18],[7,-17],[8,-15],[11,-14],[13,-14],[14,-13],[15,-12],[16,-11],[18,-10],[19,-8],[20,-7]],"dx":20},"l":{"A":[null,[2,-25],[2,-27],[5,-29],[6,-30],[7,-31],[10,-34],[11,-35],[14,-39],[15,-41],[17,-44],[18,-48],[18,-50],[18,-52],[16,-55],[14,-55],[12,-55],[10,-54],[9,-52],[8,-51],[7,-48],[5,-45],[4,-43],[3,-38],[2,-36],[2,-34],[1,-31],[0,-27],[0,-25],[0,-21],[0,-19],[1,-17],[1,-14],[2,-12],[3,-10],[5,-8],[7,-8],[10,-8],[14,-10],[16,-11]],"dx":18},"z":{"A":[null,[0,-29],[2,-30],[4,-30],[8,-30],[11,-29],[13,-29],[15,-29],[16,-28],[15,-27],[14,-26],[12,-24],[10,-22],[8,-20],[7,-18],[6,-17],[4,-15],[3,-13],[2,-11],[1,-10],[0,-9],[1,-8],[5,-8],[9,-8],[13,-8],[15,-8],[18,-8],[21,-9]],"dx":21},"x":{"A":[null,[1,-32],[2,-30],[3,-27],[5,-25],[6,-22],[9,-19],[10,-18],[11,-15],[13,-13],[14,-11],null,[18,-33],[17,-32],[15,-29],[13,-26],[11,-24],[10,-22],[9,-19],[7,-17],[6,-16],[4,-14],[3,-12],[1,-11],[0,-10]],"dx":18},"c":{"A":[null,[21,-35],[18,-36],[16,-36],[13,-36],[10,-35],[9,-34],[7,-33],[6,-32],[5,-31],[3,-28],[1,-25],[0,-22],[0,-20],[0,-17],[0,-14],[2,-11],[3,-10],[4,-9],[6,-8],[11,-8],[15,-9],[18,-10],[20,-10]],"dx":21},"v":{"A":[null,[0,-26],[1,-25],[3,-22],[4,-20],[5,-17],[6,-14],[7,-12],[8,-10],[9,-9],[10,-8],[12,-9],[14,-13],[15,-17],[17,-20],[18,-22],[19,-25],[20,-27],[22,-28],[23,-29]],"dx":23},"b":{"A":[null,[9,-24],[10,-26],[12,-29],[13,-30],[14,-33],[15,-35],[17,-38],[18,-41],[19,-44],[19,-46],[18,-48],[17,-49],[16,-50],[14,-50],[12,-49],[10,-48],[9,-47],[8,-46],[6,-43],[5,-40],[4,-38],[3,-37],[2,-34],[2,-32],[1,-29],[1,-26],[0,-24],[0,-21],[0,-19],[0,-17],[1,-14],[1,-12],[2,-11],[3,-9],[5,-8],[8,-7],[11,-8],[13,-9],[14,-10],[16,-11],[17,-12],[18,-14],[19,-15],[18,-18],[17,-19],[15,-22],[13,-23],[12,-24]],"dx":19},"n":{"A":[null,[6,-37],[6,-35],[5,-33],[5,-30],[3,-27],[2,-24],[2,-21],[1,-19],[1,-16],[1,-14],[0,-12],[0,-10],null,[7,-30],[9,-31],[10,-32],[11,-33],[13,-33],[15,-34],[17,-34],[19,-34],[21,-32],[22,-31],[23,-29],[24,-28],[24,-26],[25,-24],[25,-22],[25,-19],[24,-17],[24,-15],[23,-14],[22,-12],[21,-10]],"dx":25},"m":{"A":[null,[2,-24],[1,-20],[0,-17],[0,-14],[0,-10],[0,-8],[0,-6],null,[4,-21],[7,-24],[9,-25],[11,-26],[13,-26],[14,-27],[15,-26],[16,-25],[17,-23],[18,-22],[19,-18],[19,-16],[19,-14],[19,-12],[19,-10],[18,-9],[19,-10],[19,-12],[19,-14],[20,-15],[21,-17],[22,-20],[23,-22],[24,-23],[26,-24],[28,-24],[30,-24],[32,-24],[33,-21],[34,-19],[34,-16],[34,-14],[34,-12],[34,-10],[34,-8]],"dx":34},",":{"A":[null,[6,-15],[4,-15],[2,-14],[0,-13],[1,-11],[4,-11],[6,-12],[7,-13],[8,-10],[9,-9],[9,-6],[8,-4],[8,-2],[6,0],[2,3],[0,4]],"dx":9},".":{"A":[null,[0,-14],[0,-11],[0,-9],[0,-7],[1,-5],[3,-5],[5,-6],[6,-7],[7,-8],[7,-10],[6,-11],[5,-12],[4,-13],[2,-13],[0,-11]],"dx":7},"/":{"A":[null,[19,-50],[18,-47],[17,-44],[16,-43],[15,-40],[13,-38],[12,-36],[11,-32],[10,-30],[9,-28],[7,-25],[6,-22],[5,-17],[4,-15],[3,-14],[2,-12],[2,-10],[1,-9],[0,-7]],"dx":19},";":{"A":[null,[6,-12],[4,-12],[1,-11],[1,-9],[2,-8],[4,-8],[5,-9],[7,-10],[8,-9],[9,-8],[10,-5],[10,-3],[10,-1],[9,2],[7,5],[5,7],[2,8],[0,8],null,[3,-41],[3,-39],[3,-37],[5,-37],[7,-38],[8,-39],[7,-41],[5,-42],[3,-41]],"dx":10},"\'":{"A":[null,[0,-48],[1,-46],[2,-47],[4,-46],[5,-45],[6,-43],[6,-39]],"dx":6},"[":{"A":[null,[12,-53],[10,-54],[8,-54],[6,-54],[4,-53],[2,-53],[0,-51],[0,-49],[1,-47],[1,-45],[1,-43],[1,-41],[1,-38],[1,-36],[1,-32],[1,-30],[1,-28],[1,-25],[1,-23],[0,-22],[0,-20],[0,-17],[0,-15],[0,-12],[0,-10],[2,-9],[4,-9],[6,-10],[9,-10]],"dx":12},"]":{"A":[null,[0,-54],[2,-54],[5,-54],[8,-55],[10,-55],[11,-54],[12,-53],[12,-51],[12,-49],[12,-47],[13,-45],[13,-43],[13,-40],[13,-38],[13,-35],[13,-33],[13,-31],[13,-29],[13,-27],[14,-25],[14,-23],[14,-21],[14,-19],[14,-17],[14,-15],[14,-13],[14,-11],[15,-10],[14,-9],[13,-8],[11,-8],[9,-8],[6,-8],[4,-8]],"dx":15},"\\\\":{"A":[null,[0,-51],[1,-49],[1,-47],[2,-46],[3,-43],[4,-41],[5,-38],[5,-35],[6,-34],[7,-32],[8,-29],[9,-27],[10,-25],[11,-22],[13,-19],[14,-17],[15,-14],[16,-11]],"dx":16},"`":{"A":[null,[0,-49],[2,-46],[3,-45],[5,-43]],"dx":5},"!":{"A":[null,[4,-48],[3,-43],[3,-40],[3,-38],[3,-36],[3,-34],[3,-32],[2,-29],null,[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-8],[0,-7],[0,-7],[1,-7],[1,-7],[1,-7],[1,-7],[1,-8],[1,-8],[1,-8],[1,-8]],"dx":4},"@":{"A":[null,[22,-41],[20,-42],[19,-41],[17,-41],[15,-39],[14,-36],[13,-34],[13,-31],[13,-29],[14,-28],[14,-26],[16,-23],[17,-20],[20,-18],[22,-18],[24,-18],[26,-19],[27,-20],[29,-23],[30,-27],[31,-28],[31,-30],[31,-32],[31,-34],[31,-36],[31,-34],[31,-32],[33,-30],[34,-28],[34,-26],[35,-24],[36,-22],[37,-20],[39,-21],[40,-23],[41,-24],[42,-25],[43,-27],[44,-30],[44,-33],[44,-36],[43,-38],[42,-41],[41,-42],[40,-44],[39,-46],[38,-47],[37,-49],[35,-50],[33,-51],[29,-52],[27,-53],[24,-53],[21,-53],[18,-53],[14,-52],[11,-50],[10,-49],[7,-47],[6,-46],[5,-44],[4,-43],[3,-40],[2,-38],[1,-37],[1,-35],[0,-33],[0,-30],[0,-28],[0,-26],[1,-23],[2,-21],[3,-19],[3,-17],[4,-15],[5,-14],[7,-12],[8,-11],[10,-9],[11,-8],[14,-7],[16,-6],[20,-5],[23,-5],[25,-5],[28,-5],[31,-6],[33,-6],[37,-6],[39,-7]],"dx":44},"#":{"A":[null,[13,-48],[13,-45],[13,-42],[13,-38],[13,-35],[13,-33],[13,-30],[14,-27],[14,-25],[14,-23],[14,-20],[14,-17],null,[27,-49],[27,-46],[27,-43],[28,-36],[28,-31],[28,-28],[29,-27],[29,-24],[29,-21],[30,-20],[31,-18],null,[0,-38],[2,-38],[4,-38],[6,-39],[10,-40],[14,-40],[16,-40],[18,-40],[19,-41],[22,-41],[24,-41],[26,-41],[27,-43],[30,-41],[32,-41],[34,-41],[37,-42],null,[0,-24],[1,-25],[2,-26],[4,-26],[6,-27],[8,-27],[11,-28],[13,-28],[15,-29],[17,-29],[20,-29],[23,-29],[26,-29],[28,-28],[29,-29],[31,-29],[33,-29],[35,-29],[37,-29],[39,-29]],"dx":39},"$":{"A":[null,[15,-53],[15,-51],[14,-46],[14,-44],[14,-42],[14,-39],[14,-36],[14,-32],[14,-30],[14,-27],[14,-25],[15,-21],[15,-18],[15,-15],[15,-13],[15,-11],[15,-9],null,[24,-47],[21,-48],[19,-49],[16,-49],[13,-48],[11,-48],[10,-47],[8,-46],[5,-45],[4,-43],[2,-41],[1,-40],[0,-37],[1,-35],[4,-32],[6,-31],[10,-30],[14,-30],[18,-30],[20,-30],[22,-30],[24,-29],[25,-28],[27,-27],[28,-26],[28,-24],[27,-22],[26,-20],[25,-19],[24,-18],[23,-17],[20,-16],[19,-15],[16,-14],[14,-14],[12,-13],[8,-13],[6,-13],[4,-13],[1,-13]],"dx":28},"%":{"A":[null,[8,-50],[6,-50],[4,-50],[3,-49],[1,-47],[0,-43],[0,-41],[0,-39],[1,-38],[3,-36],[5,-35],[7,-34],[9,-34],[11,-34],[13,-35],[15,-37],[16,-38],[17,-41],[18,-43],[18,-45],[17,-46],[15,-48],[14,-49],[12,-49],[10,-49],[9,-48],null,[32,-49],[31,-48],[29,-44],[28,-43],[27,-41],[25,-39],[24,-38],[23,-36],[22,-34],[20,-32],[19,-31],[17,-28],[16,-25],[14,-23],[13,-22],[11,-20],[10,-18],[9,-17],[8,-15],[7,-14],[5,-12],null,[31,-28],[29,-27],[27,-25],[26,-24],[25,-23],[24,-21],[23,-20],[23,-18],[22,-16],[23,-14],[24,-13],[26,-12],[29,-11],[33,-11],[35,-11],[37,-12],[38,-13],[40,-14],[41,-16],[41,-19],[38,-22],[37,-23],[33,-26],[31,-28],[29,-27]],"dx":41},"^":{"A":[null,[0,-40],[2,-41],[3,-43],[4,-44],[5,-46],[6,-48],[7,-49],[8,-51],[9,-52],[10,-53],[11,-54],[12,-55],[13,-54],[15,-52],[16,-51],[18,-49],[19,-46],[20,-45],[21,-44],[22,-43],[23,-42],[24,-41]],"dx":24},"&":{"A":[null,[34,-25],[32,-21],[30,-19],[29,-17],[26,-15],[24,-13],[23,-12],[22,-10],[19,-8],[16,-6],[14,-5],[11,-4],[8,-3],[6,-3],[4,-4],[2,-5],[1,-8],[0,-11],[0,-13],[0,-16],[0,-19],[0,-21],[1,-23],[2,-24],[5,-26],[6,-27],[8,-28],[11,-29],[13,-31],[16,-32],[18,-34],[20,-36],[22,-38],[23,-39],[23,-42],[23,-44],[22,-47],[21,-51],[19,-53],[17,-55],[15,-56],[12,-58],[10,-58],[8,-58],[6,-58],[3,-56],[2,-53],[1,-50],[2,-49],[2,-46],[4,-43],[5,-42],[7,-39],[9,-37],[10,-34],[12,-33],[13,-31],[15,-28],[16,-26],[18,-23],[19,-21],[20,-20],[22,-19],[24,-17],[26,-15],[28,-14],[30,-13],[31,-11],[32,-10],[33,-8],[34,-7],[35,-6]],"dx":35},"*":{"A":[null,[8,-40],[10,-37],[11,-36],[13,-32],[14,-31],[16,-30],[18,-27],[20,-25],[22,-23],[24,-20],[25,-19],[27,-17],null,[28,-40],[27,-39],[26,-37],[22,-31],[20,-29],[19,-28],[17,-25],[16,-24],[15,-22],[14,-21],[12,-19],[11,-17],[10,-15],[9,-14],null,[19,-42],[18,-40],[18,-38],[18,-35],[18,-32],[18,-29],[18,-27],[19,-26],[19,-24],[19,-21],[18,-17],[18,-15],[19,-12],null,[0,-27],[2,-27],[4,-27],[7,-27],[10,-26],[12,-26],[14,-26],[16,-26],[18,-27],[19,-26],[20,-25],[22,-26],[25,-26],[28,-26],[30,-26],[32,-26]],"dx":32},"(":{"A":[null,[10,-53],[9,-51],[8,-50],[6,-48],[5,-46],[4,-43],[3,-41],[2,-37],[1,-35],[1,-30],[0,-29],[0,-26],[0,-24],[1,-20],[1,-18],[2,-16],[4,-14],[5,-11],[7,-10],[8,-9]],"dx":10},")":{"A":[null,[0,-53],[2,-52],[3,-51],[4,-50],[6,-49],[8,-47],[9,-46],[10,-44],[11,-43],[12,-40],[12,-38],[12,-36],[13,-34],[14,-32],[13,-30],[13,-28],[12,-24],[11,-21],[10,-19],[9,-18],[7,-16],[6,-14],[4,-13],[2,-12],[0,-11]],"dx":14},"_":{"A":[null,[0,-6],[3,-7],[5,-7],[7,-8],[10,-8],[12,-8],[15,-8],[18,-8],[20,-8],[23,-8],[25,-8],[27,-8],[30,-7],[32,-7],[34,-7],[36,-7],[37,-6],[39,-6]],"dx":39},"+":{"A":[null,[0,-30],[3,-30],[8,-31],[10,-31],[12,-31],[15,-31],[18,-31],[21,-32],[23,-32],[25,-32],[28,-32],[29,-33],null,[12,-45],[12,-42],[12,-39],[12,-34],[12,-31],[13,-28],[13,-26],[13,-24],[13,-21],[13,-19],[14,-17]],"dx":29},"Q":{"A":[null,[14,-48],[10,-46],[8,-45],[6,-42],[5,-41],[2,-36],[1,-34],[1,-32],[0,-29],[0,-25],[0,-23],[1,-20],[3,-17],[5,-15],[8,-14],[11,-13],[15,-13],[18,-14],[20,-15],[22,-16],[25,-18],[27,-19],[28,-20],[30,-23],[31,-26],[32,-28],[32,-33],[32,-36],[31,-38],[30,-40],[28,-43],[26,-46],[23,-48],[21,-49],[18,-49],[15,-50],[14,-48],[11,-49],null,[21,-26],[23,-25],[24,-24],[25,-23],[27,-22],[28,-20],[30,-18],[31,-16],[32,-15],[33,-13]],"dx":33},"W":{"A":[null,[0,-50],[0,-48],[1,-46],[1,-43],[2,-40],[3,-38],[4,-34],[5,-32],[6,-30],[7,-26],[7,-23],[8,-21],[9,-20],[9,-18],[10,-17],[11,-16],[12,-15],[13,-14],[14,-16],[16,-17],[17,-18],[18,-20],[19,-22],[20,-25],[21,-22],[22,-21],[23,-19],[24,-18],[25,-17],[26,-16],[27,-15],[29,-16],[30,-17],[31,-19],[32,-21],[32,-23],[33,-25],[33,-27],[34,-30],[35,-32],[36,-34],[37,-38],[37,-40],[38,-43],[38,-45],[38,-47],[39,-48]],"dx":39},"E":{"A":[null,[3,-49],[2,-47],[2,-42],[2,-39],[1,-36],[1,-34],[1,-31],[1,-29],[1,-25],[1,-22],[0,-21],[0,-19],[0,-17],[0,-15],[1,-14],[1,-12],[3,-11],[5,-11],[7,-12],[9,-12],[11,-12],[13,-12],[15,-12],[18,-13],[21,-13],null,[5,-33],[6,-32],[9,-31],[11,-31],[14,-30],null,[3,-49],[6,-49],[8,-49],[10,-49],[13,-49],[15,-49],[17,-49]],"dx":21},"R":{"A":[null,[4,-46],[3,-42],[2,-39],[2,-34],[1,-33],[1,-30],[1,-28],[1,-26],[1,-24],[0,-22],[0,-20],[0,-18],[0,-15],[0,-13],[0,-11],null,[6,-48],[7,-49],[9,-49],[12,-49],[14,-49],[16,-49],[17,-48],[18,-46],[18,-44],[18,-42],[19,-40],[18,-38],[18,-35],[17,-33],[16,-32],[13,-31],[11,-30],[8,-30],[8,-28],[9,-27],[10,-26],[11,-24],[13,-22],[16,-20],[17,-17],[18,-16],[19,-15],[20,-14],[21,-13]],"dx":21},"T":{"A":[null,[20,-52],[20,-49],[21,-46],[21,-42],[21,-40],[21,-38],[21,-36],[21,-34],[21,-32],[21,-28],[21,-26],[21,-24],[21,-21],[21,-18],[21,-15],[22,-12],[22,-10],null,[0,-53],[2,-53],[5,-53],[8,-53],[10,-53],[12,-52],[14,-51],[17,-51],[20,-52],[23,-52],[25,-52],[27,-52],[30,-52],[32,-52],[34,-52],[36,-52],[38,-52]],"dx":38},"Y":{"A":[null,[0,-49],[0,-47],[0,-43],[1,-39],[1,-36],[3,-34],[4,-32],[5,-31],[6,-29],[8,-27],[11,-26],[13,-26],[16,-26],[18,-26],[20,-27],[24,-28],[26,-29],[27,-30],null,[29,-53],[29,-49],[30,-44],[30,-41],[30,-37],[30,-35],[31,-32],[31,-30],[31,-27],[31,-24],[31,-22],[31,-20],[31,-18],[30,-17],[30,-15],[29,-14],[28,-12],[26,-11],[23,-10],[22,-9],[19,-8],[17,-8],[13,-8],[11,-7]],"dx":31},"U":{"A":[null,[5,-52],[4,-50],[4,-48],[4,-46],[4,-44],[3,-41],[3,-39],[3,-36],[2,-33],[1,-30],[1,-28],[1,-24],[0,-21],[0,-17],[0,-15],[1,-13],[2,-12],[3,-10],[4,-9],[7,-8],[10,-8],[12,-8],[15,-9],[19,-9],[22,-10],[24,-11],[25,-12],[27,-13],null,[32,-49],[31,-45],[31,-42],[30,-41],[30,-37],[30,-35],[29,-33],[29,-30],[28,-29],[28,-27],[28,-24],[28,-21],[28,-19],[27,-18],[27,-16],[27,-13],[27,-11],[28,-9]],"dx":32},"I":{"A":[null,[0,-52],[3,-52],[6,-53],[9,-53],[12,-53],[14,-53],[16,-53],[20,-53],[23,-53],[25,-53],[28,-52],null,[14,-51],[15,-48],[15,-46],[15,-44],[15,-42],[15,-40],[15,-38],[16,-36],[16,-32],[16,-30],[16,-27],[16,-23],[16,-21],[16,-18],[15,-16],[15,-13],null,[0,-10],[3,-10],[5,-10],[7,-10],[9,-10],[13,-11],[15,-11],[18,-11],[21,-11],[24,-11],[27,-11],[29,-12],[31,-12]],"dx":31},"O":{"A":[null,[10,-50],[8,-49],[7,-47],[6,-46],[4,-44],[3,-41],[2,-39],[1,-36],[1,-33],[0,-31],[0,-28],[0,-25],[1,-22],[2,-19],[4,-16],[8,-14],[10,-13],[13,-13],[16,-14],[18,-14],[20,-16],[23,-19],[25,-23],[26,-28],[26,-30],[26,-35],[26,-38],[26,-40],[24,-43],[23,-46],[22,-47],[20,-48],[18,-50],[14,-50],[13,-49]],"dx":26},"P":{"A":[null,[4,-49],[4,-47],[4,-44],[3,-41],[3,-39],[2,-36],[2,-32],[2,-30],[2,-28],[2,-26],[2,-24],[1,-22],[1,-19],[1,-16],[0,-14],null,[6,-51],[8,-52],[10,-53],[12,-53],[15,-54],[17,-54],[19,-54],[21,-53],[24,-52],[26,-51],[27,-50],[28,-49],[28,-47],[29,-45],[30,-41],[29,-39],[29,-37],[28,-34],[26,-31],[22,-29],[21,-28],[17,-28],[13,-29],[10,-30],[9,-31],[7,-31]],"dx":30},"A":{"A":[null,[10,-51],[8,-48],[8,-46],[7,-43],[6,-40],[6,-38],[4,-35],[3,-32],[3,-30],[3,-27],[2,-23],[2,-20],[2,-18],[1,-14],[1,-12],[0,-9],null,[12,-51],[13,-49],[15,-47],[16,-45],[17,-42],[18,-39],[19,-38],[20,-35],[21,-31],[22,-29],[23,-24],[24,-23],[25,-22],[26,-19],[27,-16],[28,-13],[29,-12],[30,-10],null,[6,-25],[9,-25],[12,-25],[14,-26],[17,-25],[19,-25],[20,-26]],"dx":30},"S":{"A":[null,[31,-46],[31,-49],[30,-50],[29,-51],[26,-52],[24,-53],[21,-53],[19,-53],[17,-53],[14,-52],[12,-51],[10,-50],[8,-49],[6,-47],[5,-46],[3,-44],[2,-41],[2,-39],[1,-38],[2,-35],[4,-33],[6,-31],[7,-30],[9,-29],[12,-28],[14,-28],[16,-28],[18,-27],[21,-26],[24,-25],[25,-24],[28,-22],[29,-21],[31,-19],[31,-16],[31,-14],[30,-13],[29,-11],[27,-10],[21,-8],[19,-7],[17,-7],[15,-7],[12,-7],[9,-7],[7,-7],[5,-8],[3,-9],[1,-11],[0,-12]],"dx":31},"D":{"A":[null,[2,-52],[2,-49],[1,-46],[1,-43],[1,-40],[1,-37],[1,-33],[0,-32],[0,-28],[0,-25],[0,-23],[0,-20],[0,-17],[0,-15],null,[4,-52],[5,-53],[7,-53],[9,-53],[10,-54],[12,-54],[14,-53],[16,-53],[17,-52],[18,-51],[21,-48],[22,-47],[23,-44],[24,-42],[25,-39],[26,-38],[26,-36],[26,-34],[26,-32],[26,-30],[26,-28],[25,-27],[24,-24],[24,-21],[23,-19],[21,-17],[20,-16],[18,-15],[15,-13],[10,-12],[8,-13]],"dx":26},"F":{"A":[null,[4,-53],[3,-52],[2,-51],[1,-47],[1,-43],[1,-40],[1,-36],[1,-33],[1,-30],[0,-29],[0,-26],[0,-24],[0,-22],[0,-19],[0,-16],[0,-14],[0,-11],null,[5,-54],[8,-54],[12,-54],[15,-54],[19,-54],[21,-55],[23,-55],[26,-55],[29,-55],null,[4,-28],[6,-28],[8,-29],[11,-29],[13,-29],[16,-30],[18,-30]],"dx":29},"G":{"A":[null,[26,-51],[23,-51],[20,-51],[18,-50],[15,-49],[14,-48],[11,-46],[8,-44],[7,-43],[4,-40],[3,-38],[1,-34],[0,-30],[0,-28],[0,-25],[0,-22],[2,-20],[4,-17],[5,-16],[8,-14],[10,-13],[14,-12],[17,-12],[19,-12],[23,-12],[27,-13],[29,-14],[31,-17],[32,-18],[33,-20],[34,-21],[34,-23],[34,-25],[32,-28],[29,-29],[27,-30],[24,-31],[22,-31],[20,-32]],"dx":34},"H":{"A":[null,[0,-54],[0,-52],[1,-51],[1,-49],[0,-46],[0,-42],[0,-37],[0,-34],[0,-32],[0,-29],[1,-26],[1,-23],[2,-20],[2,-18],[2,-15],[2,-13],[2,-11],null,[2,-29],[5,-30],[7,-31],[9,-31],[11,-31],[14,-32],[16,-32],[18,-33],[19,-34],null,[22,-53],[22,-51],[22,-47],[23,-45],[24,-41],[24,-38],[25,-35],[24,-32],[24,-29],[24,-25],[24,-23],[25,-22],[25,-20],[26,-17],[26,-15]],"dx":26},"J":{"A":[null,[25,-52],[26,-51],[26,-49],[27,-47],[27,-45],[28,-43],[28,-41],[28,-36],[29,-33],[29,-31],[29,-28],[29,-26],[29,-22],[29,-20],[29,-18],[29,-16],[28,-14],[27,-11],[26,-10],[24,-9],[22,-8],[19,-8],[16,-9],[13,-9],[11,-10],[8,-11],[5,-12],[3,-14],[1,-15],[0,-17],[0,-19],[1,-21],[1,-23],null,[14,-53],[16,-53],[20,-53],[22,-53],[24,-53],[26,-53],[29,-54],[32,-54],[34,-54],[35,-55]],"dx":35},"K":{"A":[null,[5,-51],[5,-49],[5,-45],[5,-42],[4,-40],[4,-35],[2,-30],[1,-25],[1,-20],[1,-16],[1,-13],[0,-10],[0,-8],null,[28,-53],[25,-51],[24,-50],[22,-48],[19,-45],[16,-42],[15,-40],[12,-37],[11,-35],[8,-32],[7,-29],[6,-27],[9,-25],[11,-24],[12,-23],[14,-22],[16,-21],[17,-20],[18,-18],[20,-16],[21,-14],[21,-11],[22,-10]],"dx":28},"L":{"A":[null,[6,-51],[5,-49],[5,-46],[4,-42],[4,-37],[3,-34],[3,-32],[2,-29],[1,-25],[1,-21],[0,-18],[0,-16],[0,-14],[0,-12],[0,-10],[2,-8],[5,-9],[8,-9],[10,-10],[12,-10],[14,-10],[16,-11],[19,-11],[20,-12],[23,-12],[25,-13],[25,-15]],"dx":25},"Z":{"A":[null,[3,-51],[4,-50],[6,-50],[10,-49],[14,-49],[16,-49],[20,-48],[23,-48],[25,-48],[27,-48],[28,-47],[27,-45],[26,-44],[25,-43],[24,-41],[23,-39],[22,-38],[20,-35],[19,-33],[16,-30],[15,-29],[13,-27],[12,-25],[10,-23],[8,-20],[7,-18],[6,-17],[5,-15],[4,-13],[2,-11],[0,-10],[2,-11],[3,-10],[6,-10],[10,-11],[13,-11],[16,-11],[20,-11],[24,-12],[28,-12],[30,-13]],"dx":30},"X":{"A":[null,[0,-53],[1,-51],[2,-49],[5,-44],[7,-39],[10,-35],[11,-33],[14,-30],[18,-26],[19,-24],[22,-20],[25,-17],[26,-15],[27,-14],[28,-13],null,[28,-53],[28,-51],[26,-49],[24,-47],[24,-45],[23,-44],[21,-40],[19,-37],[17,-34],[16,-32],[14,-30],[13,-26],[12,-22],[11,-20],[9,-18],[8,-16],[6,-13],[5,-11],[4,-10]],"dx":28},"C":{"A":[null,[25,-53],[23,-54],[21,-53],[19,-53],[17,-52],[15,-50],[12,-49],[10,-47],[8,-45],[5,-42],[4,-40],[2,-37],[1,-34],[0,-30],[0,-28],[0,-24],[0,-20],[1,-18],[3,-15],[5,-13],[8,-11],[10,-11],[12,-11],[16,-11],[21,-13],[23,-13]],"dx":25},"V":{"A":[null,[0,-50],[1,-49],[1,-45],[2,-44],[3,-40],[4,-39],[5,-35],[6,-32],[8,-24],[9,-22],[10,-19],[11,-16],[12,-14],[13,-11],[13,-9],[14,-8],[13,-9],[14,-10],[15,-12],[15,-14],[16,-17],[17,-21],[19,-26],[20,-28],[21,-33],[23,-38],[25,-42],[27,-45],[27,-47],[28,-48],[29,-50]],"dx":29},"B":{"A":[null,[1,-51],[1,-48],[1,-44],[1,-40],[1,-36],[1,-33],[0,-29],[0,-26],[0,-22],[1,-20],[1,-18],[1,-15],[1,-12],[1,-9],null,[3,-54],[6,-54],[8,-55],[11,-55],[14,-54],[18,-53],[20,-52],[22,-50],[23,-48],[25,-47],[26,-44],[26,-41],[25,-39],[24,-38],[23,-36],[20,-34],[17,-32],[15,-32],[10,-31],[7,-31],[10,-31],[15,-32],[19,-30],[21,-29],[23,-28],[24,-27],[26,-25],[27,-22],[27,-19],[27,-17],[26,-16],[25,-14],[24,-13],[23,-12],[21,-11],[20,-10],[18,-9],[16,-8],[12,-8],[8,-8]],"dx":27},"N":{"A":[null,[2,-48],[2,-46],[2,-43],[2,-39],[2,-34],[2,-30],[2,-28],[1,-24],[1,-21],[1,-18],[1,-14],[1,-12],[0,-10],null,[4,-51],[5,-50],[6,-47],[8,-44],[8,-42],[10,-39],[11,-36],[12,-34],[13,-31],[14,-29],[18,-20],[19,-17],[20,-16],[21,-14],[22,-12],[24,-14],[24,-16],[25,-18],[25,-20],[26,-23],[28,-26],[29,-30],[29,-32],[29,-34],[30,-37],[30,-40],[30,-42],[31,-43],[31,-46],[31,-48]],"dx":31},"M":{"A":[null,[6,-49],[6,-46],[6,-44],[5,-42],[5,-40],[4,-37],[4,-35],[4,-30],[3,-26],[3,-22],[2,-19],[1,-16],[1,-14],[0,-11],[0,-8],null,[10,-50],[11,-46],[12,-43],[13,-40],[14,-37],[15,-36],[16,-33],[17,-31],[18,-29],[19,-26],[20,-25],[21,-24],[22,-22],[22,-20],[22,-22],[24,-24],[25,-28],[26,-30],[27,-32],[27,-35],[28,-36],[29,-40],[29,-42],[30,-44],[31,-46],[32,-47],[33,-46],[34,-43],[35,-42],[36,-40],[37,-38],[37,-35],[38,-32],[38,-30],[38,-27],[38,-25],[39,-23],[41,-20],[42,-18],[42,-16],[43,-14],[43,-12],[43,-10],[43,-7]],"dx":43},"<":{"A":[null,[17,-43],[15,-42],[13,-40],[11,-38],[9,-35],[8,-33],[6,-30],[4,-29],[3,-28],[2,-27],[1,-26],[0,-25],[1,-23],[2,-22],[5,-19],[7,-17],[8,-16],[11,-13],[13,-12],[15,-11]],"dx":17},">":{"A":[null,[0,-43],[3,-41],[4,-39],[6,-37],[7,-36],[8,-34],[10,-32],[12,-30],[13,-29],[15,-27],[16,-25],[17,-24],[18,-23],[18,-21],[18,-19],[16,-18],[14,-16],[9,-13],[6,-12],[4,-11],[2,-10],[0,-9]],"dx":18},"?":{"A":[null,[0,-48],[2,-50],[4,-51],[5,-52],[9,-53],[11,-54],[13,-54],[14,-53],[17,-51],[17,-49],[17,-45],[17,-43],[16,-42],[15,-40],[14,-38],[13,-37],[10,-32],[9,-30],[8,-28],[7,-27],[7,-25],[8,-23],null,[7,-5],[7,-5],[7,-5],null,[7,-5],[7,-5]],"dx":17},":":{"A":[null,[1,-14],[0,-13],[0,-10],[2,-10],[3,-9],[5,-10],[6,-11],[5,-13],[4,-15],[3,-16],[1,-14],null,[3,-43],[2,-42],[1,-40],[1,-37],[2,-35],[5,-35],[6,-36],[7,-37],[8,-38],[8,-41],[7,-43],[5,-44],[3,-43]],"dx":8},"\"":{"A":[null,[4,-48],[3,-46],[3,-44],[2,-41],[1,-38],[0,-36],null,[19,-48],[18,-46],[17,-43],[15,-40],[15,-38],[14,-37]],"dx":19},"{":{"A":[null,[15,-54],[13,-53],[12,-51],[10,-50],[9,-47],[9,-44],[9,-42],[9,-40],[9,-38],[9,-35],[9,-32],[9,-28],[8,-27],[7,-26],[5,-25],[3,-25],[1,-25],[0,-28],[2,-29],[3,-28],[4,-27],[5,-25],[7,-26],[7,-24],[8,-22],[8,-20],[9,-19],[9,-16],[9,-13],[10,-12],[13,-12],[15,-11],[17,-12]],"dx":17},"}":{"A":[null,[4,-54],[6,-54],[4,-54],null,[6,-54],[9,-53],[11,-52],[12,-51],[12,-48],[11,-45],[10,-43],[9,-40],[9,-38],[9,-36],[8,-33],[8,-31],[9,-28],[10,-26],[12,-25],[15,-25],[17,-25],[18,-26],[18,-29],[17,-30],[15,-30],[14,-29],[13,-28],[12,-27],[10,-26],[12,-25],[11,-24],[10,-21],[10,-18],[11,-15],[10,-13],[9,-10],[8,-9],[6,-9],[4,-8],[2,-8],[0,-9]],"dx":18},"|":{"A":[null,[0,-53],[1,-50],[1,-48],[0,-47],[0,-45],[0,-43],[0,-41],[0,-39],[0,-37],[0,-35],[0,-32],[0,-29],[0,-27],[0,-25],[1,-24],[1,-22],[1,-20],[1,-18],[1,-15],[1,-13],[1,-11],[1,-9],[1,-7]],"dx":1},"~":{"A":[null,[0,-28],[0,-30],[1,-31],[2,-32],[3,-33],[4,-34],[5,-35],[7,-36],[10,-36],[11,-35],[12,-33],[13,-32],[14,-30],[15,-28],[16,-27],[18,-27],[20,-27],[21,-29],[22,-30],[23,-31],[24,-33]],"dx":24}};
var TexterTool = {
    super : DrawToolBase
     
    ,icon : [null,[52,21],[53,8],[8,8],[9,21],null,[44,15],[16,15],[9,21],null,[52,21],[44,15],null,[36,53],[36,15],null,[25,15],[24,53],[36,53],null,[9,8],[10,19],null,[10,18],[16,13],[44,14],[50,18],[50,9],[10,9],null,[12,10],[12,15],[14,13],[45,13],[49,15],null,[49,16],[49,10],[12,10],[12,13],null,[28,15],[26,51],[34,52],[33,16],null,[34,18],[28,17],[28,50],[32,49],[32,16],[30,16],null,[31,17],[31,50],[31,15]]
    
    ,cursor : null // global cursor position
    ,paragraph : null // global paragraph position

    ,TexterTool : function() {
        DrawToolBase.init.call(this, "texter", false, ["Control", "i"]);
    }
    
    ,put_char : function(key, bx, by, scale, draw_fun) {
        scale = (scale===undefined)?(BRUSH.get_local_width()/10) : scale;
        draw_fun = (draw_fun===undefined)?BOARD.add_buffer_stroke:draw_fun;

        var A = ALPHABET[key].A;
        var a,b,p = null;
        
        for(var i=0; i<A.length; i++) {
            a = p;
            b = A[i];
            
            if ((p==null)&&(A[i]!=null)&&((i==A.length-1)||((i<A.length-1)&&(A[i+1]==null))))
                a = b;

            if ((a!=null)&&(b!=null)) {
                draw_fun(
                     {"X":a[0] * scale + bx, "Y":a[1] * scale + by}
                    ,{"X":b[0] * scale + bx, "Y":b[1] * scale + by}
                );
            };
            
            p = A[i];
        };
        return ALPHABET[key].dx * scale;
    }
    
    ,draw_cursor : function(lp, params) {
        if (params==undefined)
            UI.reset_layer("overlay");

        if (lp==null)
            return;
            
        var w = 2.2 * BRUSH.get_local_width();
        
        var figure = [
             {"X":lp.X  , "Y":lp.Y}
            ,{"X":lp.X+w, "Y":lp.Y-2.6*w}
            ,{"X":lp.X  , "Y":lp.Y-2.6*w}
            ,{"X":lp.X+w, "Y":lp.Y}
        ];
        
        figure.map((p, pi)=>{
            UI.add_overlay_stroke(p, figure[(pi+1)%figure.length], params);
        });
    }
    
    ,on_start : function(lp) {
        this.cursor = UI.local_to_global({X:lp.X, Y:lp.Y});
        this.paragraph = UI.local_to_global({X:lp.X, Y:lp.Y});
        this.draw_cursor(lp);
    }
    
    ,on_move : function(lp) {
        this.draw_cursor(UI.global_to_local(this.cursor));
        this.draw_cursor(lp, {color:BRUSH.get_color("2")});
    }
    
    ,on_stop : function(lp) {
    }

    ,on_key_down : function(key) {
        if (this.cursor==null) 
            return;
        
        var lcursor = UI.global_to_local(this.cursor);
        
        if (key==" ") {
            lcursor.X += 3.0 * BRUSH.get_local_width();

        } else if (key=="Shift") {
        
        } else if (key=="Control") {
            return false;
        
        } else if ((key=="+")&&(UI.keys["Control"])) {
            return false;
        
        } else if ((key=="-")&&(UI.keys["Control"])) {
            return false;
        
        } else if (UI.keys["Control"]) {
            return false;
        
        } else if (key=="Backspace") {
            var rect = BOARD.rollback(); // returns global rect of cancelled strokes
            rect = rect.map((p)=>{
                return UI.global_to_local(p)
            });
            var mx = 3 * 2 * BRUSH.get_local_width();
            lcursor.X = rect[0].X;
            lcursor.Y-= (Math.floor( (lcursor.Y - rect[1].Y) / mx )) * mx;
            UI.redraw();
            
        } else if (key=="Enter") {
            var lparagraph = UI.global_to_local(this.paragraph);
            lcursor.X = lparagraph.X;
            lcursor.Y += 3 * 2 * BRUSH.get_local_width();

        } else if (key in ALPHABET) {
            lcursor.X += this.put_char(key, lcursor.X, lcursor.Y);
            lcursor.X += BRUSH.get_local_width();

        } else {
            lcursor.X += 3 * BRUSH.get_local_width();
            
        };
        
        this.cursor = UI.local_to_global(lcursor);
        
        BOARD.flush_commit();
        
        this.draw_cursor(lcursor);
        return true;
    }
    
    ,on_key_up : function(key) {
        if (key=="Control") {
            return false;
        };
        return true;
    }
    
    ,on_activated : function() {
        if (!UI.is_mobile)
            return;
        
        var [div, inp] = MENU_main.add("root", "input", null, "input");
        
        inp.style['width'] = (Menu.SIZE-9) + "px";
        inp.style['height'] = (Menu.SIZE-8) + "px";
        inp.addEventListener("keydown",(e)=>{
            if ((e.key in {"Enter":1, "Backspace":1})) {
                this.on_key_down(e.key);
            } else if (("01234567890".includes(e.key))) {
                this.on_key_down(e.key);
            };
            e.preventDefault();
            e.stopPropagation();
        });
        
        inp.addEventListener("input",(e)=>{
            this.on_key_down(e.data);
            e.target.value = "";
            e.preventDefault();
            e.stopPropagation();
        });
        
        inp.focus();
    }
    
    ,on_deactivated : function() {
        UI.reset_layer("overlay");
        
        if (!UI.is_mobile)
            return;        
            
        MENU_main.drop("input");
    }
    
    ,after_redraw : function() {        
        this.draw_cursor(UI.global_to_local(this.cursor));
    }
    
}


var DistortableDrawTool = {
    super : DrawToolBase

    ,DistortableDrawTool : function(name, cyclic, shortcut) {
        DrawToolBase.init.call(this, name, cyclic, shortcut);
        this.distorted = 0;
        this.mode = 0;
        this.options = {
            "distorted" : {
                "icon" : [
                      [null,[8,51],[49,11],null,[8,53],[51,13]] // normal
                     ,[null,[9,50],[24,41],[30,27],null,[51,7],[45,20],[30,27]]  // distorted 1
                     ,[null,[46,26],[50,10],null,[8,53],[25,46],[27,30],[46,26]] // distorted 2
                ]
                ,"on_click" : ()=>{
                    console.log("fuzz");
                }
                ,"type" : "count"
                ,"tooltip" : "hand-alike distortion mode"
            }
            ,"mode"    : {
                "icon" : [
                     [null,[8,51],[49,11],null,[8,53],[51,13]] // solid
                    ,[null,[7,54],[13,48],null,[19,41],[26,35],null,[33,27],[39,21],null,[52,8],[46,15]] // dashed
                    ,[null,[9,50],[11,49],null,[15,45],[16,43],null,[21,39],[22,38],null,[26,34],[28,33],null,[32,29],[33,27],null,[38,23],[39,22],null,[43,18],[45,17],null,[49,13],[50,11],null,[9,50],[11,49],null,[15,45],[16,43],null,[21,39],[22,38],null,[26,34],[28,33],null,[32,29],[33,27],null,[38,23],[39,22],null,[43,18],[45,17],null,[49,13],[50,11]]
                ]
                ,"on_click" : ()=>{
                    console.log("mode");
                }
                ,"type" : "count"
                ,"tooltip" : "solid / dash / dotted"
            }
        };
    }
    
    ,_pre_render : function(figure) {
        var w = BRUSH.get_local_width();
        
        if (this.mode == 0) {
        } else if (this.mode == 1) {
            figure = UI.figure_split(figure, this.cyclic, w*5);
        } else if (this.mode == 2) {
            figure = UI.figure_split(figure, this.cyclic, w);
        }
        
        if (this.distorted > 0) {
            figure = UI.figure_distort(figure, this.distorted, this.cyclic);
        };
            
        return figure;
    }

    ,_render : function(figure, func) {
        figure.map((p,pi)=>{
            if ((pi<figure.length-1)||(this.cyclic)) {
                if ((this.mode==1)&&(pi%2==1))
                    return;
                if ((this.mode==2)&&(pi%5!=0))
                    return;
                func(
                     p
                    ,figure[(pi+1) % figure.length]
                );
            }
        });
    }
    
    ,on_key_down : function(key) {
        if (!this.activated) 
            return false;

        if (key=='Shift') {
            this.options.distorted.handler();
            this.on_move(this.last_point);
            return true;
        };
        
        if (key=='Control') {
            this.options.mode.handler();
            this.on_move(this.last_point);
            return true;
        };
        
        return false;
    }

}

var LineTool = {
    super : DistortableDrawTool
    
    ,icon : [null,[8,51],[49,11],null,[8,53],[51,13]]

    ,LineTool : function() {
        DistortableDrawTool.init.call(this, "line", false, ["Control", "l"]);
        
        this.arrows = 0;
        this.options["arrows"] = {
            "icon" : [
                 [null,[8,51],[49,11],null,[8,53],[51,13]] // solid
                ,[null,[46,21],[46,14],[39,13],null,[9,49],[46,14]] // one arrow
                ,[null,[49,19],[48,12],[41,12],null,[12,42],[12,49],[19,49],null,[12,49],[48,12]] // double arrow
            ]
            ,"on_click" : ()=>{
                console.log("arrow");
            }
            ,"type" : "count"            
            ,"tooltip" : "line / arrow / double arrow"
        };
    }

    ,draw_arrow : function(sp, lp, func) {
        var v = sub(lp,sp);
        var dx = angle({X:Math.abs(v.X),Y:0},v);
        var dy = angle({X:0,Y:Math.abs(v.Y)},v);
        var t = BRUSH.size * UI.viewpoint.scale;
        
        func(lp,{
             X:(lp.X-dx*t) + t*(dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2))
            ,Y:(lp.Y-dy*t) + t*(dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2))
        });
        
        func(lp,{
            X:(lp.X-dx*t) + t*(dx*Math.cos(3*Math.PI/2)-dy*Math.sin(3*Math.PI/2))
           ,Y:(lp.Y-dy*t) + t*(dx*Math.sin(3*Math.PI/2)+dy*Math.cos(3*Math.PI/2))
        });
    }

    ,draw : function(sp, lp, func) {
        var figure = [sp, lp];
        
        figure = this._pre_render(figure);
        
        var a0 = [figure[figure.length-2], figure[figure.length-1]];
        var a1 = [figure[1], figure[0]];
        
        if (this.arrows > 0)
            this.draw_arrow(a0[0], a0[1], func);
        
        if (this.arrows > 1)
            this.draw_arrow(a1[0], a1[1], func);
        
        this._render(figure, func);
    }

    ,on_key_down : function(key) {
        if (!this.activated) 
            return false;
            
        if (DistortableDrawTool.on_key_down.apply(this, [key])) {
            return true;
        };
        
        if (key=='Alt') {
            this.options.arrows.handler();
            this.on_move(this.last_point);
            return true;
        };

        return false;
    }

}

var BoxTool = {
    super : DistortableDrawTool
    
    ,icon : [null,[13,12],[13,17],[13,22],[12,26],[12,30],[12,34],[13,38],[13,43],[13,48],[17,48],[21,48],[25,48],[30,47],[35,47],[39,48],[43,48],[48,48],[47,43],[47,39],[48,34],[48,30],[48,26],[47,22],[47,17],[47,12],[43,12],[39,13],[34,13],[30,12],[25,12],[21,12],[17,12],[13,12]]

    ,BoxTool : function() {
        DistortableDrawTool.init.call(this, "box", true, ["Control", "b"]);
    }

    ,draw : function(sp, lp, func) {
        var rect = UI.get_rect([sp, lp]);
        
        var figure = [
            rect[0], {X:rect[0].X, Y:rect[1].Y},
            rect[1], {X:rect[1].X, Y:rect[0].Y}
        ];
        
        figure = this._pre_render(figure);
        
        this._render(figure, func);
    }

}

var CircleTool = {
    super : DistortableDrawTool
    
    ,icon : [null,[23,52],[19,50],[16,49],[14,46],[11,43],[9,40],[7,37],[7,33],[6,29],[7,26],[7,23],[9,19],[11,16],[14,14],[16,11],[20,10],[23,7],[26,7],[30,6],[34,7],[37,8],[40,9],[44,11],[46,13],[48,16],[51,19],[52,23],[53,27],[53,29],[53,34],[52,37],[51,40],[49,43],[47,46],[43,49],[40,50],[37,52],[33,53],[30,53],[26,53],[23,52]]

    ,CircleTool : function() {
        DistortableDrawTool.init.call(this, "circle", true, ["Control", "c"]);
    }

    ,draw : function(cp, lp, func) {
        var rect = UI.get_rect([cp, lp]);
        
        if (func==UI.add_overlay_stroke)
            func(cp, cp);
        
        var rx = (rect[1].X - rect[0].X);
        var ky = (rect[0].Y - rect[1].Y) / rx;
        var figure = [];
        
        if ((rx==0)||(ky==0)) {
            return;
        }
        
        var theta = Math.PI/2;
        var step0 = (2*Math.PI/20)
        var step = step0;
        var fixed = 0;
        
        while (theta < 2.5*Math.PI) {
            
            var next_point = {
                 X:(cp.X + rx*Math.cos(theta+step)) 
                ,Y:(cp.Y - rx*Math.sin(theta+step)*ky)
            };

            if (figure.length>1) {
                var phi = angle(
                     sub(figure[figure.length-2],figure[figure.length-1])
                    ,sub(next_point,figure[figure.length-1])
                );
                //console.log(theta*180/(2*Math.PI),'\t', phi);
                if ((phi > -0.70)&&(isFinite(phi))) {
                    if (step > step0 / 8) {
                        figure.pop();
                        theta -= step;
                        fixed -= 1;
                        step = step / 2;
                        continue;
                    };
                };
            };
            
            figure.push(next_point);
            theta += step;
            
            if (step==step0) {
                fixed = 0;
            } else {
                if (fixed==2) {
                    fixed = 0;
                    step = Math.min(step*2, step0);
                } else {
                    fixed += 1;
                };
            };
            
        };
        
        figure = this._pre_render(figure);

        this._render(figure, func);
    }

}



// SETUP CONTAINER
let SETUP = {
     icon : [null,[23,53],[20,54],[16,54],null,[7,44],[7,40],[8,37],[10,34],[13,32],[17,32],[20,32],[23,33],[26,35],[28,38],[29,42],[29,45],[28,48],[26,51],[23,53],null,[10,44],[11,41],[14,38],[18,38],[21,40],[23,43],[22,47],[20,49],null,[7,44],[8,46],null,[16,54],[20,49],null,[10,44],[8,46],null,[18,52],[20,49],[24,49],[26,44],[25,40],[22,36],[18,35],[14,36],[11,38],[10,44],null,[8,46],[7,44],[7,40],[8,37],[10,34],null,[13,32],[17,32],[20,32],[26,35],null,[23,33],[28,38],[29,42],[29,45],[28,48],[26,51],[23,53],[20,54],[16,54],[20,49],[22,50],[24,49],[26,44],[25,40],[22,36],null,[18,35],[14,36],[11,38],[9,43],null,[25,40],[26,35],[25,40],null,[37,8],[40,7],[43,7],null,[54,15],[54,19],[53,22],[51,25],[49,27],[45,29],[42,29],[39,28],[36,26],[33,23],[32,20],[31,17],[32,13],[34,10],[37,8],null,[50,15],[50,19],[47,21],[44,23],[40,21],[38,18],[38,14],[40,11],null,[54,15],[52,14],null,[43,7],[40,11],null,[50,15],[52,14],null,[42,9],[40,11],[36,13],[35,17],[36,21],[39,25],[44,26],[48,24],[50,21],[50,15],null,[52,14],[54,15],[54,19],[53,22],[51,25],null,[49,27],[45,29],[42,29],[36,26],null,[39,28],[33,23],[32,20],[31,17],[32,13],[34,10],[37,8],[40,7],[43,7],[40,11],[38,11],[36,13],[35,17],[36,21],[39,25],null,[44,26],[48,24],[50,21],[52,17],null,[36,21],[36,26],[36,21],null,[26,35],[36,26],null,[23,33],[33,23],null,[28,38],[39,28],[26,35],null,[28,38],[39,28],null,[26,35],[36,26],[23,33],[33,23],[23,33],[36,26]]

    ,canvas : null
    
    ,init : function() {
        SETUP.canvas = MENU_main.add("root", "setup", null, "canvas")[1];
        var ctx = SETUP.canvas.getContext("2d");
        UI.draw_glyph(SETUP.icon, ctx);
    }

    ,add_item : function(item, title) {
        var canvas = MENU_main.add("setup", item.name, item.click, "canvas", title)[1];
        item.init(canvas);
    }
    
}

// SETUP ITEMS
let BRUSH_MODE = {
     icons : {
          true : [null,[22,36],[27,31],[22,26],null,[11,26],[6,31],[11,36],null,[6,31],[27,31],null,[48,36],[53,31],[48,26],null,[37,26],[31,31],[36,36],null,[31,31],[53,31]]
         ,false : [null,[28,37],[28,31],[28,25],null,[6,25],[6,31],[6,37],null,[6,31],[28,31],null,[53,37],[53,31],[53,25],null,[32,25],[32,31],[32,37],null,[32,31],[53,31]]
     }
    ,name : "brush_mode"

    ,canvas : null
    
    ,scaled : false
    
    ,click : function() {
        BRUSH_MODE.scaled = !BRUSH_MODE.scaled;
        BRUSH_MODE.canvas.width = BRUSH_MODE.canvas.width;
        var ctx = BRUSH_MODE.canvas.getContext('2d');
        UI.draw_glyph(BRUSH_MODE.icons[BRUSH_MODE.scaled], ctx);
        BRUSH.update_size();
    }
    
    ,init : function(canvas) {
        BRUSH_MODE.canvas = canvas;
        BRUSH_MODE.click();
    }
}

let GRID_MODE = {
     icon : [null,[30,5],[30,55],[30,5],null,[55,30],[5,30],[55,30],null,[19,13],[40,13],null,[20,48],[41,48],null,[11,18],[12,44],null,[48,17],[48,42]]

    ,name : "grid_mode"

    ,canvas : null
    
    ,grid_active : false
    
    ,click : function() {
        GRID_MODE.grid_active = !GRID_MODE.grid_active;
        GRID_MODE.canvas.width = GRID_MODE.canvas.width;
        var ctx = GRID_MODE.canvas.getContext('2d');
        UI.draw_glyph(GRID_MODE.icon, ctx, undefined, (GRID_MODE.grid_active?undefined:"#555"));
        UI.redraw();
    }
    
    ,init : function(canvas) {
        GRID_MODE.canvas = canvas;
        GRID_MODE.click();
    }
}


// SAVE ITEMS
let SAVE = {
     icon : [null,[8,7],[8,11],[8,13],[7,17],[8,19],[7,23],[8,25],[7,28],[8,30],[7,34],[8,36],[7,40],[8,42],[7,45],[8,47],[7,51],[8,53],[10,54],[14,53],[16,54],[19,53],[21,54],[25,53],[27,54],[31,53],[33,54],[36,53],[38,54],[42,53],[44,54],[48,53],[50,54],[53,53],[53,51],[53,48],[53,45],[54,42],[53,39],[53,36],[53,34],[53,30],[53,26],[53,22],[53,18],null,[44,8],[40,8],[36,7],[33,8],[30,8],[27,8],[25,8],[22,8],[19,7],[16,8],[13,8],[10,8],[8,7],null,[53,18],[44,8],[53,18],null,[15,10],[15,21],[37,21],[37,9],[37,21],[15,21],[15,10],null,[14,51],[14,31],[14,51],null,[14,31],[42,30],[42,51],[42,30],[14,31],null,[20,36],[35,36],null,[21,45],[35,45],null,[19,12],[33,12],null,[17,17],[33,16]]
    ,icon_save : [null,[16,12],[16,15],[16,19],[16,24],null,[16,34],[16,36],[16,41],[16,45],[18,47],[20,46],[25,46],[29,46],[33,47],[37,47],[41,47],[46,47],[49,46],[49,43],[50,40],[50,38],[49,36],[49,32],[49,29],[49,26],[49,23],[49,20],null,[43,13],[40,13],[37,12],[35,12],[31,13],[27,13],[24,12],[22,12],[16,12],null,[49,20],[43,13],[49,20],null,[22,12],[21,20],[37,20],[37,12],[37,20],[21,20],[22,12],null,[35,15],[24,15],[35,15],null,[25,35],[30,30],[25,25],null,[4,30],[30,30],[25,35],null,[25,25],[30,30],[4,30]]
    ,icon_load : [null,[19,15],[19,18],[19,22],[19,26],null,[19,36],[18,39],[18,43],[18,48],[20,50],[23,49],[27,49],[31,49],[36,49],[40,49],[44,49],[48,49],[52,49],[52,46],[52,43],[52,41],[52,38],[52,35],[52,32],[52,29],[52,26],[52,23],null,[45,15],[43,15],[40,15],[37,15],[33,16],[29,15],[27,15],[25,15],[19,15],null,[52,23],[45,15],[52,23],null,[25,15],[24,23],[39,23],[40,15],[39,23],[24,23],[25,15],null,[37,18],[26,18],[37,18],null,[10,27],[5,32],[10,37],null,[31,32],[5,32],[10,27],null,[10,37],[5,32],[31,32]]
    ,icon_sync : [null,[45,25],[50,29],[54,25],null,[50,24],[50,29],null,[13,33],[8,31],[5,35],null,[9,36],[8,31],null,[45,25],[50,29],[54,25],null,[13,33],[8,31],[5,35],null,[23,50],[20,49],[17,47],[14,45],[12,42],[10,39],[9,36],null,[8,23],[10,20],[11,18],[14,15],[16,13],[19,11],[23,10],[26,9],[30,8],[33,9],[36,9],[40,11],[42,13],[45,15],[48,18],[49,21],[50,24],null,[51,37],[49,40],[48,43],[45,46],[43,47],[40,49],[36,50],[33,51],[29,51],[26,51],[23,50]]
    
    ,autosync : false
    ,sent_version : null
    ,is_syncing : false
    ,canvas_sync : null
    
    ,serialize : function(o) {
        return JSON.stringify(o)
    }
    
    ,deserialize : function(json) {
        return JSON.parse(json);
    }
    
    ,update_ids : function() {
        BOARD.strokes.map((stroke)=>{
            BOARD.commit_id = Math.max(BOARD.commit_id, stroke.commit_id+1);
            BOARD.stroke_id = Math.max(BOARD.stroke_id, stroke.stroke_id+1);
            var version = (stroke.version===undefined)?0:stroke.version;
            BOARD.version = Math.max(BOARD.version, version);
        });
    }
    
    ,save : function() {
        var old = JSON.parse(localStorage.getItem("local_board_" + BOARD.board_name));

        var new_strokes = BOARD.strokes.reduce((a, stroke)=>{ // drop deleted strokes
            var min_version =  BOARD.strokes.reduce((a, stroke)=>{
                return (stroke.version < a) ? stroke.version : a;
            }, BOARD.version);
            
            if (stroke.version===undefined)
                stroke.version = min_version;

            stroke = deepcopy(stroke);
            
            if (stroke.erased>=0) {
                return a; // ignore erased
            } else if (stroke.erased<0) {
                delete stroke.erased;
            };
            if (stroke.gp[0]==null) { // erase, undo action
                return a;
            };
            
            a.push(stroke);
            return a;
        }, []);        
        
        if (old!=null) {
            if (prompt("overwrite " + old.strokes.length + " with " + new_strokes.length + " ?", "no")!="yes")
                return;
        };

        console.log("version", BOARD.version, ",saving", new_strokes.length, "strokes out of", BOARD.strokes.length);
        
        var json = SAVE.serialize({
             strokes : new_strokes
            ,slides : SLIDER.slides
            ,view_rect : SLIDER.get_current_frame()
        });
        
        localStorage.setItem("local_board_" + BOARD.board_name, json);
        
        SAVE.sent_version = null; // reset remote watermark to update the whole board
        
        MENU_main.hide("save_group");
    }

    ,load : function() {
        var json = localStorage.getItem("local_board_"+BOARD.board_name);
        if (json==null)
            return;
            
        var o = SAVE.deserialize(json);

        BOARD.strokes = o.strokes;
        SAVE.update_ids();

        SLIDER.slides = o.slides;
        if (o.slides.length==0) {
            SLIDER.current_ix = null;
        } else {
            SLIDER.current_ix = 0;
        };
        SLIDER.update();
        SLIDER.move_to(o.view_rect);
        
        MENU_main.hide("save_group");
        UI.redraw();
    }

    
    ,sync_message : function(msg) {
        var in_strokes = msg["strokes"];
        var in_version = msg["version"];
        
        var id2idx = BOARD.strokes.reduce( (a, stroke, idx)=>{
            a[stroke.stroke_id] = idx;
            return a;
        }, {});
        
        for(var i=0; i<in_strokes.length; i++) {
            var in_stroke = in_strokes[i];
            if (in_stroke.stroke_id in id2idx) {
                // updated stroke
                var sid = id2idx[in_stroke.stroke_id];
                var own_stroke = BOARD.strokes[sid];
                if (in_stroke.version > own_stroke.version) {
                    BOARD.strokes[sid] = in_stroke;
                } else {
                    // received stroke with outdated version, collision?
                };
            } else {
                // new stroke
                BOARD.strokes.push(in_stroke);
            };
            BOARD.commit_id = Math.max(BOARD.commit_id, in_stroke.commit_id+1);
            BOARD.stroke_id = Math.max(BOARD.stroke_id, in_stroke.stroke_id+1);
            BOARD.version = Math.max(BOARD.version, in_stroke.version||0);
        };
        
        if (in_strokes.length) {
            UI.redraw();
        };
        
        if (UI.view_mode=="follow") {
            if ((msg["view_rect"]!=undefined)&&(msg["view_rect"]!=null))
                SLIDER.move_to(msg["view_rect"]);
        };
        
    }

    ,sync : function() {
        var from_version = (SAVE.sent_version == null)? 0 : SAVE.sent_version + 1;
        var new_strokes = BOARD.strokes.reduce((a, stroke)=>{
            if (stroke.version >= from_version)
                a.push(stroke); 
            return a;
        }, []);
        
        if (SAVE.is_syncing) {
            console.log('skipping sync() - already syncing');
            return;
        };

        if (BOARD.locked) {
            console.log('skipping sync() - board is locked');
            return;
        };


        var message_out = deepcopy({
             name : BOARD.board_name

            ,version : BOARD.version
            ,strokes : new_strokes
            ,view_rect : (UI.view_mode=="follow") ? null : SLIDER.get_current_frame()
            ,slides : (UI.view_mode=="follow") ? null : SLIDER.slides

            ,refresh : (SAVE.sent_version == null) ? 1 : 0
            ,lead : (UI.view_mode == "lead")? 1 : 0
        });
        
        //console.log("sending: ", message_out.version, "L=", message_out.strokes.length, message_out);

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = ((xhr, message_out)=>{
            return ()=>{
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var message_in = JSON.parse(xhr.responseText);
                        //console.log("sent: ", message_out.version, "L=", message_out.strokes.length, message_out);
                        if ((message_in.resync)||(BOARD.locked)) {
                            console.log("will resync:", message_in);
                        } else {
                            //console.log("received:", message_in);
                            SAVE.sent_version = message_in.received_version;
                            SAVE.sync_message(message_in);
                        };
                        
                    } else {
                        console.log('could not send the data:', xhr);
                        if (SAVE.autosync) {
                            SAVE.sync_switch();
                        };
                    };
                    SAVE.is_syncing = false;
                } else {
                    //console.log("xhr:", xhr, "rs:", xhr.readyState);
                };
            }
        })(xhr, message_out);
        
        xhr.timeout = 10*1000;
        xhr.ontimeout = ((xhr)=>{return ()=>{console.log("timeout",xhr)}})(xhr);
        xhr.open('POST', '/board.php', true);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        
        SAVE.is_syncing = true;
        xhr.send(JSON.stringify((message_out)));
    }

    ,sync_switch : function() {
        function _sync() {
            if (SAVE.is_syncing) {
                debug('skipping sync: already syncing');
            } else {
                SAVE.sync();
            };
            if (SAVE.autosync) {
                setTimeout(_sync, 1000);
            };
        };
        
        if (SAVE.autosync) {
            SAVE.autosync = false;
        } else {
            SAVE.autosync = true;
            _sync();
        };
        
        SAVE.canvas_sync.width = SAVE.canvas_sync.width;
        var ctx = SAVE.canvas_sync.getContext('2d');
        UI.draw_glyph(SAVE.icon_sync, ctx, undefined, (SAVE.autosync?undefined:"#555"));
    }
    
    ,init : function() {
        var ctx = MENU_main.add("root", "save_group", null, "canvas", "")[1].getContext('2d');
        UI.draw_glyph(SAVE.icon, ctx);

        ctx = MENU_main.add("save_group", "save", SAVE.save, "canvas", "save locally")[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_save, ctx);

        ctx = MENU_main.add("save_group", "load", SAVE.load, "canvas", "load locally")[1].getContext('2d');
        UI.draw_glyph(SAVE.icon_load, ctx);

        var [div,canvas] = MENU_main.add("save_group", "sync", SAVE.sync_switch, "canvas", "auto-sync to server");
        ctx = canvas.getContext('2d');
        SAVE.canvas_sync = canvas;
        UI.draw_glyph(SAVE.icon_sync, ctx, undefined, "#555");
        
        //SAVE.sync_switch();
    }
    
}


// SLIDER ITEMS
let SLIDER = {
     icon_prev :  [null,[26,48],[14,30],[26,13],null,[28,47],[17,30],[28,13],null,[40,47],[28,30],[40,13],null,[42,47],[30,30],[42,13]]
    ,icon_next :  [null,[35,13],[46,30],[35,47],null,[33,13],[44,30],[33,47],null,[21,13],[33,30],[21,47],null,[19,13],[31,30],[19,47]]
    ,icon_del :   [null,[8,43],[8,48],[20,48],[20,43],[8,43],null,[8,12],[8,16],[20,16],[20,12],[8,12],null,[8,27],[8,32],[20,32],[20,27],[8,27],null,[36,35],[41,30],[36,25],null,[27,30],[41,30]]
    ,icon_add :   [null,[40,42],[40,47],[52,47],[52,42],[40,42],null,[40,14],[40,18],[52,18],[52,14],[40,14],null,[8,27],[8,32],[20,32],[20,27],[8,27],null,[36,35],[41,30],[36,25],null,[27,30],[41,30]]
    ,icon_focus : [null,[24,28],[24,32],[36,32],[36,28],[24,28],null,[25,17],[30,22],[35,17],null,[30,8],[30,22],null,[35,44],[30,39],[25,44],null,[30,54],[30,39],null,[12,35],[17,30],[12,25],null,[5,30],[17,30],null,[48,25],[43,30],[48,35],null,[55,30],[43,30]]
    ,icon_home :  [null,[25,16],[30,21],[35,16],null,[30,7],[30,21],null,[35,43],[30,38],[25,43],null,[30,53],[30,38],null,[12,34],[17,29],[12,24],null,[5,29],[17,29],null,[48,24],[43,29],[48,34],null,[55,29],[43,29]]
    

    ,canvas_current : null
    
    ,slides : []
    ,current_ix : null
    
    ,get_current_frame : function() {
        return [   
             UI.local_to_global({X: 0
                                ,Y: 0})
            ,UI.local_to_global({X: UI.window_width - UI.CANVAS_MARGIN * 2
                                ,Y: UI.window_height - UI.CANVAS_MARGIN * 2
                                })
        ]        
    }
    
    ,update : function() {
        SLIDER.canvas_current.width = SLIDER.canvas_current.width;
        if (SLIDER.current_ix==null)
            return;

        var current_slide = SLIDER.slides[SLIDER.current_ix];
        var ctx = SLIDER.canvas_current.getContext('2d');
            
        var label = current_slide[0];
        var bx = 5+(20-5*label.length);        
        
        for(var ci=0; ci<label.length; ci++)
            bx += TexterTool.put_char(label[ci], bx, Menu.SIZE-15, 0.6, (p0,p1)=>{
                UI.draw_stroke(p0, p1, 'green', 5, ctx);
            }) + 5;
        
        SLIDER.move_to(SLIDER.slides[SLIDER.current_ix][1]);
    }
    
    ,_timer : null
    ,move_to : function(rect) {
        var rect0 = SLIDER.get_current_frame();
        var LDX = (UI.window_width - UI.CANVAS_MARGIN*2);
        var LDY = (UI.window_width - UI.CANVAS_MARGIN*2);
        
        if (SLIDER._timer!=null)
            clearTimeout(SLIDER._timer);
        
        function interpolate(p0, p1, step, steps, time) {
            const d = [
                 p1[0].X - p0[0].X, p1[0].Y - p0[0].Y
                ,p1[1].X - p0[1].X, p1[1].Y - p0[1].Y
            ];
            const k = step / steps;

            UI.viewpoint_set(
                 p0[0].X + d[0] * k
                ,p0[0].Y + d[1] * k
                ,LDX / ((p0[1].X + d[2] * k) - UI.viewpoint.dx)
            );

            if (step==steps) {
                SLIDER._timer = null;
                UI.viewpoint_set(p1[0].X, p1[0].Y, LDX / (p1[1].X - p1[0].X));
                
            } else {
                SLIDER._timer = setTimeout(((p0, p1, step, steps, time)=>{
                    return ()=>{interpolate(p0, p1, step+1, steps, time)}
                })(p0, p1, step, steps, time), time/steps);
                
            };
        };
        
        interpolate(rect0, rect, 0, 15, 500);
    }
    
    ,slide_next : function() {
        if (SLIDER.current_ix==null)
            return;
        
        SLIDER.current_ix = (SLIDER.current_ix + 1) % SLIDER.slides.length;
        SLIDER.update();
    }

    ,slide_curr : function() {
        return true;
    }
    
    ,slide_prev : function() {
        if (SLIDER.current_ix==null)
            return;
        
        SLIDER.current_ix = (SLIDER.current_ix - 1);
        if (SLIDER.current_ix==-1)
            SLIDER.current_ix = SLIDER.slides.length-1;
            
        SLIDER.update();
    }

    ,slide_add : function() {
        var frame_rect = SLIDER.get_current_frame();
        
        var code = prompt("New slide code");
        if (code!="") {
            if (SLIDER.current_ix==null) {
                SLIDER.slides.push([code, frame_rect]);
                SLIDER.current_ix = 0;
            } else {
                SLIDER.slides.splice(SLIDER.current_ix + 1, 0, [code, frame_rect]);
                SLIDER.current_ix = SLIDER.current_ix + 1;
            };
        };
        
        SLIDER.update();
        
        return true;        
    }

    ,slide_del : function() {
        SLIDER.slides.splice(SLIDER.current_ix,1);
        SLIDER.current_ix = Math.min(SLIDER.current_ix, SLIDER.slides.length-1); 
        if (SLIDER.slides.length==0)
            SLIDER.current_ix = null;
        
        SLIDER.update();
        return true;
    }
    
    ,slide_focus : function() {
        if (SLIDER.current_ix!=null)
            SLIDER.update();
        return true;
    }

    ,slide_home : function() {
        SLIDER.move_to([{X:0,Y:0},{X:UI.window_width,Y:UI.window_height}])
        if (SLIDER.current_ix!=null)
            SLIDER.current_ix = 0;
            SLIDER.update();
        return true;
    }

    ,init : function() {
        var ctx = MENU_main.add("root", "slide_prev", SLIDER.slide_prev, "canvas", "")[1].getContext('2d');
        UI.draw_glyph(SLIDER.icon_prev, ctx);

        SLIDER.canvas_current = MENU_main.add("root", "slide_curr", SLIDER.slide_curr, "canvas", "")[1];
        //UI.draw_glyph(SLIDER.icon_next, ctx);

        ctx = MENU_main.add("root", "slide_next", SLIDER.slide_next, "canvas", "")[1].getContext('2d');
        UI.draw_glyph(SLIDER.icon_next, ctx);

        ctx = MENU_main.add("slide_curr", "slide_add", SLIDER.slide_add, "canvas", "save locally")[1].getContext('2d');
        UI.draw_glyph(SLIDER.icon_add, ctx);

        ctx = MENU_main.add("slide_curr", "slide_del", SLIDER.slide_del, "canvas", "save locally")[1].getContext('2d');
        UI.draw_glyph(SLIDER.icon_del, ctx);

        ctx = MENU_main.add("slide_curr", "slide_focus", SLIDER.slide_focus, "canvas", "focus on current slide")[1].getContext('2d');
        UI.draw_glyph(SLIDER.icon_focus, ctx);

        ctx = MENU_main.add("slide_curr", "slide_home", SLIDER.slide_home, "canvas", "focus on default viewpoint")[1].getContext('2d');
        UI.draw_glyph(SLIDER.icon_home, ctx);

    }
    
}


var MENU_main = null;
var MENU_options = null;

// initialising piece
function init() {
    UI.init();

    MENU_main = _new(Menu, ["root", "menu", true]);
    MENU_options = _new(Menu, ["root", "options", false]);
    
    BRUSH.init();
    BRUSH.select_color(0);
    
    TOOLS.init();
    TOOLS.add_tool(PAN_ZOOM, false); // "Control" pan & zoom tool handler
    TOOLS.add_tool(UNDO, false); // "Backspace" undo handler 
    TOOLS.add_tool(SelectorTool.DELETE, false); // "Delete" deleter handler 

    TOOLS.add_tool(_new(PenTool, []), true, "[p]en");
    TOOLS.add_tool(_new(EraserTool, []), true, "[e]raser");
    TOOLS.add_tool(_new(TexterTool, []), true, "text [i]nput");

    TOOLS.add_tool(_new(BoxTool, []), true, "[b]ox");
    TOOLS.add_tool(_new(CircleTool, []), true, "[c]ircle/ellipse");
    TOOLS.add_tool(_new(LineTool, []), true, "[l]ine, arrow");
    
    let selector = _new(SelectorTool, []);
    TOOLS.add_tool(selector, true, "[s]elect - scale, rotate, copy, paste");
    
    TOOLS.activate("pen");
    
    SETUP.init();
    //SETUP.add_item(BRUSH_SIZE);
    SETUP.add_item(BRUSH_MODE, "brush scale on/off");
    SETUP.add_item(GRID_MODE, "grid on/off");

    var ctx = MENU_main.add("root", "undo", UNDO.on_activated, "canvas", "undo [backspace]")[1].getContext('2d');
    UI.draw_glyph(UNDO.icon, ctx);
    
    // selector.DELETE + default paste
    selector.init();
    
    // SAVE
    SAVE.init();
    
    // SLIDER
    SLIDER.init();
    
    UI.redraw();
};


