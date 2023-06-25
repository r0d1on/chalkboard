'use strict';

function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

function copy(o) {
    let r;
    if (typeof(o['copy']) == 'function') {
        r = o.copy();
    } else {
        r = Object.assign({}, o);
    }
    return r;
}

function sizeof(o) {
    return Object.keys(o).length;
}

function obj_type(o) {
    return ('' + o).split(/ |\[|\]/g)[2];
}

function deepcopy(o) {
    if (typeof(o) in {'number':1, 'string':1}) {
        return o;
    } else if (Array.isArray(o)) {
        return o.map((oi)=>{return deepcopy(oi);});
    } else if (o==null) {
        return null;
    } else if (typeof(o)=='object') {
        let obj = obj_type(o);
        let co = null;
        if (obj == 'Object') {
            if (typeof(o['copy']) == 'function') {
                co = o.copy();
            } else {
                co = {};
                for(const k in o)
                    co[k] = deepcopy(o[k]);
            }
        } else if (obj == 'HTMLImageElement') {
            co = new Image();
            co.src = o.src;
        } else {
            throw 'Don not know how to clone: ' + obj;
        }
        return co;
    }
}


function is_instance_of(obj, classes) {
    if (!Array.isArray(classes))
        classes = [classes];
    for(let i=0;i<classes.length; i++) {
        let constr = (typeof(classes[i]['__konstructor'])=='function')?classes[i]['__konstructor']:classes[i];
        if (obj instanceof constr)
            return true;
    }
    return false;
}


function extend(target, source) {
    target = (target===undefined)?{}:target;
    for (const key in source)
        target[key] = source[key];
    return target;
}

function getConstructor(T) {
    let _T = null;
    // get constructor
    if (typeof(T['__konstructor']) == 'function') {
        _T = T['__konstructor'];
    } else if (typeof(T[T.__classname]) == 'function') {
        _T = T[T.__classname];
    } else {
        for(const prop in T) {
            if ( (typeof(T[prop]) == 'function') && (has(T, prop)) ) {
                if ( window[T[prop].name]==T )
                    _T = T[prop];
            }
        }
    }

    if (_T == null) {
        throw '@constructor not found for object :' + JSON.stringify(T);
    }
    return _T;
}

function allMethodNames(T) {
    let _T = getConstructor(T);
    let methodsNames = [];
    for(const prop in T) {
        if (typeof(T[prop]) == 'function') {
            if (!(T[prop] == _T)) {
                methodsNames.push(prop);
            }
        }
    }
    return methodsNames;
}

function allFieldNames(T) {
    let fieldNames = [];
    for(const prop in T) {
        if (typeof(T[prop]) != 'function') {
            if ((prop!='super')&&(prop!='mixins')) {
                fieldNames.push(prop);
            }
        }
    }
    return fieldNames;
}

function _class(name, def) {
    def.__classname = name;
    _new(def, [], true);
    return def;
}

function _new(T, params, dry) {
    params = (params===undefined)?[]:params;

    let _T = getConstructor(T);

    let at = null;

    if (!has(_T, '__@__')) {
        // T was not parsed before
        at  = {
            'statics' : allFieldNames(T)
            ,'super' : T['super']
            ,'mixins' : T['mixins']||[]
        };

        // links to super
        if (!(at.super===undefined)) {
            // inherit stuff from _S
            _T.prototype = _new(at.super, [], true);
            // so that new _T() will be of a _T type for introspection
            _T.prototype.constructor = _T;
        }

        // mixin methods
        at.mixins.map((M)=>{
            allMethodNames(M).map((method_name)=>{
                _T.prototype[method_name] = M[method_name];
            });
        });

        // own _T methods
        allMethodNames(T).map((method_name)=>{
            _T.prototype[method_name] = T[method_name];
        });

        // own constructor
        T.__init__ = _T;

        // constructor shortcuts
        T['__konstructor'] = _T;
        T.new = (...args)=>{return _new(T, args);};
        T[T.__classname] = (...args)=>{return _new(T, args);};

        _T['__@__'] = at;

    } else {
        at = _T['__@__'];
    }

    // create instance of the object with constructor call
    let obj = Object.create(_T.prototype);

    if (!dry) {

        // mixin methods
        at.mixins.map((M)=>{
            allFieldNames(M).map((prop)=>{
                obj[prop] = deepcopy(M[prop]);
            });
        });

        //obj = new _T(...params);
        // inject getters setters for class-level variables
        at.statics.map((prop)=>{
            Object.defineProperty(obj, prop, {
                // probably throw some here
                // as class var should be addressed through Class.var explicitly
                get: function() {
                    return T[prop];
                }
                ,set: function(value) {
                    T[prop] = value;
                }
            });
        });

        // run mixin initializers
        obj.__mixins = {};
        at.mixins.map((M)=>{
            let _M = getConstructor(M);
            obj.__mixins[_M.name] = M;
            _M.call(obj);
        });

        // run own constructor
        let new_obj = _T.apply(obj, params);

        if (new_obj!==undefined) // if have explicit result from constructor
            obj = new_obj;
    }

    return obj;
}

export {copy, sizeof, deepcopy, extend, _class, _new, has, is_instance_of, obj_type};
