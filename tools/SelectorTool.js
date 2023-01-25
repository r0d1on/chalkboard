'use strict';

import {_class, is_instance_of} from '../base/objects.js';

import {Point} from '../util/Point.js';
import {Stroke, LineStroke, ErasureStroke} from '../util/Strokes.js';

import {DrawToolBase} from './Base.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';
import {BRUSH} from '../ui/BRUSH.js';
import {TOOLS} from '../ui/TOOLS.js';

let SelectorBase = {
    super : DrawToolBase

    ,COLOR : '#F33A'
    ,COLOR_COPYPASTE : '#3F3A'
    ,WIDTH : 6
    ,MODES : {
        SELECTING : 0
        ,SELECTED : 1
        ,MOVING : 2
        ,SCALING : 3
        ,ROTATING : 4
        ,OPTIMIZE : 5
        ,COPY : 6
    }


    ,SelectorBase : function(allowed_modes) {
        this.allowed_modes = new Set(allowed_modes);
        this._selection_reset();
        this.is_capturing = true;
    }


    ,_selection_reset : function() {
        this.selection = [];
        this.selection_keys = {};
        this.selection_center = null;
        this.selection_rect = null;
        this.mode = SelectorBase.MODES.SELECTING;
    }

    ,_select_commit : function(commit_id, reset) {
        commit_id = (commit_id===undefined)?BOARD.commit_id:commit_id;
        reset = (reset===undefined)?true:reset;

        if (reset)
            this._selection_reset();

        for(let stroke_idx in BOARD.strokes[commit_id]) {
            let stroke = BOARD.strokes[commit_id][stroke_idx];
            stroke.selection().map((sel)=>{
                this._add_selected_point(sel.commit_id, sel.stroke_idx, sel.point_idx);
            });
        }

        if (this.selection.length > 0) {
            this.draw_selected();
            this.mode = SelectorBase.MODES.SELECTED;
        } else {
            UI.reset_layer('overlay');
            this.activated = false;
        }

    }

    ,_selected_strokes : function() {
        let was = new Set();
        let selected_strokes = [];
        this.selection.map((sel)=>{
            if (!was.has(sel.stroke_id)) {
                selected_strokes.push(BOARD.strokes[sel.commit_id][sel.stroke_idx]);
                was.add(sel.stroke_id);
            }
        });
        return selected_strokes;
    }

    ,_get_selection_rect : function() {
        return UI.get_rect(
            this.selection.reduce((a, sel)=>{
                let o = BOARD.strokes[sel.commit_id][sel.stroke_idx].get_point(sel.point_idx);
                if (Array.isArray(o)) {
                    o.map((p)=>{o.push(p);});
                } else {
                    a.push(o);
                }
                return a;
            }, [])
        );
    }

    ,get_selection_bounds : function() {
        this.selection_rect = this._get_selection_rect();
        this.selection_center = Point.new(0,0);
        this.selection_center.x = ( this.selection_rect[1].x + this.selection_rect[0].x ) / 2;
        this.selection_center.y = ( this.selection_rect[1].y + this.selection_rect[0].y ) / 2;
    }

    ,_add_selected_point : function(commit_id, stroke_idx, point_idx) {
        let stroke_id = BOARD.strokes[commit_id][stroke_idx].stroke_id;
        let sel_key = '' + commit_id + '/' + stroke_id + '/' + point_idx;
        if (!(sel_key in this.selection_keys)) {
            this.selection.push({
                commit_id : commit_id
                ,stroke_idx : stroke_idx
                ,stroke_id : stroke_id
                ,point_idx : point_idx
            });
            this.selection_keys[sel_key] = this.selection.length - 1;
        }
    }

    ,draw_selected : function() { // draws selection rectangle with keypoints
        this.get_selection_bounds();

        let ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];
        UI.reset_layer('overlay');

        if (this.selection.length == 0) {
            return;
        }

        let W = SelectorBase.WIDTH;
        let S = W; //BRUSH.get_local_width();
        let lp;

        let rect = this.selection_rect.map((p)=>{return UI.global_to_local(p);});
        let box = [ // selection box figure
            Point.new(rect[0].x-W-S, rect[0].y-W-S), Point.new(rect[1].x+W+S, rect[0].y-W-S),
            Point.new(rect[1].x+W+S, rect[1].y+W+S),
            Point.new(rect[0].x-W-S, rect[1].y+W+S)
        ];

        let d = W * 2;
        let brackets = [ // selection box brackets
            [Point.new(box[0].x  , box[0].y+d), box[0], Point.new(box[0].x+d, box[0].y  )]
            ,[Point.new(box[1].x-d, box[1].y  ), box[1], Point.new(box[1].x  , box[1].y+d)]
            ,[Point.new(box[2].x  , box[2].y-d), box[2], Point.new(box[2].x-d, box[2].y  )]
            ,[Point.new(box[3].x+d, box[3].y  ), box[3], Point.new(box[3].x  , box[3].y-d)]
        ];

        // draw rect
        brackets.map((f)=>{
            f.map((p,pi)=>{
                if (pi < f.length-1)
                    UI.draw_line(
                        p
                        ,f[(pi+1) % f.length]
                        ,SelectorBase.COLOR
                        ,W
                        ,ctx
                    );
            });
        });

        // draw selected center
        if (this.allowed_modes.has(SelectorBase.MODES.MOVING)) {
            lp = UI.global_to_local(this.selection_center);
            UI.draw_line(lp, lp, SelectorBase.COLOR, W * 3, ctx);
            UI.draw_line(lp, lp, SelectorBase.COLOR_COPYPASTE, W, ctx);
        }

        // draw ancor mode selectors

        // rotator
        if (this.allowed_modes.has(SelectorBase.MODES.ROTATING)) {
            lp = box[1];
            ctx.beginPath();
            ctx.arc(lp.x, lp.y, d/2, Math.PI, Math.PI/2);
            ctx.stroke();
        }

        // scaler
        if (this.allowed_modes.has(SelectorBase.MODES.SCALING)) {
            lp = box[2];
            ctx.beginPath();
            ctx.rect(lp.x-d/2, lp.y-d/2, d, d);
            ctx.stroke();
        }

        // optimizer
        if (this.allowed_modes.has(SelectorBase.MODES.OPTIMIZE)) {
            lp = Point.new(
                box[1].x
                ,(box[1].y + box[2].y)/2
            );
            UI.draw_line(Point.new(lp.x-d/2, lp.y-d/2), Point.new(lp.x+d/2, lp.y+d/2)
                , SelectorBase.COLOR_COPYPASTE, W, ctx
            );
            UI.draw_line(Point.new(lp.x+d/2, lp.y-d/2), Point.new(lp.x-d/2, lp.y+d/2)
                , SelectorBase.COLOR_COPYPASTE, W, ctx
            );
        }

        // copy
        if (this.allowed_modes.has(SelectorBase.MODES.COPY)) {
            lp = box[0];
            UI.draw_line(Point.new(lp.x, lp.y), Point.new(lp.x-d, lp.y-d)
                ,SelectorBase.COLOR_COPYPASTE, W, ctx);
            UI.draw_line(Point.new(lp.x-d, lp.y-d), Point.new(lp.x, lp.y-d)
                ,SelectorBase.COLOR_COPYPASTE, W, ctx);
            UI.draw_line(Point.new(lp.x-d, lp.y-d), Point.new(lp.x-d, lp.y)
                ,SelectorBase.COLOR_COPYPASTE, W, ctx);
            // paste
            if (this.clipboard.length) {
                lp = box[3];
                UI.draw_line(Point.new(lp.x, lp.y), Point.new(lp.x-d, lp.y+d)
                    ,SelectorBase.COLOR_COPYPASTE, W, ctx);
                UI.draw_line(Point.new(lp.x, lp.y), Point.new(lp.x-d, lp.y)
                    ,SelectorBase.COLOR_COPYPASTE, W, ctx);
                UI.draw_line(Point.new(lp.x, lp.y), Point.new(lp.x, lp.y+d)
                    ,SelectorBase.COLOR_COPYPASTE, W, ctx);
            }
        }

        return ctx;
    }


    ,draw_selecting : function(sp, lp) {
        UI.reset_layer('overlay');

        let ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];

        let rect = UI.get_rect([sp, lp]);

        let figure = [
            rect[0], Point.new(rect[1].x, rect[0].y),
            rect[1], Point.new(rect[0].x, rect[1].y)
        ];

        figure = UI.figure_split(figure, true, 2 * SelectorBase.WIDTH);

        figure.map((p, pi)=>{
            if (pi % 2 == 0)
                return;
            UI.draw_line(p, figure[(pi+1) % figure.length]
                , SelectorBase.COLOR, SelectorBase.WIDTH
                , ctx);
        });
    }


    ,_scale_selection : function(lpc, cx, cy) {
        this.selection.map((sel)=>{
            let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].get_point(sel.point_idx);
            pnt.x -= this.selection_center.x;
            pnt.y -= this.selection_center.y;

            pnt.x *= cx;
            pnt.y *= cy;

            pnt.x += this.selection_center.x;
            pnt.y += this.selection_center.y;
        });
    }

    ,move_scale : function(lp) {
        if (this.activated) {
            let lpc = UI.global_to_local(this.selection_center);
            let cx = ( (lp.x - lpc.x) / (this.last_point.x - lpc.x) );
            let cy = ( (lp.y - lpc.y) / (this.last_point.y - lpc.y) );

            this._scale_selection(lpc, cx, cy);
        }
    }


    ,_move_selection : function(dx, dy) {
        this.selection.map((sel)=>{
            let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].get_point(sel.point_idx);
            pnt.x += dx;
            pnt.y += dy;
        });
    }

    ,move_moving : function(lp) {
        if (this.activated) {
            let dx = -(UI.local_to_global(this.last_point).x - UI.local_to_global(lp).x);
            let dy = -(UI.local_to_global(this.last_point).y - UI.local_to_global(lp).y);
            this._move_selection(dx, dy);
        }
    }

    ,move_selecting : function(lp) {
        if (this.activated) {
            this.draw_selecting(this.start_point, lp);
        }
    }

    ,move_rotate : function(lp) {
        if (this.activated) {
            let lcp = UI.global_to_local(this.selection_center);
            let p0 = this.last_point.sub(lcp);
            let p1 = lp.sub(lcp);

            let a = (
                Math.atan(p0.x / p0.y)
                -Math.atan(p1.x / p1.y)
            );

            if (Math.abs(a) > 1) a = 0;

            this.selection.map((sel)=>{
                let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].get_point(sel.point_idx);
                pnt.x -= this.selection_center.x;
                pnt.y -= this.selection_center.y;

                let rpnt = pnt.rotate(a);
                pnt.x = rpnt.x;
                pnt.y = rpnt.y;

                pnt.x += this.selection_center.x;
                pnt.y += this.selection_center.y;
            });
        }
    }

    ,on_move : function(lp) {
        if (this.mode==SelectorBase.MODES.SELECTING) {
            this.move_selecting(lp);
        } else {
            if (this.mode==SelectorBase.MODES.MOVING) {
                this.move_moving(lp);
            } else if (this.mode==SelectorBase.MODES.SCALING) {
                this.move_scale(lp);
            } else if (this.mode==SelectorBase.MODES.ROTATING) {
                this.move_rotate(lp);
            }
            UI.redraw();
        }
        this.last_point = lp;
    }


    ,cancel_selection : function() {
        this._selection_reset();

        if ((this._activated_by > 0)||(this._activated_by_key == 'a')) { // if activated as an alt tool, or
            this.activated = false;
            this._activated_by = null;
            this._activated_by_key = null;
            TOOLS.reactivate_default(); // return control to the main tool
        }
    }

    ,_get_selection_points : function(grect) {
        return BOARD.get_points(grect);
    }

    ,stop_selecting : function(lp) {
        UI.reset_layer('overlay');
        let sp = this.start_point;

        let grect = UI.get_rect([sp, lp]).map((p)=>{
            return UI.local_to_global(p);
        });

        let points = this._get_selection_points(grect);

        points.map((pnt)=>{
            this._add_selected_point(pnt.commit_id, pnt.stroke_idx, pnt.point_idx);
        });

        if (this.selection.length > 0) {
            this.draw_selected();
            this.mode = SelectorBase.MODES.SELECTED;
        }
    }

    ,_replace_changed : function() {
        let new_strokes = [];
        let old_strokes = [];
        for(let id in this.original_strokes) {
            let old_stroke = this.original_strokes[id];
            let new_stroke = BOARD.strokes[old_stroke.commit_id][old_stroke.stroke_idx];
            // capture changed strokes
            if (!new_stroke.is_hidden())
                new_strokes.push(new_stroke.copy());
            // return original strokes back
            BOARD.strokes[old_stroke.commit_id][old_stroke.stroke_idx] = old_stroke;
            old_strokes.push(old_stroke);
        }

        // delete original strokes
        ErasureStroke.flip_strokes(old_strokes, BOARD.stroke_id, true);

        // add new strokes
        BOARD.flush(new_strokes, false);
    }

    ,on_key_point_stop : function(mode) { // eslint-disable-line no-unused-vars
        this._replace_changed();
        this.mode = SelectorBase.MODES.SELECTED;
        BOARD.op_commit();
        this._select_commit();
    }

    ,on_stop : function(lp) {
        if (this.mode==SelectorBase.MODES.SELECTING) {
            this.stop_selecting(lp);

        } else if (this.mode==SelectorBase.MODES.SELECTED) { // this mode is transient, should not happen
        } else {
            this.on_key_point_stop(this.mode);

        }

        this.activated = false;
    }


    ,_save_selected : function() {
        this.original_strokes = {};

        this.selection.map((sel)=>{
            let stroke = BOARD.strokes[sel.commit_id][sel.stroke_idx];
            if (!(stroke.stroke_id in this.original_strokes)) {
                this.original_strokes[sel.stroke_id] = stroke.copy();
                this.original_strokes[sel.stroke_id].commit_id = sel.commit_id;
                this.original_strokes[sel.stroke_id].stroke_idx = sel.stroke_idx;
            }
        });
    }

    ,on_key_point_start : function(mode) {
        BOARD.op_start();
        this._save_selected();
        this.mode = mode;
    }

    ,on_start : function(lp) {
        DrawToolBase.on_start.call(this, lp);

        if (this.mode==SelectorBase.MODES.SELECTED) {
            let W = SelectorBase.WIDTH;
            let S = W; //BRUSH.get_local_width();

            let rect = this.selection_rect.map((p)=>{return UI.global_to_local(p);});
            let key_points = [
                [UI.global_to_local(this.selection_center), SelectorBase.MODES.MOVING],
                [Point.new(rect[1].x+W+S, rect[0].y-W-S), SelectorBase.MODES.ROTATING],
                [Point.new(rect[1].x+W+S, rect[1].y+W+S), SelectorBase.MODES.SCALING],
                [Point.new(rect[0].x-W-S, rect[0].y-W-S), SelectorBase.MODES.COPY], // copy
                [Point.new(rect[0].x-W-S, rect[1].y+W+S),-SelectorBase.MODES.COPY], // paste
                [Point.new(rect[1].x+W+S, (rect[0].y+rect[1].y)/2), SelectorBase.MODES.OPTIMIZE]
            ];

            let anchor_i = null;
            key_points.map((p, pi)=>{
                let dst = Math.sqrt(lp.dst2(p[0]));
                if (UI.is_mobile)
                    dst /= 3;
                if ((anchor_i == null)&&(this.allowed_modes.has(p[1]))&&(dst < W * 3)) {
                    anchor_i = pi;
                }
            });

            if (anchor_i != null) {
                this.on_key_point_start(key_points[anchor_i][1]);
            } else {
                this.cancel_selection();
                UI.redraw();
            }

            return anchor_i;
        }
    }


    ,on_after_redraw : function() {
        if ((this.mode==SelectorBase.MODES.SELECTED)
            ||(this.mode==SelectorBase.MODES.MOVING)) {
            this.draw_selected();
        }
    }

    ,on_activated : function() {
        DrawToolBase.super.on_activated.call(this);
        // TODO: DrawToolBase.call('on_activated',this)
    }

    ,on_deactivated : function() {
        this.activated = false;
        //DrawToolBase.on_deactivated.call(this);
    }

};

