const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "demodb",
    password: "16x#wa9_u",
    port: 4000
});

/*
    status == 200 на успех
    status == 400 на ошибку

    Select из базы данных
    from: имя таблицы
    options: {
        columns: string[], - имя колонок, которые надо выбрать
        where: {
            [key: string]: number | string - имя колонки = значению
        }
    }
*/
const isObjectEmpty = (object) => {
    return Object.keys(object).length === 0;
}

const simpleSelect = async (from, options = {}) => {
    let whereClause = null;
    let columns = "*";

    if (options.columns && !isObjectEmpty(options.columns)) {
        columns = options.columns.join(",");
    }

    if (options.where && !isObjectEmpty(options.where)) {
        whereClause = "";

        //Оъединяем поля из options.where
        let i = 0;
        for(let [key, value] of Object.entries(options.where)) {
            if (i >= 1) {whereClause += " AND ";}
            //проверка типов
            if (!(typeof value === "number" || typeof value === "string")) {
                throw new Error("where сформирован неправильно");
            }
            if (typeof value === "string") {value = `\'${value}\'`;}
            whereClause += `${key}=${value}`;
            i++;
        }
    }

    const queryString = `SELECT ${columns} FROM ${from} ${whereClause ? `WHERE ${whereClause}` : ""}`;
    //console.log(queryString);

    return await pool.query(queryString)
    .then((result) => {
        //console.log(result.rows);
        return {
            status: 200,
            dataLength: result.rowCount,
            data: result.rows,
            error: false
        }
    })
    .catch((error) => {
        console.log(error);
        return {
            status: 400,
            error: true
        };
    });
}

/*
*
*   статус 200 - успех
*   статус 400 - ошибка
*/
const updateJWT = async (user_id, refreshToken) => {
    return await pool.query(`UPDATE users SET refresh_token='${refreshToken}' WHERE user_id=${user_id}`)
    .then(() => {
        return {
            status: 200,
            error: false
        };
    })
    .catch((err) => {
        console.log(err.code, err.detail);
        return {
            status: 400,
            error: true
        };
    })
}


module.exports = {
    pool, 
    simpleSelect,
    updateJWT
};