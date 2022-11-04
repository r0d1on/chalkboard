'use strict';

function has_class(dom_elem, className) {
    return (dom_elem.className.split(/ /g).indexOf(className)>=0);
}

function add_class(dom_elem, className) {
    if (!has_class(dom_elem, className)) {
        dom_elem.className = dom_elem.className + ' ' + className;
    }
}

export {has_class, add_class};
