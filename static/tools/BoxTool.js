'use strict';

import {_class} from '../base/objects.js';

import {DistortableDrawTool, SwitchableOrigin} from './Base.js';

import {UI} from '../ui/UI.js';


let BoxTool = {
    super : DistortableDrawTool
    ,mixins : [SwitchableOrigin]

    ,icon : [null,[13,12],[13,17],[13,22],[12,26],[12,30],[12,34],[13,38],[13,43],[13,48],[17,48],[21,48],[25,48],[30,47],[35,47],[39,48],[43,48],[48,48],[47,43],[47,39],[48,34],[48,30],[48,26],[47,22],[47,17],[47,12],[43,12],[39,13],[34,13],[30,12],[25,12],[21,12],[17,12],[13,12]]

    ,BoxTool : function() {
        DistortableDrawTool.init.call(this, 'box', true, ['Control', 'b']);
        this.origin = 1; // set default origin mode to "top-left"
    }

    ,draw : function(cp, lp, func) {

        if (this.origin==1) {
            cp = {
                X : (cp.X + lp.X) / 2
                ,Y : (cp.Y + lp.Y) / 2
            };
        }

        let rect = UI.get_rect([cp, lp]);

        let dx = rect[1].X - rect[0].X;
        let dy = rect[1].Y - rect[0].Y;

        let figure = [
            {X: cp.X - dx, Y: cp.Y - dy}, {X: cp.X + dx, Y: cp.Y - dy},
            {X: cp.X + dx, Y: cp.Y + dy}, {X: cp.X - dx, Y: cp.Y + dy}
        ];

        figure = this._pre_render(figure);

        this._render(figure, func);
    }

    ,on_key_down : function(key) {
        if (!this.activated)
            return false;

        if (DistortableDrawTool.on_key_down.apply(this, [key])) {
            return true;
        }

        if (key=='Alt') {
            this.options.origin.handler();
            this.on_move(this.last_point);
            return true;
        }

        return false;
    }

};

BoxTool = _class('BoxTool', BoxTool);

export {BoxTool};
