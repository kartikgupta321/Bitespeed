"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("./db"));
(async () => {
    try {
        const res = await db_1.default.query('SELECT NOW()');
        console.log('✅ DB Connected! Current time is:', res.rows[0].now);
        process.exit(0); // exit cleanly
    }
    catch (err) {
        console.error('❌ DB Connection Error:', err);
        process.exit(1);
    }
})();
