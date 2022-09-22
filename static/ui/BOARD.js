'use strict';

import {dst2} from '../util/geometry.js';

import {UI} from './UI.js';
import {BRUSH} from './BRUSH.js';


let BOARD = {
    board_name : null

    ,buffer : [] // globally positioned strokes on buffer layer and accumulated stroke buffer
    ,add_buffer_stroke : function(lp0, lp1) {
        let ctx = UI.contexts[UI.LAYERS.indexOf('buffer')];
        let color = BRUSH.get_color();
        let width = BRUSH.get_local_width();

        if (lp0!=null)
            UI.draw_stroke(lp0, lp1, color, width, ctx);

        BOARD.buffer.push({
            gp : [UI.local_to_global(lp0), UI.local_to_global(lp1)]
            ,color : color
            ,width : width / UI.viewpoint.scale
        });
    }

    ,version : 0

    ,commit_id : 0  // last commit id
    ,max_commit_id : 0 // max commit id in the log

    ,stroke_id : 0
    ,strokes : {} // globally positioned strokes on board layer (committed ones)
    ,locked : false

    ,add_stroke : function(stroke) {
        stroke.version = BOARD.version;
        stroke.stroke_id = BOARD.stroke_id++;

        let idx = Object.keys(BOARD.strokes[BOARD.commit_id]).length;
        BOARD.strokes[BOARD.commit_id][idx] = stroke;
    }

    ,flush : function(buffer, clear) {
        clear = (clear===undefined)?true:clear;
        let ctx = UI.contexts[UI.LAYERS.indexOf('board')];
        let maxw = -1e10;

        let brect = UI.get_rect(buffer.reduce((a, stroke)=>{
            let lp0, lp1;
            if (stroke.gp[0]!=null) {
                lp0 = UI.global_to_local(stroke.gp[0], UI.viewpoint);
                lp1 = UI.global_to_local(stroke.gp[1], UI.viewpoint);
                UI.draw_stroke(lp0, lp1, stroke.color, stroke.width * UI.viewpoint.scale, ctx);
            }
            BOARD.add_stroke(stroke);

            maxw = Math.max(stroke.width, maxw) * UI.viewpoint.scale;

            a.push(lp0, lp1);
            return a;
        }, []));

        ctx = UI.contexts[UI.LAYERS.indexOf('buffer')];
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

    ,hide_strokes : function(strokes, eraser_id) {

        return strokes.reduce((a, stroke)=>{

            if ((stroke.gp[0]==null)&&(stroke.gp[1]=='erase')) {
                let erased = [];
                for(let commit_id in BOARD.strokes) {
                    let strokes_group = BOARD.strokes[commit_id];
                    for(let i in strokes_group) {
                        if ((strokes_group[i].erased==stroke.stroke_id)||(strokes_group[i].erased==-stroke.stroke_id))
                            erased.push(strokes_group[i]);
                    }
                }

                erased = BOARD.hide_strokes(erased, stroke.stroke_id);
                erased.map((s)=>{
                    a.push(s);
                });

            } else {

                if (stroke.erased!=undefined) {
                    stroke.erased = -stroke.erased;
                } else {
                    stroke.erased = eraser_id;
                }

                stroke.version = BOARD.version;
                a.push(stroke);
            }

            return a;
        }, []);
    }

    ,undo : function() {
        if (BOARD.commit_id == 0) {
            return {};
        }

        BOARD.commit_id -= 1;

        UI.redraw();

        return BOARD.strokes[BOARD.commit_id+1];
    }

    ,op_start : function() {
        if (BOARD.locked)
            throw 'board is locked';

        if (BOARD.commit_id < BOARD.max_commit_id) {
            for(let commit_id=BOARD.commit_id+1; commit_id<=BOARD.max_commit_id; commit_id++) {
                delete BOARD.strokes[commit_id];
            }
        }

        BOARD.version += 1;
        BOARD.commit_id += 1;
        BOARD.strokes[BOARD.commit_id] = {};
        BOARD.max_commit_id = BOARD.commit_id;

        BOARD.locked = true;
    }

    ,op_commit : function() {
        if (!BOARD.locked)
            throw 'board is not locked';
        BOARD.locked = false;
    }


    ,get_strokes : function(rect, points) {
        points = (points===undefined)?false:points;

        let pnt = null;
        let ret = [];

        for(let commit_id=1; commit_id<=BOARD.commit_id; commit_id+=1) {
            for(let i in BOARD.strokes[commit_id]) {
                if (BOARD.strokes[commit_id][i].gp[0]==null)
                    continue;

                if (BOARD.strokes[commit_id][i].erased>0)
                    continue;

                for(let pi=0; pi<2; pi++) {
                    pnt = BOARD.strokes[commit_id][i].gp[pi];

                    if ((rect[0].Y<=pnt.Y)&&(pnt.Y<=rect[1].Y)&&(rect[0].X<=pnt.X)&&(pnt.X<=rect[1].X)) {
                        ret.push({
                            commit_id : commit_id
                            ,stroke_idx : i
                            ,stroke_id : BOARD.strokes[commit_id][i].stroke_id
                            ,point_idx : pi
                        });
                        if (!(points))
                            break;
                    }
                }
            }
        }

        return ret;
    }

    ,get_glyphs : function(col, ddx, ddy) {
        col = (col===undefined)?0:col;
        ddx = (ddx===undefined)?60:ddx;
        ddy = (ddy===undefined)?60:ddy;

        function linearize(glyph) {
            let g = glyph.reduce((a, cur)=>{
                let prev = a.pop();

                if (prev==null) {
                    a.push(null);
                    a.push(cur);

                } else if (Array.isArray(prev)) {
                    let pi;
                    for (pi=0; pi<2; pi++)
                        for (let ci=0; ci<2; ci++) {
                            if (dst2(prev[pi], cur[ci])==0) {
                                a.push(prev[1-pi], prev[pi], cur[1-ci]);
                                pi=9;
                                break;
                            }
                        }
                    if (pi==2) {
                        a.push(prev[0], prev[1]);
                        a.push(null);
                        a.push(cur);
                    }

                } else {
                    if (dst2(prev, cur[0])==0) {
                        a.push(prev, cur[1]);
                    } else if (dst2(prev, cur[1])==0) {
                        a.push(prev, cur[0]);
                    } else {
                        a.push(prev, null, cur);
                    }
                }

                return a;
            },[null]);

            let prev = g.pop();
            if (Array.isArray(prev)) {
                g.push(prev[0],prev[1]);
            } else {
                g.push(prev);
            }

            return g;
        }

        let row = 0;
        let result = [];
        let blanks = 2;

        while(blanks>0) {
            let glyph = BOARD.get_strokes([
                {X:(col+0)*ddx, Y:(row+0)*ddy}
                ,{X:(col+1)*ddx, Y:(row+1)*ddy}
            ]);

            if ((glyph.length==0)) {
                row += 1;
                blanks -= 1;
                continue;
            } else {
                blanks = 2;
            }

            glyph = glyph.map((gs)=>{
                return BOARD.strokes[gs.commit_id][gs.stroke_idx].gp.map((p)=>{
                    return {X:p.X-(col+0)*ddx, Y:p.Y-(row+0)*ddy};
                });
            });

            let rect = UI.get_rect(glyph.reduce((a, ps)=>{
                a.push(ps[0], ps[1]);
                return a;
            }, []));

            glyph = glyph.map((ps)=>{
                return ps.map((p)=>{
                    return {X:p.X, Y:p.Y};
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
                    return [p.X, p.Y];
                }
            });

            result.push([glyph, rect]);

            row += 1;
        }
        return result;
    }

};

export {BOARD};