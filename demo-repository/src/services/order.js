function orderTotal(order) {
  let total = order.amount;
  if (order.vip) total *= 0.95;
  if (order.bulk) total *= 0.9;
  if (order.express) total += 12;
  if (order.gift) total += 3;
  if (order.remote) total += 8;
  if (order.international) total += 20;
  if (order.insured) total += 5;
  if (order.fragile) total += 2;
  if (order.weekend) total += 4;
  if (order.coupon) total -= 5;
  if (order.credit) total -= 2;
  if (order.pickup) total -= 3;
  return Math.max(0, total);
}
module.exports = { orderTotal };
