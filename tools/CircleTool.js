'use strict';

import {_class} from '../base/objects.js';

import {sub, angle} from '../util/geometry.js';

import {DistortableDrawTool, SwitchableOrigin} from './Base.js';

import {UI} from '../ui/UI.js';


let CircleTool = {
    super : DistortableDrawTool
    ,mixins : [SwitchableOrigin]

    ,icon : [null,[23,52],[19,50],[16,49],[14,46],[11,43],[9,40],[7,37],[7,33],[6,29],[7,26],[7,23],[9,19],[11,16],[14,14],[16,11],[20,10],[23,7],[26,7],[30,6],[34,7],[37,8],[40,9],[44,11],[46,13],[48,16],[51,19],[52,23],[53,27],[53,29],[53,34],[52,37],[51,40],[49,43],[47,46],[43,49],[40,50],[37,52],[33,53],[30,53],[26,53],[23,52]]

    ,CircleTool : function() {
        DistortableDrawTool.init.call(this, 'circle', true, ['Control', 'c']);
    }

    ,draw : function(cp, lp, func) {

        if (this.origin==1) {
            cp = {
                X : (cp.X + lp.X) / 2
                ,Y : (cp.Y + lp.Y) / 2
            };
        }

        let rect = UI.get_rect([cp, lp]);

        if (func==UI.add_overlay_stroke)
            func(cp, cp);

        let rx = (rect[1].X - rect[0].X);
        let ky = (rect[0].Y - rect[1].Y) / rx;
        let figure = [];

        if ((rx==0)||(ky==0)) {
            return;
        }

        let theta = Math.PI/2;
        let step0 = (2*Math.PI/20);
        let step = step0;
        let fixed = 0;

        while (theta < 2.5*Math.PI) {

            let next_point = {
                X:(cp.X + rx*Math.cos(theta+step))
                ,Y:(cp.Y - rx*Math.sin(theta+step)*ky)
            };

            if (figure.length>1) {
                let phi = angle(
                    sub(figure[figure.length-2], figure[figure.length-1])
                    ,sub(next_point, figure[figure.length-1])
                );

                if ((phi > -0.70)&&(isFinite(phi))) {
                    if (step > step0 / 8) {
                        figure.pop();
                        theta -= step;
                        fixed -= 1;
                        step = step / 2;
                        continue;
                    }
                }
            }

            figure.push(next_point);
            theta += step;

            if (step==step0) {
                fixed = 0;
            } else {
                if (fixed==2) {
                    fixed = 0;
                    step = Math.min(step*2, step0);
                } else {
                    fixed += 1;
                }
            }

        }

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

CircleTool = _class('CircleTool', CircleTool);

export {CircleTool};
