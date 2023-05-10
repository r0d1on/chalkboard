'use strict';

import {_class} from '../base/objects.js';

let Logger = {

    Logger : function(ctx, log_level) {
        this.ctx = ctx;
        this.log_level = log_level;
        this.messages = [];
        this.logs = [];
    }

    ,log : function(level, ...args) {
        if (level > this.log_level)
            return;

        let font_color = 'black';

        if (level >= 0) {
            console.log(...args);
        } else if (level == -1) {
            console.warn(...args);
            font_color = 'red';
        } else  {
            console.error(...args);
            font_color = 'orange';
        }

        this.logs.splice(0, 0, [args.join(' '), level]);
        this.messages.splice(0, 0, [args.join(' '), font_color]);
        this.messages.slice(0, 40);

        if (this.ctx!=null) {

            this.ctx.canvas.width = this.ctx.canvas.width+1-1;

            for(let i=0; i < this.messages.length; i++) {
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(10, (i+2)*25, 20*this.messages[i][0].length, 20);
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = this.messages[i][1];
                this.ctx.font='20px courier';
                this.ctx.strokeText(''+(i)+'::'+this.messages[i][0], 10, 20+(i+2)*25);
            }
        }
    }
};

Logger = _class('Logger', Logger);

export {Logger};
