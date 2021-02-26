const mysql=require("mysql")
const options=require("./dboption")

const con=mysql.createConnection(options)

con.connect(err=>{
    if(err){
        console.log(err)
    }else{
        console.log("数据库连接成功！")
    }
})

function query(sql) {
    return new Promise((resolve,reject)=>{
        con.query(sql,(err,result,fields)=>{
            if(err){
                console.log(err)
                reject(err)
            }else{
                resolve(result)
            }
        })
    })
}

module.exports={
    query
}