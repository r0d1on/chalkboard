'use strict';

import {_class} from '../base/objects.js';

import {add_class, remove_class} from './html.js';

import {UI} from '../ui/UI.js';
import {Menu} from '../ui/Menu.js';


let Toast = {
    ALIGN : {
        CENTER : 0
        ,TOP_RIGHT : 1
        ,BOTTOM_RIGHT : 2
        ,BOTTOM_LEFT : 3
    }
    ,DY : (3*10 + 20)
    ,DEFAULT_CLASSES : ['toast', 'toast_dark']

    ,TOASTS : {}
    ,TOPICS : [[], [], [], []]

    /* Class methods */

    ,init : function() {
        UI.addEventListener('on_setting_changed', Toast.on_setting_changed);
    }

    ,on_setting_changed : function(name, value) {
        if (name=='board_theme') {
            let old_class = 'toast_bright';
            let new_class = 'toast_dark';
            if (value > 0) { // switched to  dark themes
                old_class = 'toast_dark';
                new_class = 'toast_bright';
            }

            for (const topic in Toast.TOASTS) {
                remove_class(Toast.TOASTS[topic].div, old_class);
                add_class(Toast.TOASTS[topic].div, new_class);
            }

            Toast.DEFAULT_CLASSES[1] = new_class;
        }



    }

    /* Instance methods */

    ,Toast : function(topic, text, lifespan, align, reset) {
        align = (align===undefined)?Toast.ALIGN.CENTER:align;
        reset = (reset===undefined)?true:reset;

        if (topic in Toast.TOASTS) {
            if (reset)
                Toast.TOASTS[topic].drop();
            else
                return Toast.TOASTS[topic];
        } else {
            if (reset===null)
                return null;
        }

        this.align = align;
        this.text = text;

        this.div = document.createElement('div');
        add_class(this.div, Toast.DEFAULT_CLASSES);
        this.div.id = topic;
        this.div.innerHTML = this.text;
        document.body.appendChild(this.div);

        this.ix = 0;
        while(
            (this.ix < Toast.TOPICS[this.align].length) &&
            (Toast.TOPICS[this.align][this.ix]!==undefined)
        ) this.ix++;

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
        } else if (this.align==Toast.ALIGN.BOTTOM_LEFT) {
            top_origin = top_origin - UI.CANVAS_MARGIN - Menu.SIZEY;
            left = UI.CANVAS_MARGIN;
            dir = -1;
        }

        let top = top_origin + dir * this.ix * Toast.DY;

        this.div.style.top = '' +  top + 'px';
        this.div.style.left = '' + left + 'px';
    }

    ,set_text : function(text) {
        let align = this.align;
        this.text = text;
        this.align = Toast.ALIGN.CENTER;
        this.set_position();
        this.div.innerHTML = text;
        this.align = align;
        this.set_position();
    }

    ,set_bold : function(on) {
        let text = this.text.replace('<b>','').replace('</b>','');
        if (on)
            this.set_text('<b>'+text+'</b>');
        else
            this.set_text(text);
    }

    ,set_bg_color : function(color) {
        this.div.style['background-color'] = color;
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

