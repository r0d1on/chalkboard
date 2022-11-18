'use strict';

import {_class, deepcopy} from '../base/objects.js';

import {DrawToolBase} from './Base.js';

import {SelectorBase} from './SelectorTool.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';

let ImageManipulatorTool = {
    super : SelectorBase

    ,icon : [null,[8,52],[8,10],[8,52],null,[8,10],[51,10],[8,10],null,[51,52],[8,52],[51,52],[51,10],[51,52],null,[22,33],[41,49],null,[25,30],[49,49],null,[32,29],[49,43],null,[36,26],[50,37],null,[34,49],[19,37],null,[26,49],[15,41],null,[19,49],[12,44],null,[11,49],[49,49],[50,37],null,[11,49],[12,44],null,[10,45],[25,30],null,[29,33],[36,26],null,[38,28],[48,35],null,[19,23],[19,23],[17,22],[17,22],[16,20],[16,20],[17,17],[17,17],[19,16],[19,16],[21,16],[21,16],[23,17],[23,17],[24,20],[24,20],[23,22],[23,22],[21,23],[19,23],[19,23],null,[20,19],[20,19]]

    ,ImageManipulatorTool : function() {
        DrawToolBase.__init__.call(this, 'imager', false, []);
        SelectorBase.__init__.call(this, [
            SelectorBase.MODES.SCALING
            //,SelectorBase.MODES.ROTATING
            //,SelectorBase.MODES.OPTIMIZE
            ,SelectorBase.MODES.MOVING
            //,SelectorBase.MODES.COPY
        ]);
    }

    ,_move_selection : function(dx, dy) {
        this.selection.map((sel)=>{
            let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[2];
            pnt.rect.map((p)=>{
                p.x += dx;
                p.y += dy;
            });
        });
    }

    ,_scale_selection : function(lpc, cx, cy) {
        this.selection.map((sel)=>{
            let pnt = BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[2];
            pnt.rect.map((p)=>{
                p.x -= this.selection_center.x;
                p.y -= this.selection_center.y;

                p.x *= cx;
                p.y *= cy;

                p.x += this.selection_center.x;
                p.y += this.selection_center.y;
            });
        });
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

    ,_get_selection_rect : function() {
        return this.selection.reduce((a, sel)=>{
            BOARD.strokes[sel.commit_id][sel.stroke_idx].gp[2].rect.map((pnt)=>{
                a.push(pnt);
            });
            return a;
        }, []);
    }

    ,_get_selection_points : function(grect) {
        return BOARD.get_strokes(grect, true, 'image'); // selected images
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
            if (key=='Delete') {
                BOARD.hide_commit(this._selected_strokes());
                this._selection_reset();
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

        if (handled)
            UI.redraw();

        return handled;
    }


};

ImageManipulatorTool = _class('ImageManipulatorTool', ImageManipulatorTool);

export {ImageManipulatorTool};
