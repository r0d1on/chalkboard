'use strict';

import {_class, extend, is_instance_of} from '../base/objects.js';

import {Point} from '../util/Point.js';
import {LineStroke, ErasureStroke} from '../util/Strokes.js';

import {DrawToolBase} from './Base.js';

import {UI} from '../ui/UI.js';
import {BOARD} from '../ui/BOARD.js';
import {BRUSH} from '../ui/BRUSH.js';

/**
 * Eraser tool erases either full strokes or only the touched area of the stroke depending on the operation mode
 *
 * @tool.name Eraser
 * @tool.demo demo-eraser
 * @tool.hotkey ctrl+e
 * @tool.iconpath EraserTool.icon|meta.code.value
 */

let EraserTool = {
    super : DrawToolBase

    ,icon : [null,[35,10],[24,26],[39,36],[50,20],[35,10],null,[15,40],[21,31],[36,42],null,[44,21],[36,16],[30,25],[38,30],[44,21],null,[39,21],[35,25],null,[50,20],[35,10],[24,26],[39,36],[50,20],null,[42,27],[32,20],null,[41,18],[34,29],null,[45,20],[37,31],null,[38,15],[30,26],null,[15,40],[24,46],null,[36,42],[33,46],[24,46],null,[18,36],[33,46],null,[25,34],[19,43],null,[29,37],[24,45],null,[33,40],[29,46],null,[5,51],[22,51],null,[35,51],[54,51],null,[5,51],[16,51],null,[54,51],[41,51]]

    ,original_width : null

    ,EraserTool : function() {
        DrawToolBase.__init__.call(this, 'eraser', false, ['Control', 'e']);

        this.mode = 0;
        this.options = extend(this.options, {
            'mode' : {
                'icon' : [
                    [null,[14,10],[14,24],null,[14,37],[14,51],null,[21,10],[21,24],null,[21,37],[21,51],null,[29,10],[29,24],null,[29,37],[29,51],null,[48,10],[48,51],null,[39,10],[39,51],null,[28,29],[32,29],[32,32],[28,32],[28,29],[28,29],[32,29],[32,32],[28,29]] // splitting
                    ,[null,[48,10],[48,51],null,[39,10],[39,51],null,[28,28],[32,28],[32,32],[28,32],[28,28],[28,28],[32,28],[32,32],[28,28]] // erasing
                ]
                ,'on_click' : ()=>{
                    UI.log(1, 'mode');
                }
                ,'type' : 'count'
                ,'tooltip' : 'eraser mode'
            }
        });

        this._buffer_strokes = []; // created strokes (splits)
    }

    ,on_start : function(lp) {
        DrawToolBase.on_start.call(this, lp);
        BOARD.op_start();
        this.original_width = BRUSH.get_local_width();
        BRUSH.set_local_width(Math.min(Math.max(this.original_width * 4, 15), 25));
        this._buffer_strokes = [];
        return true;
    }

    ,draw : function(sp, lp, func) { // eslint-disable-line no-unused-vars
        let erased = [];
        let gp = UI.local_to_global(lp);
        let diameter = BRUSH.size;
        if (!BRUSH.SCALED.value)
            diameter /= UI.viewpoint.scale;

        // collect touched strokes on the board
        BOARD.get_visible_strokes([
            Point.new(gp.x - diameter, gp.y - diameter),
            Point.new(gp.x + diameter, gp.y + diameter)
        ]).map((stroke)=>{
            if (stroke.touched_by(gp, diameter)) {
                let clean_stroke = stroke.copy();
                clean_stroke.erased=undefined;
                erased.push(clean_stroke);
                // hide but do not unregister them yet
                stroke.flip_by(BOARD.stroke_id, false);
            }
        });

        // check touched buffered strokes
        this._buffer_strokes = this._buffer_strokes.reduce((buf, stroke)=>{
            if (stroke.touched_by(gp, diameter))
                erased.push(stroke);
            else
                buf.push(stroke);
            return buf;
        }, []);

        // if "normal" erasing mode - split and trim touched strokes
        if (this.mode==0) {
            erased.map((stroke)=>{
                if (is_instance_of(stroke, LineStroke)) {
                    let trim = Math.max(0, ( diameter - gp.dst2seg( stroke.p0, stroke.p1 ) ) ) / 2;
                    stroke.split_by(gp, trim).map((s)=>{
                        this._buffer_strokes.push(s);
                    });
                }
            });
        }

        if (this._buffer_strokes.length + erased.length > 0)
            UI.redraw(undefined, true, this._buffer_strokes);

        UI.draw_overlay_stroke(lp, lp, {color : '#9335'}); // draw active eraser pointer
    }

    ,on_stop : function(lp) {
        if (!this.activated) {
            return;
        }

        this.activated = false;

        BRUSH.set_local_width(this.original_width);

        let erased = [];

        // "unerase" directly erased strokes
        for(let commit_id in BOARD.strokes) { // TODO: reduce search, look for linked strokes only
            let strokes_group = BOARD.strokes[commit_id];
            for(let i in strokes_group) {
                if (strokes_group[i].erased==BOARD.stroke_id) {
                    strokes_group[i].erased = '-' + BOARD.stroke_id;
                    erased.push(strokes_group[i]);
                }
            }
        }

        // properly "erase" them
        if (erased.length > 0) {
            ErasureStroke.flip_strokes(erased, undefined, true);
        }

        // add new strokes created to board buffer
        this._buffer_strokes.map((stroke)=>{
            BOARD.add_line(
                UI.global_to_local(stroke.p0)
                , UI.global_to_local(stroke.p1)
                , {
                    width : stroke.width * UI.viewpoint.scale
                    ,color : stroke.color
                    ,pressure : null
                }
            );
        });
        BOARD.flush(BOARD.buffer);

        BOARD.op_commit(); // finish board transaction opened in on_start()
        UI.redraw();

        DrawToolBase.on_move.call(this, lp);
    }

    ,cancel : function() {
        // TODO: rollback hidden strokes in opened and not committed transaction
        BRUSH.set_local_width(this.original_width);
        DrawToolBase.cancel.call(this);
    }

};

EraserTool = _class('EraserTool', EraserTool);

export {EraserTool};
