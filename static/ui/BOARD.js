"use strict";

import {UI} from './UI.js';
import {BRUSH} from './BRUSH.js';


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

};

export {BOARD};
