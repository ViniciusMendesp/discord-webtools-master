"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
function logout() {
    localStorage.clear();
    sessionStorage.clear();
    (0, node_fetch_1.default)('/', { method: 'DELETE' })
        .then((res) => {
        if (res === undefined) {
            // handle undefined response
        }
        else if (res.ok) {
            location.replace('/');
            location.reload();
        }
        else {
            console.log('Logout request failed.');
        }
    })
        .catch((err) => {
        // handle error
        console.error(err);
    });
    return true;
}
exports.default = logout;
