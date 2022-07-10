"use strict";

import {_class} from '../base/objects.js';

import {UI} from '../ui/UI.js';

import {BOARD} from '../ui/BOARD.js';

import {DrawToolBase} from './Base.js';


var PenTool = _class("PenTool", {
    super : DrawToolBase
    
    ,icon : [null,[6,45],[13,53],[46,23],[39,15],[6,45],null,[43,11],[51,19],[55,8],[43,11],null,[12,47],[40,21],null,[13,53],[6,45],[39,15],null,[13,53],[46,23],[39,15],null,[43,11],[51,19],[55,8],[44,11],null,[47,15],[55,8],null,[6,45],[46,23],null,[13,53],[39,16]]
     
    ,PenTool : function() {
        DrawToolBase.init.call(this, "pen", false, ["Control", "p"]);
    }
    
    ,draw : function(sp, lp, func) {
        // TODO: if dist(PEN.last_point,p)*viewpoint.zoom > threshold
        BOARD.add_buffer_stroke(this.last_point, lp);
    }

    ,cancel : function() {
        if ((this.activated)&&(BOARD.flush_commit())) {
            BOARD.rollback();
            UI.redraw();
        };
        this.activated = false;
    }
});


export {PenTool};
