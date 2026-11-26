'use strict';

import {_class} from '../base/objects.js';

import {Point} from '../util/Point.js';

import {DrawToolBase} from './Base.js';

import {UI} from '../ui/UI.js';


let SCALE = null;

/**
 * Measures the distance between a drag start and pointer position.
 * The live overlay reports pixels until a scale is calibrated. While the ruler
 * is active, press Space on a known-length segment to set that segment as one
 * scale unit; subsequent measurements use that unit and show ruler ticks.
 * Activation: Control+L.
 */
let RulerTool = {
    super : DrawToolBase

    ,icon : [null,[8,15],[52,15],[52,49],[8,49],[8,15],null,[19,15],[19,25],null,[30,15],[30,21],null,[41,15],[41,25]]

    ,RulerTool : function() {
        DrawToolBase.__init__.call(this, 'ruler', false, ['Control', 'l']);
        this.toast = null;
    }

    ,_show_text : function(text) {
        if (this.toast===null)
            this.toast = UI.toast('ruler', text, -1, 1);
        else
            this.toast.set_text(text);
    }

    ,draw : function(sp, lp, draw_line_fun) {
        const distance = sp.dst(lp);
        const value = (SCALE===null) ? distance : distance / (SCALE * UI.viewpoint.scale) ;
        const style = {color:'#F33A', width:6};
        if (distance==0)
            return;

        draw_line_fun(sp, lp, style);

        this._show_text(value.toFixed(2) + ((SCALE===null) ? ' px' : ''));

        if (SCALE===null)
            return;

        const dx = (lp.x - sp.x) / distance;
        const dy = (lp.y - sp.y) / distance;
        const tick_length = 4;
        for(let d=SCALE * UI.viewpoint.scale; d <= distance; d += SCALE * UI.viewpoint.scale) {
            const center = Point.new(sp.x + dx*d, sp.y + dy*d);
            draw_line_fun(
                Point.new(center.x - dy*tick_length, center.y + dx*tick_length)
                ,Point.new(center.x + dy*tick_length, center.y - dx*tick_length)
                ,style
            );
        }
    }

    ,on_stop : function(lp) {
        let handled = false;
        if (this.activated) {
            UI.reset_layer('overlay');
            if (this.toast!==null) {
                this.toast.drop();
                this.toast = null;
            }
            handled = true;
        }
        this.activated = false;
        this.last_point = lp;
        return handled;
    }

    ,on_key_down : function(key) {
        if ((key!=' ')&&(key!='Space'))
            return false;

        if (this.activated) {
            const distance = this.start_point.dst(this.last_point);
            if (distance > 0) {
                SCALE = distance / UI.viewpoint.scale;
                this.on_move(this.last_point);
            } else {
                this._show_text('SCALE requires a non-zero distance');
            }
        } else {
            SCALE = null;
        }
        return true;
    }


};

RulerTool = _class('RulerTool', RulerTool);

export {RulerTool};
