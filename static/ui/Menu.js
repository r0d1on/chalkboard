'use strict';

import {_class} from '../base/objects.js';
import {add_class} from '../util/html.js';

import {UI} from './UI.js';


let Menu = {

    LONG_CLICK_DELAY : 1000,
    DEFAULT_ITEM_WIDTH : 60,
    RESIZEABLE : true,

    Menu : function(container_id, top=true, dx=Menu.DEFAULT_ITEM_WIDTH, dy=Menu.DEFAULT_ITEM_WIDTH) {
        this.top = top;
        this.dx = dx;
        this.dy = dy;
        this.container = document.getElementById(container_id);

        if (this.top) {
            this.container.style['top'] = '0px';
            this.container.style['bottom'] = undefined;
        } else {
            this.container.style['top'] = undefined;
            this.container.style['bottom'] = '0px';
        }

        this.items = {};
        this.items['root'] = this._new_item(null, this.container, null, 0, 0);
    }

    ,_new_item : function(dom, dom_row, pid, top, left, dx, dy, onclick, inner_type, title) {
        return {
            dom : dom, // item dom node
            dom_row : dom_row, // item container dom node
            sub : [], // item's sub-items
            pid : pid, // parent node id
            horizontal : (pid==null) || (!this.items[pid].horizontal),
            top : top, // top index
            left : left, // bottom index
            dx : dx,
            dy : dy,
            onclick: onclick,
            inner_type: inner_type,
            title: title
        };
    }

    ,hide : function(id, x) {
        if (id == null)
            return;

        if ((id != 'root')&&(x === undefined))
            this.items[id].dom_row.style['display'] = 'none';

        this.items[id].sub.map((sid)=>{
            if (sid != x) this.hide(sid);
        });

        if (x != undefined)
            this.hide(this.items[id].pid, id);
    }

    ,show : function(id) {
        this.items[id].dom_row.style['display'] = 'block';
    }

    ,onpush : function(id, touch) {
        let that = this;
        function handler(e) {
            UI.log(1, 'menu.onpush', id, touch, e);
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
            UI.log(1, 'menu.onclick', id, touch, e);
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
                if (that.items[id].dom_row.style['display']=='none') {
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


    ,get_menu_block : function(type, id, dx, dy) {
        let elem = document.createElement(type);
        elem.id = id;
        elem.style['width'] = dx;
        elem.style['height'] = dy;
        if (type=='canvas') {
            elem.width = dx;
            elem.height = dy;
        }
        return elem;
    }

    ,add_icon : function(pid, id, icon, title, onclick) {
        let canvas = this.add(pid, id, onclick, 'canvas', title)[1];
        UI.draw_glyph(icon, canvas.getContext('2d'));
        this.items[id].icon = icon;
    }

    ,add : function(pid, id, onclick, inner_type, title, dx, dy) {
        let parent = this.items[pid];

        let dx_default = (dx===undefined);
        dx = dx_default ? this.dx : dx;

        let dy_default = (dy===undefined);
        dy = dy_default ? this.dy : dy;

        // create dom node for the item
        let dom_elem = document.createElement('div');
        dom_elem.id = id;
        dom_elem.style['width'] = dx + 'px';
        dom_elem.style['height'] = dy + 'px';
        dom_elem.style['position'] = 'fixed';
        add_class(dom_elem, 'menu_item');

        UI.IO.add_event(dom_elem, 'pointerdown', this.onpush(id, true));
        UI.IO.add_event(dom_elem, 'pointerup', this.onclick(id, onclick, true));
        UI.IO.add_event(dom_elem, 'contextmenu', e => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        });

        dom_elem.title = title || '';

        // create inner element if requested
        let sub_dom_elem = null;
        if (inner_type != undefined) {
            sub_dom_elem = this.get_menu_block(inner_type, id + '_g', dx, dy);
            dom_elem.appendChild(sub_dom_elem);
        }

        // create row dom node for the elements
        let dom_row = document.createElement('div');
        dom_row.id = id + '_row';
        dom_row.style['position'] = 'fixed';
        dom_row.style['display'] = 'none';

        let sibling = this.items[parent.sub.at(-1)];
        let top = parent.top;
        let left = parent.left;

        let top_prop = (this.top) ? 'top' : 'bottom';

        if (parent.horizontal) {
            // adding into a vertical stack of subitems
            top = sibling ? sibling.top : parent.top || 0;
            left = sibling ? (sibling.left + sibling.dx) : (parent.left + parent.dx) || 0;

            dom_elem.style[top_prop] = top + 'px';
            dom_elem.style['left'] = left + 'px';

            dom_row.style[top_prop] = top + dy + 'px';
            dom_row.style['left'] = left + 'px';
        } else {
            // adding into a horisontal stack of subitems
            top = sibling ? (sibling.top + sibling.dy) : (parent.top + parent.dy) || 0;
            left = sibling ? sibling.left : parent.left;

            if (UI.window_height <= top + dy) {
                top = (parent.top + parent.dy) || 0;
                left = (sibling.left + sibling.dx) || 0;
            }

            dom_elem.style[top_prop] = top + 'px';
            dom_elem.style['left'] = left + 'px';

            dom_row.style[top_prop] = top + 'px';
            dom_row.style['left'] = left + dx + 'px';
        }

        // 1. inject item descriptor to the global menu items list
        this.items[id] = this._new_item(dom_elem, dom_row, pid, top, left, dx, dy, onclick, inner_type, title);
        this.items[id].dx_default = dx_default;
        this.items[id].dy_default = dy_default;

        // 2. inject item to parent sub-items list
        parent.sub.push(id);

        // 3. inject item's dom to parent row dom element
        parent.dom_row.appendChild(dom_elem);
        if (parent.dom != null) {
            add_class(parent.dom, 'menu_chldrn');
            add_class(parent.dom, 'menu_chldrn_' + (this.top ? 't' : 'b') + '_' + (parent.horizontal? 'h' : 'v'));
        }

        // 4. add item's container to menu container
        this.items['root'].dom_row.appendChild(dom_row);

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
        this.items['root'].dom_row.removeChild(item.dom_row);

        let parent = this.items[item.pid];
        // 3. remove item from parent row
        parent.dom_row.removeChild(item.dom);

        // 2. remove item from praent sub-list
        let index = parent.sub.indexOf(id);
        parent.sub.splice(index, 1);

        // 1. remove item from menu items list
        delete this.items[id];

    }

    ,on_resize : function() {
        function recreate(menu, pid, items) {
            items[pid].sub.map((id)=>{
                let item = items[id];
                if (item.icon === undefined) {
                    let dx = (item.dx_default) ? undefined : item.dx;
                    let dy = (item.dy_default) ? undefined : item.dy;
                    menu.add(pid, id, item.onclick, item.inner_type, item.title, dx, dy);
                } else {
                    menu.add_icon(pid, id, item.icon, item.title, item.onclick);
                }
                recreate(menu, id, items);
            });
        }

        if (!this.RESIZEABLE)
            return;

        let w_window = UI.window_width;
        let m_info = this.items['root'].sub.reduce((s, item_name)=>{
            const item = this.items[item_name];
            if (item.dx_default) {
                s[0] += 1;
            } else {
                s[1] += (item.dx || 0);
            }
            return s;
        }, [0, 0]);

        if (UI.is_mobile || (w_window < m_info[1] + m_info[0]*this.dx) || (this.dx < Menu.DEFAULT_ITEM_WIDTH)) {
            let dd = (w_window - m_info[1]) / m_info[0];
            this.dx = dd;
            this.dy = dd;
        }

        const old_items = this.items;

        const old_elem = document.getElementById(this.container.id);
        this.container = document.createElement(old_elem.tagName);
        this.container.id = old_elem.id;
        old_elem.replaceWith(this.container);

        if (this.top) {
            this.container.style['top'] = '0px';
            this.container.style['bottom'] = undefined;
        } else {
            this.container.style['top'] = undefined;
            this.container.style['bottom'] = '0px';
        }

        this.items = {};
        this.items['root'] = this._new_item(null, this.container, null, 0, 0);

        recreate(this, 'root', old_items);
    }

};
Menu = _class('Menu', Menu);

export {Menu};
