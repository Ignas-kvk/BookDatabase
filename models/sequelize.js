const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("book", "root", "", {
    host: "localhost",
    dialect: "mysql",
    logging: false, // Disable SQL query logging
});

module.exports = sequelize;
