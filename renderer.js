// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var d3 = require('./d3.min.js');
var UIkit = require('./uikit.min.js');
var bar = document.getElementById('js-progressbar');
var ffmpeg = require('fluent-ffmpeg');
var path = require('path');
var prcoess = require('process');
var ffmpegPath = 'C:\\ffmpeg\\bin';
var fs = require('fs');
const ytdl = require('ytdl-core');
var thumb = require('node-thumbnail').thumb;
const {shell} = require('electron');
ffmpeg.setFfmpegPath(path.join(ffmpegPath, 'ffmpeg.exe'));
ffmpeg.setFfprobePath(path.join(ffmpegPath, 'ffprobe.exe'));

var cwd = process.cwd();
var mediaID = 0;

var tracer = require('tracer');
var logLevel = 'trace';
var logger = tracer.console(
			{
				format : "{{timestamp}} [{{title}}][{{method}}] {{message}} (in {{file}}:{{line}})",	
				dateformat: 'yyyy-mm-dd HH:MM:ss',
				level:logLevel,
				transport : [
                    /*
					function(data){
						fs.appendFile(logFile, data.output + '\n', function(err){
							if(err) {
								throw err;
							}
						});
                    },
                    */
					function(data){
						console.log(data.output);
                    },
                    function(data){
                        UKlogger(data.output);
                    }
                    /*,
					function(data){
						mailNotification('error', data);
                    }
                    */				
				]
			}
); 

// converting 중 drop을 막고
// convert가 끝나면 drop을 푸는 코드

function UKlogger(msg){
    d3.select('#msgPanel')
    .append('div')
    .text(msg)

    var msgPanel = d3.select('#msgPanel');
    console.log('height : ' + msgPanel.property('scrollHeight'));
    d3.select('#msgPanel').property('scrollTop', msgPanel.property('scrollHeight'));
}

function UKalert(msg){
    var modalDiv = d3.select('#errorMsg');
    modalDiv.text(msg);
    UIkit.modal('#errorModal').show();
}

var webview = d3.select('webview').node();
var zoomFactor = 0.75;

/*
d3.select('#zoomIn').on('click',function(){
    logger.info(zoomFactor);
    zoomFactor += 0.1
    webview.setZoomFactor(zoomFactor);
})

d3.select('#zoomOut').on('click',function(){
    logger.info(zoomFactor)
    zoomFactor -= 0.1
    webview.setZoomFactor(zoomFactor);
})
*/

d3.select('webview').on('dom-ready', function(){
    // when page load finished, update address bar
    var url = webview.getURL();
    logger.info('d3 object event handler on')
    d3.select('#address').property('value', url);
    webview.setZoomFactor(zoomFactor);
})


/* using d3, callback parameter d,i,n
d3.select('webview').on('did-navigate-in-page', function(a ,b, c, d){
    logger.info('did-navigate-in-page a : %s', a)
    logger.info('did-navigate-in-page b : %s', b)
    logger.info('did-navigate-in-page c : %j', c)
    logger.info('did-navigate-in-page d : %s', d)
})
*/


d3.select('webview').on('did-finish-load',function(d,i,n){
    logger.info('load done');
    document.getElementById('browser').addEventListener('did-navigate-in-page', function(ev){
        var url = ev.url;
        logger.info('did-navigate-in-page url : %s', url);
        d3.select('#address').property('value', url);
    })
})


d3.select('#loadURL').on('click',function(){
    var url = d3.select('#address').property('value');
    webview.loadURL(url);
})

/*
d3.select('webview').on('did-navigate', function(url){
    logger.info('did-navigate : %s', url)
})
*/

d3.select('#addMP3').on('click',function(){
    // from getMediaInfo, get source URL
    // and then append new row in Pannel
    var type = 'mp3';
    var url = d3.select('#address').property('value');
    logger.info(url);
    if(!validate(url)){
        UKalert('Not valid Youtube Url. check Url');        
    } else {
        getMediaInfo(url, type, addPannel);
    }
})

