async function findUser(db, email) {
  return db.query(`SELECT * FROM users WHERE email = '${email}'`);
}
module.exports = { findUser };
