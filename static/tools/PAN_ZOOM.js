"use strict";

import {UI} from '../ui/UI.js';

let PAN_ZOOM = { // background tool 
    icon : [null,[23,49],[30,55],[37,49],null,[35,11],[29,6],[24,12],null,[29,6],[30,18],null,[30,42],[30,55],null,[11,24],[6,30],[11,35],null,[48,34],[54,30],[49,24],null,[54,30],[42,30],null,[18,30],[6,30],null,[30,25],[30,34],null,[24,30],[35,30],null,[25,12],[29,6],[35,11],null,[36,49],[30,55],[24,49],null,[12,25],[6,30],[11,35],null,[48,25],[54,30],[48,34]]
           
    ,name : "panzoom"
    ,activation_key : "Control"
    
    ,moving : false
    ,last_point : null
    
    ,on_start : function(lp) {
        PAN_ZOOM.moving = true;
        PAN_ZOOM.last_point = lp;
        return true;
    }
    
    ,on_move : function(lp) {
        if (PAN_ZOOM.moving) {
            UI.viewpoint_shift(
                 (PAN_ZOOM.last_point.X - lp.X) / UI.viewpoint.scale
                ,(PAN_ZOOM.last_point.Y - lp.Y) / UI.viewpoint.scale
            );
        };
        
        if ((lp.D!=undefined)&&(PAN_ZOOM.last_point.D!=undefined))
            UI.viewpoint_zoom(lp.D / PAN_ZOOM.last_point.D, PAN_ZOOM.last_point);
        
        PAN_ZOOM.last_point = lp;
        return true;
    }
    
    ,on_stop : function(lp) {
        PAN_ZOOM.moving = false;
        return true;
    }

    ,on_wheel : function(delta) {
        var scale = 1.2;
        
        if (delta > 0)
            scale = 1.0 / scale;
        
        if (PAN_ZOOM.last_point!=null)
            UI.viewpoint_zoom(scale, PAN_ZOOM.last_point);
        
        return true;
    }

};

export {PAN_ZOOM};
