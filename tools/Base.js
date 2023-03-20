'use strict';

import {_class, extend} from '../base/objects.js';

import {UI} from '../ui/UI.js';

import {Point} from '../util/Point.js';

import {BOARD} from '../ui/BOARD.js';
import {BRUSH} from '../ui/BRUSH.js';


function figure_distort(figure, mode, cyclic) { // eslint-disable-line no-unused-vars
    mode = (mode===undefined) ? 1 : mode;
    //cyclic = (cyclic===undefined) ? true : cyclic;

    let w = BRUSH.get_local_width();

    if (mode==1) {
        w *= 1.6;
    } else if (mode==2) {
        w *= 1.0;
    }

    let p0 = null;
    let t = 0;

    let distortion = (p, i)=>{
        if (p==null)
            return p;

        if ((i==0)&&(t==0)) {
            p0 = p.copy();
            return p;
        }

        let v = p0.sub(p);

        let dx = Point.new(Math.abs(v.x), 0).angle(v);
        let dy = Point.new(0, Math.abs(v.y)).angle(v);

        let dphi = Math.sin((2 * Math.PI) * (t / (w * 80)));

        let phi = (2 * Math.PI) * (1 / (w * 60)) * (t + 10 * w * dphi);

        t += Math.sqrt(p.dst2(p0));

        p0 = p.copy();

        return Point.new(
            p.x + Math.sin(phi) * w * ((dx*Math.cos(Math.PI/2) - dy*Math.sin(Math.PI/2)))
            ,p.y + Math.sin(phi) * w * ((dx*Math.sin(Math.PI/2) + dy*Math.cos(Math.PI/2)))
        );

        /*
          X : p.X + Math.sin(phi+dphi*t) * w * ((dx*Math.cos(Math.PI/2)-dy*Math.sin(Math.PI/2)))
         ,Y : p.Y + Math.sin(phi+dphi*t) * w * ((dx*Math.sin(Math.PI/2)+dy*Math.cos(Math.PI/2)))
        */

    };

    figure = figure.map(distortion);

    if (mode==2) {
        if (!cyclic)
            figure.push(null);
        figure.map(distortion).map((p)=>{
            if (p!=null)
                figure.push(p);
        });
    }

    return figure;
}

let ToolBase = {

    ToolBase : function(name) {
        this.name = name;
        this.is_capturing = false; // once fast-activated the tool will release the control by itself
    }

    ,on_activated : function() {
        UI.log(1, this.name, ' - activated');
    }

    ,on_deactivated : function() {
        UI.log(1, this.name, ' - deactivated');
    }

    ,on_before_redraw : function() {}

    ,on_after_redraw : function() {}

    ,on_wheel : function() {}

};

ToolBase = _class('ToolBase', ToolBase);


let DrawToolBase = {
    super : ToolBase

    ,DrawToolBase : function(name, cyclic, shortcut) {
        ToolBase.__init__.call(this, name);

        this.cyclic = cyclic;
        this.shortcut = shortcut;

        this.activated = false;
        this.start_point = null;
        this.last_point = null;
    }

    ,on_start : function(lp) {
        this.activated = true;
        this.start_point = lp;
        this.last_point = lp;
        return true;
    }

    ,draw : function(){throw 'DrawToolBase.draw should be defined';}

    ,on_move : function(lp) {
        if (this.activated) {
            UI.reset_layer('overlay');
            this.draw(this.start_point, lp, UI.draw_overlay_stroke);
            this.last_point = lp;
        } else {
            UI.reset_layer('overlay');
            UI.draw_overlay_stroke(lp, lp, {
                color : BRUSH.get_color('2')
            });
        }
    }

    ,on_stop : function(lp) {
        let handled = false;
        if (this.activated) {
            UI.reset_layer('overlay');
            this.draw(this.start_point, lp, BOARD.add_line);
            BOARD.flush_commit();
            handled = true;
        }
        this.activated = false;
        this.last_point = lp;
        return handled;
    }

    ,cancel : function() {
        UI.reset_layer('overlay');
        this.activated = false;
        UI.redraw();
    }

    ,on_deactivated : function() {
        let lp = UI._last_point;
        this.on_stop(lp);
        ToolBase.on_deactivated.call(this);
    }

};

DrawToolBase = _class('DrawToolBase', DrawToolBase);


