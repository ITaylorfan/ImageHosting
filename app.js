const express = require("express")
//cookie模块
const cookieParser = require('cookie-parser');
const path = require("path")
const crypto = require("crypto")
const fs = require("fs")
const app = express()
// 获取提交的文件需要用到的模块
const multer = require("multer");


//读取post表单中的内容
app.use(express.urlencoded({ extended: false }))
//使用cookie模块 加密模式
app.use(cookieParser("secret"));

//按日期分类
const date = new Date()
let year = date.getFullYear()
let month = date.getMonth() + 1
let day = date.getDate()

if (!fs.existsSync("./public/images/uploads/" + year + "/" + month + "/" + day)) {
    if (!fs.existsSync("./public/images/uploads/" + year)) {
        fs.mkdirSync("./public/images/uploads/" + year)
    } else if (!fs.existsSync("./public/images/uploads/" + year + "/" + month)) {
        fs.mkdirSync("./public/images/uploads/" + year + "/" + month)
    }
    fs.mkdirSync("./public/images/uploads/" + year + "/" + month + "/" + day)

}

//设置文件上传路径
const upload = multer({ dest: "./public/images/uploads/" + year + "/" + month + "/" + day })
//数据库模块
let { query } = require("./sql/mysql")

// 设置模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//开启静态资源访问
app.use("/static", express.static("public"))



//测试地址
const developUrl = "http://localhost:3000"
//const developUrl = ""
const onlineUrl = ""

//自定义加密
//盐
const salt = "itaylorfan"
function cryptoFn(params) {

    //设置加密方法
    let md5 = crypto.createHash("md5")
    //进行md5加密
    md5.update(params + salt)
    //加密后的字符串
    let secret = md5.digest("hex")
    return secret
}

// 登录
//post表单提交
app.post("/uploadLogin", async (req, res) => {
    let sql = `select * from login where username='${req.body.username}' and password='${cryptoFn(req.body.password)}'`
    let result = await query(sql)
    console.log(result)
    if (result.length == 0) {
        let obj = {
            code: 200,
            msg: "密码错误",
            time: Date.now()
        }
        res.json(obj)
    } else {
        //设置cookie
        res.cookie("username", cryptoFn(req.body.username), { maxAge: 3 * 24 * 60 * 60 * 1000 })
        res.cookie("password", cryptoFn(req.body.password), { maxAge: 3 * 24 * 60 * 60 * 1000 })
        res.cookie("id", result[0].id, { maxAge: 3 * 24 * 60 * 60 * 1000 })
        let obj = {
            code: 200,
            msg: "登录成功",
            time: Date.now()
        }
        res.json(obj)
    }
})


// 拦截下面所有内容
app.use((req, res, next) => {
    let cookies = req.cookies
    if (cookies.username !== undefined) {  //如果存在cookie 就继续往下
        next()
    } else {
        //如果不存在cookie就跳转到登录界面
        res.render("./myupload/uploadLogin")
    }
})

//首页  上传页面
app.get("/", async (req, res) => {
    let sql="select count(*) num from imgs"
    let result=await query(sql)
    let option = {
        num: result[0].num
    }
    res.render("./myupload/uploadImg", option)
})




//我的图片

app.get("/auth/myImg", async (req, res) => {
    let cookies = req.cookies
    let user_id = cookies.id
    let sql = `select  * from imgs where user_id=${user_id}`
    let imgs_total = await query(sql)
    //已经使用的容量 字节
    let usage = 0
    imgs_total.forEach(item => {
        usage += item.size
    });
    // 显示在页面中的已经使用的容量
    let use_quota = ""
    //已经使用的小于1M 用单位kb表示
    if (usage < 1048576) {
        use_quota = (usage / 1024).toFixed(2) + "KB"
    } else if (usage >= 1048576 && usage < 1073741824) {  //小于1G用MB表示
        use_quota = (usage / 1024 / 1024).toFixed(2) + "MB"
    } else {  //超出1G用GB表示
        use_quota = (usage / 1024 / 1024 / 1024).toFixed(2) + "GB"
    }
    let option = {
        //5GB容量
        max: 1073741824 * 5,
        usage: usage,
        use_quota: use_quota,
        quota: "5GB"
    }
    res.render("./myupload/auth/myImg", option)
})



