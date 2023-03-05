'use strict';

import {sizeof, is_instance_of} from '../base/objects.js';

import {Point} from '../util/Point.js';
import {LineStroke, ErasureStroke} from '../util/Strokes.js';

import {UI} from './UI.js';
import {BRUSH} from './BRUSH.js';


let BOARD = {
    board_name : null

    ,buffer : [] // globally positioned strokes in buffer layer
    ,add_line : function(lp0, lp1, params) {
        let ctx = UI.contexts[UI.LAYERS.indexOf('buffer')];

        params = params || {};

        let alpha = undefined;
        let width = params.width||BRUSH.get_local_width();
        let color = params.color;
        let pressure = params.pressure;
        if (pressure===undefined)
            pressure = lp1.pressure||lp0.pressure;

        if (pressure) {
            if ((BRUSH.PRESSURE.value + 1) & 1) { // pressure -> opacity
                alpha = Math.round(((pressure + 0.0) - 0.5) * 10); // 0..1 -> -5..+5
                alpha = ((BRUSH.OPACITY.value + 1) * 5) + alpha; // ((0..2)+1)*5+(-5..+5)
                alpha = (Math.max(0, Math.min(15, alpha))); // -> 0..15
                alpha = alpha.toString(16).toUpperCase(); // -> 0..F
            }
            if ((BRUSH.PRESSURE.value + 1) & 2) { // pressure -> width
                width = Math.round(width*((pressure + 0.5))); // 0..0.2..1 -> 0.5..0.7..1.5
            }
        }

        color = color || BRUSH.get_color(alpha);

        let stroke = LineStroke.new(
            UI.local_to_global(lp0)
            ,UI.local_to_global(lp1)
            ,color
            ,width / UI.viewpoint.scale
        );

        stroke.draw(ctx);
        BOARD.buffer.push(stroke);
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


    ,flush : function(buffer, clear) {
        clear = (clear===undefined)?true:clear;
        let ctx = UI.contexts[UI.LAYERS.indexOf('board')];
        let maxw = -1e10;

        let brect = UI.get_rect(buffer.reduce((a, stroke)=>{
            stroke.draw(ctx);

            BOARD.commit_stroke(stroke);

            maxw = Math.max(stroke.width, maxw) * UI.viewpoint.scale;

            //a.push(lp0, lp1);
            stroke.rect().map((point)=>{
                a.push(UI.global_to_local(point));
            });

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

    ,hide_commit : function(strokes) {
        BOARD.op_start();
        ErasureStroke.flip_strokes(strokes, BOARD.stroke_id, true);
        BOARD.op_commit();
    }

    ,undo : function() {
        if (BOARD.commit_id == BOARD.id_prev(BOARD.commit_id))
            return [];

        let commit_id = BOARD.commit_id;
        BOARD.commit_id = BOARD.id_prev(BOARD.commit_id);
        UI.redraw();

        let undone = [];
        for (let i in BOARD.strokes[commit_id])
            undone.push(BOARD.strokes[commit_id][i]);

        UI.is_dirty = true;
        return undone;
    }

    ,drop_redo : function() {
        if (BOARD.commit_id < BOARD.max_commit_id) {
            for(let commit_id=BOARD.id_next(BOARD.commit_id); commit_id <= BOARD.max_commit_id; commit_id=BOARD.id_next(commit_id)) {
                delete BOARD.strokes[commit_id];
            }
        }
    }


    ,lock : function() {
        if (BOARD.locked)
            throw 'board is locked';
        BOARD.locked = true;
        UI.set_busy('BOARD', true);
    }

    ,unlock : function() {
        if (!BOARD.locked)
            throw 'board is not locked';
        BOARD.locked = false;
        UI.set_busy('BOARD', false);
    }

    ,op_start : function() {
        BOARD.lock();

        BOARD.drop_redo();

        BOARD.version += 1;
        BOARD.commit_id = BOARD.id_next(BOARD.commit_id);
        BOARD.strokes[BOARD.commit_id] = {};
        BOARD.max_commit_id = BOARD.commit_id;
    }

    ,commit_stroke : function(stroke) {
        stroke.version = BOARD.version;

        let id_next = BOARD.id_next(BOARD.stroke_id, 5);

        if (BOARD.stroke_id == '0')
            BOARD.id_prev(id_next, 5);

        stroke.stroke_id = BOARD.stroke_id;
        BOARD.stroke_id = id_next;

        let idx = sizeof(BOARD.strokes[BOARD.commit_id]);
        stroke.stroke_idx = idx;

        stroke.commit_id = BOARD.commit_id;

        BOARD.strokes[BOARD.commit_id][idx] = stroke;
    }

    ,op_commit : function() {
        BOARD.unlock();
        UI.is_dirty = true;
    }


    ,get_points : function(rect, classes) {
        let ret = [];

        for(let commit_id in BOARD.strokes) {
            if (commit_id > BOARD.commit_id)
                continue;

            let strokes_group = BOARD.strokes[commit_id];

            for(let stroke_idx in strokes_group) {
                let stroke = strokes_group[stroke_idx];

                if (stroke.is_hidden())
                    continue;

                if ((classes!==undefined)&&(!is_instance_of(stroke, classes)))
                    continue;

                stroke.selection(rect).map((sel)=>{
                    ret.push(sel);
                });
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
                g.push(prev[0], prev[1]);
            } else {
                g.push(prev);
            }

            return g;
        }

        let row = 0;
        let result = [];
        let blanks = 2;

        while(blanks>0) {
            let was = new Set();
            let glyph = BOARD.get_points([
                Point.new((col+0)*ddx, (row+0)*ddy)
                ,Point.new((col+1)*ddx, (row+1)*ddy)
            ]).reduce((a, pnt)=>{ // dedup points -> strokes
                if (!was.has(pnt.stroke_id)) {
                    was.add(pnt.stroke_id);
                    a.push(pnt);
                }
                return a;
            }, []);

            if ((glyph.length==0)) {
                row += 1;
                blanks -= 1;
                continue;
            } else {
                blanks = 2;
            }

            glyph = glyph.map((gs)=>{
                return [0,1].map((point_idx)=>{
                    return BOARD.strokes[gs.commit_id][gs.stroke_idx].get_point(point_idx).sub(Point.new(col*ddx, row*ddy));
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
