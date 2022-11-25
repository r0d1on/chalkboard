'use strict';

import {_class} from '../base/objects.js';

import {Point} from '../util/Point.js';

import {DistortableDrawTool} from './Base.js';

import {UI} from '../ui/UI.js';

import {BRUSH} from '../ui/BRUSH.js';


let LineTool = {
    super : DistortableDrawTool

    ,icon : [null,[8,51],[49,11],null,[8,53],[51,13]]

    ,LineTool : function() {
        DistortableDrawTool.__init__.call(this, 'line', false, ['Control', 'l']);

        this.arrows = 0;
        this.options['arrows'] = {
            'icon' : [
                [null,[8,51],[49,11],null,[8,53],[51,13]] // solid
                ,[null,[46,21],[46,14],[39,13],null,[9,49],[46,14]] // one arrow
                ,[null,[49,19],[48,12],[41,12],null,[12,42],[12,49],[19,49],null,[12,49],[48,12]] // double arrow
            ]
            ,'on_click' : ()=>{
                UI.log(1, 'arrow');
            }
            ,'type' : 'count'
            ,'tooltip' : 'line / arrow / double arrow'
        };
    }

    ,draw_arrow : function(sp, lp, draw_line_fun) {
        let v = lp.sub(sp);
        let dx = Point.new(Math.abs(v.x), 0).angle(v);
        let dy = Point.new(0, Math.abs(v.y)).angle(v);
        let t = BRUSH.size * UI.viewpoint.scale;

        draw_line_fun(lp, Point.new(
            (lp.x-dx*t) + t*(dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2))
            ,(lp.y-dy*t) + t*(dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2))
        ));

        draw_line_fun(lp, Point.new(
            (lp.x-dx*t) + t*(dx*Math.cos(3*Math.PI/2)-dy*Math.sin(3*Math.PI/2))
            ,(lp.y-dy*t) + t*(dx*Math.sin(3*Math.PI/2)+dy*Math.cos(3*Math.PI/2))
        ));
    }

    ,draw : function(sp, lp, func) {
        let figure = [sp, lp];

        figure = this._pre_render(figure);

        let a0 = [figure[figure.length-2], figure[figure.length-1]];
        let a1 = [figure[1], figure[0]];

        if (this.arrows > 0)
            this.draw_arrow(a0[0], a0[1], func);

        if (this.arrows > 1)
            this.draw_arrow(a1[0], a1[1], func);

        this._render(figure, func);
    }

    ,on_key_down : function(key) {
        if (!this.activated)
            return false;

        if (DistortableDrawTool.on_key_down.apply(this, [key])) {
            return true;
        }

        if (key=='Alt') {
            this.options.arrows.handler();
            this.on_move(this.last_point);
            return true;
        }

        return false;
    }

};

LineTool = _class('LineTool', LineTool);

export {LineTool};
