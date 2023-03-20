'use strict';

import {IO} from '../ui/IO.js';

function waitfor(request) {
    return new Promise((resolve, reject) => {
        request.oncomplete = request.onsuccess = () => resolve(request.result);
        request.onabort = request.onerror = () => reject(request.error);
    });
}


let STORE = ((store)=>{
    const db_request = indexedDB.open('chalkboard');
    db_request.onupgradeneeded = (e) => {
        let db = e.target.result;
        db.createObjectStore(store);
    };
    const db_ready = waitfor(db_request);
    return (mode, process)=>{
        return db_ready.then((db) => {
            return process(db.transaction(store, mode).objectStore(store));
        });
    };
})('store');


function db_get(key) {
    let local_value = localStorage.getItem(key);
    if (local_value==null) {
        return STORE('readonly', (store) => {
            return waitfor(store.get(key)).then((chunks)=>{
                if (chunks===undefined) {
                    return new Promise((resolve, reject)=>{resolve(null);}); // eslint-disable-line no-unused-vars
                } else {
                    return IO.decompress(chunks);
                }
            });
        });
    } else {
        return new Promise((resolve, reject)=>{resolve(local_value);}); // eslint-disable-line no-unused-vars
    }
}


function db_set(key, value) {
    let local_value = localStorage.getItem(key);
    if (local_value!=null) {
        localStorage.removeItem(key);
        localStorage.setItem(key + '/backup', local_value);
    }

    if (value==null) {
        return STORE('readwrite', (store) => {
            store.delete(key);
            return waitfor(store.transaction);
        });
    }

    return IO.compress(value).then((chunks)=>{
        return STORE('readwrite', (store) => {
            let arr = new Uint8Array(chunks.reduce((a, v) => a + v.length, 0));
            chunks.reduce((a, v)=>{
                arr.set(v, a);
                return a + v.length;
            }, 0);
            store.put(arr, key);
            return waitfor(store.transaction);
        });
    });
}


export {db_get, db_set};
