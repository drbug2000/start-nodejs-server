//express library를 가져오는 코드 두줄
const express =require('express')
const app = express()

//method override 패키지 세팅
const methodOverride = require('method-override')

//hashing 툴 bcrypt 세팅
const bcrypt = require('bcrypt')


app.use(methodOverride('_method'))
//css,이미지,js 파일(static file) 등 html 에서 불러오는 소스를 server.js에 등록하게 하는 코드
app.use(express.static(__dirname + '/public'))
//html에 data를 집어넣는 templte engine인 ejs를 설정하는 코드
app.set('view engine','ejs')


//post 요청을 통해 받은 값을 편하게 요청.body로 받아 올수 있게 해주는 코드
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//env 파일 관리를 위한코드
require('dotenv').config()

//MongoDB에 연결하는 코드
const { MongoClient,ObjectId } = require('mongodb')
let db 
const url = process.env.DB_URL
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')
    //서버를 띄우는 코드
    app.listen(process.env.PORT,()=>{
        console.log('http://localhost:8080 에서 서버 실행중')
    })

}).catch((err)=>{
    console.log(err)
})

//mongo connect 
const MongoStore = require('connect-mongo')

//passport로 session을 구현하기 위한 library setting
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
app.use(passport.initialize())
app.use(session({
	secret: process.env.SESSION_KEY,
	resave: false,
	saveUninitialized: false,
    cookie : {maxAge: 60*60*1000},
    store : MongoStore.create({
        mongoUrl : process.env.DB_URL,
        dbName : 'fourm'
    })

}))
app.use(passport.session())

//세션을 만드는 자동 코드
passport.serializeUser((user,done)=>{
    //요청.login 이 실행되면, 이 안의 코드도 같이 실행됨
    console.log(user)//로그인 시도중인 유저의 정보가 담긴다. 
    //위 passport.use(local)에서 return cb(null, result)했던 result가 그대로 담겨서 그렇다.
    process.nextTick(()=>{//nodejs에서 특정 코드를 비동기적으로 처리 해주는 문법(queueMicrotasj())
        //이 내용의 document를 생성하고 쿠키도 알아서 보내줌
        done(null, {id : user._id , username:user.username})//세션document에 기록할 내용
        //이렇게 하면 세션이 발행됨. DB연결은 아직 안했으니 메모리에 저장됨
    })
})

//사용자가 보낸 쿠키를 분석하는 코드 
passport.deserializeUser(async(user,done)=>{
	let result = await db.collection('user').findOne({_id: new ObjectId(user.id)})
	delete result.password
    process.nextTick(()=>{
		done(null, result)		
	})
})

//서버의 기능 작성
app.get('/',(요청,응답)=> {
    응답.sendFile(__dirname + '/index.html')
})

app.get('/A',(요청,응답)=> {
    db.collection('post').insertOne({title:'A enter'})
    응답.send('A반갑다A')
})
app.get('/getdb',async(요청,응답)=> {
    let result = await db.collection('post').find().toArray()
    console.log(result)
    응답.send(result[0].title)
})

