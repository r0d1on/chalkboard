'use strict';

function has_class(dom_elem, className) {
    return (dom_elem.className.split(/ /g).indexOf(className)>=0);
}

function add_class(dom_elem, className) {
    if (!Array.isArray(className))
        className = [className];

    className.map((cls)=>{
        if (!has_class(dom_elem, cls))
            dom_elem.className = dom_elem.className + ' ' + cls;
    });
}

function remove_class(dom_elem, className) {
    if (!Array.isArray(className))
        className = [className];

    className.map((cls)=>{
        if (has_class(dom_elem, cls)) {
            dom_elem.className = dom_elem.className.split(/ /g).map((c)=>{
                return (c == cls)?'':c;
            }).join(' ').trim();
        }
    });
}

export {has_class, add_class, remove_class};
