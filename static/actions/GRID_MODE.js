'use strict';

import {UI} from '../ui/UI.js';


let GRID_MODE = {
    icon : [null,[30,5],[30,55],[30,5],null,[55,30],[5,30],[55,30],null,[19,13],[40,13],null,[20,48],[41,48],null,[11,18],[12,44],null,[48,17],[48,42]]

    ,name : 'grid_mode'

    ,canvas : null

    ,grid_active : false

    ,click : function() {
        GRID_MODE.grid_active = !GRID_MODE.grid_active;
        GRID_MODE.canvas.width = GRID_MODE.canvas.width+1-1;
        let ctx = GRID_MODE.canvas.getContext('2d');
        UI.draw_glyph(GRID_MODE.icon, ctx, undefined, (GRID_MODE.grid_active?undefined:'#555'));
        UI.redraw();
    }

    ,init : function(canvas) {
        GRID_MODE.canvas = canvas;
        GRID_MODE.click();
    }
};

export {GRID_MODE};
