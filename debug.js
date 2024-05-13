// let encoded = '0x646174613a2c7b2270223a227373632d3230222c226f70223a226465706c6f79222c227469636b223a226865726f222c226d6178223a223231303030303030222c226c696d223a2231303030227d'
// let a = Buffer.from(encoded.slice(2), 'hex').toString().slice(6)
// console.log('a', JSON.parse(a))
// console.log('a', a)

import { generateSalt } from "./global.js";


// let num = Number('21000000');
// let hex = '0x' + num.toString(16);
// console.log(hex); // 输出 '0xa'

let a = generateSalt(9)
console.log(a)
