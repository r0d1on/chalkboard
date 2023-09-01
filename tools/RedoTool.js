'use strict';

import {_class, is_instance_of} from '../base/objects.js';

import {ErasureStroke} from '../util/Strokes.js';

import {ToolBase} from './Base.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';


let RedoTool = { // background tool
    super : ToolBase

    ,icon : [null,[39,8],[49,17],[39,25],null,[49,17],[37,16],[32,15],[26,16],[20,18],[15,22],[12,27],[11,32],[12,38],[15,44],[20,48],null,[38,19],[34,19],[27,19],[20,18],[15,22],[12,27],[11,32],[12,38],[20,48],[24,50],[33,51],null,[39,8],[49,17],[39,25],null,[20,48],[33,51]]

    ,RedoTool : function() {
        ToolBase.__init__.call(this, 'redo');
        this.background_key = [['Shift', 'Backspace'], ['Control', 'y'], ['Meta', 'y']];
    }

    ,on_activated : function() {
        let redone = BOARD.redo();
        redone.map((stroke)=>{
            if (is_instance_of(stroke, ErasureStroke))
                stroke.flip_by();
        });
        UI.redraw();
    }

};

RedoTool = _class('RedoTool', RedoTool);

export {RedoTool};