//获取图片
// 返回实例{"code":1,"msg":"success","data":{"images":{"total":1,"per_page":60,"current_page":"1","last_page":1,"data":[{"id":6574,"user_id":302,"folder_id":0,"strategy":"local","path":"2021\/02\/23","name":"846ff604ab4e7.png","alias_name":null,"pathname":"2021\/02\/23\/846ff604ab4e7.png","size":"343434.00","mime":"image\/png","sha1":"14649c13bb83f4d6cb753e650f49073b4b4b5f1a","md5":"ccbdea0b1e5497a424dac7a6fd37d07b","ip":"117.150.175.27","suspicious":0,"create_time":"2021-02-23 11:14:29","url":"https:\/\/pic.iqy.ink\/2021\/02\/23\/846ff604ab4e7.png"}]},"folders":[{"id":26,"user_id":302,"parent_id":0,"name":"abc","delete_time":null,"update_time":"2021-02-23 13:24:40","create_time":"2021-02-23 13:24:40"}]},"url":"https:\/\/pic.iqy.ink\/user\/images.html","wait":3}
app.post("/user/getImg", async (req, res) => {
    //注意 文件夹数不超过一页最大容量-1

    //分页      每页最大数目
    let per_page = 50
    //获取页码
    let page = req.body.page
    //获取文件夹id
    let folderId = req.body.folderId

    //获取用户id
    let user_id = req.cookies.id

    //返回的文件夹
    let folder_result = []

    //返回的图片
    let imgs_result = []

    //最后一页
    let last_page = 0

    //图片总数
    let imgs_total = []

    //如果进入的是文件夹页面
    // {"code":1,"msg":"success","data":{"images":{"total":0,"per_page":60,"current_page":1,"last_page":0,"data":[]},"folders":[]},"url":"https:\/\/pic.iqy.ink\/user\/images.html","wait":3}
    if (folderId != undefined && folderId != 0) { //0表示没有点击文件夹
        //查询当前文件夹下文件夹总个数
        let sql1 = `select  count(*) num from folder where user_id=${user_id} and parent_id=${folderId}`
        let folder_total = await query(sql1)
        //查询当前文件夹下图片总个数
        let sql2 = `select  count(*) num from imgs where user_id=${user_id} and folder_id=${folderId}`
        imgs_total = await query(sql2)

        // 查询文件夹 获取当前页的文件夹
        let sql3 = `select * from folder where user_id=${user_id} and parent_id=${folderId} limit ${(page - 1) * per_page},10`
        folder_result = await query(sql3)

        // 文件夹会占据图片空间 所以要减去文件夹个数 当前页的文件夹
        let folder_num = folder_result.length
        console.log("总文件夹个数" + folder_total[0].num)
        console.log("当前页文件夹个数" + folder_num)
        //判断当前页是否有文件夹
        let sql4 = ""
        if ((Math.floor(folder_total[0].num / per_page) + 1) >= page) {
            //如果有就要减去文件夹个数
            sql4 = `select * from imgs where user_id=${user_id} and folder_id=${folderId} limit ${(page - 1) * per_page},${per_page - folder_num}`
        } else {
            // 如果没有就不减   文件夹数不超过一页最大容量-1
            sql4 = `select * from imgs where user_id=${user_id} and folder_id=${folderId} limit ${(page - 1) * per_page - folder_total[0].num},10`
        }
        //查询当前页的图片
        imgs_result = await query(sql4)
        console.log("总图片个数" + imgs_total[0].num)
        console.log("当前页图片个数" + imgs_result.length)

        //最后一页
        last_page = Math.ceil((folder_total[0].num + imgs_total[0].num) / per_page)
        console.log("最后一页页码" + last_page)

    } else {   //进入的不是文件夹页面
        //查询文件夹总个数
        let sql3 = `select  count(*) num from folder where user_id=${user_id} and parent_id=0`
        let folder_total = await query(sql3)
        //查询图片总个数
        let sql4 = `select  count(*) num from imgs where user_id=${user_id} and folder_id is NULL`
        imgs_total = await query(sql4)

        // 查询文件夹 获取当前页的文件夹
        let sql1 = `select * from folder where user_id=${user_id} and parent_id=0 limit ${(page - 1) * per_page},10`
        folder_result = await query(sql1)
        console.log(folder_result)
        // 文件夹会占据图片空间 所以要减去文件夹个数 当前页的文件夹
        let folder_num = folder_result.length
        console.log("总文件夹个数" + folder_total[0].num)
        console.log("当前页文件夹个数" + folder_num)
        //判断当前页是否有文件夹
        let sql2 = ""
        if ((Math.floor(folder_total[0].num / per_page) + 1) >= page) {
            //如果有就要减去文件夹个数
            sql2 = `select * from imgs where user_id=${user_id} and folder_id is NULL limit ${(page - 1) * per_page},${per_page - folder_num}`
        } else {
            // 如果没有就不减   文件夹数不超过一页最大容量-1
            sql2 = `select * from imgs where user_id=${user_id} and folder_id is NULL limit ${(page - 1) * per_page - folder_total[0].num},10`
        }
        //查询当前页的图片
        imgs_result = await query(sql2)
        console.log("总图片个数" + imgs_total[0].num)
        console.log("当前页图片个数" + imgs_result.length)

        //最后一页
        last_page = Math.ceil((folder_total[0].num + imgs_total[0].num) / per_page)
        console.log("最后一页页码" + last_page)
    }
    console.log(req.body)

    let obj = {
        code: 1,
        data: {
            // 文件夹
            folders: folder_result,
            images: {
                //当前页
                current_page: page,
                // 响应实例
                // data: [{
                //     alias_name: null,
                //     create_time: "2021-02-23 11:14:29",
                //     folder_id: 0,
                //     id: 6574,
                //     ip: "117.150.175.27",
                //     md5: "ccbdea0b1e5497a424dac7a6fd37d07b",
                //     mime: "image/png",
                //     name: "846ff604ab4e7.png",
                //     path: "2021/02/23",
                //     pathname: "2021/02/23/846ff604ab4e7.png",
                //     sha1: "14649c13bb83f4d6cb753e650f49073b4b4b5f1a",
                //     size: "343434.00",
                //     strategy: "local",
                //     suspicious: 0,
                //     url: "https://pic.iqy.ink/2021/02/23/846ff604ab4e7.png",
                //     user_id: 302
                // }],

                //图片列表
                data: imgs_result,
                last_page: last_page,
                per_page: per_page,
                //总数据
                total: imgs_total[0].num,
            }
        },
        msg: "success",
        url: developUrl + "/auth/myImg",
        wait: 3,
    }


    res.json(obj)

})

