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
    var duration = options.duration;
    var cleanTitle = options.title.replace(/["<>/:%*?|\\]/g, "");
    var rowHead = '[' + type + ']' + cleanTitle + ' - ' + duration + 'sec';
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