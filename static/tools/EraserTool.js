'use strict';

import {_class} from '../base/objects.js';

import {dst2seg} from '../util/geometry.js';

import {DrawToolBase} from './Base.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';
import {BRUSH} from '../ui/BRUSH.js';


let EraserTool = _class('EraserTool', {
    super : DrawToolBase

    ,icon : [null,[35,10],[24,26],[39,36],[50,20],[35,10],null,[15,40],[21,31],[36,42],null,[44,21],[36,16],[30,25],[38,30],[44,21],null,[39,21],[35,25],null,[50,20],[35,10],[24,26],[39,36],[50,20],null,[42,27],[32,20],null,[41,18],[34,29],null,[45,20],[37,31],null,[38,15],[30,26],null,[15,40],[24,46],null,[36,42],[33,46],[24,46],null,[18,36],[33,46],null,[25,34],[19,43],null,[29,37],[24,45],null,[33,40],[29,46],null,[5,51],[22,51],null,[35,51],[54,51],null,[5,51],[16,51],null,[54,51],[41,51]]

    ,EraserTool : function() {
        DrawToolBase.init.call(this, 'eraser', false, ['Control', 'e']);
    }

    ,touches : function(gp, stroke) {
        let dst = dst2seg(gp
            ,stroke.gp[0]
            ,stroke.gp[1]
        );
        return (dst < ((BRUSH.size + stroke.width)/2.0));
    }

    ,on_start : function(lp) {
        DrawToolBase.on_start.call(this, lp);
        BOARD.op_start();
    }

    ,draw : function(sp, lp, func) { // eslint-disable-line no-unused-vars
        let erased = false;
        let gp = UI.local_to_global(lp);
        for(let i=0; i<BOARD.strokes.length; i++) {
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
        }

        if (erased) {
            UI.redraw();
        }

        UI.add_overlay_stroke(lp, lp, {color : '#9335'});
    }

    ,on_stop : function(lp) {
        this.activated = false;

        let erased = BOARD.strokes.reduce((a, stroke)=>{
            if (stroke.erased==BOARD.stroke_id) {
                stroke.erased = -stroke.erased;
                a.push(stroke);
            }
            return a;
        }, []);

        if (erased.length>0) {
            BOARD.undo_strokes(erased);
            BOARD.add_stroke({gp:[null, 'erase']});
        }

        BOARD.op_commit();
        UI.redraw();

        DrawToolBase.on_move.call(this, lp);
    }

    ,cancel : function() {
        this.activated = false;
    }
});

export {EraserTool};
