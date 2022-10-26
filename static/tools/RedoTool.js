'use strict';

import {_class} from '../base/objects.js';

import {ToolBase} from './Base.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';


let RedoTool = { // background tool
    super : ToolBase

    ,icon : [null,[39,8],[49,17],[39,25],null,[49,17],[37,16],[32,15],[26,16],[20,18],[15,22],[12,27],[11,32],[12,38],[15,44],[20,48],null,[38,19],[34,19],[27,19],[20,18],[15,22],[12,27],[11,32],[12,38],[20,48],[24,50],[33,51],null,[39,8],[49,17],[39,25],null,[20,48],[33,51]]

    ,RedoTool : function() {
        ToolBase.init.call(this, 'redo');
        this.background_key = [['Shift', 'Backspace'], ['Control', 'y']];
    }

    ,on_activated : function() {
        if (BOARD.commit_id >= BOARD.max_commit_id) {
            return;
        }
        BOARD.commit_id = BOARD.id_next(BOARD.commit_id);
        let strokes_group = BOARD.strokes[BOARD.commit_id];
        for(let i in strokes_group) {
            if ((strokes_group[i].gp[0]==null)&&(strokes_group[i].gp[1]=='erase')) {
                BOARD.version += 1;
                BOARD.hide_strokes([strokes_group[i]]);
            }
        }
        UI.redraw();

    }

};

RedoTool = _class('RedoTool', RedoTool);

export {RedoTool};
