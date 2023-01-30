const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3333;
const converter = require('json-2-csv');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: false
}));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    return res.render('index')
});

app.post('/get-faq', (req, res) => {

    const { selector, list } = req.body;
    const faq = [];
    const urlList = list.split('\r\n');
    let title = '';
    let num = 0;
    let options;
    let $ = '';
    let el = '';
    let qres = '';
    let phrase = 'tag element';
    let tagTitle = '';
    let elementFaq = '';
    let n = 0;


        for(let i = 0; i < urlList.length; i++){
            
            options = {
                url: urlList[i],
                headers: {
                  'User-Agent': 'request', 
                  "Content-Type" : "text/html; charset=utf-8"
                }
              };


            request.get(options, (err, response, body) => {
                
                num = 1;
                el = {
                    url: urlList[i],
                    questions: 0
                };
                

                if(typeof(body) == 'string'){

                    $ = cheerio.load(body.toString('utf8'));

                
                    for(let j = 1; j <= 6; j++){
                
                        elementTitle = $(`${selector} h${j}`).each(function(){
                            title = $(this).text().trim();
                            if(title.substring(title.length-1, title.length) === '?'){
                                el[`question${num}`] = title;
                                el.questions = el.questions + 1;
                                tagTitle = $(this).nextAll('h1, h2, h3, h4, h5, h6').eq(0).text().trim();
                                console.log(tagTitle);
                                phrase = $(this).nextAll().eq(0).text().trim();
                                while(tagTitle !== phrase){
                                    qres = qres + ' ' + phrase;
                                    n++;
                                    phrase = $(this).nextAll().eq(n).text().trim();
                                }
                                el[`response${num}`] = qres;
                                qres = '';
                                num++; 
                                n = 0;
                            };
                        });
                    };
                }


                const faqScript = {'@context': 'https://schema.org','@type': 'FAQPage','mainEntity': []}

                  for(let y = 1; y <= el.questions; y++){
                    elementFaq = {'@type': 'Question','name': el[`question${y}`],'acceptedAnswer': {'@type': 'Answer','text': el[`response${y}`]}}
                    if(el.questions > 0){

                        faqScript.mainEntity.push(elementFaq);
                    }
                }
                el.script = `<script type='application/ld+json'> ${JSON.stringify(faqScript)} </script>`;
                faqScript.mainEntity = [];
                faq[i] = el;
                el = {};



                if(i == urlList.length-1){
                    const newFaq = faq.filter(el => el.questions > 0);
                    converter.json2csv(newFaq, (err, csv) => {
                        if(err){
                            console.log(err)
                        }
                        console.log(csv);
                        fs.writeFileSync('./download/data.csv', csv, 'utf8');
                    });
                return res.render('get-faq', {faq: newFaq});
                }
            });
            
        }

});

app.get('/download', (req, res)=> {
    const file = `./download/data.csv`;
    res.download(file);
});

app.listen(PORT, console.log(`Server is running on http://localhost:${PORT}`));
