'use strict';

import {_class} from '../base/objects.js';

import {ToolBase} from './Base.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';


let UndoTool = { // background tool
    super : ToolBase

    ,icon : [null,[21,8],[11,17],[21,25],null,[23,16],[11,17],null,[22,15],[29,15],[35,16],[41,18],[46,22],[49,27],[50,32],[49,38],[46,43],[41,47],null,[22,19],[26,19],[34,19],[41,21],[46,25],[49,29],[50,34],[48,40],[43,45],[37,49],[27,50],null,[11,17],[22,10],null,[10,17],[22,23],null,[38,48],[30,50]]
    ,activation_key : [null, 'Backspace']

    ,UndoTool : function() {
        ToolBase.init.call(this, 'undo');
    }

    ,on_activated : function() {
        let undone = BOARD.undo();
        for(let i in undone) {
            if ((undone[i].gp[0]==null)&&(undone[i].gp[1]=='erase')) {
                BOARD.version += 1;
                BOARD.hide_strokes([undone[i]]);
            }
        }
        UI.redraw();

    }

};

UndoTool = _class('UndoTool', UndoTool);

export {UndoTool};