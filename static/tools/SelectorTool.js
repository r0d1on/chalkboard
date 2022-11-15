'use strict';

import {_class, copy, deepcopy} from '../base/objects.js';

import {dst2, sub, rotate} from '../util/geometry.js';

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

            if (BOARD.is_hidden(stroke))
                continue;

            if ((stroke.gp[0]==null)&&(stroke.gp[1]=='erase'))
                continue;

            if ((stroke.gp[0]==null)&&(stroke.gp[1]=='image')) {
                this._add_selected_point(commit_id, stroke_idx, null);
                continue;
            }

            if (stroke.gp[0]==null)
                throw 'Unknown type of stroke :'+stroke.gp[1];

            this._add_selected_point(commit_id, stroke_idx, 0);
            this._add_selected_point(commit_id, stroke_idx, 1);
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


    ,get_selection_bounds : function() {
        this.selection_rect = this._get_selection_rect();
        this.selection_center = {X:0, Y:0};
        this.selection_center.X = ( this.selection_rect[1].X + this.selection_rect[0].X ) / 2;
        this.selection_center.Y = ( this.selection_rect[1].Y + this.selection_rect[0].Y ) / 2;
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

    ,draw_selected : function() {
        this.get_selection_bounds();

        let ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];
        UI.reset_layer('overlay');

        if (this.selection.length == 0) {
            return;
        }

        let W = SelectorBase.WIDTH;
        let S = BRUSH.get_local_width();
        let lp;

        let rect = this.selection_rect.map((p)=>{return UI.global_to_local(p);});
        let box = [ // selection box figure
            {X:rect[0].X-W-S, Y:rect[0].Y-W-S}, {X:rect[1].X+W+S, Y:rect[0].Y-W-S},
            {X:rect[1].X+W+S, Y:rect[1].Y+W+S},
            {X:rect[0].X-W-S, Y:rect[1].Y+W+S}
        ];

        let d = W * 2;
        let brackets = [ // selection box brackets
            [{X:box[0].X  , Y:box[0].Y+d}, box[0], {X:box[0].X+d, Y:box[0].Y  }]
            ,[{X:box[1].X-d, Y:box[1].Y  }, box[1], {X:box[1].X  , Y:box[1].Y+d}]
            ,[{X:box[2].X  , Y:box[2].Y-d}, box[2], {X:box[2].X-d, Y:box[2].Y  }]
            ,[{X:box[3].X+d, Y:box[3].Y  }, box[3], {X:box[3].X  , Y:box[3].Y-d}]
        ];

        // draw rect
        brackets.map((f)=>{
            f.map((p,pi)=>{
                if (pi < f.length-1)
                    UI.draw_stroke(
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
            UI.draw_stroke(lp, lp, SelectorBase.COLOR, W * 3, ctx);
            UI.draw_stroke(lp, lp, SelectorBase.COLOR_COPYPASTE, W, ctx);
        }

        // draw ancor mode selectors

        // rotator
        if (this.allowed_modes.has(SelectorBase.MODES.ROTATING)) {
            lp = box[1];
            ctx.beginPath();
            ctx.arc(lp.X, lp.Y, d/2, Math.PI, Math.PI/2);
            ctx.stroke();
        }

        // scaler
        if (this.allowed_modes.has(SelectorBase.MODES.SCALING)) {
            lp = box[2];
            ctx.beginPath();
            ctx.rect(lp.X-d/2, lp.Y-d/2, d, d);
            ctx.stroke();
        }

        // optimizer
        if (this.allowed_modes.has(SelectorBase.MODES.OPTIMIZE)) {
            lp = {
                X: box[1].X
                ,Y:(box[1].Y + box[2].Y)/2
            };
            UI.draw_stroke({X:lp.X-d/2,Y:lp.Y-d/2},{X:lp.X+d/2,Y:lp.Y+d/2}, SelectorBase.COLOR_COPYPASTE, W, ctx);
            UI.draw_stroke({X:lp.X+d/2,Y:lp.Y-d/2},{X:lp.X-d/2,Y:lp.Y+d/2}, SelectorBase.COLOR_COPYPASTE, W, ctx);
        }

        // copy
        if (this.allowed_modes.has(SelectorBase.MODES.COPY)) {
            lp = box[0];
            UI.draw_stroke({X:lp.X,Y:lp.Y},{X:lp.X-d,Y:lp.Y-d}  ,SelectorBase.COLOR_COPYPASTE, W, ctx);
            UI.draw_stroke({X:lp.X-d,Y:lp.Y-d},{X:lp.X,Y:lp.Y-d},SelectorBase.COLOR_COPYPASTE, W, ctx);
            UI.draw_stroke({X:lp.X-d,Y:lp.Y-d},{X:lp.X-d,Y:lp.Y},SelectorBase.COLOR_COPYPASTE, W, ctx);

            // paste
            if (this.clipboard.length) {
                lp = box[3];
                UI.draw_stroke({X:lp.X,Y:lp.Y}, {X:lp.X-d,Y:lp.Y+d}, SelectorBase.COLOR_COPYPASTE, W, ctx);
                UI.draw_stroke({X:lp.X,Y:lp.Y}, {X:lp.X-d,Y:lp.Y}, SelectorBase.COLOR_COPYPASTE, W, ctx);
                UI.draw_stroke({X:lp.X,Y:lp.Y}, {X:lp.X,Y:lp.Y+d}, SelectorBase.COLOR_COPYPASTE, W, ctx);
            }
        }

        return ctx;
    }


    ,draw_selecting : function(sp, lp) {
        UI.reset_layer('overlay');

        let ctx = UI.contexts[UI.LAYERS.indexOf('overlay')];

        let rect = UI.get_rect([sp, lp]);

        let figure = [
            rect[0], {X:rect[1].X, Y:rect[0].Y},
            rect[1], {X:rect[0].X, Y:rect[1].Y}
        ];

        figure = UI.figure_split(figure, true, 2 * SelectorBase.WIDTH);

        figure.map((p,pi)=>{
            if (pi%2==0)
                return;
            UI.draw_stroke(p, figure[(pi+1) % figure.length]
                , SelectorBase.COLOR, SelectorBase.WIDTH
                , ctx);
        });
    }

    ,move_scale : function(lp) {
        if (this.activated) {
            let lpc = UI.global_to_local(this.selection_center);
            let cx = ( (lp.X - lpc.X) / (this.last_point.X - lpc.X) );
            let cy = ( (lp.Y - lpc.Y) / (this.last_point.Y - lpc.Y) );

            this._scale_selection(lpc, cx, cy);
        }
    }

    ,move_moving : function(lp) {
        if (this.activated) {
            let dx = -(UI.local_to_global(this.last_point).X - UI.local_to_global(lp).X);
            let dy = -(UI.local_to_global(this.last_point).Y - UI.local_to_global(lp).Y);
            this._move_selection(dx, dy);
        }
    }

    ,move_selecting : function(lp) {
        if (this.activated) {
            this.draw_selecting(this.start_point, lp);
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
            // capture changed strokes
            if (!(BOARD.is_hidden(BOARD.strokes[old_stroke.commit_id][old_stroke.stroke_idx])))
                new_strokes.push(deepcopy(BOARD.strokes[old_stroke.commit_id][old_stroke.stroke_idx]));
            // return original strokes back
            BOARD.strokes[old_stroke.commit_id][old_stroke.stroke_idx] = old_stroke;
            old_strokes.push(old_stroke);
        }

        // delete original strokes
        BOARD.hide_strokes(old_strokes, BOARD.stroke_id);
        BOARD.add_stroke({gp:[null, 'erase']});

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


    ,on_key_point_start : function(mode) {
        BOARD.op_start();
        this._save_selected();
        this.mode = mode;
    }

    ,on_start : function(lp) {
        DrawToolBase.on_start.call(this, lp);

        if (this.mode==SelectorBase.MODES.SELECTED) {
            let W = SelectorBase.WIDTH;
            let S = BRUSH.get_local_width();

            let rect = this.selection_rect.map((p)=>{return UI.global_to_local(p);});
            let key_points = [
                [UI.global_to_local(this.selection_center), SelectorBase.MODES.MOVING],
                [{X:rect[1].X+W+S, Y:rect[0].Y-W-S}, SelectorBase.MODES.ROTATING],
                [{X:rect[1].X+W+S, Y:rect[1].Y+W+S}, SelectorBase.MODES.SCALING],
                [{X:rect[0].X-W-S, Y:rect[0].Y-W-S}, SelectorBase.MODES.COPY], // copy
                [{X:rect[0].X-W-S, Y:rect[1].Y+W+S},-SelectorBase.MODES.COPY], // paste
                [{X:rect[1].X+W+S, Y:(rect[0].Y+rect[1].Y)/2}, SelectorBase.MODES.OPTIMIZE]
            ];

            let anchor_i = null;
            key_points.map((p, pi)=>{
                let dst = Math.sqrt(dst2(lp, p[0]));
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
        DrawToolBase.init.call(this, SelectorTool.NAME, false, [['Control', 's'], ['Control', 'a'], ['Meta', 'a']]);
        SelectorBase.init.call(this, [
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
            UI.log('selector:on_paste_strokes_default');

            TOOLS.activate(SelectorTool.NAME, false, 0);

            this.last_point = UI._last_point;

            this.paste(strokes);
        };
    }

    ,_save_selected : function() {
        this.original_strokes = {};

        this.selection.map((sel)=>{
            let stroke = BOARD.strokes[sel.commit_id][sel.stroke_idx];
            if (!(stroke.stroke_id in this.original_strokes)) {
                this.original_strokes[sel.stroke_id] = deepcopy(stroke);
                this.original_strokes[sel.stroke_id].commit_id = sel.commit_id;
                this.original_strokes[sel.stroke_id].stroke_idx = sel.stroke_idx;
            }
        });
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

            let points = BOARD.get_strokes(
                UI.get_rect([
                    {X:lp.X-W-S, Y:lp.Y-W-S}
                    ,{X:lp.X+W+S, Y:lp.Y+W+S}
                ]).map((p)=>{
                    return UI.local_to_global(p);
                })
                ,true); // select points

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
            return true;
        }
        return false;
    }

    ,on_start : function(lp) {
        if (!this._try_select(lp)) {
            SelectorBase.on_start.call(this, lp);
        }
    }


    ,_move_selection : function(dx, dy) {
        this.selection.map((sel)=>{
            let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[sel.point_idx];
            pnt.X += dx;
            pnt.Y += dy;
        });
    }

    ,_scale_selection : function(lpc, cx, cy) {
        this.selection.map((sel)=>{
            let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[sel.point_idx];
            pnt.X -= this.selection_center.X;
            pnt.Y -= this.selection_center.Y;

            pnt.X *= cx;
            pnt.Y *= cy;

            pnt.X += this.selection_center.X;
            pnt.Y += this.selection_center.Y;
        });
    }


    ,move_rotate : function(lp) {
        if (this.activated) {
            let lcp = UI.global_to_local(this.selection_center);
            let p0 = sub(this.last_point, lcp);
            let p1 = sub(             lp, lcp);

            let a = (
                Math.atan(p0.X / p0.Y)
                -Math.atan(p1.X / p1.Y)
            );

            if (Math.abs(a) > 1) a = 0;

            this.selection.map((sel)=>{
                let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[sel.point_idx];
                pnt.X -= this.selection_center.X;
                pnt.Y -= this.selection_center.Y;

                let rpnt = rotate(pnt, a);
                pnt.X = rpnt.X;
                pnt.Y = rpnt.Y;

                pnt.X += this.selection_center.X;
                pnt.Y += this.selection_center.Y;
            });
        }
    }


    ,_get_selection_points : function(grect) {
        return BOARD.get_strokes(grect, true); // selected points
    }

    ,_get_selection_rect : function() {
        return UI.get_rect(
            this.selection.map((sel)=>{
                return BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[sel.point_idx];
            })
        );
    }


    ,draw_selected : function() {
        let ctx = SelectorBase.draw_selected.call(this);
        // draw over selected points
        this._selected_strokes().map((s)=>{
            UI.draw_stroke(
                UI.global_to_local(s.gp[0])
                ,UI.global_to_local(s.gp[1])
                ,'#F335'
                ,s.width * UI.viewpoint.scale * 1.3
                ,ctx
            );
        });
    }

    ,clipboard : []

    ,copy : function() {
        let copied = new Set();
        this.clipboard = this.selection.reduce((a, sel)=>{
            let stroke = BOARD.strokes[sel.commit_id][sel.stroke_idx];
            if (!copied.has(stroke.stroke_id)) {
                copied.add(stroke.stroke_id);
                let c_stroke = deepcopy(stroke);
                c_stroke.gp[0] = UI.global_to_local(c_stroke.gp[0]);
                c_stroke.gp[1] = UI.global_to_local(c_stroke.gp[1]);
                c_stroke.width *= UI.viewpoint.scale;
                a.push(c_stroke);
            }
            return a;
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
                ).then(UI.log('copied to system clipboard'));
            }

        }

        this.draw_selected();
    }

    ,paste : function(clipboard) {
        let dx = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        let dy = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        clipboard.map((stroke)=>{
            dx = [Math.min(dx[0], stroke.gp[0].X), Math.max(dx[1], stroke.gp[0].X)];
            dx = [Math.min(dx[0], stroke.gp[1].X), Math.max(dx[1], stroke.gp[1].X)];

            dy = [Math.min(dy[0], stroke.gp[0].Y), Math.max(dy[1], stroke.gp[0].Y)];
            dy = [Math.min(dy[0], stroke.gp[1].Y), Math.max(dy[1], stroke.gp[1].Y)];
        });
        dx = (dx[0] + dx[1])/2.0;
        dy = (dy[0] + dy[1])/2.0;

        BOARD.buffer = [];
        clipboard.map((stroke)=>{
            stroke.gp[0] = UI.local_to_global({
                X : stroke.gp[0].X - dx + this.last_point.X
                ,Y : stroke.gp[0].Y - dy + this.last_point.Y
            });
            stroke.gp[1] = UI.local_to_global({
                X : stroke.gp[1].X - dx + this.last_point.X
                ,Y : stroke.gp[1].Y - dy + this.last_point.Y
            });
            stroke.width /= UI.viewpoint.scale;
            BOARD.buffer.push(stroke);
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
            let p0 = BOARD.strokes[s0.commit_id][s0.stroke_idx].gp[s0.point_idx];
            let lp0 = UI.global_to_local(p0);

            // TODO: n**2 -> O(logN) with kd
            for(let j=i+1; j<this.selection.length; j++) {
                let s1 = this.selection[j];
                let lp1 = UI.global_to_local(BOARD.strokes[s1.commit_id][s1.stroke_idx].gp[s1.point_idx]);
                let to = (BOARD.strokes[s0.commit_id][s0.stroke_idx].width + BOARD.strokes[s1.commit_id][s1.stroke_idx].width)/2.0;
                let d = dst2(lp0, lp1);
                if (( d < to ) && ( d > 0 )) {
                    BOARD.strokes[s1.commit_id][s1.stroke_idx].gp[s1.point_idx] = copy(p0);
                    squeezed += 1;
                }
            }
        }
        UI.log('Squeezed: ', squeezed);

        // delete dots - strokes of length 0
        let deleted = this.selection.reduce((a, s0)=>{
            let ix = s0.stroke_idx;
            let stroke = BOARD.strokes[s0.commit_id][ix];
            let d = dst2(stroke.gp[0], stroke.gp[1]);
            if ((d==0)&&(!BOARD.is_hidden(stroke))) {
                a.push(stroke);
                stroke.erased=undefined;
            }

            return a;
        }, []);

        if (deleted.length>0) {
            deleted.map((stroke)=>{delete stroke.erased;});
            BOARD.hide_strokes(deleted, BOARD.stroke_id);
        }
        UI.log('Deleted: ', deleted.length);

        //
        if (UI.keys['Shift']) { // round up opt
            let rounded = 0;
            this.selection.map((s0)=>{
                let ix = s0.stroke_idx;
                if (BOARD.is_hidden(BOARD.strokes[s0.commit_id][ix]))
                    return;

                BOARD.strokes[s0.commit_id][ix].gp.map((p)=>{
                    if (Math.round(p.X)!=p.X) {
                        p.X = Math.round(p.X);
                        rounded++;
                    }
                    if (Math.round(p.Y)!=p.Y) {
                        p.Y = Math.round(p.Y);
                        rounded++;
                    }
                });

            });
            UI.log('Rounded: ', rounded);
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

            } else if ((UI.keys['Control']||UI.keys['Meta'])&&(key=='a')) {
                this.start_point = {X:Number.NEGATIVE_INFINITY,Y:Number.NEGATIVE_INFINITY};
                this.stop_selecting({X:Number.POSITIVE_INFINITY,Y:Number.POSITIVE_INFINITY});
                handled = true;

            } else if (key in keymap) {
                let dxdy = keymap[key];
                let scale = (UI.keys['Control'])?1:5;
                scale = (UI.keys['Shift'])?30:scale;
                scale = scale / UI.viewpoint.scale;
                this._move_selection( dxdy[0] * scale, dxdy[1] * scale );
                handled = true;

            }

        }

        if ((UI.keys['Control']||UI.keys['Meta'])&&(key=='v')) {
            if (!SelectorTool.USE_SYSTEM_CLIPBOARD) {
                this.paste(this.clipboard);
                handled = true;
            }
        }

        if (handled)
            UI.redraw();

        return handled;
    }

    ,on_paste_strokes : function(strokes) {
        UI.log('selector:on_paste_strokes');
        this.paste(strokes);
        return true;
    }

    ,on_activated : function() {
        // TODO: DrawToolBase.call('on_activated',this)
        SelectorBase.on_activated.call(this);
        if (this._activated_by_key == 'a') {
            this.start_point = {X:Number.NEGATIVE_INFINITY,Y:Number.NEGATIVE_INFINITY};
            this.stop_selecting({X:Number.POSITIVE_INFINITY,Y:Number.POSITIVE_INFINITY});
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
