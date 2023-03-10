'use strict';

import {_class} from '../base/objects.js';

let Logger = {

    Logger : function(ctx, log_level) {
        this.ctx = ctx;
        this.log_level = log_level;
        this.logs = [];
    }

    ,log : function(level, ...args) {
        if (level > this.log_level)
            return;
        console.log(...args);

        this.logs.splice(0, 0, args.join(' '));
        this.logs.slice(0, 40);

        if (this.ctx!=null) {

            this.ctx.canvas.width = this.ctx.canvas.width+1-1;

            for(let i=0; i < this.logs.length; i++) {
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(10, (i+2)*25, 20*this.logs[i].length, 20);
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = 'black';
                this.ctx.font='20px courier';
                this.ctx.strokeText(''+(i)+'::'+this.logs[i], 10, 20+(i+2)*25);
            }
        }
    }
};

Logger = _class('Logger', Logger);

export {Logger};
