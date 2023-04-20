"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.getItem = exports.setItem = void 0;
const node_localstorage_1 = require("node-localstorage");
const localStorage = new node_localstorage_1.LocalStorage('./server-localstorage');
function setItem(state, kvp) {
    const current = localStorage.getItem(state);
    const new_data = Object.assign(Object.assign({}, (current && JSON.parse(current))), kvp);
    localStorage.setItem(state, JSON.stringify(new_data));
}
exports.setItem = setItem;
function getItem(state, key) {
    if (!state) {
        return null;
    }
    const current = localStorage.getItem(state);
    if (typeof current === 'string') {
        const parsed = JSON.parse(current);
        return parsed[key];
    }
    return null;
}
exports.getItem = getItem;
function remove(state) {
    localStorage.removeItem(state);
}
exports.remove = remove;