let DistortableDrawTool = {
    super : DrawToolBase

    ,DistortableDrawTool : function(name, cyclic, shortcut) {
        DrawToolBase.__init__.call(this, name, cyclic, shortcut);
        this.distorted = 0;
        this.mode = 0;
        this.options = extend(this.options, {
            'distorted' : {
                'icon' : [
                    [null,[8,51],[49,11],null,[8,53],[51,13]] // normal
                    ,[null,[9,50],[24,41],[30,27],null,[51,7],[45,20],[30,27]]  // distorted 1
                    ,[null,[46,26],[50,10],null,[8,53],[25,46],[27,30],[46,26]] // distorted 2
                ]
                ,'on_click' : ()=>{
                    UI.log(1, 'fuzz');
                }
                ,'type' : 'count'
                ,'tooltip' : 'hand-alike distortion mode'
            }
            ,'mode'    : {
                'icon' : [
                    [null,[8,51],[49,11],null,[8,53],[51,13]] // solid
                    ,[null,[7,54],[13,48],null,[19,41],[26,35],null,[33,27],[39,21],null,[52,8],[46,15]] // dashed
                    ,[null,[9,50],[11,49],null,[15,45],[16,43],null,[21,39],[22,38],null,[26,34],[28,33],null,[32,29],[33,27],null,[38,23],[39,22],null,[43,18],[45,17],null,[49,13],[50,11],null,[9,50],[11,49],null,[15,45],[16,43],null,[21,39],[22,38],null,[26,34],[28,33],null,[32,29],[33,27],null,[38,23],[39,22],null,[43,18],[45,17],null,[49,13],[50,11]]
                ]
                ,'on_click' : ()=>{
                    UI.log(1, 'mode');
                }
                ,'type' : 'count'
                ,'tooltip' : 'solid / dash / dotted'
            }
        });
    }

    ,_pre_render : function(figure, split_mode) {
        split_mode = (split_mode===undefined)?this.mode:split_mode;
        let w = BRUSH.get_local_width();

        if (split_mode == 0) {
            // no splitting - use sraight lines
        } else if (split_mode == 1) {
            figure = UI.figure_split(figure, this.cyclic, w*5);
        } else if (split_mode == 2) {
            figure = UI.figure_split(figure, this.cyclic, w);
        }

        if (this.distorted > 0) {
            figure = figure_distort(figure, this.distorted, this.cyclic);
        }

        return figure;
    }

    ,_render : function(figure, draw_line_fun, split_mode) {
        split_mode = (split_mode===undefined)?this.mode:split_mode;
        figure.map((p, pi)=>{
            if ( (pi < figure.length-1) || (this.cyclic) ) {
                if ( (split_mode==1) && (pi%2==1) )
                    return;
                if ( (split_mode==2) && (pi%5!=0) )
                    return;
                if ((p==null)||(figure[(pi+1) % figure.length]==null))
                    return;
                draw_line_fun(
                    p
                    ,figure[(pi+1) % figure.length]
                );
            }
        });
    }

    ,on_key_down : function(key) {
        if (!this.activated)
            return false;

        if (key=='Shift') {
            this.options.distorted.handler();
            this.on_move(this.last_point);
            return true;
        }

        if (key=='Control') {
            this.options.mode.handler();
            this.on_move(this.last_point);
            return true;
        }

        return false;
    }

};

DistortableDrawTool = _class('DistortableDrawTool', DistortableDrawTool);


let SwitchableOrigin = {
    SwitchableOrigin : function() {
        this.origin = 0;
        this.options =  extend(this.options, {
            'origin' : {
                'icon' : [
                    [null,[35,13],[30,8],[25,13],null,[30,51],[30,8],null,[47,35],[52,30],[47,25],null,[9,30],[52,30]] // origin = click
                    ,[null,[47,15],[52,10],[47,5],null,[9,10],[52,10],null,[5,48],[10,53],[15,48],null,[9,10],[10,53]] // origin = (click-current)/2
                ]
                ,'on_click' : ()=>{
                    UI.log(1, 'origin');
                }
                ,'type' : 'count'
                ,'tooltip' : 'origin mode'
            }
        });
    }
};

SwitchableOrigin = _class('SwitchableOrigin', SwitchableOrigin);


export {ToolBase, DrawToolBase, DistortableDrawTool, SwitchableOrigin};
