'use strict';

import {_class} from '../base/objects.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';
import {BRUSH} from '../ui/BRUSH.js';


let ToolBase = _class('ToolBase', {
    
    ToolBase : function(name) {
        this.name = name;
    }
    
    ,on_activated : function(){
        console.log(this.name,' - activated');
    }
    
    ,on_deactivated : function() {
        console.log(this.name,' - deactivated');
    }
    
    ,after_redraw : function() {}

    ,on_wheel : function() {}
    
});


let DrawToolBase = _class('DrawToolBase', {
    super : ToolBase

    ,DrawToolBase : function(name, cyclic, shortcut) {
        ToolBase.init.call(this, name);

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
    }

    ,draw : function(){throw 'DrawToolBase.draw should be defined';}

    ,on_move : function(lp) {
        if (this.activated) {
            UI.reset_layer('overlay');
            this.draw(this.start_point, lp, UI.add_overlay_stroke);
            this.last_point = lp;
        } else {
            UI.reset_layer('overlay');
            UI.add_overlay_stroke(lp, lp, {
                color : BRUSH.get_color('2')
            });
        }
    }
    
    ,on_stop : function(lp) {
        if (this.activated) {
            UI.reset_layer('overlay');
            this.draw(this.start_point, lp, BOARD.add_buffer_stroke);        
            BOARD.flush_commit();
        }
        this.activated = false;
        this.last_point = lp;
    }

    ,cancel : function() {
        UI.reset_layer('overlay');
        this.activated = false;
    }
    
});


let DistortableDrawTool = _class('DistortableDrawTool', {
    super : DrawToolBase

    ,DistortableDrawTool : function(name, cyclic, shortcut) {
        DrawToolBase.init.call(this, name, cyclic, shortcut);
        this.distorted = 0;
        this.mode = 0;
        this.options = {
            'distorted' : {
                'icon' : [
                    [null,[8,51],[49,11],null,[8,53],[51,13]] // normal
                    ,[null,[9,50],[24,41],[30,27],null,[51,7],[45,20],[30,27]]  // distorted 1
                    ,[null,[46,26],[50,10],null,[8,53],[25,46],[27,30],[46,26]] // distorted 2
                ]
                ,'on_click' : ()=>{
                    console.log('fuzz');
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
                    console.log('mode');
                }
                ,'type' : 'count'
                ,'tooltip' : 'solid / dash / dotted'
            }
        };
    }
    
    ,_pre_render : function(figure) {
        let w = BRUSH.get_local_width();
        
        if (this.mode == 0) {
            // no splitting - use sraight lines
        } else if (this.mode == 1) {
            figure = UI.figure_split(figure, this.cyclic, w*5);
        } else if (this.mode == 2) {
            figure = UI.figure_split(figure, this.cyclic, w);
        }
        
        if (this.distorted > 0) {
            figure = UI.figure_distort(figure, this.distorted, this.cyclic);
        }
            
        return figure;
    }

    ,_render : function(figure, func) {
        figure.map((p,pi)=>{
            if ((pi<figure.length-1)||(this.cyclic)) {
                if ((this.mode==1)&&(pi%2==1))
                    return;
                if ((this.mode==2)&&(pi%5!=0))
                    return;
                func(
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

});


export {ToolBase, DrawToolBase, DistortableDrawTool};
