const Sequelize = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const model = sequelize.define("Photo", {
        id: {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            autoIncrement: true
        },
        URL: {
            type: Sequelize.STRING,
        },
        categoryName: {
            type: Sequelize.STRING,
        },
        author: {
            type: Sequelize.STRING,
        },
        description: {
            type: Sequelize.STRING,
        },
    }, { timestamps: false });
    model.associate = (models) =>{
    }
    return model;
};