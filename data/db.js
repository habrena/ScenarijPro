const { Sequelize} = require("sequelize");
const bcrypt = require('bcrypt');

const sequelize = new Sequelize("wt26", "root", "", { 
    host: "localhost",
    dialect: "mysql",
    logging: false, 
});

const Scenario = sequelize.define("Scenario", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    timestamps: false 
});

const Line = sequelize.define("Line", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    lineId: { 
        type: Sequelize.INTEGER, 
        allowNull: false
    }, 
    text: {
        type: Sequelize.STRING,
        allowNull: false, 
        defaultValue: ""
    },
    nextLineId: {
        type: Sequelize.INTEGER,
        allowNull: true 
    }
}, {
    timestamps: false 
});

const Delta = sequelize.define("Delta", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: Sequelize.STRING, 
        allowNull: false
    },
    lineId: {
        type: Sequelize.INTEGER,
        allowNull: true 
    },
    nextLineId: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    content: {
        type: Sequelize.STRING, 
        allowNull: true
    },
    oldName: {
        type: Sequelize.STRING, 
        allowNull: true
    },
    newName: {
        type: Sequelize.STRING, 
        allowNull: true
    },
    timestamp: {
        type: Sequelize.INTEGER, 
        allowNull: false
    }
}, {
    timestamps: false 
});

const Checkpoint = sequelize.define("Checkpoint", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    timestamp: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false 
});

//definiranje User modela
const User = sequelize.define("User", {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fullName: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, 
        validate: {
            isEmail: true 
        }
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    notifFrequency: {
        type: Sequelize.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    hooks: {
        //genSaltSync je sinhrona verzija generiranja salta
        //genSalt je asinhrona ver, ne zaustavlja rad citave stranice prilikom registracije
        beforeCreate: async (user) => {
            if (user.password) {
            const salt = await bcrypt.genSalt(10, 'a');
            user.password = await bcrypt.hash(user.password, salt);
        }
    },
        beforeUpdate:async (user) => {
            if (user.password) {
            const salt = await bcrypt.genSalt(10, 'a');
            user.password = await bcrypt.hash(user.password, salt);
        }
  }
 }
});

const UserScenario = sequelize.define("UserScenario", {
    id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    role: { 
        type: Sequelize.STRING, 
        defaultValue: "owner" 
    } // Opcionalno: npr. vlasnik ili urednik
}, { 
    timestamps: false 
});

//relacije
Scenario.hasMany(Line, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Line.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Delta, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Delta.belongsTo(Scenario, { foreignKey: 'scenarioId' });

Scenario.hasMany(Checkpoint, { foreignKey: 'scenarioId', onDelete: 'CASCADE' });
Checkpoint.belongsTo(Scenario, { foreignKey: 'scenarioId' });

User.belongsToMany(Scenario, { through: UserScenario, foreignKey: 'userId' });
Scenario.belongsToMany(User, { through: UserScenario, foreignKey: 'scenarioId' });

module.exports = {
    sequelize,
    Scenario,
    Line,
    Delta,
    Checkpoint,
    User,
    UserScenario
};