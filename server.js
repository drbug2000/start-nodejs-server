//express library를 가져오는 코드 두줄
const express =require('express')
const app = express()

//method override 패키지 세팅
const methodOverride = require('method-override')

app.use(methodOverride('_method'))
//css,이미지,js 파일(static file) 등 html 에서 불러오는 소스를 server.js에 등록하게 하는 코드
app.use(express.static(__dirname + '/public'))
//html에 data를 집어넣는 templte engine인 ejs를 설정하는 코드
app.set('view engine','ejs')


//post 요청을 통해 받은 값을 편하게 요청.body로 받아 올수 있게 해주는 코드
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//MongoDB에 연결하는 코드
const { MongoClient,ObjectId } = require('mongodb')
let db 
const url = 'mongodb+srv://drbug2000:c2888c2888@chris2888.h3ieuji.mongodb.net/?retryWrites=true&w=majority '
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')
    //서버를 띄우는 코드
    app.listen(8888,()=>{
        console.log('http://localhost:8080 에서 서버 실행중')
    })

}).catch((err)=>{
    console.log(err)
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
    응답.render('list.ejs', {posts : result })//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

app.get('/time',async(요청,응답)=> {
    
    //ejs 파일 전송 
    응답.render('time.ejs', {time : new Date()})//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

app.get('/write',async(요청,응답)=> {
    
    //ejs 파일 전송 
    응답.render('write.ejs')//render를 해야 ejs 파일 보내짐
    //기본 경로는 views floder로 되어 있음
    //두번째 인자로 데이터를 ejs로 보내야함
})

app.post('/newpost',async(요청,응답)=> {
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

app.get('/detail/:id',async(요청,응답)=> {
    param=요청.params
    //await db.collection('post').findOne({:param.aaa})
    try{
    let result =await db.collection('post').findOne({_id:new ObjectId(param.id)})
    //let result =await db.collection('post').findOne({_id:new ObjectId('65b7506bb9e7ac76bf0c5b9a')})
    console.log(param)
    if(param==null){
        응답.status(404).send("옳지 않은 url 요청")
    }
    응답.render('detail.ejs',{ post : result })    
    }catch(e){
        console.log(e)
        응답.status(404).send("옳지 않은 url 요청")
    }
    
})

app.get('/edit/:id',async(요청,응답)=> {
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
            응답.render('edit_put.ejs',{ post : result })
        }    
    }catch(e){
        console.log(e)
        응답.status(404).send("옳지 않은 url 요청")
    }
    
})

app.post('/edit/:id',async(요청,응답)=> {
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

app.put('/edit/:id',async(요청,응답)=> {
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

app.delete('/edit/:id',async(요청,응답)=> {
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
