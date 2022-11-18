'use strict';

import {sizeof} from '../base/objects.js';

import {Point} from '../util/Point.js';

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

    ,commit_id : '0'  // last commit id
    ,max_commit_id : '0' // max commit id in the log

    ,stroke_id : '0'
    ,strokes : {} // globally positioned strokes on board layer (committed ones)
    ,locked : false

    ,id_next : function(id, pad) {
        pad = (pad===undefined)?4:pad;
        let iid = id.split('-')[0];
        let vid = id.split('-')[1] || UI.view_id;

        iid = Number.parseInt(iid, 36) + 1;
        iid = Number(iid).toString(36);

        while (iid.length < pad)
            iid = '0' + iid;

        return iid + '-' + vid;
    }

    ,id_prev : function(id, pad) {
        pad = (pad===undefined)?4:pad;
        let iid = id.split('-')[0];
        let vid = id.split('-')[1] || UI.view_id;

        iid = Number.parseInt(iid, 36) - 1;
        iid = (iid>=0)?Number(iid).toString(36):id.split('-')[0];

        while (iid.length < pad)
            iid = '0' + iid;

        return iid + '-' + vid;
    }

    ,add_stroke : function(stroke) {
        stroke.version = BOARD.version;

        stroke.stroke_id = BOARD.stroke_id;
        BOARD.stroke_id = BOARD.id_next(BOARD.stroke_id, 5);

        let idx = sizeof(BOARD.strokes[BOARD.commit_id]);
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
        ctx.clearRect(brect[0].x - maxw
            , brect[0].y - maxw
            , brect[1].x - brect[0].x + 2*maxw
            , brect[1].y - brect[0].y + 2*maxw
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
                        if ((strokes_group[i].erased==stroke.stroke_id)||(strokes_group[i].erased=='-'+stroke.stroke_id))
                            erased.push(strokes_group[i]);
                    }
                }

                erased = BOARD.hide_strokes(erased, stroke.stroke_id);
                erased.map((s)=>{
                    a.push(s);
                });
            //} else if ((stroke.gp[0]==null)&&(stroke.gp[1]=='image')) {
            } else {
                if (stroke.erased!=undefined) {
                    if (stroke.erased[0]=='-')
                        stroke.erased = stroke.erased.substr(1);
                    else
                        stroke.erased = '-' + stroke.erased;
                } else {
                    stroke.erased = eraser_id;
                }

                stroke.version = BOARD.version;
                a.push(stroke);
            }

            return a;
        }, []);
    }

    ,hide_commit : function(strokes) {
        BOARD.op_start();
        BOARD.hide_strokes(strokes, BOARD.stroke_id);
        BOARD.add_stroke({gp:[null, 'erase']});
        BOARD.op_commit();
    }

    ,is_hidden : function(stroke) {
        return (
            (stroke.erased!==undefined)&&
            (stroke.erased!==null)&&
            (stroke.erased[0]!='-')
        );
    }

    ,undo : function() {
        if (BOARD.commit_id == BOARD.id_prev(BOARD.commit_id)) {
            return {};
        }

        let commit_id = BOARD.commit_id;

        BOARD.commit_id = BOARD.id_prev(BOARD.commit_id);

        UI.redraw();

        return BOARD.strokes[commit_id];
    }

    ,drop_redo : function() {
        if (BOARD.commit_id < BOARD.max_commit_id) {
            for(let commit_id=BOARD.id_next(BOARD.commit_id); commit_id <= BOARD.max_commit_id; commit_id=BOARD.id_next(commit_id)) {
                delete BOARD.strokes[commit_id];
            }
        }
    }

    ,op_start : function() {
        if (BOARD.locked)
            throw 'board is locked';

        BOARD.drop_redo();

        BOARD.version += 1;
        BOARD.commit_id = BOARD.id_next(BOARD.commit_id);
        BOARD.strokes[BOARD.commit_id] = {};
        BOARD.max_commit_id = BOARD.commit_id;

        BOARD.locked = true;
    }

    ,op_commit : function() {
        if (!BOARD.locked)
            throw 'board is not locked';
        BOARD.locked = false;
    }


    ,get_strokes : function(rect, points, special) {
        points = (points===undefined)?false:points;

        let pnt = null;
        let ret = [];

        for(let commit_id in BOARD.strokes) {
            if (commit_id > BOARD.commit_id)
                break;

            let strokes_group = BOARD.strokes[commit_id];

            for(let stroke_idx in strokes_group) {
                let stroke = strokes_group[stroke_idx];

                if (BOARD.is_hidden(stroke))
                    continue;

                if (stroke.gp[0]==null) {
                    if ((stroke.gp[1]==special)&&(
                        (rect[0].y > stroke.gp[2].rect[0].y)&&(rect[0].y < stroke.gp[2].rect[1].y)&&
                        (rect[0].x > stroke.gp[2].rect[0].x)&&(rect[0].x < stroke.gp[2].rect[1].x)
                    )) {
                        ret.push({
                            commit_id : commit_id
                            ,stroke_idx : stroke_idx
                            ,stroke_id : stroke.stroke_id
                            ,point_idx : null
                        });
                    }
                } else {
                    for(let pi=0; pi<2; pi++) {
                        pnt = stroke.gp[pi];

                        if ((rect[0].y<=pnt.y)&&(pnt.y<=rect[1].y)&&(rect[0].x<=pnt.x)&&(pnt.x<=rect[1].x)) {
                            ret.push({
                                commit_id : commit_id
                                ,stroke_idx : stroke_idx
                                ,stroke_id : stroke.stroke_id
                                ,point_idx : pi
                            });
                            if (!(points))
                                break;
                        }
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
                            if (prev[pi].dst2(cur[ci])==0) {
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
                    if (prev.dst2(cur[0])==0) {
                        a.push(prev, cur[1]);
                    } else if (prev.dst2(cur[1])==0) {
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
                Point.new((col+0)*ddx, (row+0)*ddy)
                ,Point.new((col+1)*ddx, (row+1)*ddy)
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
                    return Point.new(p.x-(col+0)*ddx, p.y-(row+0)*ddy);
                });
            });

            let rect = UI.get_rect(glyph.reduce((a, ps)=>{
                a.push(ps[0], ps[1]);
                return a;
            }, []));

            glyph = glyph.map((ps)=>{
                return ps.map((p)=>{
                    return Point.new(p.x, p.y);
                });
            });

            rect[0].x -= col*ddx;
            rect[1].x -= col*ddx;
            rect[0].y -= row*ddy;
            rect[1].y -= row*ddy;

            glyph = linearize(glyph);

            glyph = glyph.map((p)=>{
                if (p==null) {
                    return p;
                } else {
                    return [p.x, p.y];
                }
            });

            result.push([glyph, rect]);

            row += 1;
        }
        return result;
    }

};

export {BOARD};
