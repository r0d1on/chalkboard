'use strict';

import {_class} from '../base/objects.js';

import {UI} from './UI.js';

function has_class(dom_elem, className) {
    return (dom_elem.className.split(/ /g).indexOf(className)>=0)
}

function add_class(dom_elem, className) {
    if (!has_class(dom_elem, className)) {
        dom_elem.className = dom_elem.className + " " + className;
    }
}

let Menu = {

    SIZE : 60
    ,LONG_CLICK_DELAY : 1000

    ,Menu : function(root_name, root_div_id, top) {
        this.id = root_div_id;
        this.container = document.getElementById(this.id);

        this.top = (top===undefined)?true:top;

        if (this.top) {
            this.container.style['top'] = '0px';
            this.container.style['bottom'] = undefined;
        } else {
            this.container.style['top'] = undefined;
            this.container.style['bottom'] = '0px';
        }

        this.items = {};
        this.items[root_name] = this._new_item(null, this.container, null, 0, 0);
    }

    ,_new_item : function(dom, rdom, pid, top, left) {
        return {
            dom : dom // item dom node
            ,rdom : rdom // item container dom node
            ,sub : [] // item's sub-items
            ,pid : pid // parent node id
            ,horizontal : (pid==null) || (!this.items[pid].horizontal)
            ,top : top // top index
            ,left : left // bottom index
        };
    }

    ,hide : function(id, x) {
        if (id == null)
            return;

        if ((id != 'root')&&(x === undefined))
            this.items[id].rdom.style['display'] = 'none';

        this.items[id].sub.map((sid)=>{
            if (sid != x) this.hide(sid);
        });

        if (x != undefined)
            this.hide(this.items[id].pid, id);
    }

    ,show : function(id) {
        this.items[id].rdom.style['display'] = 'block';
    }

    ,onpush : function(id, touch) {
        let that = this;
        function handler(e) {
            UI.log('menu.onpush', id, touch, e);
            if (touch) {
                e.stopPropagation();
                e.preventDefault();
            }
            that.items[id]._push = (new Date()).valueOf();
        }
        return handler;
    }

    ,onclick : function(id, onclk, touch) {
        let that = this;
        function handler(e) {
            UI.log('menu.onclick', id, touch, e);
            if (touch) {
                e.stopPropagation();
                e.preventDefault();
            }

            let long = ((new Date()).valueOf() - that.items[id]._push) > Menu.LONG_CLICK_DELAY;

            if (touch && (e.button===undefined))
                e.button = 0;

            if ( ( onclk != undefined ) && ( onclk != null ) && ( !onclk(e, id, long) ) ) {
                return;
            }

            if (that.items[id].sub.length > 0) {
                that.hide(that.items[id].pid, id);
                if (that.items[id].rdom.style['display']=='none') {
                    that.show(id);
                } else {
                    that.hide(id);
                }
            } else {
                that.hide('root');
            }
        }
        return handler;
    }


    ,get_menu_block : function(type, id) {
        let elem = document.createElement(type);
        elem.id = id;
        elem.style['width'] = Menu.SIZE;
        elem.style['height'] = Menu.SIZE;
        if (type=='canvas') {
            elem.width = Menu.SIZE;
            elem.height = Menu.SIZE;
        }
        return elem;
    }

    ,add : function(pid, id, onclick, inner_type, title) {
        let parent = this.items[pid];

        // create dom node for the item
        let dom_elem = document.createElement('div');
        dom_elem.id = id;
        dom_elem.style['width'] = Menu.SIZE + 'px';
        dom_elem.style['height'] = Menu.SIZE + 'px';
        add_class(dom_elem, "menu_item");

        dom_elem.addEventListener('mousedown', this.onpush(id, false));
        dom_elem.addEventListener('touchstart', this.onpush(id, true));
        dom_elem.addEventListener('mouseup', this.onclick(id, onclick, false));
        dom_elem.addEventListener('touchend', this.onclick(id, onclick, true));
        dom_elem.addEventListener('contextmenu', e => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        });

        dom_elem.title = title||'';

        // create inner element if requested
        let sub_dom_elem = null;
        if (inner_type != undefined) {
            sub_dom_elem = this.get_menu_block(inner_type, id + '_g');
            dom_elem.appendChild(sub_dom_elem);
        }

        // create row dom node for the elements
        let dom_row = document.createElement('div');
        dom_row.id = id + '_row';
        dom_row.style['position'] = 'absolute';
        dom_row.style['display'] = 'none';

        let top = parent.top;
        let left = parent.left;

        let top_prop = (this.top)?'top':'bottom';
        let bot_prop = (!this.top)?'top':'bottom';

        if (parent.horizontal) {
            left += parent.sub.length;
            top += 1;
            dom_elem.style[top_prop]  = '0px';
            dom_elem.style['left'] = Menu.SIZE * parent.sub.length + 'px';
            dom_row.style[top_prop]   = Menu.SIZE * top + 'px';
            dom_row.style['left']  = Menu.SIZE * left + 'px';
        } else {
            left += 1;
            top += parent.sub.length;
            dom_elem.style[top_prop]  = Menu.SIZE * parent.sub.length + 'px';
            dom_elem.style['left'] = '0px';
            dom_row.style[top_prop]   = Menu.SIZE * top + 'px';
            dom_row.style['left']  = Menu.SIZE * left + 'px';
        }

        // 1. inject item descriptor to the global menu items list
        this.items[id] = this._new_item(dom_elem, dom_row, pid, top, left);

        // 2. inject item to parent sub-items list
        parent.sub.push(id);

        // 3. inject item's dom to parent row dom element
        parent.rdom.appendChild(dom_elem);
        if (parent.dom != null) {
            add_class(parent.dom, "menu_chldrn");
            add_class(parent.dom, "menu_chldrn_"+(this.top?'t':'b')+'_'+(parent.horizontal?"h":"v"));
        }

        // 4. add item's container to menu container
        this.items['root'].rdom.appendChild(dom_row);

        return [dom_elem, sub_dom_elem];
    }

    ,drop : function(id) {
        if (!(id in this.items))
            return;

        let item = this.items[id];

        // drop children
        item.sub.map((sid)=>{
            this.drop(sid);
        });

        // 4. remove from menu container
        this.items['root'].rdom.removeChild(item.rdom);

        let parent = this.items[item.pid];
        // 3. remove item from parent row
        parent.rdom.removeChild(item.dom);

        // 2. remove item from praent sub-list
        let index = parent.sub.indexOf(id);
        parent.sub.splice(index, 1);

        // 1. remove item from menu items list
        delete this.items[id];

    }

};

Menu = _class('Menu', Menu);

export {Menu};
