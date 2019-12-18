const fs = require('fs');
const ytdl = require('ytdl-core');

var url = 'https://www.youtube.com/watch?v=zEkg4GBQumc';

/*
ytdl('https://www.youtube.com/watch?v=zEkg4GBQumc')
.pipe(fs.createWriteStream('video.mp4'));
*/
const options = {
    'ext' : '.mp4',
    'ytdlOpts' : {
        'filter' : 'audioandvideo'
    }   
}
//var downloadStream = ytdl('https://www.youtube.com/watch?v=zEkg4GBQumc', options)
var downloadStream = ytdl('https://m.youtube.com/watch?v=NRKqzBkrcBs', options)
downloadStream.pipe(fs.createWriteStream('video.mp4'));  

downloadStream.on('progress',function(length,totalDownloaded,totalDownloadedLength){
    console.log(length);
    console.log(totalDownloaded);
    console.log(totalDownloadedLength);
})

ytdl.getInfo(url)
.then(function(info){
    console.log(info);
})