SelectorBase = _class('SelectorBase', SelectorBase);


let SelectorTool = {
    super : SelectorBase

    ,icon : [null,[6,12],[6,18],null,[7,24],[6,30],null,[6,36],[7,42],null,[7,49],[6,55],null,[12,54],[18,54],null,[25,54],[30,55],null,[36,55],[42,54],null,[48,54],[54,54],null,[54,48],[54,42],null,[54,36],[54,30],null,[54,24],[54,18],null,[54,12],[54,6],null,[48,6],[42,6],null,[36,5],[30,5],null,[25,6],[18,6],null,[12,6],[7,6],null,[54,46],[54,54],[48,54],null,[55,55],[54,46],null,[12,54],[6,55],[11,54],null,[6,55],[6,49],null,[6,54],[7,49],null,[7,6],[12,6],null,[6,12],[6,6],[6,12],null,[55,6],[55,12],null,[48,6],[54,5],[48,6]]
    ,USE_SYSTEM_CLIPBOARD : true
    ,NAME : 'selector'

    ,SelectorTool : function() {
        DrawToolBase.__init__.call(this, SelectorTool.NAME, false, [['Control', 's'], ['Control', 'a'], ['Meta', 'a']]);
        SelectorBase.__init__.call(this, [
            SelectorBase.MODES.SCALING
            ,SelectorBase.MODES.ROTATING
            ,SelectorBase.MODES.OPTIMIZE
            ,SelectorBase.MODES.MOVING
            ,SelectorBase.MODES.COPY
        ]);

        this.original_strokes = {};
        this.clipboard = [];
    }


    ,init : function(MENU_main) {
        let ctx = MENU_main.add('root', 'delete', SelectorTool.DELETE.on_activated, 'canvas', 'delete selected[del]')[1].getContext('2d');
        UI.draw_glyph(SelectorTool.DELETE.icon, ctx);

        SelectorTool.DELETE.selector = this;

        // default strokes paste override
        UI.on_paste_strokes_default = (strokes)=>{
            UI.log(1, 'selector:on_paste_strokes_default');

            TOOLS.activate(SelectorTool.NAME, false, 0);

            this.last_point = UI._last_point;

            this.paste(strokes);
        };
    }


    ,on_key_point_start : function(mode) {
        if (mode == SelectorBase.MODES.COPY) {
            this.copy();
        } else if (mode == -SelectorBase.MODES.COPY) {
            if (SelectorTool.USE_SYSTEM_CLIPBOARD) {
                if ((navigator.clipboard===undefined)||(navigator.clipboard==null)) {
                    SelectorTool.USE_SYSTEM_CLIPBOARD = false;
                    UI.toast('copy/paste', 'system clipboard is unavailable', 2000);
                } else {
                    navigator.clipboard.readText().then(text => {
                        UI.on_paste(text, 'text/plain');
                    });
                }
            } else {
                this.paste(this.clipboard);
            }
        } else if (mode == SelectorBase.MODES.OPTIMIZE) {
            BOARD.op_start();
            this._save_selected();
            this.mode = mode;
            this.optimize();
            this.on_key_point_stop(SelectorBase.MODES.OPTIMIZE);
        } else {
            // SelectorBase.MODES.MOVING
            // SelectorBase.MODES.ROTATING
            // SelectorBase.MODES.SCALING
            SelectorBase.on_key_point_start.call(this, mode);
        }
    }

    ,_try_select : function(lp) {
        if (UI.keys['Shift']||UI.keys['Alt']) {
            // Shift - select / unselect
            // Alt - select / unselect figure
            let W = SelectorBase.WIDTH;
            let S = BRUSH.get_local_width();

            // points nearby
            let points = BOARD.get_points(
                UI.get_rect([
                    Point.new(lp.x-W-S, lp.y-W-S)
                    ,Point.new(lp.x+W+S, lp.y+W+S)
                ]).map((p)=>{
                    return UI.local_to_global(p);
                }));

            // points from touched strokes
            BOARD.get_points(
                UI.get_rect([
                    Point.new(0, 0)
                    ,Point.new(UI.window_width, UI.window_width)
                ]).map((p)=>{
                    return UI.local_to_global(p);
                })
            ).map((pnt)=>{
                if (BOARD.strokes[pnt.commit_id][pnt.stroke_idx].touched_by(UI.local_to_global(lp))) {
                    points.push(pnt);
                }
            });

            if (UI.keys['Alt']) {
                (
                    new Set(points.map((pnt)=>{return pnt.commit_id;}))
                ).forEach((commit_id)=>{
                    this._select_commit(commit_id, false);
                });
            }

            points.map((pnt)=>{
                this._add_selected_point(pnt.commit_id, pnt.stroke_idx, pnt.point_idx);
            });

            if (this.selection.length > 0) {
                this.draw_selected();
                this.mode = SelectorBase.MODES.SELECTED;
            }
            return points.length > 0;
        }
        return false;
    }

    ,on_start : function(lp) {
        if (!this._try_select(lp)) {
            SelectorBase.on_start.call(this, lp);
        }
        return true;
    }


    ,draw_selected : function() {
        let ctx = SelectorBase.draw_selected.call(this);
        // draw over selected points
        this._selected_strokes().map((s)=>{
            if (is_instance_of(s, LineStroke))
                UI.draw_line(
                    UI.global_to_local(s.p0)
                    ,UI.global_to_local(s.p1)
                    ,'#F335'
                    ,s.width * UI.viewpoint.scale * 1.3
                    ,ctx
                );
        });
    }

    ,clipboard : []

    ,copy : function() {
        let copied = new Set();
        this.clipboard = this.selection.reduce((clipboard, sel)=>{
            let stroke = BOARD.strokes[sel.commit_id][sel.stroke_idx];
            if (!copied.has(stroke.stroke_id)) {
                copied.add(stroke.stroke_id);
                clipboard.push(stroke.copy().to_local().to_json());
            }
            return clipboard;
        }, []);

        if (SelectorTool.USE_SYSTEM_CLIPBOARD) {
            if ((navigator.clipboard===undefined)||(navigator.clipboard==null)) {
                SelectorTool.USE_SYSTEM_CLIPBOARD = false;
                UI.toast('copy/paste', 'system clipboard is unavailable', 2000);
            } else {
                window.navigator.clipboard.writeText(
                    JSON.stringify({
                        'strokes' : this.clipboard
                    })
                ).then(UI.log(1, 'copied to system clipboard'));
            }

        }

        this.draw_selected();
    }

    ,paste : function(clipboard) {
        clipboard = clipboard.map((json)=>{
            return Stroke.from_json(json);
        });

        let rect = UI.get_rect(clipboard.reduce((r, stroke)=>{
            r.push(stroke.get_point(0));
            r.push(stroke.get_point(1));
            return r;
        }, []));

        let figure_center = Point.new(
            (rect[0].x + rect[1].x) / 2.0
            ,(rect[0].y + rect[1].y) / 2.0
        );

        BOARD.buffer = [];
        clipboard.map((stroke)=>{
            BOARD.buffer.push(
                stroke.copy()
                    .shift(figure_center, -1).shift(this.last_point, +1)
                    .to_global()
            );
        });
        BOARD.flush_commit();

        this._select_commit();

        this.draw_selected();

        this.clipboard = [];
        this.mode = SelectorBase.MODES.SELECTED;
    }

    ,optimize : function() {

        // merge nearby points
        let squeezed = 0;
        for(let i=0; i<this.selection.length; i++) {
            let s0 = this.selection[i];
            let p0 = BOARD.strokes[s0.commit_id][s0.stroke_idx].get_point(s0.point_idx);
            let lp0 = UI.global_to_local(p0);

            // TODO: n**2 -> O(logN) with kd
            for(let j=i+1; j<this.selection.length; j++) {
                let s1 = this.selection[j];
                let lp1 = UI.global_to_local(BOARD.strokes[s1.commit_id][s1.stroke_idx].get_point(s1.point_idx));
                let to = (BOARD.strokes[s0.commit_id][s0.stroke_idx].width + BOARD.strokes[s1.commit_id][s1.stroke_idx].width)/2.0;
                let d = lp0.dst2(lp1);
                if (( d < to ) && ( d > 0 )) {
                    BOARD.strokes[s1.commit_id][s1.stroke_idx].set_point(s1.point_idx, p0.copy());
                    squeezed += 1;
                }
            }
        }
        UI.log(0, 'Squeezed: ', squeezed);

        // delete dots - strokes of length 0
        let deleted = this.selection.reduce((a, s0)=>{
            let ix = s0.stroke_idx;
            let stroke = BOARD.strokes[s0.commit_id][ix];
            let d = stroke.get_point(0).dst2(stroke.get_point(1));
            if ((d==0)&&(!stroke.is_hidden())) {
                a.push(stroke);
                stroke.erased=undefined;
            }

            return a;
        }, []);

        if (deleted.length>0) {
            deleted.map((stroke)=>{delete stroke.erased;});
            ErasureStroke.flip_strokes(deleted, BOARD.stroke_id);
        }
        UI.log(0, 'Deleted: ', deleted.length);

        //
        if (UI.keys['Shift']) { // round up opt
            let rounded = 0;
            this.selection.map((s0)=>{
                let stroke = BOARD.strokes[s0.commit_id][s0.stroke_idx];
                if (stroke.is_hidden())
                    return;

                [0,1].map((point_idx)=>{
                    let p = stroke.get_point(point_idx);
                    let rnd = false;
                    if (Math.round(p.x)!=p.x) {
                        p.x = Math.round(p.x);
                        rnd = true;
                    }
                    if (Math.round(p.y)!=p.y) {
                        p.y = Math.round(p.y);
                        rnd = true;
                    }
                    if (rnd)
                        stroke.set_point(point_idx, p);
                    rounded += rnd * 1;
                });
            });
            UI.log(0, 'Rounded: ', rounded);
        }
    }


    ,on_key_down : function(key) {
        let handled = false;

        let keymap = {
            'ArrowUp'    : [0,-1],
            'ArrowDown'  : [0,+1],
            'ArrowLeft'  : [-1,0],
            'ArrowRight' : [+1,0]
        };

        if (key=='Escape') {
            this.cancel_selection();
            handled = true;
        }

        if (this.mode==SelectorBase.MODES.SELECTED) {
            if ((UI.keys['Control']||UI.keys['Meta'])&&(key=='c')) {
                this.copy();
                handled = true;

            } else if ((UI.keys['Control']||UI.keys['Meta'])&&(key=='x')) {
                this.copy();
                BOARD.hide_commit(this._selected_strokes());
                handled = true;

            }  else if (key in keymap) {
                let dxdy = keymap[key];
                let scale = (UI.keys['Control']||UI.keys['Meta']||UI.keys['Alt']) ? 1 : 5;
                scale = (UI.keys['Shift']) ? 30 : scale;
                scale = scale / UI.viewpoint.scale;
                this.on_key_point_start(SelectorBase.MODES.MOVING);
                this._move_selection( dxdy[0] * scale, dxdy[1] * scale );
                this.on_key_point_stop(SelectorBase.MODES.MOVING);
                handled = true;

            }

        }

        if ((UI.keys['Control']||UI.keys['Meta'])&&(key=='v')) {
            if (!SelectorTool.USE_SYSTEM_CLIPBOARD) {
                this.paste(this.clipboard);
                handled = true;
            }
        } else if ((UI.keys['Control']||UI.keys['Meta'])&&(key=='a')) {
            this.start_point = Point.new(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
            this.stop_selecting(Point.new(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY));
            handled = true;
        }

        if (handled)
            UI.redraw();

        return handled;
    }

    ,on_paste_strokes : function(strokes) {
        UI.log(1, 'selector:on_paste_strokes');
        this.paste(strokes);
        return true;
    }

    ,on_activated : function() {
        // TODO: DrawToolBase.call('on_activated',this)
        SelectorBase.on_activated.call(this);
        if (this._activated_by_key == 'a') {
            this.start_point = Point.new(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
            this.stop_selecting(Point.new(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY));
        }
    }


    ,DELETE : { // background tool
        icon : [null,[24,55],[21,54],[17,53],null,[43,53],[41,54],[38,55],[34,55],[29,55],[24,55],null,[25,27],[21,27],[16,27],[14,26],[16,24],[19,23],[23,23],[29,23],[34,23],[39,23],[43,24],[45,24],[42,27],[37,27],[32,27],[28,27],[25,27],null,[24,16],[20,16],[16,15],[14,15],[16,13],[19,12],[23,12],[28,11],[33,11],[38,12],[41,12],[44,13],[40,16],[36,16],[32,16],[27,16],[24,16],null,[14,26],[17,53],null,[45,24],[43,53],null,[21,54],[21,27],null,[24,55],[25,27],null,[29,55],[30,28],null,[34,55],[35,28],null,[42,27],[38,55],null,[16,27],[17,53],null,[21,27],[24,55],null,[28,27],[29,55],null,[37,27],[38,55],null,[45,24],[43,53],null,[19,12],[39,14],null,[22,7],[23,12],[22,7],[37,7],null,[22,7],[30,5],[37,7],[38,12],[37,7],null,[23,12],[38,12],null,[14,26],[19,23],null,[23,23],[29,23],null,[31,22],[39,23],[45,24]]

        ,name : 'delete'

        ,selector : null

        ,background_key : 'Delete'

        ,on_activated : function() {
            let that = SelectorTool.DELETE.selector;
            if (that.mode==SelectorBase.MODES.SELECTED) {
                BOARD.hide_commit(that._selected_strokes());

                SelectorTool.DELETE.selector._selection_reset();

                UI.redraw();
            }
        }
    }

};

SelectorTool = _class('SelectorTool', SelectorTool);

export {SelectorBase, SelectorTool};
