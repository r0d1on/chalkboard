'use strict';

import {_class} from '../base/objects.js';

import {DrawToolBase} from './Base.js';

import {BOARD} from '../ui/BOARD.js';

/**
 * Pen tool draws a line following the mouse or pointer movement after the tool was activated
 * either with touch / mouse or pen event.
 *
 * @tool.name Pen
 * @tool.demo demo-pen
 * @tool.hotkey ctrl+p
 * @tool.iconpath PenTool.icon|meta.code.value
 */

let PenTool = {
    super : DrawToolBase

    ,icon : [null,[54,15],[47,7],[15,39],[23,46],[54,15],null,[19,50],[10,43],[7,54],[19,50],null,[48,13],[21,40],null,[47,7],[54,15],[23,46],null,[47,7],[15,39],[23,46],null,[19,50],[10,43],[7,54],[18,50],null,[15,47],[7,54],null,[54,15],[15,39],null,[47,7],[23,45]]

    ,PenTool : function() {
        DrawToolBase.__init__.call(this, 'pen', false, ['Control', 'p']);
    }

    ,draw : function(sp, lp, func) { // eslint-disable-line no-unused-vars
        // TODO: if dist(PEN.last_point,p)*viewpoint.zoom > threshold
        BOARD.add_line(this.last_point, lp);
    }

    ,cancel : function() {
        BOARD.buffer = [];
        DrawToolBase.cancel.call(this);
    }

};

PenTool = _class('PenTool', PenTool);

export {PenTool};
