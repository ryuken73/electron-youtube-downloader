const fs = require('fs');
const ytdl = require('ytdl-core');

var url = 'https://www.youtube.com/watch?v=zEkg4GBQumc';

/*
ytdl('https://www.youtube.com/watch?v=zEkg4GBQumc')
.pipe(fs.createWriteStream('video.mp4'));
*/
var downloadStream = ytdl('https://www.youtube.com/watch?v=zEkg4GBQumc',{'filter':'audioonly'})
downloadStream.pipe(fs.createWriteStream('video.mp3'));  

downloadStream.on('progress',function(length,totalDownloaded,totalDownloadedLength){
    console.log(length);
    console.log(totalDownloaded);
    console.log(totalDownloadedLength);
})

ytdl.getInfo(url)
.then(function(info){
    console.log(info);
})