app.get('/list',async(요청,응답)=> {
    let result = await db.collection('post').find().toArray()
    //console.log(result)
    //응답.send(result[0].title) "응답"은 한번만 해야됨

    //ejs 파일 전송 
    응답.render('list.ejs', {posts : result ,user : 요청.user})//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

app.get('/time',async(요청,응답)=> {
    
    //ejs 파일 전송 
    응답.render('time.ejs', {time : new Date()})//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

app.get('/write',checklogin,async(요청,응답)=> {
    
    //ejs 파일 전송 
    응답.render('write.ejs',{user:요청.user})//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

app.post('/newpost',checklogin,async(요청,응답)=> {
    console.log(요청.body)
    try{
        if(요청.body.title==''){
            응답.send("no title string")
        }else{
        await db.collection('post').insertOne({title:요청.body.title, content:요청.body.content})
        응답.redirect('/list')//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
        }

    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    
    //redirect하면 다른 링크로 보내줌
})

app.get('/detail/:id',checklogin,async(요청,응답)=> {
    param=요청.params

    //await db.collection('post').findOne({:param.aaa})
    try{
    let result =await db.collection('post').findOne({_id:new ObjectId(param.id)})
    //let result =await db.collection('post').findOne({_id:new ObjectId('65b7506bb9e7ac76bf0c5b9a')})
    console.log(param)
    if(param==null){
        응답.status(404).send("옳지 않은 url 요청")
    }
    응답.render('detail.ejs',{ post : result,user: 요청.user })    
    }catch(e){
        console.log(e)
        응답.status(404).send("옳지 않은 url 요청")
    }
    
})

app.get('/edit/:id',checklogin,async(요청,응답)=> {
    param=요청.params
    //await db.collection('post').findOne({:param.aaa})
    console.log('edit GET API')

    try{
        let result =await db.collection('post').findOne({_id:new ObjectId(param.id)})
        //let result =await db.collection('post').findOne({_id:new ObjectId('65b7506bb9e7ac76bf0c5b9a')})
        console.log(param)
        if(param==null){
            응답.status(404).send("옳지 않은 url 요청")
        }else{
            응답.render('edit_put.ejs',{ post : result, user:요청.user })
        }    
    }catch(e){
        console.log(e)
        응답.status(404).send("옳지 않은 url 요청")
    }
    
})

app.post('/edit/:id',checklogin,async(요청,응답)=> {
    //console.log(요청.body)
    console.log('edit API')
    try{
        if(요청.body.title==''){
            응답.send('no title string')
        }else{
        var target_id = {_id : new ObjectId(요청.params.id)}
        console.log( 'targetid'+ target_id)
        var update = { $set:{title  : 요청.body.title, content:요청.body.content} }
        await db.collection('post').updateOne(target_id,update)
        응답.redirect('/list')//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
        }

    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    
    //redirect하면 다른 링크로 보내줌
})

app.put('/edit/:id',checklogin,async(요청,응답)=> {
    //console.log(요청.body)
    console.log('edit API-by PUT')

    try{
        if(요청.body.title==''){
            응답.send('no title string')
        }else{
        var target_id = {_id : new ObjectId(요청.params.id)}
        console.log( 'targetid'+ target_id)
        var update = { $set:{title  : 요청.body.title, content:요청.body.content} }
        await db.collection('post').updateOne(target_id,update)
        응답.redirect('/list')//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
        }

    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    

})

app.delete('/edit/:id',checklogin,async(요청,응답)=> {
    console.log("delete API")

    try{
        var target_id = { _id : new ObjectId(요청.params.id)}
        if(target_id){

        }
        console.log( 'targetid'+ 요청.params.id)
        const result = await db.collection("post").deleteOne(target_id)

        if(result.deletedCount === 1 ){
            console.log("DB : Successfully deleted one document.")
        }else {
            console.log(result.deletedCount)
            console.log("DB : No documents matched the query. Deleted 0 documents.");
        }
        응답.redirect('/list')
    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }

})

app.get('/list/:page',async(요청,응답)=> {
    let doc_count = await db.collection('post').countDocuments()
    let result = await db.collection('post').find().skip(5 * (요청.params.page-1) ).limit(5).toArray()
    let page_meta = {count : doc_count , current : 요청.params.page , cur_length : result.length}
    let results = {post : result }
    //console.log(result)
    //응답.send(result[0].title) "응답"은 한번만 해야됨
    console.log("doc_count" + doc_count)
    //ejs 파일 전송 
    응답.render('lists.ejs', { posts : result, pages : page_meta ,user:요청.user})//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번,cb)=> { 
	//유저가 입력한 id-password가 맞는지 검사하는 코드
	console.log('passport start')
	//DB조회
	let result = await db.collection('user').findOne({username : 입력한아이디})
	if(!result){
	//id가 없는경우
        console.log('[login fail]no id')
		               //회원인증 실패 = false
		return cb(null,false,{message: '아이디 DB에 없음'})
	}
	if (await bcrypt.compare(입력한비번,result.password)){
        console.log('[login]mathch id & password')
		//로그인 성공
		return cb(null, result)
	}else {
        console.log('[login fail]not match password')
                   //비밀번호 불일치 = false   
		return cb(null,false,{message :'비번 불일치'})
	}
//전체 코드를 try-catch 하는것도 하면 좋음
}))

//middleware
function checklogin(요청,응답,next){
    if(!요청.user){
        응답.render('login_again.ejs')
    }
}

app.get('/login',async(요청,응답)=> {
    
    try{
        응답.render('login.ejs',{user:요청.user})//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    
    //redirect하면 다른 링크로 보내줌
})

app.post('/login',async(요청,응답,next)=>{
	//입력된 값을 대조하는 코드
	passport.authenticate('local',(error, user, info)=> { 
		//비교 작업이 끝나면 실행할 코드  
		//error: 에러 발생시, user:성공시, info:실패 사유
        console.log('login start')
		if(error) return 응답.status(500).json(error)
		if(!user) return 응답.status(401).json(info.message)//우리가 위에 적은 메세지
		console.log('login not fail')
		//session을 만들어줌
		요청.logIn(user,(err)=>{
			if(err) return next(err)
			//로그인 성공시 실행하는 코드
            console.log('login success')
			응답.redirect('/list/1')
		})
	})(요청,응답,next)
})

app.get('/mypage',checklogin,async(요청,응답)=> {
    console.log("mypage API start")
    //console.log(요청.user)

    let result = await db.collection('user').findOne({_id : new ObjectId(요청.user._id)})
    let user = {username: result.username, detail : result.detail }
    try{
        응답.render('mypage.ejs',{user: user})//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    
    //redirect하면 다른 링크로 보내줌
})

app.get('/edit_user',checklogin,async(요청,응답)=> {
    
    let result = await db.collection('user').findOne({_id : new ObjectId(요청.user._id)})
    let user = {username: result.username, detail : result.detail }
    console.log(user)
    try{
        응답.render('edit_user.ejs',{user : user})//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    //redirect하면 다른 링크로 보내줌
})

app.post('/edit_user',checklogin,async(요청,응답)=> {
    console.log('edit user-detail API')
    try{
        if(요청.body.user_detail.length >200){
            응답.send('no title string')
        }else{
        console.log(요청.user)
        var target_id = {_id : new ObjectId(요청.user._id)}
        console.log( 'targetid'+ target_id)
        var update = { $set:{ detail : 요청.body.user_detail }}
        await db.collection('user').updateOne(target_id,update)
        응답.redirect('/list')//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
        }

    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    
    //redirect하면 다른 링크로 보내줌
})

app.get('/signup',async(요청,응답)=> {
    
    try{
        응답.render('create_account.ejs',{user:요청.user})//기능이 끝나면 응답을 해줘야함( 그래야 무한 로딩 안빠진다 )
    }catch(e){
        console.log(e)
        응답.status(500).send('서버 에러남') 
    }
    
    //redirect하면 다른 링크로 보내줌
})

app.post('/signup',async(요청,응답,next)=>{
	//입력된 값을 대조하는 코드
    console.log("sign up AIP start")
    console.log("body data: "+ 요청.body)
	let checkname = await db.collection('user').findOne({username : 요청.body.username})
    console.log("checkname(null is ok) :" +checkname)
    console.log('password '+요청.body.password)
    console.log('confirm password '+요청.body.confirmpassword)
    if(checkname){
        응답.send("이미 있는 id 입니다")
        return 
    }

    //password compare code
    let hashpassword = await bcrypt.hash(요청.body.password,process.env.HASH_TIME)
    await db.collection('user').insertOne({ 
        username : 요청.body.username, 
        password : hashpassword 
    })
    응답.render('signup_success.ejs',{user:요청.user})
})

app.post('/checkid',async(요청,응답)=> {
    //입력된 값을 대조하는 코드
    console.log("checkid AIP start")
    console.log("body data: "+ 요청.body.username)
	let checkname = await db.collection('user').findOne({username : 요청.body.username})
    console.log("checkname(null is ok) :" +checkname)
    if(checkname){
        응답.send({"exists":true})//이미 아이디가 존재함
        
    }else{
        응답.send({"exists":false})
    }
    
})

app.get('/test',async(요청,응답)=> {
    
    console.log("user:",요청.user)
    let checkname = await db.collection('user').findOne({username : 요청.body.username})
    
    응답.send("check server console.")
    //redirect하면 다른 링크로 보내줌
})


