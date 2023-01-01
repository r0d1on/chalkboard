'use strict';

import {_class} from '../base/objects.js';

import {Point} from '../util/Point.js';

import {DrawToolBase} from './Base.js';

import {UI} from '../ui/UI.js';
import {BRUSH} from '../ui/BRUSH.js';
import {BOARD} from '../ui/BOARD.js';


let FillTool = {
    super : DrawToolBase

    ,icon : [null,[15,42],[30,41],null,[6,34],[16,46],null,[28,5],[48,29],null,[16,46],[28,46],[48,29],null,[6,34],[6,24],[28,5],null,[12,38],[35,37],null,[9,34],[40,33],null,[8,30],[44,29],null,[6,34],[16,46],[28,46],[48,29],[28,5],[6,24],[6,34],null,[48,47],[53,47],[53,52],[48,52],[48,47],null,[51,46],[54,49],[51,53],[47,49],[51,46],null,[48,47],[50,41],[48,47],null,[54,49],[50,41],[54,49]]

    ,FillTool : function() {
        DrawToolBase.__init__.call(this, 'fill', false, ['Control', 'f']);
    }

    ,get_intersection : function(p0, lw, strokes, dp) {
        let dpx = Point.new(Math.abs(dp.x), 0).angle(dp);
        let dpy = Point.new(0, Math.abs(dp.y)).angle(dp);

        let qx = (((dpx > 0) ? UI.window_width - UI.CANVAS_MARGIN * 2 : 0) - p0.x) / dpx;
        let qy = (((dpy > 0) ? UI.window_height- UI.CANVAS_MARGIN * 2 : 0) - p0.y) / dpy;

        let q = Math.min(Math.abs(qx), Math.abs(qy)) / lw;

        let p1 = p0.add(dp.mul(q));

        for(let commit_id in strokes)
            for(let stroke_idx in strokes[commit_id])
                p1 = BOARD.strokes[commit_id][stroke_idx].intersection(p0, p1, lw) || p1;

        return p1;
    }

    ,draw : function(sp, lp, func) { // eslint-disable-line no-unused-vars
        let strokes = {};
        BOARD.get_points(
            UI.get_rect([
                Point.new(0,0)
                ,Point.new(UI.window_width - UI.CANVAS_MARGIN * 2, UI.window_height- UI.CANVAS_MARGIN * 2)
            ]).map((p)=>{
                return UI.local_to_global(p);
            })
        ).map((s)=>{
            strokes[s.commit_id] = strokes[s.commit_id] || {};
            strokes[s.commit_id][s.stroke_idx] = 1;
        });

        let v = lp.sub(sp);
        let dx = Point.new(Math.abs(v.x), 0).angle(v);
        let dy = Point.new(0, Math.abs(v.y)).angle(v);
        let lw = BRUSH.get_local_width();

        let p0 = null;
        let s = 0;

        while ( (p0==null) || (p0.dst(lp) >= lw * 1.5) ) {
            p0 = Point.new(
                (sp.x + dx * lw * s)
                ,(sp.y + dy * lw * s)
            );

            let p1 = this.get_intersection(p0, lw, strokes,
                Point.new(
                    lw * (dx * Math.cos(Math.PI/2) - dy * Math.sin(Math.PI/2))
                    ,lw * (dx * Math.sin(Math.PI/2) + dy * Math.cos(Math.PI/2))
                )
            );

            let p2 = this.get_intersection(p0, lw, strokes,
                Point.new(
                    lw * (dx * Math.cos(3*Math.PI/2) - dy * Math.sin(3*Math.PI/2))
                    ,lw * (dx * Math.sin(3*Math.PI/2) + dy * Math.cos(3*Math.PI/2))
                )
            );

            func(p1, p2);
            s+=1;
        }

    }

    //,cancel : function() {
    //    BOARD.buffer = [];
    //    DrawToolBase.cancel.call(this);
    //}

};

FillTool = _class('FillTool', FillTool);

export {FillTool};
