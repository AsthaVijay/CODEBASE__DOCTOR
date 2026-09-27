const { test } = require('node:test');
const assert = require('node:assert/strict');
const { orderTotal } = require('../src/services/order');
test('base order retains its total', () => assert.equal(orderTotal({amount:100}),100));
test('discounted order never becomes negative', () => assert.equal(orderTotal({amount:1,coupon:true}),0));
