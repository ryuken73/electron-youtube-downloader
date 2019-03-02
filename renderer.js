// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var d3 = require('./d3.min.js');
var UIkit = require('./uikit.min.js');
var path = require('path');
var prcoess = require('process');
var fs = require('fs');
const ytdl = require('ytdl-core');
const {shell} = require('electron');
var {remote} = require('electron');
var ffmpeg = require('fluent-ffmpeg');

// var cwd = process.cwd();
global.downloadPath = remote.app.getPath('downloads');
var mediaID = 0;

var tracer = require('tracer');
var logLevel = 'trace';
var logger = tracer.console(
    {
        format : "{{timestamp}} [{{title}}][{{method}}] {{message}} (in {{file}}:{{line}})",	
        dateformat: 'yyyy-mm-dd HH:MM:ss',
        level:logLevel,
        transport : [
            function(data){
                console.log(data.output);
            },
            function(data){
                UKlogger(data.output);
            }

        ]
    }
); 

const webview = d3.select('webview').node();
const backBtn = d3.select('#goBack');
const forwardBtn = d3.select('#goForward');
const refreshBtn = d3.select('#refresh');
const addMP3Btn = d3.select('#addMP3');
const addMP4Btn = d3.select('#addMP4');

backBtn.on('click', () => {
    webview.goBack();
})

forwardBtn.on('click', () => {
    webview.goForward();
})

refreshBtn.on('click', () => {
    webview.reload();
})

addClickEffect([backBtn, forwardBtn, refreshBtn, addMP3Btn, addMP4Btn]);

function addClickEffect(tgt){

    const elements = typeof(tgt) === 'object' ? tgt : [tgt];

    for(let element of elements){
        element.on('mousedown', () => {
            console.log('mousedown');
            element.style('transform', 'translateY(5%)')
        })
        
        element.on('mouseup', () => {
            console.log('mouseup')
            element.transition().style('transform', 'translateY(-5%)')
        })

    }
}

function getFullname(fname) {
    return path.join(global.downloadPath, fname);
}

// setup ffmpeg path
const appPath = remote.app.getAppPath();
logger.info('appPath : %s', appPath);

const ffmpegPath = path.join(appPath, '../bin');
const ffmpegBin  = 'ffmpeg.exe';
const ffprobeBin = 'ffprobe.exe';

ffmpeg.setFfmpegPath(path.join(ffmpegPath,  ffmpegBin));
ffmpeg.setFfprobePath(path.join(ffmpegPath, ffprobeBin));

// setup UKlogger

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

const zoomFactor = 0.75;

d3.select('webview').on('dom-ready', function(){
    // when page load finished, update address bar
    var url = webview.getURL();
    logger.info('d3 object event handler on')
    d3.select('#address').property('value', url);
    webview.setZoomFactor(zoomFactor);
})


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


addMP3Btn.on('click',function(){
    // from getMediaInfo, get source URL
    // and then append new row in Pannel
    const type = 'mp3';
    const url = d3.select('#address').property('value');
    logger.info(url);
    if(!validate(url)){
        UKalert('Not valid Youtube Url. check Url');        
    } else {
        getMediaInfo(url, type, addPannel);
    }
})

addMP4Btn.on('click',function(){

    const type = 'mp4';
    const url = d3.select('#address').property('value');
    logger.info(url);
    if(!validate(url)){
        UKalert('Not valid Youtube Url. check Url');        
    } else {
        getMediaInfo(url, type, addPannel);
    }
})