//创建文件夹
// 响应格式
// {"code":1,"msg":"创建成功","data":"","url":"https:\/\/pic.iqy.ink\/user\/images.html","wait":3}
app.post("/user/createFolder", async (req, res, next) => {
    let parent_id = req.body.parent_id
    let name = req.body.name
    let cookies = req.cookies
    let user_id = cookies.id
    let sql = `insert into folder(name,parent_id,user_id) values("${name}",${parent_id},${user_id})`
    let result = await query(sql)
    let obj = {
        code: 1,
        msg: "创建成功",
        data: "",
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

// 文件夹重命名
app.post("/user/renameFolder", async (req, res, next) => {
    let id = req.body.id
    let parent_id=req.body.parent_id
    let name = req.body.name
    let cookies = req.cookies
    let user_id = cookies.id
    let sql = `update folder set name='${name}' where id=${id} and user_id=${user_id} and parent_id=${parent_id}`
    let result = await query(sql)
    let obj = {
        code: 1,
        msg: "重命名成功",
        data: "",
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

// 删除文件夹
app.post("/user/deleteFolder", async (req, res, next) => {
    let id = req.body.id
    let cookies = req.cookies
    let user_id = cookies.id

    let sql = `delete from folder where id=${id} and user_id=${user_id}`
    let result = await query(sql)
    
    let obj = {
        code: 1,
        msg: "删除成功",
        data: "",
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

//重命名图片
app.post("/user/renameImage", async (req, res, next) => {
    let id = req.body.id
    let name = req.body.name
    let cookies = req.cookies
    let user_id = cookies.id
    let sql = `update imgs set name='${name}' where id=${id} and user_id=${user_id}`
    let result = await query(sql)
    let obj = {
        code: 1,
        msg: "重命名成功",
        data: "",
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

//删除磁盘图片
function deleteImages(path) {
    if(fs.existsSync(path)){
        fs.unlinkSync(path)
        console.log("删除实体成功！")
    }  
}


// 删除数据库中图片记录
app.post("/user/deleteImages", async (req, res, next) => {
    let id = req.body.id
    let cookies = req.cookies
    let user_id = cookies.id
    let result = []
    let sql = ""
    //可能有删除多个的情况
    console.log(req.body)
    console.log(req.body['id[]'])
    if (req.body['id[]'] != undefined) {   //这就表示有多张图片
        req.body['id[]'].forEach(async item => {
            let sql2=`select * from imgs where id=${item} and user_id=${user_id}`
            let imgs_result=await query(sql2)
            //删除实体
            deleteImages(imgs_result[0].pathname)
            //删除数据库记录
            sql = `delete from imgs where id=${item} and user_id=${user_id}`
            result = await query(sql)
        })
    } else {//单张图片
        let sql2=`select * from imgs where id=${id} and user_id=${user_id}`
        let imgs_result=await query(sql2)
        //删除实体
        deleteImages(imgs_result[0].pathname)
        sql = `delete from imgs where id=${id} and user_id=${user_id}`
        result = await query(sql)
    }
    let obj = {
        code: 1,
        msg: "删除成功",
        data: "",
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

//获取文件夹
// {"code":1,"msg":"success","data":[{"id":26,"user_id":302,"parent_id":0,"name":"abc","delete_time":null,"update_time":"2021-02-23 13:24:40","create_time":"2021-02-23 13:24:40"},{"id":27,"user_id":302,"parent_id":0,"name":"abc","delete_time":null,"update_time":"2021-02-23 17:32:46","create_time":"2021-02-23 17:32:46"}],"url":"https:\/\/pic.iqy.ink\/user\/images.html","wait":3}
app.post("/user/getFolders", async (req, res, next) => {
    let parent_id = req.body.parentId
    let id=req.body.id
    let cookies = req.cookies
    let user_id = cookies.id
    let result = []
    let sql=""
    if(parent_id!=undefined){
        sql = `select * from folder where parent_id=${parent_id} and user_id=${user_id}`
    }else{
        sql = `select * from folder where parent_id=${id} and user_id=${user_id}`
    }
    
    result=await query(sql)
    let obj = {
        code: 1,
        msg: "success",
        data: result,
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

//移动图片
app.post("/user/moveImages", async (req, res, next) => {
    let folder_id = req.body.folderId
    let cookies = req.cookies
    let user_id = cookies.id
    let result
	let sql=""
    console.log(req.body)
    if(req.body['ids[]']!=undefined){
        if(typeof req.body['ids[]']  == "object"){  //是数组
            req.body['ids[]'].forEach(async item=>{
					if(folder_id==0){
						sql=`update imgs set folder_id = null where id=${item} and user_id=${user_id}`
					}else{
						sql=`update imgs set folder_id=${folder_id} where id=${item} and user_id=${user_id}`
					}
               
                result=await query(sql)
            })
        }else{  //不是数组
			if(folder_id==0){
				sql=`update imgs set folder_id = null where id=${req.body['ids[]']} and user_id=${user_id}`
			}else{
				 sql=`update imgs set folder_id=${folder_id} where id=${req.body['ids[]']} and user_id=${user_id}`
			}
            result=await query(sql)
        }
  
    }
  

    let obj = {
        code: 1,
        msg: "移动成功",
        data: "",
        url: developUrl + "/auth/myImg",
        wait: 3
    }
    res.json(obj)
    console.log(result)
})

// //图片api
// app.get("/index/api", (req, res) => {
//     let option = {

//     }
//     res.render("./myupload/auth/api", option)
// })
// //登录
// app.get("/auth/login", (req, res) => {
//     let option = {

//     }
//     res.render("./myupload/auth/login", option)
// })
// //注册
// app.get("/auth/register", (req, res) => {
//     let option = {

//     }
//     res.render("./myupload/auth/register", option)
// })



//退出登录
app.get("/user/logout",(req,res,next)=>{
    //node原生写法
    // res.clearCookie("id")
    // res.clearCookie("username")
    // res.clearCookie("password")

    //express写法
    // 设置其立马失效
    res.cookie("id", '', {expires: new Date(0)});
    res.cookie("username", '', {expires: new Date(0)});
    res.cookie("password", '', {expires: new Date(0)});
    res.send("<script> window.location='/';</script>")
})


// 文件上传接口
app.post("/upload", upload.array("image"), async (req, res, next) => {

    // 读取传过来的file
    // console.log(req.files)

    // 重命名文件
    let oldPath = req.files[0].path
    let newPath = req.files[0].path + req.files[0].originalname
    // console.log(oldPath,newPath)
    try {
        fs.rename(oldPath, newPath, err => {
            if (err) throw err
        })
    } catch (e) {
        console.log(e)
    }


    //封装图片响应数据
    let img = {
        name: req.files[0].originalname,
        url: developUrl + req.files[0].destination.replace("./public", "/static") + "/" + req.files[0].filename + req.files[0].originalname,
        size: req.files[0].size,
        mime: req.files[0].mimetype,
        sha1: "",
        md5: "",
        path: req.files[0].destination,
        pathname: req.files[0].destination + "/" + req.files[0].filename + req.files[0].originalname
    }

    //存入数据库
    let sql = `insert into imgs(user_id,name,url,path,pathname,mime,size) 
    values(${req.cookies.id},'${img.name}','${img.url}','${img.path}','${img.pathname}','${img.mime}','${img.size}')`
    let result = await query(sql)
    // console.log(result)


    //响应数据类型
    //{"code":200,"msg":"上传成功","time":1613977566,"data":{"name":"HITMAN2-2021-02-17-22-49-09-375.png","url":"https:\/\/img.coolcr.cn\/2021\/02\/22\/3a7318b08f159.png","size":2735059,"mime":"image\/png","sha1":"3a31599bbda33a9529e324146a356c29bbb68d8a","md5":"7ccc4dc6c463bbf98c68ae9f8a6701f8"}}


    let obj = {
        code: 200,	//Number 状态码，成功返回200，失败返回500
        msg: "上传成功！", //String	success	提示信息
        time: Date.now(),  //Number	1544176295	响应时间戳
        data: img  //array | object	{ "token": "8961576c9090ef0902c4b89406f8d557" } 获取的token数据

    }
    res.json(obj)
})

//处理404页面
app.use((req, res, next) => {
    //404页面
    let rs = fs.createReadStream("./public/404.html")
    rs.pipe(res)
})


module.exports = app