d3.select('#addMP4').on('click',function(){

    var type = 'mp4';
    var url = d3.select('#address').property('value');
    logger.info(url);
    if(!validate(url)){
        UKalert('Not valid Youtube Url. check Url');        
    } else {
        getMediaInfo(url, type, addPannel);
    }
})

function addPannel(options){

    var id   = options.mediaID;
    var url  = options.url;
    var type = options.type;
    var cleanTitle = options.title.replace(/["<>/:%*?|\\]/g, "");
    var rowHead = '[' + type + ']' + cleanTitle;
    var pannelID = '#mediaPannel';
    var fname = cleanTitle + '.' + type;

    options.fname = fname; // to use onDownload

    var row = d3.select(pannelID)
    .append('div')
    .classed('uk-grid',true)
    .classed('uk-grid-small',true)
    .classed('mediaRow',true)
    .attr('mediaID', id)
    .attr('uk-grid','')  

    // add download button
    var downloadDiv = row.append('div').classed('uk-width-1-6',true).classed('downloadDiv',true).attr('mediaID',id);
    downloadDiv.append('div')
    .classed('uk-label',true)
    .classed('uk-label-success',true)
    .classed('uk-width-1-1',true)
    .classed('uk-text-center',true)
    .classed('uk-animation-slide-left-small',true)
    .text('download')
    .on('click',function(){
        onDownload(this, options)
    });

    // add title Button
    var titleDiv = row.append('div').classed('uk-width-expand',true).classed('titleDiv',true).attr('mediaID',id);
    titleDiv.append('div')
    .classed('uk-animation-slide-top-small',true)
    .text(rowHead)

    // add progress
    var progressDiv = row.append('div').classed('uk-width-auto',true).classed('progressDiv',true).attr('mediaID',id);
    progressDiv
    .append('div')
    .append('span')
    .classed('uk-label',true)
    .classed('uk-background-secondary',true)
    .classed('uk-animation-slide-right-small',true)
    .text('0%')

    // add last button
    var operationDiv = row.append('div').classed('uk-width-auto',true).classed('operationDiv',true).attr('mediaID',id);
    operationDiv
    .append('div')
    .append('span')
    .classed('uk-label',true)
    .classed('uk-label-warning',true)
    .classed('uk-animation-slide-right-small',true)
    .text('DELE')
    .on('click',function(){
        row.remove();
    });   
    
    // download button handler
    var onDownload = function(downloadBTN, downloadOpts){

        var downloadOpts = {
            id : id,
            url : url,
            type : type,
            fname : fname
        }

        var cancelHandler = function(downloadStream,fname){
            logger.info('register cancel handler');
            d3.select(downloadBTN).on('click',null);
            d3.select(downloadBTN).text('CANCEL');
            d3.select(downloadBTN).on('click',function(){
                logger.info('stop downloading');
                downloadStream.destroy();
            })
        }

        var abortHandler = function(downloadStream,fname){
            logger.info('register abort handler');

            d3.select('.progressDiv')
            .select('.uk-label')
            .text('0%')

            logger.info('delete file')
            fs.unlink(fname,function(err){
                if(err){
                    logger.error('error delete %s : %j', fname, err);
                } else {
                    logger.info('delete %s success ', fname)
                }
            });

            d3.select(downloadBTN).on('click',null);
            d3.select(downloadBTN).text('DOWNLOAD');
            d3.select(downloadBTN).on('click', function(){
                onDownload(downloadBTN, downloadOpts)
            })
        }          

        download(downloadOpts, cancelHandler, abortHandler, function(fullname){
            logger.info('download callback called!')
            d3.select(downloadBTN).on('click',null);
            d3.select(downloadBTN).text('PLAY');
            d3.select(downloadBTN).on('click',function(){     
                logger.info('playing media!');
                shell.openItem(fullname);
            })      
            procDivToDone(id);
            operDivToOpen(id, fullname);
        });      
    }
}

// process div change when download finished
function procDivToDone(mediaID){
    var badge = d3.select('div.progressDiv[mediaID="' + mediaID + '"]').select('div').select('span');
    badge.classed('uk-label-warning',false);
    badge.classed('uk-label-default',true);
    badge.text('Done');   
}

// operation div change when download finished
function operDivToOpen(mediaID, fullname){
    var operbadge = d3.select('div.operationDiv[mediaID="' + mediaID + '"]').select('div').select('span');
    operbadge.on('click', null);
    operbadge.on('click', function(){
        logger.info('open file manager')
        shell.showItemInFolder(fullname);       
    })
    operbadge.classed('uk-label-warning',false);
    operbadge.classed('uk-label-success',true);
    operbadge.text('OPEN');
}

// validate youtube url
function validate(url){

    if(!ytdl.validateURL(url)){       
        return false;
    }

    var vid = ytdl.getURLVideoID(url);
    if(!ytdl.validateID(vid)){
        return false;
    }
    return true
}

function clearModal(modalID){
    var selector = '#' + modalID;
    d3.select(selector).remove();
}

function createModal(modalID, msg){
    d3.select('#procModalBody')
    .append('p')
    .attr('id', modalID)
    .text(msg)
}

function getMediaInfo(url,type,callback){

    clearModal('getInfo')
    createModal('getInfo','Geting Stream Information...')
    UIkit.modal('#procModal').show(); 
        
    ytdl.getInfo(url)
    .then(function(info){
        //logger.info(info);
        logger.info(info.title);
        logger.info(info.thumbnail_url);
        logger.info(info.formats)
        info.formats.forEach(function(format){
            var type = format.type;
            var quality = format.quality;
            var url = format.url;
            var container = format.container;
            var encoding = format.encoding;
            var profile = format.profile;
            logger.info(type,quality,container,encoding,profile);

        })
        mediaID += 1;
        UIkit.modal('#procModal').hide(); 
        clearModal('getInfo');
        var opts = {url:url, title:info.title, type:type, mediaID:mediaID};
        callback(opts);
    })
    .then(null, function(err){
        UKalert(err);
        logger.error(err);
        UIkit.modal('#procModal').hide(); 
        clearModal('getInfo');
    })
}

function download(options, addCancelHandler, addAbortHandler, done){

    var mediaID = options.id;
    var url  = options.url;
    var type = options.type;
    var fname = options.fname;

    var typeOptions = {
        'mp3' : {
            'ext' : '.mp3',
            'ytdlOpts' : {
                'filter' : 'audioonly'
            }
        },
        'mp4' : {
            'ext' : '.mp4',
            'ytdlOpts' : {
                'filter' : 'audioandvideo'
            }           
        }
    }


    logger.info('download to %s',fname );
   
    var downloadStream = ytdl(url, typeOptions[type].ytdlOpts)
    var fileWriteStream = fs.createWriteStream(fname);
    
    downloadStream.pipe(fileWriteStream);     

    //onCancel(downloadStream);

    fileWriteStream.on('close',function(err){
        logger.info('fie write closed!');
    })

    fileWriteStream.on('error',function(err){
        logger.info('file write error');
    })

    fileWriteStream.on('finish',function(err){
        logger.info('file write finish')
    })


    downloadStream.on('response',function(msg){
        logger.info('downloadStream response done');
        logger.info(msg.statusCode);
        if(msg.statusCode === 200){
            logger.info('request OK!')
            addCancelHandler(downloadStream,fname);
        }
    })

    downloadStream.on('progress',function(length,totalDownloaded,totalDownloadedLength){
        
        var percent = (totalDownloaded / totalDownloadedLength) * 100;
        var percentString = percent.toFixed(2) + '%'
        //logger.info('processed : %s', percentString);

        var badge = d3.select('div.progressDiv[mediaID="' + mediaID + '"]').select('div').select('span');
        badge.text(percentString);

        if(totalDownloaded == totalDownloadedLength){
            logger.info('download complete!');
            var fullname = path.join(cwd, fname);
            done(fullname);

            //addPreview(options.type, fullname, options.mediaID);
        }
    })   

    downloadStream.on('abort',function(){
        logger.info('downloadStream abort fire!');
        addAbortHandler(downloadStream, fname);
    })
    /*
    downloadStream.on('abort', function(err){
        logger.info('download canceled');
    })
    */

}

/*
function download(options){

    var url  = options.url;
    var type = options.type;
    var cleanTitle = options.title.replace(/["<>/:%*?|\\]/g, "");

    var typeOptions = {
        'mp3' : {
            'ext' : '.mp3',
            'ytdlOpts' : {
                'filter' : 'audioonly'
            }
        },
        'mp4' : {
            'ext' : '.mp4',
            'ytdlOpts' : {
                'filter' : 'audioandvideo'
            }           
        }
    }


    var fname = cleanTitle + typeOptions[type].ext;
    var modalID = 'getMedia'
    var modalBaseMsg = 'download stream...';

    //addPreview(options.type, fname, options.mediaID);
    
    clearModal(modalID)
    createModal(modalID, modalBaseMsg)
    logger.info('download to %s',fname );
    UIkit.modal('#procModal').show(); 
    
    var downloadStream = ytdl(url, typeOptions[type].ytdlOpts)
    
    downloadStream.pipe(fs.createWriteStream(fname));  
    
    downloadStream.on('progress',function(length,totalDownloaded,totalDownloadedLength){
        
        var percent = (totalDownloaded / totalDownloadedLength) * 100;
        logger.info('processed : %s', percent.toFixed(2) + '%');
        d3.select('#' + modalID).text(modalBaseMsg + ' ' + percent.toFixed(2) + '%');
        if(totalDownloaded == totalDownloadedLength){
            logger.info('download complete!');
            UIkit.modal('#procModal').hide();
            clearModal('getMedia');
            var fullname = path.join(cwd, fname);
            addPreview(options.type, fullname, options.mediaID);
        }
    })   
    


}


function addPreview(type, fullname, mediaID){
    var id = 'clip' + mediaID;
    d3.select('#mediaPannel')
    .append('div')
    .attr('id', id)
    .attr('uk-margin','')
    .append('button')
    .classed('uk-button',true)
    .classed('uk-button-default',true)
    .classed('uk-button-small',true)
    .classed('uk-animation-scale-up',true)
    .classed('uk-margin-medium-right',true)
    .classed('uk-margin-small-bottom',true)
    .text('play')
    .on('click',function(){
        logger.info('play clicked');
        d3.select('#videoPlayer').attr('src',fullname); 
    })
    
    var basename = path.basename(fullname);

    d3.select('#mediaPannel')
    .select('div#' + id)
    .append('button')
    .classed('uk-button',true)    
    .classed('uk-button-text',true)
    .classed('uk-button-small',true)
    .classed('uk-animation-scale-up',true)
    .classed('uk-margin-small-bottom',true)
    .text(basename)   
    .on('click',function(){
        logger.info('open file manager')
        shell.showItemInFolder(fullname);
    }) 
}

d3.select('#capture').on('click', function(){
    logger.info(d3.select('#videoPlayer').property('currentTime'));
    var offset = d3.select('#videoPlayer').property('currentTime')
    var fullname =  d3.select('#videoPlayer').attr('src');
    var outPath = path.dirname(fullname);
    var extn = path.extname(fullname);
    var base = path.basename(fullname,extn);
    var outputFile = path.join(outPath,base) + '_' + offset + '.png';
        
    // 변환시작 -> 기존 progress 정보 삭제
    d3.select('#progressBody').remove();

    // progress HTML 생성
    d3.select('#procModalBody')
    .append('p')
    .attr('id','progressBody')
    .text('extracting image...')
    .append('span')
    .attr('id','progress')

    var command = ffmpeg(fullname)
    .inputOptions(['-ss ' + offset])
    .outputOptions(['-vframes 1'])
    .on('start', function(commandLine) {
        logger.info('Spawned Ffmpeg with command: ' + commandLine);   
        UIkit.modal('#procModal').show();        
    })
    .on('progress', function(progress) {
        logger.info('Processing: ' + progress.percent + '% done');
    })
    .on('stderr', function(stderrLine) {
        logger.info('Stderr output: ' + stderrLine);
    })
    .on('error', function(err, stdout, stderr) {
        logger.error('Cannot process video: ' + err.message);
        fs.unlink(outputFile,function(err){
            if(err) logger.error(err);
            logger.info('file delete success! : %s', outputFile);
        })
        UIkit.modal('#procModal').hide();
    })
    .on('end', function(stdout, stderr) {
        var thumbSuffix = '_thumb';
        logger.info('capture image succeeded !');
        var options = {
            'source' : outputFile,
            'destination' : path.dirname(outputFile),
            'suffix' : thumbSuffix,
            'width' : 100,
            'logger' : function(message){
                logger.info(message);
            }
        }
        thumb(options)
        .then(function(){
            var thumbPath = path.dirname(outputFile);
            var extn = path.extname(outputFile);
            var baseFname = path.basename(outputFile,extn);
            var thumbnail = path.join(thumbPath,baseFname) + thumbSuffix + extn;
            d3.select('ul.uk-thumbnav')
            .append('li')
            .append('a')
            .attr('href',outputFile)
            //.text('image')
            .append('img')
            .attr('src', thumbnail);
        })
        .then(null,function(err){
            logger.error(err);
            UKalert(err);
        })

        UIkit.modal('#procModal').hide();
        //UIkit.modal('#modalProgress').hide();
    })
    .output(outputFile)
    .run();

})

/* 


d3.selection().on('dragover', function(e){
    d3.event.preventDefault();
    d3.event.stopPropagation();    
});

d3.select('#videoPlayer').on('loadstart',function(){

    var fullname = d3.select('#videoPlayer').attr('src');
    logger.info('media ready: %s', fullname );
    d3.select('#fileMgr').attr('disabled',null);
    d3.select('#capture').attr('disabled',null);
    d3.select('#upload').attr('disabled',null);
    var from = d3.select(this).attr('from');
    
    if(from === 'drop'){
        showModal('메타정보 추출중...');
        getMeta(fullname,function(err, streamInfo, formatInfo){        
            hideModal('메타정보 추출완료');
            logger.info(streamInfo);
            logger.info(formatInfo);

            var beforePanelElement = d3.select('#beforePanelStream');
            var beforeformatElement = d3.select('#beforePanelFormat');

            putPanelInfo(beforePanelElement, streamInfo);
            putPanelInfo(beforeformatElement, formatInfo);        

            var origDiv = d3.select('#orig');
            addLoadBtn(origDiv, 'orig');
            d3.select('.load-orig').dispatch('click');
        })    
    }

})

function getMeta(fname,callback){
    ffmpeg.ffprobe(fname, function(err,metadata){
        if(err){
            logger.error(err);
            
        }

        var streamInfo = metadata.streams ? metadata.streams : {'streamInfo':'none',};
        var formatInfo = metadata.format ? metadata.format : {'formatInfo':'none',};
        var streamInfoArray1 = JSON.stringify(streamInfo[0]).split(',');  
        var formatInfoArray = JSON.stringify(formatInfo).split(',');
        if(formatInfo.nb_streams == 2){
            var streamInfoArray2 = JSON.stringify(streamInfo[1]).split(',');
        }
        
        logger.info(streamInfo);
        logger.info(formatInfoArray);

        callback(null, streamInfoArray1,formatInfoArray);
    })
}

d3.select('#videoPlayer').on('timeupdate', function(){
    //logger.info(d3.event.target.currentTime);
    //logger.info(d3.event.target.duration);
})

d3.select('#videoPlayer').on('error',function(){
    var errCode = d3.event.target.error.code;
    var errMsg = d3.event.target.error.message;
    //var userMsg = '<span class="uk-text-small">오류 : video loading error : code = ' + errCode + ' , msg = ' + errMsg + '</span>'; 
    var userMsg = '오류 : video loading error : code = ' + errCode + ' , msg = ' + errMsg ;
    // error code ref : https://developer.mozilla.org/ko/docs/Web/API/MediaError
    console.log(userMsg);
    UKalert(userMsg);

})

d3.select('#title').on('click', function(){
    var fullname = d3.select('#videoPlayer').attr('src');
    shell.showItemInFolder(fullname);
})

d3.select('upload').on('click', function(){
    
})

d3.select('#capture').on('click', function(){
    logger.info(d3.select('#videoPlayer').property('currentTime'));
    var offset = d3.select('#videoPlayer').property('currentTime')
    var fullname =  d3.select('#videoPlayer').attr('src');
    var outPath = path.dirname(fullname);
    var extn = path.extname(fullname);
    var base = path.basename(fullname,extn);
    var outputFile = path.join(outPath,base) + '_' + offset + '.png';
        
    // 변환시작 -> 기존 progress 정보 삭제
    d3.select('#progressBody').remove();

    // progress HTML 생성
    d3.select('#procModalBody')
    .append('p')
    .attr('id','progressBody')
    .text('extracting image...')
    .append('span')
    .attr('id','progress')

    var command = ffmpeg(fullname)
    .inputOptions(['-ss ' + offset])
    .outputOptions(['-vframes 1'])
    .on('start', function(commandLine) {
        logger.info('Spawned Ffmpeg with command: ' + commandLine);   
        UIkit.modal('#procModal').show();        
    })
    .on('progress', function(progress) {
        logger.info('Processing: ' + progress.percent + '% done');
    })
    .on('stderr', function(stderrLine) {
        logger.info('Stderr output: ' + stderrLine);
    })
    .on('error', function(err, stdout, stderr) {
        logger.error('Cannot process video: ' + err.message);
        fs.unlink(outputFile,function(err){
            if(err) logger.error(err);
            logger.info('file delete success! : %s', outputFile);
        })
        UIkit.modal('#procModal').hide();
    })
    .on('end', function(stdout, stderr) {
        var thumbSuffix = '_thumb';
        logger.info('capture image succeeded !');
        var options = {
            'source' : outputFile,
            'destination' : path.dirname(outputFile),
            'suffix' : thumbSuffix,
            'width' : 100,
            'logger' : function(message){
                logger.info(message);
            }
        }
        thumb(options)
        .then(function(){
            var thumbPath = path.dirname(outputFile);
            var extn = path.extname(outputFile);
            var baseFname = path.basename(outputFile,extn);
            var thumbnail = path.join(thumbPath,baseFname) + thumbSuffix + extn;
            d3.select('ul.uk-thumbnav')
            .append('li')
            .append('a')
            .attr('href',outputFile)
            .text('image')
            //.append('img')
            //.attr('src', thumbnail);
        })
        .then(null,function(err){
            logger.error(err);
            UKalert(err);
        })

        UIkit.modal('#procModal').hide();
        //UIkit.modal('#modalProgress').hide();
    })
    .output(outputFile)
    .run();

})

d3.select("#convert").on('click',function(){

    // 변환시작 -> 기존 progress 정보 삭제
    d3.select('#progressBody').remove();

    // progress HTML 생성
    d3.select('#procModalBody')
    .append('p')
    .attr('id','progressBody')
    .text('Converting Processed ')
    .append('span')
    .attr('id','progress')

    // progress HTML에 cancel button 추가
    d3.select('#procModalBody')
    .select('p')     
    .append('span')
    .append('button')
    .attr('id','cancel')
    .classed('uk-button',true)
    .classed('uk-button-small',true)
    .classed('uk-button-primary',true)
    .classed('uk-position-center-right',true)
    .classed('uk-position-medium', true)
    .text('변환취소')
   
    // output 파일 postfix를 위한 현재 timestamp 구하기
    var now = new Date();

    // output 파일 fullname 설정
    var origFname = d3.select('#videoPlayer').attr('src');
    if(!origFname){
        UKalert('먼저 소스 영상을 drag & drop 하시기 바랍니다.')
        logger.error('변환 대상 파일 없음!')
        return false;
    }
    var origPath = path.dirname(origFname);
    var origExtn = path.extname(origFname);
    var origBase = path.basename(origFname,origExtn);
    var convBase = origBase + '_' + now.getTime();
    var convFname = path.join(origPath,convBase) + origExtn;
    //

    logger.info('convert start : %s', origFname);
    
    var command = ffmpeg(origFname)
        .videoCodec('libx264')
        .on('start', function(commandLine) {
            UIkit.modal('#procModal').show();
            disableDropOnBody();
            logger.info('Spawned Ffmpeg with command: ' + commandLine);
            d3.select('button.load-conv').remove();
            d3.select('#afterPanelStream').text('변환후 Video 정보');
            d3.select('#afterPanelFormat').text('변환후 Format 정보')
            d3.select('#cancel').on('click', function(){
                d3.select('#modalProgress').text('취소중..');
                command.kill();
            })
        })
        .on('progress', function(progress) {
            logger.info('Processing: ' + progress.percent + '% done');
            d3.select('#progress').text(' : ' + progress.percent.toFixed(2) + '% ');
        })
        .on('stderr', function(stderrLine) {
            logger.info('Stderr output: ' + stderrLine);
        })
        .on('error', function(err, stdout, stderr) {
            logger.error('Cannot process video: ' + err.message);
            UIkit.modal('#procModal').hide();
            fs.unlink(convFname,function(err){
                if(err) logger.error(err);
                logger.info('file delete success! : %s', convFname);
            })
            enableDropOnBody();
        })
        .on('end', function(stdout, stderr) {
            logger.info('Transcoding succeeded !');
            //UIkit.modal('#modalProgress').hide();
            UIkit.modal('#procModal').hide();
            getMeta(convFname,function(err, streamInfo, formatInfo){              
                var beforePanelElement = d3.select('#afterPanelStream');
                var beforeformatElement = d3.select('#afterPanelFormat');
        
                putPanelInfo(beforePanelElement, streamInfo);
                putPanelInfo(beforeformatElement, formatInfo);

                var convDiv = d3.select('#conv');
                convDiv.attr('fullname',convFname);
                addLoadBtn(convDiv,'conv');
                d3.select('.load-conv').dispatch('click');
            })   
            enableDropOnBody();  
        })
        .save(convFname);
});

function addLoadBtn(ele, from){

    // load-orig, load-conv
    var btnClass = 'load-' + from;
    ele.append('button')
    .classed('uk-button',true)
    .classed('uk-button-primary',true)
    .classed('uk-width-1-1',true)
    .classed('panelBtn', true)
    .classed(btnClass,true)
    .text('Load')
    .on('click',function(){
        var fullname = ele.attr('fullname');
        // set title
        d3.select('#title').text(fullname);
        // load video
        d3.select('#videoPlayer').attr('src',fullname);    
        d3.select('#videoPlayer').attr('from',from);  
        // change active button color and text
        var origBtnClass = 'load-orig';
        var convBtnClass = 'load-conv';
        d3.select(this)
        .classed('uk-button-primary',false)
        .classed('uk-button-secondary',true)
        .text('Loaded');
        
        var prevBtnClass = btnClass == origBtnClass ? convBtnClass : origBtnClass;
        d3.select('.' + prevBtnClass)
        .classed('uk-button-secondary',false)
        .classed('uk-button-primary',true)
        .text('Load');       
    })
}

function clearPanelInfo(elementArray){
    elementArray.forEach(function(ele){
        ele.selectAll('div').remove();
    });
}

function putPanelInfo(ele, content){
    ele.selectAll('div')
    .data(content)
    .enter()
    .append('div')
    .text(function(d){
        return d.replace('{','').replace('}','')
    })
}



// 발급요청중

function showModal(msg){
    var modalDiv = d3.select('#errorMsg');
    modalDiv.text('');
    modalDiv.text(msg);
    //modalDiv.append('h2').text('발급요청중....')
    UIkit.modal('#errorModal').show();
}

// 발급완료

function hideModal(msg){
    var modalDiv = d3.select('#errorMsg');
    modalDiv.text('');
    modalDiv.text(msg);
    setTimeout(function(){
        UIkit.modal('#errorModal').hide();
    },1000)
}

logger.info('loading done!')
*/