function addPannel(options){

    const mediaID   = options.mediaID;
    const url  = options.url;
    const type = options.type;
    const duration = options.duration;
    const cleanTitle = options.title.replace(/["<>/:%*?|\\]/g, "");
    const rowHead = '[' + type + ']' + cleanTitle + ' - ' + duration + 'sec';
    const pannelID = '#mediaPannel';
    const fname = cleanTitle + '.' + type;
    const fullname = getFullname(fname);

    options.fname = fname; 
    options.fullname = fullname;

    var row = d3.select(pannelID)
    .append('div')
    .classed('uk-grid',true)
    .classed('uk-grid-small',true)
    .classed('mediaRow',true)
    .attr('mediaID', mediaID)
    .attr('uk-grid','')  

    // add download button
    const downloadDiv = row.append('div').classed('uk-width-1-6',true).classed('downloadDiv',true).attr('mediaID',mediaID);
    const downloadBTN = downloadDiv.append('div').classed('uk-label uk-label-success uk-width-1-1 uk-text-center uk-animation-slide-left-small',true);

    downloadBTN.text('download')
    downloadBTN.on('click',function(){
        downloadClicked(this, options)
    });

    // add title Button
    var titleDiv = row.append('div').classed('uk-width-expand',true).classed('titleDiv',true).attr('mediaID',mediaID);
    titleDiv.append('div')
    .classed('uk-animation-slide-top-small',true)
    .text(rowHead)

    // add progress
    var progressDiv = row.append('div').classed('uk-width-auto',true).classed('progressDiv',true).attr('mediaID',mediaID);
    progressDiv
    .append('div')
    .append('span')
    .classed('uk-label',true)
    .classed('uk-background-secondary',true)
    .classed('uk-animation-slide-right-small',true)
    .text('0%')

    // add last button
    const operationDiv = row.append('div').classed('uk-width-auto',true).classed('operationDiv',true).attr('mediaID',mediaID);
    const operationBTN = operationDiv.append('div').append('span');
    operationBTN.classed('uk-label uk-label-warning uk-animation-slide-right-small',true);
    operationBTN.text('DELE')
    operationBTN.on('click',function(){
        row.remove();
    });   

    addClickEffect([downloadDiv, operationDiv]) 

}

// download button handler
const downloadClicked = function(downloadBTN, downloadOpts){

    const {mediaID, url, type, fname, fullname} = downloadOpts; 

    download(downloadOpts, cancelHandler(downloadBTN), abortHandler(downloadBTN, downloadOpts), function(fullname){
        logger.info(`[${downloadOpts.type}]download callback called!`)
        d3.select(downloadBTN).on('click',null);
        d3.select(downloadBTN).text('PLAY');
        d3.select(downloadBTN).on('click',function(){     
            logger.info('playing media!');
            shell.openItem(fullname);
        })      
        procDivToDone(mediaID);
        operDivToOpen(mediaID, fullname);
        const extForIOS = 'mp4';
        if(downloadOpts.type === 'mp3'){
            audioToMP4(fullname, extForIOS, mediaID, function(mID){
                procDivToDone(mID);
            })    
        }
    });      
}

function download(options, addCancelHandler, addAbortHandler, done){

    const mediaID = options.mediaID;
    const url  = options.url;
    const type = options.type;
    const fname = options.fname;
    const fullname = options.fullname;

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


    logger.info('download to %s',fullname );
   
    var downloadStream = ytdl(url, typeOptions[type].ytdlOpts)
    var fileWriteStream = fs.createWriteStream(fullname);
    
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
            addCancelHandler(downloadStream, fullname);
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
            //var fullname = path.join(DEFAULTPATH, fname);
            done(fullname);

            //addPreview(options.type, fullname, options.mediaID);
        }
    })   

    downloadStream.on('abort',function(){
        logger.info('downloadStream abort fire!');
        fileWriteStream.destroy();
        addAbortHandler(downloadStream, fullname);
    })
    /*
    downloadStream.on('abort', function(err){
        logger.info('download canceled');
    })
    */

}

const cancelHandler = function(downloadBTN) {
    return  function(downloadStream,fullname){
        logger.info('register cancel handler');
        d3.select(downloadBTN).on('click',null);
        d3.select(downloadBTN).text('CANCEL');
        d3.select(downloadBTN).on('click',function(){
            logger.info('stop downloading');
            downloadStream.destroy();
        })
    }
}


const abortHandler = function(downloadBTN, downloadOpts) {

    return function(downloadStream,fullname){
        logger.info('run abort handler');
    
        d3.select('.progressDiv')
        .select('.uk-label')
        .text('0%')
    
        logger.info('delete file')
        fs.unlink(fullname,function(err){
            if(err){
                logger.error('error delete %s : %j', fullname, err);
            } else {
                logger.info('delete %s success ', fullname)
            }
        });
    
        d3.select(downloadBTN).on('click',null);
        d3.select(downloadBTN).text('DOWNLOAD');
        d3.select(downloadBTN).on('click', function(){
            downloadClicked(downloadBTN, downloadOpts)
        })
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
        logger.info(info.length_seconds);
        //logger.info(info.formats)
        info.formats.forEach(function(format){
            var type = format.type;
            var quality = format.quality;
            var url = format.url;
            var container = format.container;
            var encoding = format.encoding;
            var profile = format.profile;
            //logger.info(type,quality,container,encoding,profile);

        })
        mediaID += 1;
        UIkit.modal('#procModal').hide(); 
        clearModal('getInfo');
        var opts = {url:url, title:info.title, type:type, duration:info.length_seconds, mediaID:mediaID};
        callback(opts);
    })
    .then(null, function(err){
        UKalert(err);
        logger.error(err);
        UIkit.modal('#procModal').hide(); 
        clearModal('getInfo');
    })
}



function audioToMP4(fullname, customExtn, mediaID, done){
    logger.info('audioToMP4 start : %s', fullname);
    // output 파일 postfix를 위한 현재 timestamp 구하기
    const now = new Date();

    const origFname = fullname;
    const origPath = path.dirname(origFname);
    const origExtn = path.extname(origFname);
    const origBase = path.basename(origFname,origExtn);
    const convBase = origBase + '_' + now.getTime();

    const ext = customExtn ? '.' + customExtn : 'mp4'
    const convFname = path.join(origPath,convBase) + ext;

    const startTime = new Date();
    
    let command = ffmpeg(origFname)
        .on('start', function(commandLine) {
            logger.info('convert start');
            logger.info('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('progress', function(progress) {
            const percentString = progress.percent.toFixed(2) +'%';          
            const badge = d3.select('div.progressDiv[mediaID="' + mediaID + '"]').select('div').select('span');
            badge.text(percentString);  
        })
        .on('stderr', function(stderrLine) {
            logger.info('Stderr output: ' + stderrLine);
        })
        .on('error', function(err, stdout, stderr) {
            logger.error('Cannot process video: ' + err.message);
            fs.unlink(convFname,function(err){
                if(err) logger.error(err);
                logger.info('file delete success! : %s', convFname);
            })
        })
        .on('end', function(stdout, stderr) {
            logger.info('Transcoding succeeded !');
            //UIkit.modal('#modalProgress').hide();
            done(mediaID);
        })
        .save(convFname);
}