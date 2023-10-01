'use strict';

import {is_instance_of} from '../base/objects.js';

import {Point} from '../util/Point.js';
import {LineStroke, ErasureStroke} from '../util/Strokes.js';
import {SortedList, IndexGrid} from '../util/Structures.js';

import {UI} from './UI.js';
import {BRUSH} from './BRUSH.js';


let BOARD = {
    board_name : null

    ,buffer : [] // globally positioned strokes in buffer layer
    ,add_line : function(lp0, lp1, params={}) {
        let ctx = UI.ctx['buffer'];
        let alpha = undefined;
        let width = params.width || BRUSH.get_local_width();
        let color = params.color;
        let pressure = params.pressure;
        if (pressure === undefined)
            pressure = lp1.pressure || lp0.pressure;

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
            UI.local_to_global(lp0),
            UI.local_to_global(lp1),
            color,
            width / UI.viewpoint.scale
        );

        stroke.draw(ctx);
        BOARD.buffer.push(stroke);
    }

    ,XList : null
    ,YList : null
    ,IGrid : null

    ,version : 0

    ,commit_id : '0000-00'  // last commit id
    ,max_commit_id : '0000-00' // max commit id in the log

    ,stroke_id : '00000-00'
    ,strokes : {} // globally positioned strokes on board layer (committed ones)
    ,locked : false

    ,id_next : function(id) {
        let iid = id.split('-')[0];
        const pad = iid.length;

        iid = Number.parseInt(iid, 36) + 1;
        iid = Number(iid).toString(36);

        while (iid.length < pad)
            iid = '0' + iid;

        return iid + '-' + UI.view_id;
    }

    ,id_prev : function(id) {
        let iid = id.split('-')[0];
        const pad = iid.length;

        iid = Number.parseInt(iid, 36) - 1;
        iid = (iid>=0) ? Number(iid).toString(36) : id.split('-')[0];

        while (iid.length < pad)
            iid = '0' + iid;

        return iid + '-' + UI.view_id;
    }

    ,id_eq : function(id0, id1) {
        return id0.split('-')[0] == id1.split('-')[0];
    }

    ,id_ge : function(id0, id1) {
        return id0.split('-')[0] >= id1.split('-')[0];
    }

    ,id_bt : function(id, id0, id1) {
        const iid = id.split('-')[0];
        return ((id0.split('-')[0] < iid)&&(iid <= id1.split('-')[0]));
    }

    ,add_strokes : function(buffer, clear=true, draw=true) {
        let ctx = UI.ctx['board'];

        if (buffer.length==0)
            return [];

        let brect = UI.get_rect(buffer.reduce((a, stroke)=>{
            if (draw)
                stroke.draw(ctx);

            BOARD.commit_stroke(stroke);

            stroke.rect().map((point)=>{
                a.push(UI.global_to_local(point));
            });

            return a;
        }, []));

        if (clear)
            buffer.splice(0, buffer.length);

        return brect;
    }

    ,flush_commit : function() {
        if (BOARD.buffer.length==0)
            return false;

        BOARD.op_start();
        let brect = BOARD.add_strokes(BOARD.buffer);
        UI.ctx['buffer'].clearRect(
            brect[0].x, brect[0].y,
            brect[1].x - brect[0].x, brect[1].y - brect[0].y
        );
        BOARD.op_commit();

        return true;
    }

    ,hide_commit : function(strokes) {
        BOARD.op_start();
        ErasureStroke.flip_strokes(strokes, BOARD.stroke_id, true);
        BOARD.op_commit();
    }

    ,undo : function() { // ###
        let commit_id_prev = BOARD.id_prev(BOARD.commit_id);

        if (BOARD.id_eq(BOARD.commit_id, commit_id_prev))
            return [];

        let commit_id_was = BOARD.commit_id;
        BOARD.commit_id = commit_id_prev;
        let undone = [];

        BOARD.get_commits(commit_id_prev, commit_id_was).map((commit)=>{
            if (undone.length > 0)
                UI.log(-1, 'undoing more than 1 commit');
            for (let i in commit) {
                let stroke = commit[i];
                undone.push(stroke);
                BOARD.unregister(stroke);
            }
        });

        BOARD.version += 1;

        UI.on_board_changed();
        return undone;
    }

    ,drop_redo : function() {
        if (BOARD.commit_id < BOARD.max_commit_id) {
            for(let commit_id in BOARD.strokes) {
                if ((BOARD.commit_id < commit_id)&&(commit_id <= BOARD.max_commit_id)) {
                    delete BOARD.strokes[commit_id];
                }
            }
        }
    }

    ,redo : function() { // ###
        if (BOARD.id_ge(BOARD.commit_id, BOARD.max_commit_id))
            return [];

        let commit_id_was = BOARD.commit_id;
        BOARD.commit_id = BOARD.id_next(BOARD.commit_id);
        let redone = [];

        BOARD.get_commits(commit_id_was, BOARD.commit_id).map((commit)=>{
            if (redone.length > 0)
                UI.log(-1, 'redoing more than 1 commit');
            for (let i in commit) {
                let stroke = commit[i];
                redone.push(stroke);
                BOARD.register(stroke);
            }
        });

        BOARD.version += 1;

        UI.on_board_changed();
        return redone;
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
        stroke.stroke_id = BOARD.stroke_id;
        stroke.commit_id = BOARD.commit_id;

        BOARD.stroke_id = BOARD.id_next(BOARD.stroke_id);

        BOARD.register(stroke);
    }

    ,op_commit : function() {
        BOARD.unlock();
        UI.on_board_changed();
    }

    ,register : function(stroke, bulk=false) { // ###
        if (bulk) {
            UI.log(-1, 'bulk loading strokes');
            BOARD.init();
            for (const commit_id in stroke) {
                BOARD.strokes[commit_id] = {};
                for(const stroke_id in stroke[commit_id])
                    BOARD.register(stroke[commit_id][stroke_id]);
            }
            UI.log(-1, 'bulk loading strokes done');
            return;
        }

        let old_stroke = BOARD.strokes[stroke.commit_id][stroke.stroke_id];
        if ((old_stroke!==undefined)&&(!old_stroke.is_hidden())) {
            BOARD.unregister(old_stroke);
        }
        if (stroke.is_hidden())
            BOARD.unregister(stroke);
        else {
            BOARD.strokes[stroke.commit_id][stroke.stroke_id] = stroke;
            BOARD.IGrid.add_stroke(stroke);
        }
    }

    ,unregister : function(stroke) { // ###
        BOARD.IGrid.remove_stroke(stroke);
    }

    ,get_global_rect : function() {
        return BOARD.IGrid.bounding_rect();
    }

    ,get_commits : function(commit_min='', commit_max=BOARD.commit_id) {
        let commits = [];
        for(let commit_id in BOARD.strokes) {
            if (BOARD.id_bt(commit_id, commit_min, commit_max))
                commits.push(BOARD.strokes[commit_id]);
        }
        return commits;
    }

    ,get_visible_strokes : function(rect=UI.viewpoint_rect()) {
        let strokes = [];
        for(let stroke of BOARD.IGrid.get_strokes_in(rect)) {
            if (stroke.is_hidden()) // can happend for inplace hidden strokes
                continue;
            strokes.push(stroke);
        }
        return strokes;
    }

    ,get_points : function(rect, classes) {
        let ret = [];

        BOARD.get_commits().map((commit)=>{
            for(let stroke_id in commit) {
                let stroke = commit[stroke_id];

                if ((!stroke.is_drawable())||(stroke.is_hidden()))
                    continue;

                if ((classes!==undefined)&&(!is_instance_of(stroke, classes)))
                    continue;

                stroke.selection(rect).map((sel)=>{
                    ret.push(sel);
                });
            }
        });

        return ret;
    }

    ,get_glyphs : function(col=0, ddx=60, ddy=60) {
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
                    return BOARD.strokes[gs.commit_id][gs.stroke_id].get_point(point_idx).sub(Point.new(col*ddx, row*ddy));
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

    ,init : function() {
        BOARD.strokes = {};

        BOARD.XList = SortedList.new((stroke)=>{
            if (stroke.is_drawable()) {
                let rect = stroke.rect();
                return [rect[0].x, rect[1].x];
            } else {
                return [];
            }
        });
        BOARD.YList = SortedList.new((stroke)=>{
            if (stroke.is_drawable()) {
                let rect = stroke.rect();
                return [rect[0].y, rect[1].y];
            } else {
                return [];
            }
        });
        BOARD.IGrid = IndexGrid.new([Point.new(0,0), Point.new(30,30)], 30);
    }

};

export {BOARD};
