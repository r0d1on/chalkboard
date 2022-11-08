'use strict';

import {_class} from '../base/objects.js';

import {add_class} from './html.js';

import {UI} from '../ui/UI.js';


let Toast = {
    ALIGN : {
        CENTER : 0
        ,TOP_RIGHT : 1
        ,BOTTOM_RIGHT : 2
    }
    ,DY : (3*10 + 20)

    ,TOASTS : {}
    ,TOPICS : [[], [], []]

    ,Toast : function(topic, text, lifespan, align) {
        align = (align===undefined)?Toast.ALIGN.CENTER:align;

        if (topic in Toast.TOASTS)
            Toast.TOASTS[topic].drop();

        this.align = align;

        this.div = document.createElement('div');
        add_class(this.div, 'toast');
        this.div.id = topic;
        this.div.innerHTML = text;
        document.body.appendChild(this.div);

        this.ix = 0;
        while((this.ix < Toast.TOPICS[this.align].length) && (Toast.TOPICS[this.align][this.ix]!==undefined)) this.ix++;

        Toast.TOPICS[this.align][this.ix] = topic;
        Toast.TOASTS[topic] = this;

        this.lifespan = lifespan;
        this.age = 0;
        this.topic = topic;

        if (lifespan > 0)
            this.timeout = setTimeout(this._blur(), lifespan/10);
        else
            this.timeout = null;

        this.set_position();
    }

    ,set_position() {
        let left = UI.window_width - this.div.clientWidth - UI.CANVAS_MARGIN;
        let top_origin = UI.window_height - this.div.clientHeight;
        let dir = +1;

        if (this.align==Toast.ALIGN.CENTER) {
            top_origin = top_origin >> 1;
            left = left>>1;
            dir = +1;
        } else if (this.align==Toast.ALIGN.BOTTOM_RIGHT) {
            top_origin = top_origin - UI.CANVAS_MARGIN;
            dir = -1;
        } else if (this.align==Toast.ALIGN.TOP_RIGHT) {
            top_origin = UI.CANVAS_MARGIN;
            dir = +1;
        }

        let top = top_origin + dir * this.ix * Toast.DY;

        this.div.style.top = '' +  top + 'px';
        this.div.style.left = '' + left + 'px';
    }

    ,set_text : function(text) {
        this.div.innerHTML = text;
        this.set_position();
    }

    ,shift : function() {
        if (this.ix==0)
            return;

        this.ix = this.ix - 1;
        Toast.TOPICS[this.align][this.ix] = Toast.TOPICS[this.align][this.ix + 1];
        Toast.TOPICS[this.align][this.ix + 1] = undefined;

        this.set_position();
    }

    ,drop : function() {
        document.body.removeChild(this.div);
        clearTimeout(this.timeout);
        Toast.TOPICS[this.align][this.ix] = undefined;
        delete Toast.TOASTS[this.topic];

        for(let i = this.ix + 1; i <= Toast.TOPICS[this.align].length; i++) {
            const topic = Toast.TOPICS[this.align][i];
            if (topic===undefined)
                continue;
            const toast = Toast.TOASTS[topic];
            if (toast===undefined)
                continue;
            toast.shift();
        }
    }

    ,_blur : function() {
        const toast = this;
        function handler() {
            if (toast.age >= toast.lifespan) {
                toast.drop();
            } else {
                toast.age += toast.lifespan / 10;
                if (2.0 * toast.age >= toast.lifespan)
                    toast.div.style.opacity = 1.0 - (toast.age / toast.lifespan);
                toast.timeout = setTimeout(toast._blur(), toast.lifespan / 10);
            }
        }
        return handler;
    }
};

Toast = _class('Toast', Toast);

export {Toast};

