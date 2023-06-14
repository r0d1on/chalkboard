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
        if (BOARD.commit_id >= BOARD.max_commit_id) {
            return;
        }

        let commit_id_was = BOARD.commit_id;
        BOARD.commit_id = BOARD.id_next(BOARD.commit_id);
        let redone = [];

        for(let commit_id in BOARD.strokes) {
            if ((BOARD.commit_id > commit_id)&&(commit_id >= commit_id_was)) {
                if (redone.length > 0)
                    UI.log(-1, 'redoing more than 1 commit');
                for (let i in BOARD.strokes[commit_id])
                    redone.push(BOARD.strokes[commit_id][i]);
            }
        }

        for(let i in redone) {
            if (is_instance_of(redone[i], ErasureStroke)) {
                BOARD.version += 1;
                redone[i].flip_by();
            }
        }
        UI.redraw();
    }

};

RedoTool = _class('RedoTool', RedoTool);

export {RedoTool};
