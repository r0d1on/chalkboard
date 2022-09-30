'use strict';

function has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

function copy(o) {
    return Object.assign({}, o);
}

function size(o) {
    return Object.keys(o).length
}

function deepcopy(o) {
    if (typeof(o) in {'number':1, 'string':1}) {
        return o;
    } else if (Array.isArray(o)) {
        return o.map((oi)=>{return deepcopy(oi);});
    } else if (o==null) {
        return null;
    } else if (typeof(o)=='object') {
        let co = {};
        for(const k in o)
            co[k] = deepcopy(o[k]);
        return co;
    }
}

function getConstructor(T) {
    let _T = null;
    // get constructor
    if ( (T.__classname in T) && (typeof(T[T.__classname]) == 'function') ) {
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
        T.init = _T;

        _T['__@__'] = at;

    } else {
        at = _T['__@__'];
    }

    // create instance of the object with constructor call
    let obj = null;

    obj = Object.create(_T.prototype);

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
        obj._mixins = {};
        at.mixins.map((M)=>{
            let _M = getConstructor(M);
            obj._mixins[_M.name] = M;
            _M.call(obj);
        });

        // run own constructor
        _T.apply(obj, params);
    }

    return obj;
}

export {copy, size, deepcopy, _class, _new};
