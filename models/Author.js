const { DataTypes } = require("sequelize");
const sequelize = require("./sequelize");

const Author = sequelize.define("Author", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    bio: {
        type: DataTypes.TEXT,
    },
}, {
    tableName: "author",
    timestamps: false, // Disable createdAt and updatedAt fields
});

module.exports = Author;
