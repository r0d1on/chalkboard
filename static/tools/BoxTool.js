'use strict';

import {_class} from '../base/objects.js';

import {DistortableDrawTool} from './Base.js';

import {UI} from '../ui/UI.js';


let BoxTool = {
    super : DistortableDrawTool

    ,icon : [null,[13,12],[13,17],[13,22],[12,26],[12,30],[12,34],[13,38],[13,43],[13,48],[17,48],[21,48],[25,48],[30,47],[35,47],[39,48],[43,48],[48,48],[47,43],[47,39],[48,34],[48,30],[48,26],[47,22],[47,17],[47,12],[43,12],[39,13],[34,13],[30,12],[25,12],[21,12],[17,12],[13,12]]

    ,BoxTool : function() {
        DistortableDrawTool.init.call(this, 'box', true, ['Control', 'b']);
    }

    ,draw : function(sp, lp, func) {
        let rect = UI.get_rect([sp, lp]);

        let figure = [
            rect[0], {X:rect[0].X, Y:rect[1].Y},
            rect[1], {X:rect[1].X, Y:rect[0].Y}
        ];

        figure = this._pre_render(figure);

        this._render(figure, func);
    }

};

BoxTool = _class('BoxTool', BoxTool);

export {BoxTool};
