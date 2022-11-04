'use strict';

import {_class, sizeof} from '../base/objects.js';

import {add_class} from './html.js';

import {UI} from '../ui/UI.js';


let Toast = {
    TOASTS : {}
    ,DY : (3*10 + 20)

    ,Toast : function(topic, text, lifespan) {
        if (topic in Toast.TOASTS)
            Toast.drop(topic);

        const div = document.createElement('div');
        add_class(div, 'toast');
        div.innerHTML = text;

        document.body.appendChild(div);
        let top = ((UI.window_height - div.clientHeight)>>1);
        let bottom = ((UI.window_width - div.clientWidth)>>1);

        top = top + sizeof(Toast.TOASTS) * Toast.DY;

        div.style.top = '' +  top + 'px';
        div.style.left = '' + bottom + 'px';

        Toast.TOASTS[topic] = {
            'div' : div
            ,'lifespan' : lifespan
            ,'age' : 0
            ,'timeout' : setTimeout(Toast.blur(topic), lifespan/10)
        };

    }

    ,drop : function(topic) {
        document.body.removeChild(Toast.TOASTS[topic]['div']);
        clearTimeout(Toast.TOASTS[topic]['timeout']);
        delete Toast.TOASTS[topic];
    }

    ,blur : function(topic) {
        function handler() {
            const tst = Toast.TOASTS[topic];
            if (tst===undefined)
                return;

            if (tst['age'] >= tst['lifespan']) {
                Toast.drop(topic);
            } else {
                tst['age'] += tst['lifespan']/10;
                if (2.0 * tst['age'] >= tst['lifespan'])
                    tst['div'].style.opacity = 1.0 - (tst['age'] / tst['lifespan']);
                tst['timeout'] = setTimeout(Toast.blur(topic), tst['lifespan']/10);
            }
        }
        return handler;
    }
};

Toast = _class('Toast', Toast);

export {Toast};

